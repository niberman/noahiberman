import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Github, Linkedin, Mail } from "lucide-react";
import { NAV_LINKS, useNavLinks, type NavLink } from "@/components/Navigation";
import { inoahLauncherHidden } from "@/lib/inoah-launcher";
import { useIsMobile } from "@/hooks/use-mobile";
import { BrandWordsString } from "@/data/brand";
import { getLenis } from "@/lib/lenis-ref";
import { prefetchRoute } from "@/lib/route-chunks";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { rise, useParallax } from "./fx";

/**
 * The site-wide design system, from the "cinematic editorial" redesign:
 * page background, ambient grain + orbs, and the nav/footer chrome. App.tsx
 * renders EditorialNav/EditorialFooter on every route, so these components
 * are the single nav and footer for the whole site; EditorialPage adds the
 * ambient layer (grain + orbs) for the routes that want it. Values follow
 * design_handoff_work_aviation_now/README.md verbatim.
 */

/** Horizontal page gutter shared by every editorial section. */
export const PAD_X = "px-[clamp(16px,4vw,56px)]";
/**
 * The same gutter for fixed chrome (nav bar, menu overlay). <body> already
 * pads the page by the safe-area insets, so in-flow sections line up with the
 * notch for free. Fixed elements ignore that padding and have to add the
 * inset themselves, or a landscape iPhone puts the logo under the island.
 */
const PAD_X_FIXED =
  "pl-[calc(clamp(16px,4vw,56px)+env(safe-area-inset-left))] pr-[calc(clamp(16px,4vw,56px)+env(safe-area-inset-right))]";
/** Eyebrow / label type. */
export const EYEBROW = "text-xs tracking-[.3em] uppercase text-ed-muted";
/** Section H2 (Aviation, Now): centered display heading, last phrase in <em>. */
export const H2 = "font-editorial font-normal text-[clamp(44px,7vw,110px)] leading-[.92] tracking-[-.035em]";
/** Hero intro paragraph. */
export const INTRO = "text-[clamp(17px,1.4vw,21px)] font-light leading-[1.55] text-ed-body";
/** Running body copy. */
export const BODY = "text-[clamp(16px,1.3vw,19px)] font-light leading-[1.65] text-ed-body";
/** Small serif title for cards and list items. */
export const CARD_TITLE = "font-editorial font-normal text-[clamp(26px,2.4vw,34px)] leading-none tracking-[-.02em]";

export function EditorialPage({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen font-body text-ed-ink antialiased [background:radial-gradient(ellipse_at_50%_0%,#12081f_0%,#040208_55%)]">
      <Ambient />
      <main className="relative z-[1]">{children}</main>
    </div>
  );
}

/** The full ambient layer: film grain (site's .grain-overlay tile) + the two
 *  orbs. App renders it on every route that doesn't mount EditorialPage,
 *  except the homepage, whose flight map owns the backdrop. */
export function Ambient() {
  return (
    <>
      <div aria-hidden className="grain-overlay fixed z-50 pointer-events-none" style={{ opacity: 0.06 }} />
      <AmbientOrbs />
    </>
  );
}

/**
 * Interior page frame: the Now page's top clearance (clears the 76px nav),
 * bottom breathing room, and gutters. `width` narrows the column for reading
 * pages (articles, forms).
 */
export function PageShell({
  width = "max-w-[1200px]",
  className = "",
  children,
  ...rest
}: {
  width?: string;
  className?: string;
  children: ReactNode;
} & Record<string, unknown>) {
  return (
    <main
      className={`relative mx-auto w-full ${width} pt-[clamp(130px,18vh,190px)] pb-[clamp(96px,14vw,180px)] ${PAD_X} ${className}`}
      {...rest}
    >
      {children}
    </main>
  );
}

const TITLE_SIZE = {
  /** Work hero H1. */
  hero: "text-[clamp(64px,13vw,210px)] leading-[.9] tracking-[-.035em]",
  /** Work case-study title; detail pages reuse it so list and page match. */
  item: "max-w-[16ch] text-[clamp(48px,8vw,136px)] leading-[.92] tracking-[-.035em]",
  /** Section H2 scale, for utility pages (booking, sign-in, dashboard). */
  page: "text-[clamp(44px,7vw,110px)] leading-[.92] tracking-[-.035em]",
} as const;

/**
 * Page header in the editorial pattern: eyebrow, serif H1 that rises in,
 * Spanish italic line, light intro. Every interior route opens with this so
 * the type scale and entry motion match Work, Aviation, and Now.
 */
export function PageHeader({
  eyebrow,
  title,
  es,
  intro,
  size = "page",
  align = "left",
  className = "",
  children,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  es?: ReactNode;
  intro?: ReactNode;
  size?: keyof typeof TITLE_SIZE;
  align?: "left" | "center";
  className?: string;
  children?: ReactNode;
}) {
  const center = align === "center";
  return (
    <header className={`mb-[clamp(48px,7vw,96px)] flex flex-col ${center ? "items-center text-center" : "items-start text-left"} ${className}`}>
      {eyebrow && (
        <div className={`ed-rise mb-[clamp(20px,3vw,32px)] ${EYEBROW}`} style={rise(0.05)}>
          {eyebrow}
        </div>
      )}
      <h1
        className={`ed-rise text-balance font-editorial font-normal text-ed-ink ${TITLE_SIZE[size]}`}
        style={rise(0.15, 1.2)}
      >
        {title}
      </h1>
      {es && (
        <p
          className={`ed-rise mt-[clamp(16px,2.5vw,32px)] font-editorial italic leading-[1.05] ${
            size === "hero" ? "text-[clamp(24px,3vw,44px)] text-ed-muted" : "text-[clamp(22px,2.6vw,38px)] text-ed-light"
          }`}
          style={rise(0.4)}
        >
          {es}
        </p>
      )}
      {intro && (
        <div className={`ed-rise mt-[clamp(20px,3vw,36px)] max-w-[600px] ${INTRO}`} style={rise(0.55)}>
          {intro}
        </div>
      )}
      {children && (
        <div className="ed-rise mt-[clamp(24px,3.5vw,44px)]" style={rise(0.7)}>
          {children}
        </div>
      )}
    </header>
  );
}

/** Quiet back link that sits above a PageHeader. */
export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="ed-rise mb-[clamp(28px,4vw,48px)] inline-flex items-center gap-2 text-[13px] font-medium tracking-[.02em] text-ed-muted transition-colors hover:text-ed-ink"
      style={rise(0)}
    >
      <ArrowLeft className="h-4 w-4" />
      {children}
    </Link>
  );
}

/** The two blurred color orbs from the editorial ambient layer. Rendered
 *  globally by App on non-editorial routes so every page shares the same
 *  atmosphere; the homepage skips it (the flight map owns that backdrop). */
export function AmbientOrbs() {
  return (
    <div aria-hidden className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <div className="ed-orb-a absolute left-[10%] top-[-20%] h-[70vw] w-[70vw] rounded-full blur-[60px] [background:radial-gradient(circle,rgba(128,51,204,.28),transparent_60%)]" />
      <div className="ed-orb-b absolute right-[-20%] bottom-[-30%] h-[70vw] w-[70vw] rounded-full blur-[70px] [background:radial-gradient(circle,rgba(70,20,130,.35),transparent_60%)]" />
    </div>
  );
}

/** Same curve the rest of the site's entries use (--ease-out-expo). */
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Warm a page route's chunk on the first sign of intent. */
const warm = (link: NavLink) => () => {
  if (link.type === "page") prefetchRoute(link.path);
};

export function EditorialNav() {
  const { isActive, follow } = useNavLinks();
  const { pathname } = useLocation();
  const isMobile = useIsMobile();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  // Closes on navigation and on breakpoint change.
  useEffect(() => setOpen(false), [pathname, isMobile]);

  // The homepage flight map broadcasts when it takes over the screen; the bar
  // slides away and returns with it (same contract the old global nav had).
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const handler = (event: Event) => {
      const isVisible = (event as CustomEvent<{ visible?: boolean }>).detail?.visible !== false;
      setVisible(isVisible);
      if (!isVisible) setOpen(false);
    };
    window.addEventListener("flightMapNavVisibilityChange", handler);
    return () => window.removeEventListener("flightMapNavVisibilityChange", handler);
  }, []);

  // While the menu is open the page behind it must not move, and Escape
  // closes it. Lenis's stop() also clips the root's overflow (lenis.css), so
  // it freezes wheel and touch scrolling alike.
  useEffect(() => {
    if (!open) return;
    const lenis = getLenis();
    lenis?.stop();
    // The menu is the whole site map: have every page ready before the tap.
    NAV_LINKS.forEach((link) => warm(link)());
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      lenis?.start();
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const closeAndFollow = (e: React.MouseEvent<HTMLAnchorElement>, link: NavLink) => {
    setOpen(false);
    // Release the scroll lock now, not on the next commit: section links
    // (Contact, Follow My Flight) scroll through Lenis inside follow(), and a
    // stopped Lenis ignores scrollTo.
    getLenis()?.start();
    follow(e, link);
  };

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-[100] flex h-[76px] items-center justify-between gap-4 ${PAD_X_FIXED} transition-[transform,opacity] duration-500 ${
        visible ? "" : "-translate-y-full opacity-0 pointer-events-none"
      }`}
      // Tabbing out of the open menu closes it instead of leaving focus on
      // the page hidden underneath.
      onBlur={(e) => {
        if (open && e.relatedTarget instanceof Node && !e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      {/* Backdrop. The design's top-down fade, plus a blur that fades out
          with it: content scrolling under the bar dissolves instead of
          running through the wordmark and links at full sharpness. Lives on
          a child, never on <nav> itself, because a backdrop-filter there
          would turn the nav into the containing block for the fixed menu. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[112px] bg-gradient-to-b from-[rgba(4,2,8,.94)] via-[rgba(4,2,8,.7)] to-[rgba(4,2,8,0)] backdrop-blur-[12px] [mask-image:linear-gradient(to_bottom,#000_50%,transparent)]"
      />

      <a
        href="/"
        onClick={(e) => (open ? closeAndFollow(e, NAV_LINKS[0]) : follow(e, NAV_LINKS[0]))}
        className="flex shrink-0 items-center gap-3 text-ed-ink"
      >
        <img src="/logo.png" alt="Noah Berman logo" width={24} height={24} className="h-6 w-6 object-contain" />
        <span className="font-editorial text-2xl tracking-[-.01em]">Noah Berman</span>
      </a>

      <div className="hidden md:flex flex-wrap items-center justify-end gap-[clamp(14px,2.2vw,30px)] text-[13px] font-medium tracking-[.02em]">
        {NAV_LINKS.map((link) => (
          <a
            key={link.path}
            href={link.path}
            onClick={(e) => follow(e, link)}
            onPointerEnter={warm(link)}
            onFocus={warm(link)}
            aria-current={isActive(link) ? "page" : undefined}
            className={
              isActive(link)
                ? "font-editorial italic text-[17px] text-ed-ink"
                : "whitespace-nowrap text-ed-muted transition-colors hover:text-white"
            }
          >
            {link.label}
          </a>
        ))}
      </div>

      <button
        ref={toggleRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close menu" : "Menu"}
        aria-expanded={open}
        aria-controls="site-menu"
        className="md:hidden py-2 font-editorial italic text-xl text-ed-ink"
      >
        {open ? "Close" : "Menu"}
      </button>

      <AnimatePresence>
        {open && (
          <m.div
            id="site-menu"
            data-lenis-prevent
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.28, ease: EASE }}
            // Covers the whole screen from behind the bar (z below the bar's
            // own content, above its backdrop), so there is no seam where the
            // bar ends. Link size also tracks viewport height so all nine fit
            // on a small phone without scrolling.
            className={`fixed inset-0 z-[-1] flex flex-col gap-1 overflow-y-auto overscroll-contain ${PAD_X_FIXED} pt-[100px] pb-10 short:pt-[84px] short:pb-5 text-center bg-[rgba(4,2,8,.97)] backdrop-blur-[20px] md:hidden`}
          >
            {NAV_LINKS.map((link, i) => (
              <m.a
                key={link.path}
                href={link.path}
                onClick={(e) => closeAndFollow(e, link)}
                aria-current={isActive(link) ? "page" : undefined}
                initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE, delay: reduceMotion ? 0 : 0.04 + i * 0.035 }}
                className={`font-editorial text-[clamp(28px,min(11vw,5.6svh),56px)] leading-[1.15] tracking-[-.02em] ${
                  isActive(link) ? "italic text-ed-light" : "text-ed-ink"
                }`}
              >
                {link.label}
              </m.a>
            ))}
            <p className={`mt-auto pt-8 short:hidden ${EYEBROW}`}>{BrandWordsString}</p>
          </m.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

const FOOTER_LINK = "text-ed-ink transition-colors hover:text-ed-light";
const ICON_LINK = "inline-flex transition-colors hover:text-ed-light";
const sectionLink = (id: string) => NAV_LINKS.find((l) => l.id === id)!;

export function EditorialFooter() {
  const { follow } = useNavLinks();
  const { pathname } = useLocation();
  const quote = useParallax<HTMLParagraphElement>(0.1);
  // On phones the iNoah launcher floats over the bottom-right corner and sat
  // on top of the copyright line. Where the launcher shows, the footer keeps
  // its last line above it (launcher: 20px inset + 48px tall, plus air).
  const bottomPad = inoahLauncherHidden(pathname)
    ? "pb-10"
    : "pb-[calc(env(safe-area-inset-bottom)+5.75rem)] sm:pb-10";
  // Every other route paints its own page ground behind the footer. The
  // homepage's ground is the live flight map, which is fixed inside the
  // route container (z-10), so at z-1 the footer rendered *under* the map:
  // the quote and links showed through its tiles with routes and place names
  // drawn across them. On the homepage the footer rises above that container
  // and takes the same blurred ground as the contact section before it.
  const layer = pathname === "/" ? "z-20 bg-background/[.93] backdrop-blur-xl" : "z-[1]";

  return (
    <footer
      className={`relative ${layer} overflow-hidden border-t border-white/[.08] pt-[clamp(72px,12vw,160px)] ${bottomPad} ${PAD_X} text-center`}
    >
      <m.p
        ref={quote.ref}
        style={{ y: quote.y }}
        className="mx-auto max-w-[14ch] text-balance font-editorial italic text-[clamp(44px,9vw,150px)] leading-[.95] tracking-[-.03em] text-ed-ink"
      >
        "El cielo no es el límite."
      </m.p>
      <p className={`mt-5 mb-[clamp(48px,7vw,96px)] ${EYEBROW}`}>The sky is not the limit.</p>

      <div className="mb-7 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm">
        <Link to="/blog" className={FOOTER_LINK}>Blog</Link>
        <a href="/#follow-my-flight" onClick={(e) => follow(e, sectionLink("follow-my-flight"))} className={FOOTER_LINK}>
          Follow My Flight
        </a>
        <Link to="/inoah" className={FOOTER_LINK}>Ask iNoah</Link>
        <a href="/#contact" onClick={(e) => follow(e, sectionLink("contact"))} className={FOOTER_LINK}>
          Contact
        </a>
        <a href="mailto:noah@noahiberman.com" className={FOOTER_LINK}>Email</a>
      </div>

      <div className="mb-10 flex justify-center gap-[22px] text-ed-muted">
        <a href="https://github.com/niberman" target="_blank" rel="noopener noreferrer" aria-label="GitHub" className={ICON_LINK}>
          <Github className="h-5 w-5" />
        </a>
        <a href="https://www.linkedin.com/in/noahiberman/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className={ICON_LINK}>
          <Linkedin className="h-5 w-5" />
        </a>
        <a href="mailto:noah@noahiberman.com" aria-label="Email" className={ICON_LINK}>
          <Mail className="h-5 w-5" />
        </a>
      </div>

      {/* Wraps as two whole units (wordmark, then tagline) on narrow
          screens instead of breaking "Noah / Berman" across lines. */}
      <div className="mb-2.5 flex flex-wrap items-center justify-center gap-x-[18px] gap-y-1.5">
        <span className="inline-flex items-center gap-2.5 whitespace-nowrap">
          <img src="/logo.png" alt="Noah Berman logo" width={20} height={20} loading="lazy" className="h-5 w-5 object-contain" />
          <span className="font-editorial text-[22px]">Noah Berman</span>
        </span>
        <span className="whitespace-nowrap text-[13px] text-ed-muted">{BrandWordsString}</span>
      </div>
      <p className="text-xs text-ed-muted">© {new Date().getFullYear()} Noah Berman. All rights reserved.</p>
    </footer>
  );
}
