import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const MISTRAL_API_KEY = Deno.env.get("MISTRAL_API_KEY");
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
    if (!MISTRAL_API_KEY) {
      throw new Error("MISTRAL_API_KEY manquante dans les secrets Supabase.");
    }

    const body = await req.json();
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
