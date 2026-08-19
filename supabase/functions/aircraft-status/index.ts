import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  BASE_CORS_HEADERS as corsHeaders,
  caughtErrorResponse,
  errorResponse,
  HttpError,
  jsonResponse,
  preflightResponse,
} from "../_shared/http.ts";
import { callerClient, getCallerUser } from "../_shared/supabase.ts";

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
    return preflightResponse(corsHeaders);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new HttpError(401, "Missing Authorization header.");
    }

    const supabaseClient = callerClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      authHeader,
    );

    const user = await getCallerUser(supabaseClient);

    if (!user) {
      throw new HttpError(401, "Unauthorized");
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

      return jsonResponse({ success: true, aircraft }, 200, corsHeaders);
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

      return jsonResponse({ success: true, aircraft: result }, 200, corsHeaders);
    }

    return errorResponse("Method not allowed", 405, corsHeaders);
  } catch (error) {
    return caughtErrorResponse(error, "aircraft-status", corsHeaders);
  }
});

