// Supabase client construction shared by every edge function: the
// service-role client used for privileged reads and writes, and the
// caller-scoped client used to identify who is asking.
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

export function serviceClient(url: string, serviceRoleKey: string): SupabaseClient {
  return createClient(url, serviceRoleKey);
}

// The caller's JWT, keyed by the client built from it. auth.getUser() resolves
// the *stored session* and ignores the Authorization header the client carries,
// so calling it bare in an edge function always fails with "Auth session
// missing!" — there is no session in a server runtime. The token has to be
// handed to getUser() explicitly. Keeping it here rather than in each caller's
// signature means no call site can forget, which is how this broke: the header
// was set correctly everywhere and read nowhere.
const callerTokens = new WeakMap<SupabaseClient, string>();

/** Client that acts as the caller, so RLS and getCallerUser() see their JWT. */
export function callerClient(
  url: string,
  anonKey: string,
  authHeader: string | null,
): SupabaseClient {
  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader ?? "" } },
  });
  const jwt = authHeader?.replace(/^Bearer\s+/i, "").trim();
  if (jwt) callerTokens.set(client, jwt);
  return client;
}

export async function getCallerUser(client: SupabaseClient) {
  const { data: { user }, error } = await client.auth.getUser(callerTokens.get(client));
  // An expired or malformed JWT is a rejection with a reason, not an anonymous
  // caller; log it so a 401 is diagnosable from the function logs.
  if (error) console.warn("auth.getUser failed:", error.message);
  return user;
}

/** True only for a signed-in user listed in app_owners (checked by the is_owner RPC). */
export async function isCallerOwner(client: SupabaseClient): Promise<boolean> {
  const user = await getCallerUser(client);
  if (!user) return false;
  const { data: owner } = await client.rpc("is_owner");
  return owner === true;
}
