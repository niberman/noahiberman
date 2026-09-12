// The iNoah conversation surface: disclosure, suggested questions, streaming
// transcript, voice, composer. One component serves both containers, the
// floating panel (variant "panel", with a close button) and the /inoah page
// (variant "page").
//
// Visual system is scoped under .inoah-surface (see index.css): #0B0F14
// ground, #131A22 surfaces, #4FB3FF accent, Inter for UI, JetBrains Mono for
// data, 8px spacing grid, 12px radius, 180ms state and 400ms panel motion.
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Check, Copy, RefreshCw, Square, Volume2, VolumeX, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { streamInoah } from "@/lib/inoahStream";
import { useVoice } from "./useVoice";
import { Waveform } from "./Waveform";

// The markdown pipeline is the heaviest dependency here and is only needed
// once the first answer settles; streaming text renders as plain prose. Lazy
// keeps it off the /inoah critical path entirely.
const MarkdownRenderer = lazy(() =>
  import("@/components/MarkdownRenderer").then((m) => ({ default: m.MarkdownRenderer })),
);

export const DISCLOSURE_LINE =
  "You are talking to iNoah, an AI built by Noah. It answers from his public notes.";

const CHIP_POOL_SIZE = 18;
const CHIPS_SHOWN = 6;
const CHIP_OFFSET_KEY = "inoah.chips.offset";
const SESSION_KEY = "inoah.session";

interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: "streaming" | "done" | "error";
  declined?: boolean;
  suggestions?: string[];
}

function sessionId(): string {
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return "no-storage";
  }
}

/** Rotate which six of the pool are shown, advancing once per mount. */
function nextChipOffset(): number {
  try {
    const prev = Number(localStorage.getItem(CHIP_OFFSET_KEY) ?? "0") || 0;
    const next = (prev + CHIPS_SHOWN) % CHIP_POOL_SIZE;
    localStorage.setItem(CHIP_OFFSET_KEY, String(next));
    return prev % CHIP_POOL_SIZE;
  } catch {
    return 0;
  }
}

interface InoahSurfaceProps {
  variant: "panel" | "page";
  onClose?: () => void;
}

export default function InoahSurface({ variant, onClose }: InoahSurfaceProps) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [ready, setReady] = useState(false);
  const [pool, setPool] = useState<string[]>([]);
  const [chipOffset, setChipOffset] = useState(0);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const voice = useVoice();
  const logRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastPromptRef = useRef<string | null>(null);

  // Disclosure: rendered before anything else, spoken when sound is on, and
  // logged as shown. The composer unlocks a beat later so the line lands
  // before the first turn. It stays pinned above the transcript, so it can
  // never scroll away or be skipped.
  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 700);
    if (supabase) {
      void supabase.from("inoah_events").insert({
        type: "disclosure_shown",
        session_id: sessionId(),
        payload: { variant, muted: voice.muted, path: window.location.pathname },
      });
    }
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Speak the disclosure once the engine probe has settled, so it uses the
  // same voice as the replies. Muted visitors read it instead.
  const disclosureSpoken = useRef(false);
  useEffect(() => {
    if (disclosureSpoken.current || voice.muted || !voice.engine) return;
    disclosureSpoken.current = true;
    voice.speakNow(DISCLOSURE_LINE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.engine, voice.muted]);

  // Chip pool: the first 18 questions of the public corpus, six shown,
  // rotated on every open so repeat visitors see fresh entries.
  useEffect(() => {
    setChipOffset(nextChipOffset());
    if (!supabase) return;
    let live = true;
    supabase.rpc("inoah_public_questions").then(({ data, error: rpcError }) => {
      if (!live || rpcError || !data) return;
      setPool((data as { question: string }[]).map((r) => r.question).slice(0, CHIP_POOL_SIZE));
    });
    return () => {
      live = false;
    };
  }, []);

  const chips = useMemo(() => {
    if (pool.length === 0) return [];
    return Array.from(
      { length: Math.min(CHIPS_SHOWN, pool.length) },
      (_, i) => pool[(chipOffset + i) % pool.length],
    );
  }, [pool, chipOffset]);

  const rotateChips = useCallback(() => {
    setChipOffset(nextChipOffset());
  }, []);

  // Keep the transcript pinned to the newest text without fighting Lenis.
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  // Composer grows with content instead of reserving empty rows.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [input]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // The surface lazy-loads after the dialog's own autofocus pass, so land
  // focus on the composer ourselves, a beat after Radix's focus scope settles.
  // Desktop only: on a phone this would pop the soft keyboard over the chips
  // before anyone has read them.
  useEffect(() => {
    if (variant !== "panel" || !window.matchMedia("(min-width: 640px)").matches) return;
    const t = window.setTimeout(() => textareaRef.current?.focus({ preventScroll: true }), 80);
    return () => window.clearTimeout(t);
  }, [variant]);

  const send = useCallback(
    async (raw: string) => {
      const prompt = raw.trim();
      if (!prompt || sending || !ready) return;
      setError(null);
      setInput("");
      setSending(true);
      lastPromptRef.current = prompt;
      voice.cancel();

      const assistantId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "user", content: prompt, status: "done" },
        { id: assistantId, role: "assistant", content: "", status: "streaming" },
      ]);

      const patch = (partial: Partial<Msg>) =>
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, ...partial } : m)),
        );

      const controller = new AbortController();
      abortRef.current = controller;
      let streamed = "";
      let declined = false;

      try {
        const done = await streamInoah(
          prompt,
          {
            onMeta: (meta) => {
              declined = meta.type === "decline";
            },
            onDelta: (delta) => {
              streamed += delta;
              voice.feed(delta);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: streamed } : m,
                ),
              );
            },
          },
          controller.signal,
        );
        voice.end();
        patch({
          content: done.response || streamed,
          status: "done",
          declined: declined || done.declined,
          suggestions: done.suggestions,
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        voice.cancel();
        const message = err instanceof Error ? err.message : "iNoah hit a snag.";
        if (streamed) {
          patch({ content: streamed, status: "done" });
        } else {
          setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        }
        setError(message);
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        setSending(false);
      }
    },
    [ready, sending, voice],
  );

  const copyTranscript = useCallback(async () => {
    const lines = messages
      .filter((m) => m.content)
      .map((m) => `${m.role === "user" ? "You" : "iNoah"}: ${m.content}`);
    const text = [`iNoah, noahiberman.com`, DISCLOSURE_LINE, "", ...lines].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard denied; the button simply does not confirm.
    }
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  };

  const isEmpty = messages.length === 0;

  const chipButton = (label: string, key: string, delayMs = 0) => (
    <button
      key={key}
      type="button"
      onClick={() => void send(label)}
      disabled={sending || !ready}
      style={{ animationDelay: `${delayMs}ms` }}
      className={cn(
        "inoah-chip flex min-h-[52px] items-center rounded-[12px] border border-white/10 bg-[var(--in-surface)] px-4 py-2",
        "text-left text-[13px] leading-snug text-[var(--in-text)]/90",
        "transition-[border-color,background-color,transform] [transition-duration:180ms] ease-out",
        "hover:border-[var(--in-accent)]/50 hover:bg-[var(--in-surface-2)] hover:-translate-y-px",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--in-accent)]",
        "disabled:opacity-50 disabled:pointer-events-none motion-reduce:transition-none",
      )}
    >
      {label}
    </button>
  );

  return (
    <div
      className={cn(
        "inoah-surface flex h-full min-h-0 flex-col overflow-hidden bg-[var(--in-bg)] font-sans text-[var(--in-text)] antialiased",
        variant === "page" && "rounded-[12px] border border-white/10 shadow-2xl",
      )}
    >
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-white/10 bg-[var(--in-surface)] px-4 py-3">
        <span className="relative flex h-2 w-2 flex-none" aria-hidden="true">
          <span
            className={cn(
              "absolute inline-flex h-full w-full rounded-full bg-[var(--in-success)] opacity-60",
              voice.speaking && "animate-ping motion-reduce:animate-none",
            )}
          />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--in-success)]" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold leading-tight tracking-tight">iNoah</h2>
          <p className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--in-muted)]">
            AI twin · public notes only
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={voice.toggleMute}
            aria-label={voice.muted ? "Unmute iNoah's voice" : "Mute iNoah's voice"}
            aria-pressed={!voice.muted}
            className="inoah-icon-btn"
          >
            {voice.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => void copyTranscript()}
            disabled={isEmpty}
            aria-label="Copy transcript"
            className="inoah-icon-btn disabled:opacity-40 disabled:pointer-events-none"
          >
            {copied ? <Check className="h-4 w-4 text-[var(--in-success)]" /> : <Copy className="h-4 w-4" />}
          </button>
          {onClose && (
            <button type="button" onClick={onClose} aria-label="Close iNoah" className="inoah-icon-btn">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      {/* Disclosure: pinned, present before the first turn, never dismissible. */}
      <div
        role="note"
        aria-label="AI disclosure"
        className="flex items-start gap-2.5 border-b border-[var(--in-accent)]/15 bg-[var(--in-accent)]/[0.06] px-4 py-2.5"
      >
        <span
          aria-hidden="true"
          className="mt-px flex-none rounded-[4px] border border-[var(--in-accent)]/40 px-1 py-px font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-[var(--in-accent)]"
        >
          AI
        </span>
        <p className="text-xs leading-relaxed text-[var(--in-text)]/80">{DISCLOSURE_LINE}</p>
      </div>

      {/* Transcript */}
      <div
        ref={logRef}
        data-lenis-prevent
        role="log"
        aria-live="polite"
        aria-label="Conversation with iNoah"
        className="inoah-glow flex-1 overflow-y-auto overscroll-contain px-4 py-4"
      >
        {isEmpty ? (
          // min-h-full, not h-full: when the panel is short the content grows
          // past it and scrolls instead of clipping the orb off the top.
          <div className="flex min-h-full flex-col items-center justify-center gap-6 px-2 py-4 text-center">
            <div className="inoah-orb" aria-hidden="true" />
            <div className="space-y-1.5">
              <p className="text-lg font-semibold tracking-tight">Ask me anything on file.</p>
              <p className="mx-auto max-w-[280px] text-[13px] leading-relaxed text-[var(--in-muted)]">
                Answers come from Noah's public notes, in his voice, read aloud.
              </p>
            </div>
            <div className="w-full max-w-sm">
              <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                {chips.length > 0
                  ? chips.map((c, i) => chipButton(c, `chip-${c}`, i * 50))
                  : Array.from({ length: CHIPS_SHOWN }, (_, i) => (
                      // Same footprint as a real chip, so the grid does not
                      // shift when the pool arrives.
                      <div
                        key={`chip-skeleton-${i}`}
                        aria-hidden="true"
                        className="min-h-[52px] animate-pulse rounded-[12px] border border-white/5 bg-[var(--in-surface)]/60 motion-reduce:animate-none"
                        style={{ animationDelay: `${i * 120}ms` }}
                      />
                    ))}
              </div>
              {pool.length > CHIPS_SHOWN && (
                <button
                  type="button"
                  onClick={rotateChips}
                  className={cn(
                    "mx-auto mt-3 flex items-center gap-1.5 rounded-[8px] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--in-muted)]",
                    "transition-colors [transition-duration:180ms] hover:text-[var(--in-text)]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--in-accent)]",
                  )}
                >
                  <RefreshCw className="h-3 w-3" aria-hidden="true" />
                  More questions
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex justify-end">
                  <p className="max-w-[85%] whitespace-pre-wrap rounded-[12px] rounded-br-[4px] bg-[var(--in-surface-2)] px-4 py-2.5 text-[14px] leading-relaxed">
                    {m.content}
                  </p>
                </div>
              ) : (
                <div key={m.id} className="max-w-[94%]">
                  <p className="mb-1 font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--in-accent)]/80">
                    iNoah
                  </p>
                  {m.status === "streaming" ? (
                    <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-[var(--in-text)]/90">
                      {m.content}
                      <span className="inoah-caret" aria-hidden="true" />
                    </p>
                  ) : (
                    <Suspense
                      fallback={
                        <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-[var(--in-text)]/90">
                          {m.content}
                        </p>
                      }
                    >
                      <MarkdownRenderer
                        content={m.content}
                        className="prose-sm text-[14px] leading-relaxed [&_p]:text-[var(--in-text)]/90 [&_a]:text-[var(--in-accent)] [&_strong]:text-[var(--in-text)]"
                      />
                    </Suspense>
                  )}
                  {m.declined && m.suggestions && m.suggestions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {m.suggestions.map((s) => chipButton(s, `${m.id}-${s}`))}
                    </div>
                  )}
                </div>
              ),
            )}
            {sending && messages[messages.length - 1]?.content === "" && (
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--in-muted)]">
                <span className="inline-block animate-pulse motion-reduce:animate-none">Reading the notes</span>
              </p>
            )}
            {error && (
              <p className="text-[13px] text-[var(--in-danger)]">
                {error}{" "}
                <button
                  type="button"
                  onClick={() => lastPromptRef.current && void send(lastPromptRef.current)}
                  className="underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--in-accent)]"
                >
                  Retry
                </button>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Voice bar: only while speaking. */}
      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] [transition-duration:180ms] ease-out motion-reduce:transition-none",
          voice.speaking ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
        aria-hidden={!voice.speaking}
      >
        <div className="overflow-hidden">
          <div className="flex items-center gap-3 border-t border-white/10 bg-[var(--in-surface)] px-4 py-2">
            <div className="h-6 flex-1" role="img" aria-label="iNoah is speaking">
              <Waveform active={voice.speaking} getLevel={voice.getLevel} />
            </div>
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--in-muted)]">
              Speaking
            </span>
            <button
              type="button"
              onClick={voice.cancel}
              aria-label="Stop speaking"
              className="inoah-icon-btn h-7 w-7"
              tabIndex={voice.speaking ? 0 : -1}
            >
              <Square className="h-3 w-3 fill-current" />
            </button>
          </div>
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-white/10 bg-[var(--in-surface)] p-3">
        <div
          className={cn(
            "flex items-end gap-2 rounded-[12px] border border-white/10 bg-[var(--in-bg)] px-3 py-2",
            "transition-colors [transition-duration:180ms] focus-within:border-[var(--in-accent)]/60 motion-reduce:transition-none",
          )}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={ready ? "Ask iNoah" : "One moment"}
            disabled={!ready}
            aria-label="Ask iNoah a question"
            className="flex-1 resize-none bg-transparent py-1 leading-relaxed outline-none placeholder:text-[var(--in-muted)] disabled:opacity-60"
            /* 16px keeps iOS from zooming the viewport on focus */
            style={{ fontSize: "16px" }}
          />
          <button
            type="button"
            onClick={() => void send(input)}
            disabled={sending || !ready || !input.trim()}
            aria-label="Send question"
            className={cn(
              "flex h-8 w-8 flex-none items-center justify-center rounded-full",
              "bg-[var(--in-accent)] text-[#08121C] transition-[opacity,transform] [transition-duration:180ms] ease-out",
              "hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--in-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--in-surface)]",
              "disabled:opacity-30 disabled:pointer-events-none motion-reduce:transition-none",
            )}
          >
            <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between px-1">
          <a
            href="mailto:noah@noahiberman.com"
            className={cn(
              "font-mono text-[10px] tracking-wide text-[var(--in-muted)] underline-offset-2",
              "transition-colors [transition-duration:180ms] hover:text-[var(--in-accent)] hover:underline",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--in-accent)] rounded-[4px]",
            )}
          >
            Ask Noah directly
          </a>
          <span className="hidden font-mono text-[10px] text-[var(--in-muted)]/60 sm:inline" aria-hidden="true">
            Enter to send
          </span>
        </div>
      </div>
    </div>
  );
}
