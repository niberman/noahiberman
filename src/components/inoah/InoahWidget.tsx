// Site-wide iNoah entry point: a small launcher pill that opens the
// conversation surface as a right side panel on desktop and a full-screen
// sheet on mobile. The surface is lazy so pages never pay for the chat,
// markdown, and voice code until someone opens it.
import { lazy, Suspense, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import * as Dialog from "@radix-ui/react-dialog";
import { useLenis } from "lenis/react";
import { cn } from "@/lib/utils";
import { getLenis } from "@/lib/lenis-ref";
import { inoahLauncherHidden } from "@/lib/inoah-launcher";
import { useMapExploring } from "@/hooks/use-active-waypoint";

const InoahSurface = lazy(() => import("./InoahSurface"));

// The launcher rides along on every route except the ones listed in
// lib/inoah-launcher (the /inoah page and the app-shell routes).

/** Scroll depth (px) past which the phone launcher folds down to its glyph. */
const COMPACT_AFTER = 160;

/**
 * Where the phone sheet should sit while the on-screen keyboard is up.
 *
 * iOS does not shrink the layout viewport for the keyboard. A fixed inset-0
 * sheet keeps its full height, the keyboard covers its lower half, and Safari
 * pans the whole sheet upward to show the focused field, which pushes the
 * header and its close button off the top of the screen. The visual viewport
 * does report the space that is left, so while something covers a real slice
 * of the screen the sheet is pinned to that box instead. Returns null when
 * nothing needs overriding (keyboard down, desktop, pinch-zoom, or a browser
 * that already resizes the layout viewport itself).
 */
function useKeyboardBox(open: boolean) {
  const [box, setBox] = useState<{ top: number; height: number } | null>(null);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!open || !vv) return;
    const phone = window.matchMedia("(max-width: 639px)");
    // Applied straight from the viewport events, which already fire at most
    // once per frame. Unchanged values bail out of the state update.
    const apply = () => {
      const layoutHeight = Math.max(window.innerHeight, document.documentElement.clientHeight);
      const covered = layoutHeight - vv.height;
      const next =
        phone.matches && covered > 120 && Math.abs(vv.scale - 1) < 0.01
          ? { top: Math.round(vv.offsetTop), height: Math.round(vv.height) }
          : null;
      setBox((prev) =>
        prev?.top === next?.top && prev?.height === next?.height ? prev : next,
      );
    };
    vv.addEventListener("resize", apply);
    vv.addEventListener("scroll", apply);
    apply();
    return () => {
      vv.removeEventListener("resize", apply);
      vv.removeEventListener("scroll", apply);
      setBox(null);
    };
  }, [open]);

  return box;
}

function LauncherGlyph() {
  return (
    <span className="flex h-3.5 items-end gap-[2px]" aria-hidden="true">
      <span className="inoah-launcher-bar w-[2.5px] rounded-full bg-current" style={{ height: "55%", animationDelay: "0ms" }} />
      <span className="inoah-launcher-bar w-[2.5px] rounded-full bg-current" style={{ height: "100%", animationDelay: "160ms" }} />
      <span className="inoah-launcher-bar w-[2.5px] rounded-full bg-current" style={{ height: "70%", animationDelay: "320ms" }} />
      <span className="inoah-launcher-bar w-[2.5px] rounded-full bg-current" style={{ height: "40%", animationDelay: "480ms" }} />
    </span>
  );
}

export function InoahWidget() {
  const [open, setOpen] = useState(false);
  const keyboardBox = useKeyboardBox(open);
  const { pathname } = useLocation();
  // The pill steps aside while the visitor is panning the flight map.
  const exploring = useMapExploring();
  // Phones only (the classes below are max-sm, or touch plus short:, which
  // is a phone in landscape): the full "Ask iNoah" pill at
  // the top of a page, folding to the glyph once the visitor is reading, so
  // it stops covering a third of the last line on screen. setState bails
  // when the value is unchanged, so the per-frame Lenis callback is free.
  const [compact, setCompact] = useState(false);
  useLenis((lenis) => setCompact(lenis.scroll > COMPACT_AFTER));
  useEffect(() => {
    setCompact((getLenis()?.scroll ?? window.scrollY) > COMPACT_AFTER);
  }, [pathname]);

  if (inoahLauncherHidden(pathname)) return null;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label="Open iNoah, Noah's AI assistant"
          aria-hidden={exploring || undefined}
          tabIndex={exploring ? -1 : undefined}
          className={cn(
            "inoah-surface fixed bottom-[max(env(safe-area-inset-bottom),1.25rem)] right-[calc(1.25rem+env(safe-area-inset-right))] z-40 flex h-12 items-center gap-2.5 rounded-full",
            "border border-[rgba(180,140,240,.3)] bg-[rgba(10,6,18,.92)] px-4 text-ed-ink shadow-[0_8px_32px_-8px_rgba(128,51,204,.5)] backdrop-blur",
            "transition-[transform,box-shadow,border-color,opacity] [transition-duration:180ms] ease-out",
            "hover:-translate-y-0.5 hover:border-[rgba(180,140,240,.6)] hover:shadow-[0_12px_40px_-8px_rgba(128,51,204,.65)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ed-light focus-visible:ring-offset-2 focus-visible:ring-offset-black",
            "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
            exploring && "pointer-events-none translate-y-3 opacity-0",
          )}
        >
          <span className="text-ed-light">
            <LauncherGlyph />
          </span>
          <span
            className={cn(
              "overflow-hidden whitespace-nowrap text-[13px] font-medium tracking-[.02em]",
              "max-w-[6rem] transition-[max-width,opacity,margin] duration-300 ease-out motion-reduce:transition-none",
              // -ml cancels the flex gap so the folded pill is a true circle.
              compact && "max-sm:-ml-2.5 max-sm:max-w-0 max-sm:opacity-0",
              // A phone in landscape is wider than sm but only ~340px tall,
              // where the full pill sits on top of the map cards.
              compact &&
                "[@media(pointer:coarse)]:short:-ml-2.5 [@media(pointer:coarse)]:short:max-w-0 [@media(pointer:coarse)]:short:opacity-0",
            )}
          >
            Ask iNoah
          </span>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            "fixed inset-0 z-[150] bg-black/60 backdrop-blur-[2px]",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:[animation-duration:180ms]",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:[animation-duration:180ms]",
            "motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none",
          )}
        />
        <Dialog.Content
          data-lenis-prevent
          onOpenAutoFocus={(e) => {
            const content = e.currentTarget as HTMLElement | null;
            // On a touch screen, focusing the composer raises the keyboard
            // over the starter questions before anyone has read them. Focus
            // the sheet itself and let the first tap decide.
            if (window.matchMedia("(pointer: coarse)").matches) {
              e.preventDefault();
              content?.focus({ preventScroll: true });
              return;
            }
            // Land focus on the composer, not the first header button.
            const textarea = content?.querySelector("textarea");
            if (textarea instanceof HTMLTextAreaElement) {
              e.preventDefault();
              textarea.focus();
            }
          }}
          style={keyboardBox ? { top: keyboardBox.top, bottom: "auto", height: keyboardBox.height } : undefined}
          className={cn(
            "fixed inset-0 z-[160] flex flex-col outline-none",
            "sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[420px] sm:border-l sm:border-white/10 sm:shadow-2xl",
            "data-[state=open]:animate-in data-[state=open]:[animation-duration:400ms] data-[state=open]:ease-out",
            "data-[state=closed]:animate-out data-[state=closed]:[animation-duration:180ms]",
            "data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
            "sm:data-[state=open]:slide-in-from-right sm:data-[state=closed]:slide-out-to-right",
            "motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none",
          )}
        >
          <Dialog.Title className="sr-only">iNoah, Noah's AI assistant</Dialog.Title>
          <Dialog.Description className="sr-only">
            An AI built by Noah. It answers from his public notes.
          </Dialog.Description>
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center bg-[#06030c]">
                <span className="text-[10px] uppercase tracking-[0.26em] text-ed-muted animate-pulse motion-reduce:animate-none">
                  Waking iNoah
                </span>
              </div>
            }
          >
            <InoahSurface variant="panel" onClose={() => setOpen(false)} />
          </Suspense>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
