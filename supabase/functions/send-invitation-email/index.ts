import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, name, token } = await req.json();

    if (!email || !name || !token) {
      return new Response(
        JSON.stringify({ error: "email, name, and token are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const siteUrl = Deno.env.get("SITE_URL") || Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".lovable.app") || "";
    const invitationLink = `${siteUrl}/accept-invitation?token=${token}`;

    // For now, log the invitation details. 
    // Replace with actual email sending (e.g., Resend, SendGrid) when ready.
    console.log("=== SENDING INVITATION EMAIL ===");
    console.log("To:", email);
    console.log("Name:", name);
    console.log("Link:", invitationLink);
    console.log("================================");

    return new Response(
      JSON.stringify({
        success: true,
        message: `Invitation email queued for ${email}`,
        link: invitationLink,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-invitation-email error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
