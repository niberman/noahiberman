// Motion helpers for the redesigned pages. All progressive: pages read fine without them.
const EASE = "cubic-bezier(0.22,1,0.36,1)";
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function reveal(root) {
  const els = root.querySelectorAll("[data-reveal]");
  if (reduced()) return () => {};
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target, d = +el.dataset.reveal || 0;
      el.style.transition = `opacity .9s ${EASE} ${d}ms, transform .9s ${EASE} ${d}ms, filter .9s ${EASE} ${d}ms`;
      el.style.opacity = "1"; el.style.transform = "none"; el.style.filter = "none";
      el.addEventListener("transitionend", () => { el.style.transition = ""; }, { once: true });
      io.unobserve(el);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
  els.forEach((el) => {
    el.style.opacity = "0"; el.style.transform = "translateY(36px)"; el.style.filter = "blur(8px)";
    io.observe(el);
  });
  return () => io.disconnect();
}

export function tilt(root) {
  root.querySelectorAll("[data-tilt]").forEach((el) => {
    const max = +el.dataset.tilt || 5;
    el.addEventListener("mouseenter", () => { el.style.transition = "transform .25s ease"; });
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(1000px) rotateX(${(-y * max).toFixed(2)}deg) rotateY(${(x * max).toFixed(2)}deg) translateY(-3px)`;
      el.style.setProperty("--mx", `${((x + 0.5) * 100).toFixed(1)}%`);
      el.style.setProperty("--my", `${((y + 0.5) * 100).toFixed(1)}%`);
    });
    el.addEventListener("mouseleave", () => { el.style.transform = "perspective(1000px) rotateX(0) rotateY(0)"; });
  });
}

export function glow(root) {
  // Cursor-following glow position for [data-glow] sections (var(--gx)/(--gy)).
  root.querySelectorAll("[data-glow]").forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--gx", `${e.clientX - r.left}px`);
      el.style.setProperty("--gy", `${e.clientY - r.top}px`);
      el.style.setProperty("--go", "1");
    });
    el.addEventListener("mouseleave", () => el.style.setProperty("--go", "0"));
  });
}

export function magnetic(root) {
  root.querySelectorAll("[data-magnetic]").forEach((el) => {
    const s = +el.dataset.magnetic || 0.3;
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
      el.style.transition = "transform .2s ease";
      el.style.transform = `translate(${x * s}px, ${y * s}px)`;
    });
    el.addEventListener("mouseleave", () => { el.style.transition = `transform .6s ${EASE}`; el.style.transform = "translate(0,0)"; });
  });
}

export function countUp(root) {
  const els = root.querySelectorAll("[data-count]");
  const fmt = (el, v) => {
    const dec = +el.dataset.decimals || 0;
    el.textContent = (el.dataset.prefix || "") + v.toFixed(dec) + (el.dataset.suffix || "");
  };
  if (reduced()) { els.forEach((el) => fmt(el, +el.dataset.count)); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target, target = +el.dataset.count, dur = +el.dataset.duration || 1800, t0 = performance.now();
      const step = (t) => {
        const p = Math.min(1, (t - t0) / dur), k = 1 - Math.pow(1 - p, 4);
        fmt(el, target * k);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      io.unobserve(el);
    });
  }, { threshold: 0.3 });
  els.forEach((el) => { fmt(el, 0); io.observe(el); });
}

export function parallax(root) {
  if (reduced()) return () => {};
  const els = [...root.querySelectorAll("[data-parallax]")];
  if (!els.length) return () => {};
  let raf = 0;
  const tick = () => {
    raf = 0;
    const vh = window.innerHeight;
    els.forEach((el) => {
      const r = el.getBoundingClientRect();
      const c = (r.top + r.height / 2 - vh / 2) / vh; // -1..1 through the viewport
      el.style.transform = `translate3d(0, ${(-c * (+el.dataset.parallax || 0.2) * 200).toFixed(1)}px, 0)`;
    });
  };
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(tick); };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  tick();
  return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
}

export function progressLine(root) {
  // [data-progress-line] grows (scaleY) as its parent scrolls through the viewport.
  const els = [...root.querySelectorAll("[data-progress-line]")];
  if (!els.length) return () => {};
  let raf = 0;
  const tick = () => {
    raf = 0;
    const vh = window.innerHeight;
    els.forEach((el) => {
      const r = el.parentElement.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (vh * 0.7 - r.top) / r.height));
      el.style.transform = `scaleY(${p.toFixed(3)})`;
    });
  };
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(tick); };
  window.addEventListener("scroll", onScroll, { passive: true });
  tick();
  return () => window.removeEventListener("scroll", onScroll);
}

export function clock(el, tz = "America/Denver") {
  if (!el) return () => {};
  const f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const tick = () => { el.textContent = f.format(new Date()); };
  tick();
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
}

export function all(root) {
  const offs = [reveal(root), parallax(root), progressLine(root)];
  tilt(root); glow(root); magnetic(root); countUp(root);
  return () => offs.forEach((f) => f && f());
}
