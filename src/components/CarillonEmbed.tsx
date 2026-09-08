import { useState } from "react";
import { Music } from "lucide-react";

const RECORDING_SRC = "/audio/carillon.mp3";

/**
 * Carillon recording slot. Drop the audio file at /public/audio/carillon.mp3
 * and the player appears; until then the card renders a quiet placeholder
 * instead of a dead control.
 */
export function CarillonEmbed() {
  const [available, setAvailable] = useState(false);

  return (
    <div className="rounded-xl border border-border/50 bg-card/50 p-5 sm:p-6 shadow-elegant">
      <div className="flex items-center gap-2 mb-2">
        <Music className="h-4 w-4 text-secondary" />
        <h3 className="font-semibold text-primary-foreground">Carillon</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        Played the DU carillon at hockey games and recitals, including a guest
        concert and a final concert in my last spring on campus.
      </p>
      <audio
        src={RECORDING_SRC}
        onCanPlay={() => setAvailable(true)}
        className="hidden"
        preload="metadata"
      />
      {available ? (
        <audio controls src={RECORDING_SRC} className="w-full">
          Your browser does not support the audio element.
        </audio>
      ) : (
        <p className="text-xs text-muted-foreground/70 italic">
          Recording coming soon.
        </p>
      )}
    </div>
  );
}
