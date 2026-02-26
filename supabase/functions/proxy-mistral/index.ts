import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const MISTRAL_API_KEY = Deno.env.get("MISTRAL_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

      if (!equipeId || Number.isNaN(etape) || typeof htmlSection !== "string") {
        throw new Error("Payload vitrine_upsert invalide.");
      }

      const upsertResp = await fetch(`${SUPABASE_URL}/rest/v1/vitrines?on_conflict=equipe_id,etape`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Prefer": "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify([{ equipe_id: equipeId, etape, html_section: htmlSection }]),
      });

      const upsertData = await upsertResp.json().catch(() => null);
      if (!upsertResp.ok) {
        throw new Error(upsertData?.message || `Erreur vitrine_upsert: ${upsertResp.status}`);
      }

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

      if (!vitrineId || typeof htmlSection !== "string") {
        throw new Error("Payload vitrine_update invalide.");
      }

      const updateResp = await fetch(`${SUPABASE_URL}/rest/v1/vitrines?id=eq.${encodeURIComponent(vitrineId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Prefer": "return=representation",
        },
        body: JSON.stringify({ html_section: htmlSection }),
      });

      const updateData = await updateResp.json().catch(() => null);
      if (!updateResp.ok) {
        throw new Error(updateData?.message || `Erreur vitrine_update: ${updateResp.status}`);
      }

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
      max_tokens: Math.min(body.generationConfig?.maxOutputTokens ?? 2048, 1500),
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
