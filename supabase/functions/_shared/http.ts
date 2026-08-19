// CORS and JSON response helpers shared by every edge function.
//
// Two CORS shapes exist on purpose: public endpoints answer any origin, and
// owner-only endpoints answer the site origins only. Everything else about the
// response envelope is identical, so it lives here.

/** Any origin, no method allowlist: for the REST-shaped endpoints that also serve GET/PUT/DELETE. */
export const BASE_CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export const PUBLIC_CORS_HEADERS: Record<string, string> = {
  ...BASE_CORS_HEADERS,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const SITE_ORIGINS = [
  "https://www.noahiberman.com",
  "https://noahiberman.com",
];

const DEFAULT_SITE_ORIGIN = SITE_ORIGINS[0];

/** Owner-only endpoints: echo the caller's origin only when it is the site. */
export function siteCorsHeaders(origin: string | null): Record<string, string> {
  return {
    ...PUBLIC_CORS_HEADERS,
    "Access-Control-Allow-Origin":
      origin && SITE_ORIGINS.includes(origin) ? origin : DEFAULT_SITE_ORIGIN,
    "Vary": "Origin",
  };
}

/** Same as BASE_CORS_HEADERS plus request headers a specific endpoint needs (e.g. x-webhook-secret). */
export function corsHeadersWith(extraAllowedHeaders: string[]): Record<string, string> {
  return {
    ...BASE_CORS_HEADERS,
    "Access-Control-Allow-Headers": [
      "authorization, x-client-info, apikey, content-type",
      ...extraAllowedHeaders,
    ].join(", "),
  };
}

export function preflightResponse(corsHeaders: Record<string, string>): Response {
  return new Response("ok", { headers: corsHeaders });
}

export function jsonResponse(
  body: unknown,
  status = 200,
  corsHeaders: Record<string, string> = PUBLIC_CORS_HEADERS,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extraHeaders },
  });
}

export function errorResponse(
  message: string,
  status: number,
  corsHeaders: Record<string, string> = PUBLIC_CORS_HEADERS,
  extraHeaders: Record<string, string> = {},
): Response {
  return jsonResponse({ error: message }, status, corsHeaders, extraHeaders);
}

/** Message from an unknown thrown value, for the catch-all 500 every function has. */
export function errorMessage(err: unknown, fallback = "Unexpected server error."): string {
  return err instanceof Error ? err.message : fallback;
}

/** An error carrying the HTTP status the caller should receive. */
export class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

/**
 * Response for a caught exception: the declared status for an HttpError, 500
 * otherwise. Unexpected failures are logged in full and reported generically so
 * internal details do not leak to the caller.
 */
export function caughtErrorResponse(
  error: unknown,
  context: string,
  corsHeaders: Record<string, string>,
): Response {
  const status = error instanceof HttpError ? error.status : 500;
  const message = error instanceof HttpError
    ? error.message
    : "Unexpected server error.";

  if (status >= 500) {
    console.error(`${context} failed:`, error);
  } else {
    console.warn(`${context} rejected (${status}): ${errorMessage(error)}`);
  }

  return errorResponse(message, status, corsHeaders);
}
