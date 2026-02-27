import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const MISTRAL_API_KEY = Deno.env.get("MISTRAL_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  const users = await restQuery(
    `/rest/v1/utilisateurs?select=id,code,role_id,actif,roles(nom)&code=eq.${encodeURIComponent(actorCode)}&actif=eq.true&limit=1`
  );
  return Array.isArray(users) && users.length > 0 ? users[0] : null;
}

async function verifierAccesEcritureVitrine(actorCode: string, equipeId: number | string) {
  if (!actorCode) {
    throw new Error("actor_code requis pour l'écriture vitrine.");
  }

  const utilisateur = await getUtilisateurParCode(actorCode);
  if (!utilisateur) {
    throw new Error("Utilisateur non autorisé.");
  }

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();

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

      await verifierAccesEcritureVitrine(actorCode, equipeId);

      const upsertData = await restQuery(`/rest/v1/vitrines?on_conflict=equipe_id,etape`, {
        method: "POST",
        headers: {
          "Prefer": "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify([{ equipe_id: equipeId, etape, html_section: htmlSection }]),
      });

      return new Response(JSON.stringify({ ok: true, data: upsertData }), {
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

      await verifierAccesEcritureVitrine(actorCode, vitrine.equipe_id);

      const updateData = await restQuery(`/rest/v1/vitrines?id=eq.${encodeURIComponent(String(vitrineId))}`, {
        method: "PATCH",
        headers: {
          "Prefer": "return=representation",
        },
        body: JSON.stringify({ html_section: htmlSection }),
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

    if (messages.length > 15) {
      messages = [messages[0], ...messages.slice(-14)];
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

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Erreur Edge Function:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
