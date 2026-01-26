import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase";

const DEFAULT_FUNCTION_PATH = "/functions/v1/inoah-chat";
const DEFAULT_TIMEOUT_MS = 60000;

export interface InoahChatRequest {
  prompt: string;
  include_context?: boolean;
  apply_style?: boolean;
  max_tokens?: number;
  turnstileToken?: string;
}

export interface InoahChatResponse {
  status?: string;
  response: string;
  styled?: boolean;
  context_included?: boolean;
}

export async function sendInoahMessage(
  request: InoahChatRequest
): Promise<InoahChatResponse> {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase is not configured yet.");
  }

  const functionsBase =
    import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || supabaseUrl;
  const functionPath =
    import.meta.env.VITE_INOAH_FUNCTION_PATH || DEFAULT_FUNCTION_PATH;
  const url = `${functionsBase}${functionPath}`;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        data?.error || data?.message || "iNoah chat request failed.";
      throw new Error(message);
    }

    return data as InoahChatResponse;
  } finally {
    window.clearTimeout(timeout);
  }
}
