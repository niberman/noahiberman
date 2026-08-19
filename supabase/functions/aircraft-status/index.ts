import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { errorResponse, HttpError } from "../_shared/errors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AircraftStatus {
  aircraft_tail_number: string;
  aircraft_type: string;
  airport_base?: string;
  status: string;
  location?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new HttpError(401, "Missing Authorization header.");
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get the current user
    const { data: { user }, error: authError } = await supabaseClient.auth
      .getUser();

    if (authError || !user) {
      throw new HttpError(401, authError?.message ?? "Unauthorized");
    }

    const method = req.method;

    // Handle GET requests - fetch current aircraft status
    if (method === "GET") {
      const { data: aircraft, error } = await supabaseClient
        .from("aircraft_status")
        .select("*")
        .eq("user_id", user.id)
        .order("last_updated", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows returned

      return new Response(
        JSON.stringify({ success: true, aircraft }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Handle POST requests - create/update aircraft status
    if (method === "POST") {
      const aircraftStatus: AircraftStatus = await req.json();

      // Check if aircraft already exists
      const { data: existing, error: lookupError } = await supabaseClient
        .from("aircraft_status")
        .select("id")
        .eq("user_id", user.id)
        .eq("aircraft_tail_number", aircraftStatus.aircraft_tail_number)
        .maybeSingle();

      if (lookupError) throw lookupError;

      let result;
      if (existing) {
        // Update existing
        const { data, error } = await supabaseClient
          .from("aircraft_status")
          .update({
            ...aircraftStatus,
            last_updated: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Create new
        const { data, error } = await supabaseClient
          .from("aircraft_status")
          .insert({
            user_id: user.id,
            ...aircraftStatus,
          })
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      return new Response(
        JSON.stringify({ success: true, aircraft: result }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 405,
      }
    );
  } catch (error) {
    return errorResponse(error, "aircraft-status", corsHeaders);
  }
});

