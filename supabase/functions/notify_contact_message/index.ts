// supabase/functions/notify_contact_message/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify webhook secret for security
    const webhookSecret = Deno.env.get("WEBHOOK_SECRET");
    const providedSecret = req.headers.get("x-webhook-secret");
    
    if (webhookSecret && providedSecret !== webhookSecret) {
      console.error("Invalid webhook secret");
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const payload = await req.json();
    
    // Handle both direct calls and Supabase webhook format
    const record = payload.record || payload;
    const { name, email, message, created_at } = record;

    if (!name || !email || !message) {
      console.error("Missing required fields:", { name, email, message });
      return new Response("Missing required fields", { status: 400, headers: corsHeaders });
    }

    console.log(`Processing contact message from ${name} (${email})`);

    // Get environment variables
    const smtpUsername = Deno.env.get("SMTP_USERNAME");
    const smtpPassword = Deno.env.get("SMTP_PASSWORD");
    const notificationEmail = Deno.env.get("NOTIFICATION_EMAIL") || "noah@noahiberman.com";

    if (!smtpUsername || !smtpPassword) {
      console.error("SMTP credentials not configured");
      return new Response("SMTP credentials not configured", { status: 500, headers: corsHeaders });
    }

    // Create the SMTP client using denomailer
    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: {
          username: smtpUsername,
          password: smtpPassword,
        },
      },
    });

    const subject = `[Website Contact] New message from ${name}`;
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
          New Contact Form Submission
        </h2>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
          <p><strong>Received:</strong> ${created_at ? new Date(created_at).toLocaleString() : new Date().toLocaleString()}</p>
        </div>
        <div style="background: #fff; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px;">
          <h3 style="margin-top: 0; color: #495057;">Message:</h3>
          <p style="white-space: pre-wrap; line-height: 1.6;">${message}</p>
        </div>
        <p style="color: #6c757d; font-size: 12px; margin-top: 20px;">
          This email was sent from your website contact form at noahiberman.com
        </p>
      </div>
    `;

    const textBody = `
New Contact Form Submission
============================

Name: ${name}
Email: ${email}
Received: ${created_at ? new Date(created_at).toLocaleString() : new Date().toLocaleString()}

Message:
${message}

---
This email was sent from your website contact form at noahiberman.com
    `;

    await client.send({
      from: smtpUsername,
      to: notificationEmail,
      subject,
      content: textBody,
      html: htmlBody,
      replyTo: email, // Reply directly to the person who contacted
    });

    await client.close();

    console.log(`Email notification sent successfully to ${notificationEmail}`);
    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }), 
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error sending email:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
