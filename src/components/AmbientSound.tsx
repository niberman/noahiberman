import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";

export function AmbientSound() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setIsMounted(true);
    // Note: In a real implementation, you would load an actual audio file
    // For now, this is a placeholder that demonstrates the UI
  }, []);

  const toggleSound = () => {
    if (!audioRef.current) return;
    
    // Check if audio source is configured
    if (!audioRef.current.src || audioRef.current.src === window.location.href) {
      console.warn("Audio source not configured. Please set the src attribute to an audio file.");
      return;
    }
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => {
        console.log("Audio playback failed:", err);
        setIsPlaying(false);
      });
    }
    setIsPlaying(!isPlaying);
  };

  if (!isMounted) return null;

  return (
    <div className="fixed bottom-8 left-8 z-50">
      <Button
        variant="outline"
        size="icon"
        onClick={toggleSound}
        className="rounded-full bg-card/80 backdrop-blur-lg border-border hover:bg-card shadow-elegant"
        aria-label="Toggle ambient sound"
        title={isPlaying ? "Mute ambient sound" : "Play ambient sound"}
      >
        {isPlaying ? (
          <Volume2 className="h-5 w-5" />
        ) : (
          <VolumeX className="h-5 w-5" />
        )}
      </Button>
      {/* Placeholder for audio element - in real app, load actual audio file */}
      <audio
        ref={audioRef}
        loop
        preload="none"
        src="" // Would be: "/ambient-sound.mp3" 
      />
    </div>
  );
}
