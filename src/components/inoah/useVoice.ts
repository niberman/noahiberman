// Voice for iNoah replies. ElevenLabs through the inoah-tts function when the
// server has a key, otherwise the browser's SpeechSynthesis API. The engine is
// probed once per page and cached; a mid-session ElevenLabs failure downgrades
// to the browser engine instead of silencing the reply.
//
// Replies stream, so speech is fed deltas and cut into sentence-sized
// segments: the first segment is spoken while the rest of the reply is still
// arriving, which is what keeps audio inside the 700ms budget.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase";

type Engine = "elevenlabs" | "browser";

const MUTE_KEY = "inoah.muted";

const FUNCTIONS_BASE = () =>
  import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || supabaseUrl;

// One probe per page load, shared across mounts.
let enginePromise: Promise<Engine> | null = null;
function probeEngine(): Promise<Engine> {
  if (!enginePromise) {
    enginePromise = fetch(`${FUNCTIONS_BASE()}/functions/v1/inoah-tts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ probe: true }),
    })
      .then((r) => r.json())
      .then((d) => (d?.engine === "elevenlabs" ? "elevenlabs" : "browser"))
      .catch(() => "browser" as Engine);
  }
  return enginePromise;
}

/** Split point for the next speakable segment, or -1 if none yet. */
function segmentBreak(buffer: string): number {
  for (let i = 0; i < buffer.length; i++) {
    const ch = buffer[i];
    if ((ch === "." || ch === "?" || ch === "\n") && i >= 20) return i + 1;
    // Noah chains clauses with commas, so long comma runs still get cut
    // early enough for the first audio to start on time.
    if (ch === "," && i >= 90) return i + 1;
  }
  return -1;
}

/** Markdown and mechanical text read badly; strip to speakable prose. */
function speakable(text: string): string {
  return text
    .replace(/`{1,3}[^`]*`{1,3}/g, "")
    .replace(/[*_#>]/g, "")
    .replace(/\bnoah@noahiberman\.com\b/gi, "noah at noahiberman dot com")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export interface Voice {
  muted: boolean;
  toggleMute: () => void;
  speaking: boolean;
  engine: Engine | null;
  /** Feed streamed reply text; segments are spoken as they complete. */
  feed: (delta: string) => void;
  /** The reply is finished; speak whatever is left in the buffer. */
  end: () => void;
  /** Speak one standalone line immediately (the disclosure). */
  speakNow: (text: string) => void;
  cancel: () => void;
  /** 0..1 realtime output level when the engine exposes one, else null. */
  getLevel: (() => number) | null;
}

export function useVoice(): Voice {
  const [muted, setMuted] = useState(() => {
    try {
      return localStorage.getItem(MUTE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [speaking, setSpeaking] = useState(false);
  const [engine, setEngine] = useState<Engine | null>(null);

  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const engineRef = useRef<Engine | null>(null);
  const bufferRef = useRef("");
  const pendingUtterances = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const levelDataRef = useRef<Uint8Array | null>(null);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const playheadRef = useRef(0);
  const generationRef = useRef(0);

  useEffect(() => {
    probeEngine().then((e) => {
      engineRef.current = e;
      setEngine(e);
    });
  }, []);

  const refreshSpeaking = useCallback(() => {
    setSpeaking(pendingUtterances.current > 0 || activeSourcesRef.current.size > 0);
  }, []);

  const ensureAudioGraph = useCallback(() => {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new Ctx();
      const analyser = audioCtxRef.current.createAnalyser();
      analyser.fftSize = 64;
      analyser.connect(audioCtxRef.current.destination);
      analyserRef.current = analyser;
      levelDataRef.current = new Uint8Array(analyser.frequencyBinCount);
    }
    if (audioCtxRef.current.state === "suspended") {
      void audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const speakWithBrowser = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;
    const utter = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find((v) => v.lang.startsWith("en") && /Google US English|Samantha|Alex|Daniel/i.test(v.name)) ??
      voices.find((v) => v.lang.startsWith("en-US")) ??
      voices.find((v) => v.lang.startsWith("en"));
    if (preferred) utter.voice = preferred;
    utter.rate = 1.02;
    utter.pitch = 0.95;
    pendingUtterances.current += 1;
    refreshSpeaking();
    let settled = false;
    let started = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      pendingUtterances.current = Math.max(0, pendingUtterances.current - 1);
      refreshSpeaking();
    };
    utter.onstart = () => {
      started = true;
    };
    utter.onend = settle;
    utter.onerror = settle;
    // A synthesis engine with no working voices never fires any event; do not
    // leave the speaking indicator stuck on for a voice that will never come.
    window.setTimeout(() => {
      if (!started) settle();
    }, 4000);
    window.speechSynthesis.speak(utter);
  }, [refreshSpeaking]);

  const speakWithElevenLabs = useCallback(async (text: string) => {
    const generation = generationRef.current;
    try {
      const res = await fetch(`${FUNCTIONS_BASE()}/functions/v1/inoah-tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        // Key removed or quota gone mid-session: downgrade for good.
        engineRef.current = "browser";
        setEngine("browser");
        if (!mutedRef.current && generation === generationRef.current) speakWithBrowser(text);
        return;
      }
      const bytes = await res.arrayBuffer();
      if (mutedRef.current || generation !== generationRef.current) return;
      const ctx = ensureAudioGraph();
      const audio = await ctx.decodeAudioData(bytes);
      if (mutedRef.current || generation !== generationRef.current) return;
      const source = ctx.createBufferSource();
      source.buffer = audio;
      source.connect(analyserRef.current!);
      const startAt = Math.max(ctx.currentTime, playheadRef.current);
      playheadRef.current = startAt + audio.duration;
      activeSourcesRef.current.add(source);
      refreshSpeaking();
      source.onended = () => {
        activeSourcesRef.current.delete(source);
        refreshSpeaking();
      };
      source.start(startAt);
    } catch {
      // Decode or network failure on one segment: drop it, keep the reply.
    }
  }, [ensureAudioGraph, refreshSpeaking, speakWithBrowser]);

  const speakSegment = useCallback((raw: string) => {
    if (mutedRef.current) return;
    const text = speakable(raw);
    if (!text) return;
    if (engineRef.current === "elevenlabs") void speakWithElevenLabs(text);
    else speakWithBrowser(text);
  }, [speakWithBrowser, speakWithElevenLabs]);

  const feed = useCallback((delta: string) => {
    if (mutedRef.current) return;
    bufferRef.current += delta;
    let cut = segmentBreak(bufferRef.current);
    while (cut !== -1) {
      const segment = bufferRef.current.slice(0, cut);
      bufferRef.current = bufferRef.current.slice(cut);
      speakSegment(segment);
      cut = segmentBreak(bufferRef.current);
    }
  }, [speakSegment]);

  const end = useCallback(() => {
    const rest = bufferRef.current;
    bufferRef.current = "";
    if (rest.trim()) speakSegment(rest);
  }, [speakSegment]);

  const cancel = useCallback(() => {
    generationRef.current += 1;
    bufferRef.current = "";
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    pendingUtterances.current = 0;
    for (const source of activeSourcesRef.current) {
      try {
        source.stop();
      } catch {
        // already stopped
      }
    }
    activeSourcesRef.current.clear();
    playheadRef.current = 0;
    refreshSpeaking();
  }, [refreshSpeaking]);

  const speakNow = useCallback((text: string) => {
    if (mutedRef.current) return;
    speakSegment(text);
  }, [speakSegment]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(MUTE_KEY, next ? "1" : "0");
      } catch {
        // private mode; the toggle still works for the session
      }
      if (next) cancel();
      return next;
    });
  }, [cancel]);

  // Chrome loads voices asynchronously; touching the list here warms it so the
  // first reply does not speak with the wrong default voice.
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const warm = () => window.speechSynthesis.getVoices();
    warm();
    window.speechSynthesis.addEventListener("voiceschanged", warm);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", warm);
  }, []);

  useEffect(() => cancel, [cancel]);

  const getLevel = useMemo(() => {
    if (engine !== "elevenlabs") return null;
    return () => {
      const analyser = analyserRef.current;
      const data = levelDataRef.current;
      if (!analyser || !data) return 0;
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      return sum / (data.length * 255);
    };
  }, [engine]);

  return { muted, toggleMute, speaking, engine, feed, end, speakNow, cancel, getLevel };
}
