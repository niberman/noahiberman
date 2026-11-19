import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { markSecretAccessGranted } from "@/lib/secretAccess";

/** Side of the square top-left hot zone, in CSS pixels. */
const ZONE = 96;

const inZone = (x: number, y: number) => x <= ZONE && y <= ZONE;

/** True when the event comes from somewhere the visitor is typing. */
const isTyping = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
};

export const useSecretDashboardAccess = () => {
  const navigate = useNavigate();
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapTimestampsRef = useRef<number[]>([]);

  useEffect(() => {
    const open = () => {
      markSecretAccessGranted();
      navigate("/dashboard");
    };

    // === KEYBOARD SHORTCUT: Shift + D ===
    // Never while typing: a capital D in the contact form, the booking form or
    // the iNoah composer used to throw the visitor onto the login page and
    // lose what they had written.
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!e.shiftKey || e.key !== "D") return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
      if (isTyping(e.target)) return;
      e.preventDefault();
      open();
    };

    // === HIDDEN CLICK ZONE: 5 clicks within 3 seconds ===
    // Matched by pointer position, not by an overlay element, so whatever
    // sits in the corner (the nav logo, the map's Exit button) keeps working.
    // `detail` is 0 for keyboard and scripted clicks, which never count.
    const handleClick = (e: MouseEvent) => {
      if (e.detail === 0 || !inZone(e.clientX, e.clientY)) return;

      clickCountRef.current += 1;
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);

      if (clickCountRef.current >= 5) {
        clickCountRef.current = 0;
        open();
        return;
      }

      clickTimerRef.current = setTimeout(() => {
        clickCountRef.current = 0;
      }, 3000);
    };

    // === MOBILE TRIPLE-TAP: top-left corner within one second ===
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch || !inZone(touch.clientX, touch.clientY)) return;

      const now = Date.now();
      tapTimestampsRef.current = [...tapTimestampsRef.current, now].filter(
        (timestamp) => now - timestamp < 1000
      );

      if (tapTimestampsRef.current.length >= 3) {
        tapTimestampsRef.current = [];
        open();
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    document.addEventListener("click", handleClick);
    document.addEventListener("touchstart", handleTouchStart, { passive: true });

    return () => {
      document.removeEventListener("keydown", handleKeyPress);
      document.removeEventListener("click", handleClick);
      document.removeEventListener("touchstart", handleTouchStart);
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    };
  }, [navigate]);

  return null;
};
