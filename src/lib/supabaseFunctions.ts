import { supabase, supabaseUrl, supabaseAnonKey } from '@/lib/supabase';

type FunctionMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface CallSupabaseFunctionOptions<TBody> {
  method?: FunctionMethod;
  body?: TBody;
}

const ensureClientReady = () => {
  if (!supabase || !supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase is not configured yet.');
  }
};

export async function callSupabaseFunction<TResponse, TBody = Record<string, unknown>>(
  functionName: string,
  options: CallSupabaseFunctionOptions<TBody> = {}
): Promise<TResponse> {
  ensureClientReady();

  const { data: sessionData } = await supabase!.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    throw new Error('Please sign in to access this feature.');
  }

  const method = options.method ?? 'POST';
  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method,
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: method === 'GET' ? undefined : JSON.stringify(options.body ?? {}),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.error || data?.message || `Function ${functionName} failed`;
    throw new Error(message);
  }

  return data as TResponse;
}

