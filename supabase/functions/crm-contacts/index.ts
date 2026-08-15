import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  BASE_CORS_HEADERS as corsHeaders,
  errorMessage,
  errorResponse,
  jsonResponse,
  preflightResponse,
} from "../_shared/http.ts";
import { callerClient, getCallerUser } from "../_shared/supabase.ts";

interface Contact {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  notes?: string;
  tags?: string[];
  priority?: string;
  follow_up_date?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return preflightResponse(corsHeaders);
  }

  try {
    const supabaseClient = callerClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      req.headers.get("Authorization"),
    );

    const user = await getCallerUser(supabaseClient);

    if (!user) {
      throw new Error("Unauthorized");
    }

    const method = req.method;

    // Handle GET requests - fetch contacts
    if (method === "GET") {
      const { data: contacts, error } = await supabaseClient
        .from("crm_contacts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return jsonResponse({ success: true, contacts }, 200, corsHeaders);
    }

    // Handle POST requests - create contact
    if (method === "POST") {
      const contact: Contact = await req.json();

      const { data: newContact, error } = await supabaseClient
        .from("crm_contacts")
        .insert({
          user_id: user.id,
          ...contact,
        })
        .select()
        .single();

      if (error) throw error;

      return jsonResponse({ success: true, contact: newContact }, 201, corsHeaders);
    }

    // Handle PUT requests - update contact
    if (method === "PUT") {
      const { id, ...updates }: Contact & { id: string } = await req.json();

      const { data: updatedContact, error } = await supabaseClient
        .from("crm_contacts")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;

      return jsonResponse({ success: true, contact: updatedContact }, 200, corsHeaders);
    }

    // Handle DELETE requests - delete contact
    if (method === "DELETE") {
      const { id } = await req.json();

      const { error } = await supabaseClient
        .from("crm_contacts")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      return jsonResponse({ success: true }, 200, corsHeaders);
    }

    return errorResponse("Method not allowed", 405, corsHeaders);
  } catch (error) {
    return errorResponse(errorMessage(error), 400, corsHeaders);
  }
});

