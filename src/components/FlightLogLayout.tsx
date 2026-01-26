import { motion, useMotionValue, animate } from "framer-motion";
import React, { useEffect, useMemo, useRef, useState } from "react";

type FlightLogLayoutProps = {
  mapComponent: React.ReactNode;
  chatComponent: React.ReactNode;
  children: React.ReactNode;
};

const MOBILE_GUTTER_PX = 12;

function useMeasuredHeight<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      setHeight(el.getBoundingClientRect().height);
    });
    ro.observe(el);
    setHeight(el.getBoundingClientRect().height);

    return () => ro.disconnect();
  }, []);

  return { ref, height } as const;
}

export function FlightLogLayout({ mapComponent, chatComponent, children }: FlightLogLayoutProps) {
  const childArray = useMemo(() => React.Children.toArray(children), [children]);
  const hero = childArray[0] ?? null;
  const body = childArray.slice(1);

  // Mobile measurements
  const { ref: chatRef, height: chatHeight } = useMeasuredHeight<HTMLDivElement>();
  const { ref: sheetHeaderRef, height: sheetHeaderHeight } =
    useMeasuredHeight<HTMLDivElement>();
  const [navHeight, setNavHeight] = useState<number>(96);

  const [viewportHeight, setViewportHeight] = useState<number>(
    typeof window === "undefined" ? 0 : window.innerHeight
  );

  useEffect(() => {
    const readNavHeight = () => {
      const raw = getComputedStyle(document.documentElement).getPropertyValue("--app-nav-height").trim();
      const parsed = Number.parseFloat(raw.replace("px", ""));
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 96;
    };

    const updateAll = () => {
      setViewportHeight(window.innerHeight);
      setNavHeight(readNavHeight());
    };

    const onResize = () => updateAll();
    const onNavHeightChange = () => updateAll();

    window.addEventListener("resize", onResize);
    window.addEventListener("app-nav-height-changed", onNavHeightChange as EventListener);
    updateAll();

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("app-nav-height-changed", onNavHeightChange as EventListener);
    };
  }, []);

  const availableHeight = Math.max(0, viewportHeight - navHeight - chatHeight);
  const expandedY = 0;
  const collapsedY = Math.max(
    0,
    availableHeight - Math.max(sheetHeaderHeight, 1) - MOBILE_GUTTER_PX
  );

  const y = useMotionValue(collapsedY);

  // Keep y within constraints if measurements change
  useEffect(() => {
    const current = y.get();
    const next = Math.min(Math.max(current, expandedY), collapsedY);
    if (Number.isFinite(next) && Math.abs(next - current) > 0.5) {
      y.set(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsedY]);

  const snapTo = (target: number) =>
    animate(y, target, { type: "spring", stiffness: 420, damping: 40 });

  return (
    <div className="min-h-screen relative">
      {/* Map background */}
      <div className="fixed inset-0 z-0">{mapComponent}</div>

      {/* Overlay */}
      <div className="relative z-50 pointer-events-none">
        {/* Desktop Glass Sidebar */}
        <aside className="hidden md:flex fixed left-0 top-[var(--app-nav-height)] h-[calc(100vh-var(--app-nav-height))] w-[450px] p-4 lg:p-6 pointer-events-auto">
          <div className="w-full h-full rounded-2xl border border-border/50 bg-card/70 backdrop-blur-xl shadow-elegant flex flex-col overflow-x-hidden">
            {/* Slot A */}
            <div className="shrink-0 border-b border-border/40 px-4 py-4">
              <div className="mx-auto w-full max-w-[380px]">
                {hero}
              </div>
            </div>

            {/* Slot B (scrolls) */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4">
              <div className="mx-auto w-full max-w-[380px]">
                <div className="prose prose-invert max-w-none">
                  <div className="space-y-8">{body}</div>
                </div>
              </div>
            </div>

            {/* Slot C (pinned) */}
            <div className="shrink-0 border-t border-border/40 bg-card/90 backdrop-blur-xl px-4 py-4 shadow-elegant">
              <div className="mx-auto w-full max-w-[380px]">
                {chatComponent}
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile: draggable sheet + fixed chat */}
        <div className="md:hidden">
          {/* Sheet */}
          <motion.div
            className="fixed left-0 right-0 z-[55] pointer-events-auto"
            style={{
              top: navHeight,
              height: availableHeight,
              y,
            }}
            drag="y"
            dragConstraints={{ top: expandedY, bottom: collapsedY }}
            dragElastic={0.06}
            onDragEnd={(_, info) => {
              const current = y.get();
              const velocity = info.velocity.y;
              const midpoint = collapsedY / 2;

              if (velocity > 500) {
                snapTo(collapsedY);
                return;
              }
              if (velocity < -500) {
                snapTo(expandedY);
                return;
              }
              snapTo(current > midpoint ? collapsedY : expandedY);
            }}
          >
            <div className="h-full mx-auto max-w-2xl px-4 pb-4 pt-3">
              <div className="h-full rounded-2xl border border-border/50 bg-card/70 backdrop-blur-xl shadow-elegant overflow-hidden flex flex-col">
                {/* Handle + Hero */}
                <div ref={sheetHeaderRef} className="shrink-0 px-4 pt-3 pb-4 border-b border-border/40">
                  <div className="flex justify-center pb-3">
                    <div className="h-1.5 w-12 rounded-full bg-primary-foreground/20" />
                  </div>
                  {hero}
                </div>

                {/* Scroll body */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4">
                  <div className="prose prose-invert max-w-none">
                    <div className="space-y-8">{body}</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Chat pinned to bottom */}
          <div
            ref={chatRef}
            className="fixed left-0 right-0 bottom-0 z-[60] pointer-events-auto"
          >
            <div className="mx-auto max-w-2xl px-4 pb-4 pt-3">
              <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl shadow-elegant px-4 py-4">
                {chatComponent}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

