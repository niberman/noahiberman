import { useState } from "react";
import { Music } from "lucide-react";
import { tilt } from "@/components/editorial/fx";

const RECORDING_SRC = "/audio/carillon.mp3";

/**
 * Carillon recording slot on the Now page. Drop the audio file at
 * /public/audio/carillon.mp3 and the player appears; until then the card
 * renders a quiet placeholder instead of a dead control.
 */
export function CarillonEmbed() {
  const [available, setAvailable] = useState(false);

  return (
    <div
      {...tilt(2)}
      className="flex flex-wrap items-center justify-between gap-6 rounded-3xl border border-white/[.1] p-[clamp(24px,3vw,40px)] backdrop-blur-[8px] [background:radial-gradient(500px_circle_at_var(--mx,20%)_var(--my,50%),rgba(128,51,204,.16),transparent_60%)]"
    >
      <div className="flex items-center gap-5">
        <Music className="h-7 w-7 shrink-0 text-ed-light" />
        <div>
          <h3 className="mb-1.5 font-editorial font-normal text-[clamp(26px,2.4vw,34px)] leading-none tracking-[-.02em]">
            Carillon
          </h3>
          <p className="text-[15px] font-light leading-[1.6] text-ed-body">
            Played the DU carillon at hockey games and recitals.
          </p>
        </div>
      </div>
      <audio
        src={RECORDING_SRC}
        onCanPlay={() => setAvailable(true)}
        className="hidden"
        preload="metadata"
      />
      {available ? (
        <audio controls src={RECORDING_SRC} className="w-full max-w-sm">
          Your browser does not support the audio element.
        </audio>
      ) : (
        <span className="font-editorial italic text-xl text-ed-muted">Recording coming soon.</span>
      )}
    </div>
  );
}
