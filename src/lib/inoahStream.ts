// Streaming client for inoah-chat. POST with `stream: true` returns SSE:
// a `meta` event (answer or decline, retrieval confidence), unnamed events
// carrying `{t}` text deltas, then `done` with the cleaned full text.
// EventSource cannot POST, so this parses the stream by hand.
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase";

export interface InoahStreamMeta {
  type: "answer" | "decline";
  confidence?: number;
  suggestions?: string[];
  context_included?: boolean;
}

export interface InoahStreamDone {
  response: string;
  provider?: string;
  declined?: boolean;
  suggestions?: string[];
}

export interface InoahStreamHandlers {
  onMeta?: (meta: InoahStreamMeta) => void;
  onDelta?: (text: string) => void;
}

const FUNCTIONS_BASE = () =>
  import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || supabaseUrl;

export async function streamInoah(
  prompt: string,
  handlers: InoahStreamHandlers = {},
  signal?: AbortSignal,
): Promise<InoahStreamDone> {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("iNoah is not configured yet.");
  }

  const res = await fetch(`${FUNCTIONS_BASE()}/functions/v1/inoah-chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({ prompt, include_context: true, stream: true }),
    signal,
  });

  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => null);
    if (res.status === 429) {
      throw new Error("iNoah is getting a lot of questions right now. Give it a minute.");
    }
    throw new Error(data?.error || "iNoah could not answer that.");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let done: InoahStreamDone | null = null;
  let fallback = "";

  const handleBlock = (block: string) => {
    let event = "message";
    const dataLines: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    }
    if (dataLines.length === 0) return;
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(dataLines.join("\n"));
    } catch {
      return;
    }
    if (event === "meta") {
      handlers.onMeta?.(payload as unknown as InoahStreamMeta);
    } else if (event === "done") {
      done = payload as unknown as InoahStreamDone;
    } else if (event === "error") {
      throw new Error(String(payload.error ?? "iNoah hit a snag."));
    } else if (typeof payload.t === "string") {
      fallback += payload.t;
      handlers.onDelta?.(payload.t);
    }
  };

  for (;;) {
    const { value, done: eof } = await reader.read();
    if (eof) break;
    buffer += decoder.decode(value, { stream: true });
    let sep = buffer.indexOf("\n\n");
    while (sep !== -1) {
      handleBlock(buffer.slice(0, sep));
      buffer = buffer.slice(sep + 2);
      sep = buffer.indexOf("\n\n");
    }
  }
  if (buffer.trim()) handleBlock(buffer);

  // A dropped connection can end the stream before `done`; the accumulated
  // deltas are still a complete-enough answer to keep.
  return done ?? { response: fallback };
}
