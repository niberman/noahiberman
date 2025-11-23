import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

export const useSecretDashboardAccess = () => {
  const navigate = useNavigate();
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tapCountRef = useRef(0);
  const tapTimestampsRef = useRef<number[]>([]);

  useEffect(() => {
    // === KEYBOARD SHORTCUT: Shift + D ===
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === "D") {
        e.preventDefault();
        navigate("/dashboard");
      }
    };

    // === HIDDEN CLICK ZONE: 5 clicks within 3 seconds ===
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Check if the click is on the secret zone (by checking for a data attribute we'll add)
      if (target.hasAttribute("data-secret-zone")) {
        clickCountRef.current += 1;

        // Clear existing timer
        if (clickTimerRef.current) {
          clearTimeout(clickTimerRef.current);
        }

        // If 5 clicks reached, navigate
        if (clickCountRef.current >= 5) {
          navigate("/dashboard");
          clickCountRef.current = 0;
          return;
        }

        // Reset counter after 3 seconds
        clickTimerRef.current = setTimeout(() => {
          clickCountRef.current = 0;
        }, 3000);
      }
    };

    // === MOBILE TRIPLE-TAP: Top-left corner (100x100px) ===
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      
      // Check if tap is in top-left corner (100x100px)
      if (touch.clientX <= 100 && touch.clientY <= 100) {
        const now = Date.now();
        tapTimestampsRef.current.push(now);

        // Keep only taps from the last 1 second
        tapTimestampsRef.current = tapTimestampsRef.current.filter(
          (timestamp) => now - timestamp < 1000
        );

        // If 3 taps detected within 1 second, navigate
        if (tapTimestampsRef.current.length >= 3) {
          e.preventDefault();
          navigate("/dashboard");
          tapTimestampsRef.current = [];
        }
      }
    };

    // Attach listeners
    document.addEventListener("keydown", handleKeyPress);
    document.addEventListener("click", handleClick);
    document.addEventListener("touchstart", handleTouchStart);

    // Cleanup
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
      document.removeEventListener("click", handleClick);
      document.removeEventListener("touchstart", handleTouchStart);
      
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
      }
    };
  }, [navigate]);

  return null;
};

