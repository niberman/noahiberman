// supabase/functions/notify_contact_message/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { SmtpClient } from "https://deno.land/x/smtp/mod.ts";

serve(async (req) => {
  try {
    const { record } = await req.json();
    const { name, email, message, created_at } = record;

    // Create the SMTP client
    const client = new SmtpClient();

    await client.connectTLS({
      hostname: "smtp.gmail.com",
      port: 465,
      username: Deno.env.get("SMTP_USERNAME")!, // your Gmail address
      password: Deno.env.get("SMTP_PASSWORD")!, // your Gmail App Password
    });

    const subject = `New contact message from ${name}`;
    const body = `
      New contact message:

      Name: ${name}
      Email: ${email}
      Message:
      ${message}

      Sent at: ${created_at}
    `;

    await client.send({
      from: "Noah Berman <noah@noahiberman.com>",
      to: "noah@noahiberman.com",
      subject,
      content: body,
    });

    await client.close();

    return new Response("Email sent successfully", { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response("Failed to send email: " + err.message, { status: 500 });
  }
});
