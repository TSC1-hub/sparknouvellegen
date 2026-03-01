import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const MISTRAL_API_KEY = Deno.env.get("MISTRAL_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const AUTH_REQUIRE_SESSION = Deno.env.get("AUTH_REQUIRE_SESSION") === "true";
const AUTH_ENFORCE_ACTOR_BINDING = Deno.env.get("AUTH_ENFORCE_ACTOR_BINDING") === "true";
const MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions";

const RATE_LIMITS: Record<string, { limit: number; windowMs: number }> = {
  mistral_chat: { limit: 60, windowMs: 60_000 },
  vitrine_upsert: { limit: 120, windowMs: 60_000 },
  vitrine_update: { limit: 120, windowMs: 60_000 },
};

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function logEvent(level: "info" | "error", event: string, meta: Record<string, unknown> = {}) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    ...meta,
  };
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else console.log(line);
}

function getClientIp(req: Request) {
  const header = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";
  const first = header.split(",")[0]?.trim();
  return first || "unknown";
}

function applyRateLimit(action: string, actorCode: string | null, req: Request) {
  const config = RATE_LIMITS[action];
  if (!config) {
    return { allowed: true, remaining: null, retryAfterSec: 0 };
  }

  const principal = actorCode || `ip:${getClientIp(req)}`;
  const key = `${action}:${principal}`;
  const now = Date.now();
  const existing = rateLimitBuckets.get(key);

  if (!existing || now >= existing.resetAt) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.limit - 1, retryAfterSec: 0 };
  }

  if (existing.count >= config.limit) {
    const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  existing.count += 1;
  rateLimitBuckets.set(key, existing);
  return { allowed: true, remaining: config.limit - existing.count, retryAfterSec: 0 };
}

function extractBearerToken(req: Request) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  const token = auth.slice(7).trim();
  return token || null;
}

async function verifySessionToken(req: Request) {
  const token = extractBearerToken(req);
  if (!token || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return { mode: "legacy" as const, userId: null };
  }

  try {
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${token}`,
      },
    });

    if (!resp.ok) {
      return { mode: "invalid" as const, userId: null };
    }

    const user = await resp.json().catch(() => null);
    return { mode: "session" as const, userId: user?.id || null };
  } catch {
    return { mode: "invalid" as const, userId: null };
  }
}

async function restQuery(path: string, init: RequestInit = {}) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Secrets Supabase manquants.");
  }

  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      ...(init.headers || {}),
    },
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || `Erreur REST Supabase: ${response.status}`);
  }
  return data;
}

async function getUtilisateurParCode(actorCode: string) {
  try {
    const users = await restQuery(
      `/rest/v1/utilisateurs?select=id,code,role_id,actif,auth_user_id,roles(nom)&code=eq.${encodeURIComponent(actorCode)}&actif=eq.true&limit=1`
    );
    return Array.isArray(users) && users.length > 0 ? users[0] : null;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes("auth_user_id")) {
      throw err;
    }
    const users = await restQuery(
      `/rest/v1/utilisateurs?select=id,code,role_id,actif,roles(nom)&code=eq.${encodeURIComponent(actorCode)}&actif=eq.true&limit=1`
    );
    return Array.isArray(users) && users.length > 0 ? users[0] : null;
  }
}

function verifierBindingActeur(
  utilisateur: any,
  authContext: { mode: "legacy" | "invalid" | "session"; userId: string | null },
  reqId: string,
  action: string,
  actorCode: string,
) {
  if (authContext.mode !== "session" || !authContext.userId) {
    return;
  }

  const linkedAuthUserId = utilisateur?.auth_user_id || null;
  if (!linkedAuthUserId) {
    logEvent("info", "auth.binding.missing", {
      reqId,
      action,
      actorCode,
      authUserId: authContext.userId,
    });
    return;
  }

  if (linkedAuthUserId === authContext.userId) {
    return;
  }

  logEvent("error", "auth.binding.mismatch", {
    reqId,
    action,
    actorCode,
    expectedAuthUserId: linkedAuthUserId,
    gotAuthUserId: authContext.userId,
    enforced: AUTH_ENFORCE_ACTOR_BINDING,
  });

  if (AUTH_ENFORCE_ACTOR_BINDING) {
    throw new Error("Session invalide pour ce code utilisateur.");
  }
}

async function verifierAccesEcritureVitrine(
  actorCode: string,
  equipeId: number | string,
  authContext: { mode: "legacy" | "invalid" | "session"; userId: string | null },
  reqId: string,
  action: string,
) {
  if (!actorCode) {
    throw new Error("actor_code requis pour l'écriture vitrine.");
  }

  const utilisateur = await getUtilisateurParCode(actorCode);
  if (!utilisateur) {
    throw new Error("Utilisateur non autorisé.");
  }

  verifierBindingActeur(utilisateur, authContext, reqId, action, actorCode);

  const equipes = await restQuery(
    `/rest/v1/equipes?select=id,code_equipe,facilitateur_id&id=eq.${encodeURIComponent(String(equipeId))}&limit=1`
  );
  const equipe = Array.isArray(equipes) && equipes.length > 0 ? equipes[0] : null;
  if (!equipe) {
    throw new Error("Équipe introuvable.");
  }

  const roleNom = utilisateur?.roles?.nom || "";
  const estEleveEquipe = roleNom === "eleve" && utilisateur.code === equipe.code_equipe;
  const estFacEquipe = ["facilitateur", "facilitateur_general", "admin"].includes(roleNom)
    && (roleNom !== "facilitateur" || utilisateur.id === equipe.facilitateur_id);

  let estMentorEquipe = false;
  if (roleNom === "mentor") {
    const mentorRelations = await restQuery(
      `/rest/v1/mentor_equipes?select=id&mentor_id=eq.${encodeURIComponent(String(utilisateur.id))}&equipe_id=eq.${encodeURIComponent(String(equipe.id))}&limit=1`
    );
    estMentorEquipe = Array.isArray(mentorRelations) && mentorRelations.length > 0;
  }

  if (!estEleveEquipe && !estFacEquipe && !estMentorEquipe) {
    throw new Error("Accès refusé pour cette équipe.");
  }

  return { utilisateur, equipe };
}

serve(async (req: Request) => {
  const reqId = crypto.randomUUID();
  const t0 = Date.now();

  if (req.method === "OPTIONS") {
    logEvent("info", "edge.options", { reqId });
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const action = String(body?.action || "mistral_chat");
    const actorCode = String(body?.actor_code || "").trim().toUpperCase() || null;
    const authContext = await verifySessionToken(req);

    logEvent("info", "edge.request.start", {
      reqId,
      action,
      actorCode,
      authMode: authContext.mode,
      authUserId: authContext.userId,
      equipeId: body?.equipe_id ?? null,
    });

    if (AUTH_REQUIRE_SESSION && authContext.mode !== "session") {
      return new Response(JSON.stringify({
        error: "Session requise. Reconnecte-toi puis réessaie.",
        req_id: reqId,
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rateLimit = applyRateLimit(action, actorCode, req);
    if (!rateLimit.allowed) {
      logEvent("error", "rate_limit.hit", {
        reqId,
        action,
        actorCode,
        retryAfterSec: rateLimit.retryAfterSec,
      });
      return new Response(JSON.stringify({
        error: "Trop de requêtes, réessaie dans quelques secondes.",
        retry_after: rateLimit.retryAfterSec,
        req_id: reqId,
      }), {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Retry-After": String(rateLimit.retryAfterSec),
        },
      });
    }

    if (body?.action === "vitrine_upsert") {
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error("Secrets Supabase manquants pour vitrine_upsert.");
      }

      const equipeId = body?.equipe_id;
      const etape = Number(body?.etape);
      const htmlSection = body?.html_section;
      const actorCode = String(body?.actor_code || "").trim().toUpperCase();

      if (!equipeId || Number.isNaN(etape) || typeof htmlSection !== "string") {
        throw new Error("Payload vitrine_upsert invalide.");
      }

      await verifierAccesEcritureVitrine(actorCode, equipeId, authContext, reqId, "vitrine_upsert");

      const upsertData = await restQuery(`/rest/v1/vitrines?on_conflict=equipe_id,etape`, {
        method: "POST",
        headers: {
          "Prefer": "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify([{ equipe_id: equipeId, etape, html_section: htmlSection }]),
      });

      logEvent("info", "vitrine.upsert.ok", {
        reqId,
        actorCode,
        equipeId,
        etape,
        htmlLength: htmlSection.length,
        durationMs: Date.now() - t0,
      });

      return new Response(JSON.stringify({ ok: true, data: upsertData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body?.action === "vitrine_delete_equipe") {
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error("Secrets Supabase manquants pour vitrine_delete_equipe.");
      }

      const equipeId = body?.equipe_id;
      const actorCodeDel = String(body?.actor_code || "").trim().toUpperCase();

      if (!equipeId) {
        throw new Error("equipe_id requis pour vitrine_delete_equipe.");
      }

      // Vérifier que l'acteur est FAC ou admin
      const utilisateurDel = await getUtilisateurParCode(actorCodeDel);
      if (!utilisateurDel) throw new Error("Utilisateur non autorisé.");
      const roleNomDel = utilisateurDel?.roles?.nom || "";
      if (!["facilitateur", "facilitateur_general", "admin"].includes(roleNomDel)) {
        throw new Error("Seul un facilitateur peut supprimer les vitrines d'une équipe.");
      }

      await restQuery(
        `/rest/v1/vitrines?equipe_id=eq.${encodeURIComponent(String(equipeId))}`,
        { method: "DELETE", headers: { "Prefer": "return=minimal" } }
      );

      logEvent("info", "vitrine.delete_equipe.ok", {
        reqId,
        actorCode: actorCodeDel,
        equipeId,
        durationMs: Date.now() - t0,
      });

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body?.action === "vitrine_update") {
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error("Secrets Supabase manquants pour vitrine_update.");
      }

      const vitrineId = body?.id;
      const htmlSection = body?.html_section;
      const actorCode = String(body?.actor_code || "").trim().toUpperCase();

      if (!vitrineId || typeof htmlSection !== "string") {
        throw new Error("Payload vitrine_update invalide.");
      }

      const vitrines = await restQuery(
        `/rest/v1/vitrines?select=id,equipe_id&id=eq.${encodeURIComponent(String(vitrineId))}&limit=1`
      );
      const vitrine = Array.isArray(vitrines) && vitrines.length > 0 ? vitrines[0] : null;
      if (!vitrine?.equipe_id) {
        throw new Error("Vitrine introuvable.");
      }

      await verifierAccesEcritureVitrine(actorCode, vitrine.equipe_id, authContext, reqId, "vitrine_update");

      const updateData = await restQuery(`/rest/v1/vitrines?id=eq.${encodeURIComponent(String(vitrineId))}`, {
        method: "PATCH",
        headers: {
          "Prefer": "return=representation",
        },
        body: JSON.stringify({ html_section: htmlSection }),
      });

      logEvent("info", "vitrine.update.ok", {
        reqId,
        actorCode,
        vitrineId,
        equipeId: vitrine.equipe_id,
        htmlLength: htmlSection.length,
        durationMs: Date.now() - t0,
      });

      return new Response(JSON.stringify({ ok: true, data: updateData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!MISTRAL_API_KEY) {
      throw new Error("MISTRAL_API_KEY manquante dans les secrets Supabase.");
    }

    const systemText = body.system_instruction?.parts?.[0]?.text;
    let contents = body.contents || [];
    let messages = [];

    if (systemText) {
      messages.push({ role: "system", content: systemText });
    }

    contents.forEach((msg: any) => {
      messages.push({
        role: msg.role === "model" ? "assistant" : msg.role,
        content: msg.parts?.[0]?.text || "",
      });
    });

    if (messages.length > 32) {
      messages = [messages[0], ...messages.slice(-31)];
    }

    const mistralBody = {
      model: "mistral-small-latest",
      messages,
      temperature: Math.min(body.generationConfig?.temperature ?? 0.9, 0.8),
      max_tokens: Math.min(body.generationConfig?.maxOutputTokens ?? 4096, 8192),
      top_p: 0.9,
    };

    const mistralResponse = await fetch(MISTRAL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MISTRAL_API_KEY}`,
      },
      body: JSON.stringify(mistralBody),
    });

    const data = await mistralResponse.json();

    if (!mistralResponse.ok) {
      throw new Error(data.error?.message || `Erreur Mistral: ${mistralResponse.status}`);
    }

    logEvent("info", "mistral.chat.ok", {
      reqId,
      model: mistralBody.model,
      maxTokens: mistralBody.max_tokens,
      messagesCount: messages.length,
      durationMs: Date.now() - t0,
    });

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logEvent("error", "edge.request.error", {
      reqId,
      durationMs: Date.now() - t0,
      error: message,
    });
    return new Response(JSON.stringify({ error: message, req_id: reqId }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
