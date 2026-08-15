// Shared error handling for the edge functions. The goal is that a caller can
// always tell an authorization problem (401) or a bad request (400) apart from
// a server-side failure (500), and that the failure is logged with its stack.

/** An error carrying the HTTP status the caller should receive. */
export class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unexpected server error.";
}

/**
 * Build the error response for a caught exception: the declared status for an
 * HttpError, 500 otherwise. Unexpected failures are logged in full and reported
 * generically so internal details do not leak to the caller.
 */
export function errorResponse(
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

  return new Response(JSON.stringify({ error: message }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}
