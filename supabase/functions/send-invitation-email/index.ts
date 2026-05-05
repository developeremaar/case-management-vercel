import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type InvitationPayload = {
  email?: string;
  name?: string;
  token?: string;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const payload = (await req.json()) as InvitationPayload;

    const email = payload.email?.trim();
    const name = payload.name?.trim();
    const token = payload.token?.trim();

    if (!email || !name || !token) {
      return jsonResponse(
        { error: "email, name, and token are required" },
        400
      );
    }

    const siteUrl = Deno.env.get("SITE_URL") || Deno.env.get("APP_URL");

    if (!siteUrl) {
      return jsonResponse(
        {
          error: "SITE_URL or APP_URL environment variable is required",
        },
        500
      );
    }

    const normalizedSiteUrl = siteUrl.trim().replace(/\/+$/, "");

    if (!normalizedSiteUrl) {
      return jsonResponse(
        {
          error: "SITE_URL or APP_URL environment variable is invalid",
        },
        500
      );
    }

    const invitationLink = `${normalizedSiteUrl}/accept-invitation?token=${encodeURIComponent(
      token
    )}`;

    // Email provider is not configured yet in this project.
    // We return the generated secure invitation link so UI can offer copy fallback.

    return jsonResponse({
      success: true,
      emailConfigured: false,
      message: "تم إنشاء رابط الدعوة، لكن إرسال البريد غير مفعّل بعد.",
      link: invitationLink,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";

    console.error("send-invitation-email error:", err);

    return jsonResponse({ error: message }, 500);
  }
});
