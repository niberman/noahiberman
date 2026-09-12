// The voice indicator: a row of bars that move while iNoah is speaking.
// ElevenLabs playback drives it with real output levels through an analyser;
// SpeechSynthesis exposes no audio data, so the bars move on a smoothed
// pseudo-random walk instead, which reads as voice without claiming to be a
// spectrogram. Reduced motion gets a static, mid-height set of bars.
import { useEffect, useRef } from "react";

const BAR_COUNT = 22;

interface WaveformProps {
  active: boolean;
  getLevel: (() => number) | null;
  className?: string;
}

export function Waveform({ active, getLevel, className }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phasesRef = useRef<number[]>(
    Array.from({ length: BAR_COUNT }, (_, i) => i * 0.7),
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.clientWidth;
    const cssHeight = canvas.clientHeight;
    canvas.width = cssWidth * dpr;
    canvas.height = cssHeight * dpr;
    ctx.scale(dpr, dpr);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const barWidth = 3;
    const gap = (cssWidth - BAR_COUNT * barWidth) / (BAR_COUNT - 1);
    let raf = 0;
    let running = true;

    const draw = (t: number) => {
      if (!running) return;
      ctx.clearRect(0, 0, cssWidth, cssHeight);
      const level = active ? (getLevel ? Math.min(1, getLevel() * 2.2) : 0.55) : 0;
      for (let i = 0; i < BAR_COUNT; i++) {
        let h: number;
        if (!active) {
          h = 0.16;
        } else if (reduced) {
          h = 0.45;
        } else if (getLevel) {
          const wobble = 0.6 + 0.4 * Math.sin(t / 90 + phasesRef.current[i] * 2.1);
          h = 0.12 + level * wobble;
        } else {
          const wobble =
            0.5 +
            0.5 * Math.sin(t / 140 + phasesRef.current[i] * 1.9) *
              Math.sin(t / 310 + phasesRef.current[i]);
          h = 0.14 + 0.62 * Math.abs(wobble);
        }
        const barHeight = Math.max(2, h * cssHeight);
        const x = i * (barWidth + gap);
        const y = (cssHeight - barHeight) / 2;
        ctx.fillStyle = active ? "#4FB3FF" : "rgba(139, 152, 165, 0.5)";
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 1.5);
        ctx.fill();
      }
      if (active && !reduced) raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, [active, getLevel]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
      style={{ width: "100%", height: "100%" }}
    />
  );
}
