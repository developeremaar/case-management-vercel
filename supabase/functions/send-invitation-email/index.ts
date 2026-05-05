import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type InvitationPayload = { email?: string; name?: string; token?: string };

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const payload = (await req.json()) as InvitationPayload;
    const email = payload.email?.trim();
    const name = payload.name?.trim();
    const token = payload.token?.trim();

    if (!email || !name || !token) {
      return jsonResponse({ error: "email, name, and token are required" }, 400);
    }

    const siteUrl = Deno.env.get("SITE_URL") || Deno.env.get("APP_URL");
    if (!siteUrl?.trim()) return jsonResponse({ error: "SITE_URL or APP_URL environment variable is required" }, 500);

    const invitationLink = `${siteUrl.trim().replace(/\/+$/, "")}/accept-invitation?token=${encodeURIComponent(token)}`;

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("INVITATION_FROM_EMAIL") || Deno.env.get("MAIL_FROM");

    if (!resendApiKey || !fromEmail) {
      return jsonResponse({
        success: true,
        emailConfigured: false,
        message: "تم إنشاء رابط الدعوة، لكن إرسال البريد غير مفعّل بعد. يمكنك نسخ الرابط يدويًا.",
        link: invitationLink,
      });
    }

    const sendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: "دعوة للانضمام إلى نظام إدارة الحالات",
        html: `<div dir="rtl"><p>مرحبًا ${name}</p><p>تمت دعوتك للانضمام إلى النظام.</p><p><a href="${invitationLink}">اضغط هنا لقبول الدعوة</a></p></div>`,
      }),
    });

    if (!sendRes.ok) {
      const errorText = await sendRes.text();
      return jsonResponse({ error: "failed_to_send_email", details: errorText }, 502);
    }

    return jsonResponse({ success: true, emailConfigured: true, message: "تم إرسال الدعوة بنجاح إلى البريد الإلكتروني." });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : "Internal server error" }, 500);
  }
});
