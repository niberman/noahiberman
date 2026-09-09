import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Github, Linkedin, Mail } from "lucide-react";
import { NAV_LINKS, useNavLinks } from "@/components/Navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { BrandWordsString } from "@/data/brand";
import { m } from "framer-motion";
import { useParallax } from "./fx";

/**
 * Chrome for the "cinematic editorial" routes (Work, Aviation, Now): page
 * background, ambient grain + orbs, a page-local nav and footer. App.tsx
 * hides the global Navigation/Footer on exactly these routes. Values follow
 * design_handoff_work_aviation_now/README.md verbatim.
 */

/** Horizontal page gutter shared by every editorial section. */
export const PAD_X = "px-[clamp(16px,4vw,56px)]";
/** Eyebrow / label type. */
export const EYEBROW = "text-xs tracking-[.3em] uppercase text-ed-muted";

export function EditorialPage({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen font-body text-ed-ink antialiased [background:radial-gradient(ellipse_at_50%_0%,#12081f_0%,#040208_55%)]">
      {/* Ambient layer: film grain (site's .grain-overlay tile) + two orbs. */}
      <div aria-hidden className="grain-overlay fixed z-50 pointer-events-none" style={{ opacity: 0.06 }} />
      <div aria-hidden className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="ed-orb-a absolute left-[10%] top-[-20%] h-[70vw] w-[70vw] rounded-full blur-[60px] [background:radial-gradient(circle,rgba(128,51,204,.28),transparent_60%)]" />
        <div className="ed-orb-b absolute right-[-20%] bottom-[-30%] h-[70vw] w-[70vw] rounded-full blur-[70px] [background:radial-gradient(circle,rgba(70,20,130,.35),transparent_60%)]" />
      </div>
      <EditorialNav />
      <main className="relative z-[1]">{children}</main>
      <EditorialFooter />
    </div>
  );
}

function EditorialNav() {
  const { isActive, follow } = useNavLinks();
  const { pathname } = useLocation();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  // Closes on navigation and on breakpoint change.
  useEffect(() => setOpen(false), [pathname, isMobile]);

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-[100] flex h-[76px] items-center justify-between gap-4 ${PAD_X} bg-gradient-to-b from-[rgba(4,2,8,.9)] to-[rgba(4,2,8,0)]`}
    >
      <a
        href="/"
        onClick={(e) => follow(e, NAV_LINKS[0])}
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
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu"
        aria-expanded={open}
        className="md:hidden py-2 font-editorial italic text-xl text-ed-ink"
      >
        {open ? "Close" : "Menu"}
      </button>

      {open && (
        <div
          className={`fixed inset-x-0 top-[76px] bottom-0 z-[150] flex flex-col gap-1 overflow-auto ${PAD_X} pt-6 pb-10 text-center bg-[rgba(4,2,8,.97)] backdrop-blur-[20px] md:hidden`}
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.path}
              href={link.path}
              onClick={(e) => {
                follow(e, link);
                setOpen(false);
              }}
              className="font-editorial text-[clamp(40px,11vw,56px)] leading-[1.15] tracking-[-.02em] text-ed-ink"
            >
              {link.label}
            </a>
          ))}
          <p className={`mt-auto pt-8 ${EYEBROW}`}>{BrandWordsString}</p>
        </div>
      )}
    </nav>
  );
}

const FOOTER_LINK = "text-ed-ink transition-colors hover:text-ed-light";
const ICON_LINK = "inline-flex transition-colors hover:text-ed-light";
const sectionLink = (id: string) => NAV_LINKS.find((l) => l.id === id)!;

function EditorialFooter() {
  const { follow } = useNavLinks();
  const quote = useParallax<HTMLParagraphElement>(0.1);

  return (
    <footer
      className={`relative z-[1] overflow-hidden border-t border-white/[.08] pt-[clamp(72px,12vw,160px)] pb-10 ${PAD_X} text-center`}
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

      <div className="mb-2.5 flex items-center justify-center gap-2.5">
        <img src="/logo.png" alt="Noah Berman logo" width={20} height={20} loading="lazy" className="h-5 w-5 object-contain" />
        <span className="font-editorial text-[22px]">Noah Berman</span>
        <span className="ml-2 text-[13px] text-ed-muted">{BrandWordsString}</span>
      </div>
      <p className="text-xs text-ed-muted">© {new Date().getFullYear()} Noah Berman. All rights reserved.</p>
    </footer>
  );
}
