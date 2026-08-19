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

interface TrackFlightRequest {
  flightIdentifier: string; // Can be flight number or FA flight ID
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

    const { flightIdentifier }: TrackFlightRequest = await req.json();

    if (!flightIdentifier) {
      throw new HttpError(400, "Flight identifier is required.");
    }

    // TODO: Integrate with FlightAware API
    // For now, return mock flight data
    const mockFlightData = {
      fa_flight_id: `FA-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      flight_number: flightIdentifier.toUpperCase(),
      origin: "SFO",
      origin_name: "San Francisco International",
      destination: "LAX",
      destination_name: "Los Angeles International",
      departure_time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      arrival_time: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(), // 1 hour from now
      aircraft: "Boeing 737-800",
      status: "Departed",
      tracking_data: {
        altitude: 35000,
        speed: 450,
        heading: 180,
        latitude: 36.7783,
        longitude: -119.4179,
      },
    };

    // Store the tracked flight
    const { data: trackedFlight, error } = await supabaseClient
      .from("flight_tracking")
      .insert({
        user_id: user.id,
        fa_flight_id: mockFlightData.fa_flight_id,
        flight_number: mockFlightData.flight_number,
        origin: mockFlightData.origin_name,
        destination: mockFlightData.destination_name,
        departure_time: mockFlightData.departure_time,
        arrival_time: mockFlightData.arrival_time,
        aircraft: mockFlightData.aircraft,
        status: mockFlightData.status,
        tracking_data: mockFlightData.tracking_data,
      })
      .select()
      .single();

    if (error) throw error;

    return jsonResponse(
      { success: true, flight: mockFlightData, flightId: trackedFlight.id },
      200,
      corsHeaders,
    );
  } catch (error) {
    return caughtErrorResponse(error, "track-flight", corsHeaders);
  }
});

