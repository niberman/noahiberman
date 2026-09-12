// Site-wide iNoah entry point: a small launcher pill that opens the
// conversation surface as a right side panel on desktop and a full-screen
// sheet on mobile. The surface is lazy so pages never pay for the chat,
// markdown, and voice code until someone opens it.
import { lazy, Suspense, useState } from "react";
import { useLocation } from "react-router-dom";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

const InoahSurface = lazy(() => import("./InoahSurface"));

// The page has its own inline surface, and app-shell routes have their own
// focus; everywhere else the launcher rides along.
const HIDDEN_PREFIXES = ["/inoah", "/dashboard", "/login", "/logo", "/openclaw"];

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
  const { pathname } = useLocation();

  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label="Open iNoah, Noah's AI assistant"
          className={cn(
            "inoah-surface fixed bottom-5 right-5 z-40 flex h-12 items-center gap-2.5 rounded-full",
            "border border-[#4FB3FF]/25 bg-[#131A22]/95 px-4 text-[#E6EDF3] shadow-[0_8px_32px_-8px_rgba(79,179,255,0.45)] backdrop-blur",
            "transition-[transform,box-shadow,border-color] [transition-duration:180ms] ease-out",
            "hover:-translate-y-0.5 hover:border-[#4FB3FF]/60 hover:shadow-[0_12px_40px_-8px_rgba(79,179,255,0.6)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4FB3FF] focus-visible:ring-offset-2 focus-visible:ring-offset-black",
            "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
          )}
        >
          <span className="text-[#4FB3FF]">
            <LauncherGlyph />
          </span>
          <span className="text-[13px] font-medium tracking-tight">Ask iNoah</span>
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
            // Land focus on the composer, not the first header button.
            const textarea = (e.currentTarget as HTMLElement | null)?.querySelector("textarea");
            if (textarea instanceof HTMLTextAreaElement) {
              e.preventDefault();
              textarea.focus();
            }
          }}
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
              <div className="flex h-full items-center justify-center bg-[#0B0F14]">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8B98A5] animate-pulse motion-reduce:animate-none">
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
