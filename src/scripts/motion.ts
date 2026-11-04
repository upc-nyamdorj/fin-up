import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger, SplitText);

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(pointer: fine)").matches;
const $ = <T extends Element = HTMLElement>(s: string) => document.querySelector<T & Element>(s);
const $$ = <T extends HTMLElement = HTMLElement>(s: string) => [...document.querySelectorAll<T>(s)];

/* heavy setup (ScrollTriggers, SplitText, pointer effects) waits until the page has
   loaded and the main thread is idle, so it never competes with first paint */
const idleQueue: (() => void)[] = [];
let idleReady = false, flushing = false;
const onIdle = (fn: () => void) => (idleReady && !flushing ? fn() : idleQueue.push(fn));
const nextIdle = () => new Promise((r) => ("requestIdleCallback" in window ? requestIdleCallback(r, { timeout: 500 }) : setTimeout(r, 16)));
// one job per idle slot, so setup never turns into a single long task
const flush = async () => {
  idleReady = flushing = true;
  while (idleQueue.length) {
    idleQueue.shift()!();
    await nextIdle();
  }
  flushing = false;
  ScrollTrigger.refresh();
};
const whenIdle = () => ("requestIdleCallback" in window ? requestIdleCallback(flush, { timeout: 2000 }) : setTimeout(flush, 300));
if (document.readyState === "complete") whenIdle();
else addEventListener("load", whenIdle, { once: true });

/* ---------- smooth scroll ---------- */
let lenis: Lenis | undefined;
if (!reduce) {
  lenis = new Lenis({ anchors: { offset: -72 } });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis!.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* the splash intro and hero entrance are pure CSS (see global.css) so they don't wait for this bundle */

/* ---------- scroll-linked motion ---------- */
if (!reduce) onIdle(() => {
  // top progress line
  gsap.to("#progress", { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.3 } });

  // hero parallax out
  const heroOut = { trigger: "#hero", start: "top top", end: "bottom top", scrub: true };
  gsap.to("[data-hero-copy]", { yPercent: -18, opacity: 0.15, ease: "none", scrollTrigger: heroOut });
  gsap.to("[data-hero-stage]", { y: -90, scale: 0.92, ease: "none", scrollTrigger: heroOut });

  // section headings: words rise out of a line mask
  $$("[data-split]").forEach((h) => onIdle(() => {
    SplitText.create(h, {
      type: "lines,words",
      mask: "lines",
      autoSplit: true,
      onSplit: (self) =>
        gsap.from(self.words, {
          yPercent: 110,
          duration: 1.1,
          stagger: 0.06,
          ease: "expo.out",
          scrollTrigger: { trigger: h, start: "top 88%" },
        }),
    });
  }));

  // swirls draw left to right with the scroll, then drift a little slower than the page
  $$("[data-swirl]").forEach((el) => {
    gsap.fromTo(el, { clipPath: "inset(-10% 100% -10% 0)" }, { clipPath: "inset(-10% 0% -10% 0)", ease: "none", scrollTrigger: { trigger: el, start: "top 90%", end: "center 55%", scrub: 1 } });
    if (el.dataset.swirl === "draw") return; // e.g. inside a sticky column, where drift would slide it over the copy
    gsap.fromTo(el, { y: 70 }, { y: -70, ease: "none", scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true } });
  });

  // pause CSS loops (aurora, orbits, floats, shimmer) in sections that are off screen
  $$("#hero, [data-marquee-wrap], #guide").forEach((el) =>
    ScrollTrigger.create({ trigger: el, start: "top bottom", end: "bottom top", onToggle: (self) => el.classList.toggle("offscreen", !self.isActive) }),
  );

  // marquee rows, accelerated + skewed by scroll velocity
  const loops = $$("[data-marquee]").map((track) => {
    const forward = track.dataset.marquee === "1";
    const loop = gsap.fromTo(track, { xPercent: forward ? 0 : -50 }, { xPercent: forward ? -50 : 0, duration: 40, ease: "none", repeat: -1 });
    ScrollTrigger.create({ trigger: track, start: "top bottom", end: "bottom top", onToggle: (self) => (self.isActive ? loop.play() : loop.pause()) });
    return loop;
  });
  const skew = gsap.quickTo("[data-marquee-wrap]", "skewX", { duration: 0.5, ease: "power3.out" });
  ScrollTrigger.create({
    onUpdate(self) {
      const v = self.getVelocity();
      const boost = 1 + Math.min(Math.abs(v) / 180, 8);
      loops.forEach((loop) => {
        loop.timeScale(boost);
        gsap.to(loop, { timeScale: 1, duration: 1.4, ease: "power2.out", overwrite: true });
      });
      skew(gsap.utils.clamp(-8, 8, v / -300));
      gsap.delayedCall(0.15, () => skew(0));
    },
  });

});

/* ---------- pointer effects (desktop only) ---------- */
if (finePointer && !reduce) onIdle(() => {
  // custom cursor: precise dot + trailing ring that stretches with speed,
  // wraps magnetic buttons, grows over links and shows a label on [data-cursor-label]
  const ring = $("#cursor-ring")!, dot = $("#cursor-dot")!, label = $("#cursor-label")!;
  document.documentElement.classList.add("has-cursor");
  ring.classList.remove("hidden");
  dot.classList.remove("hidden");
  gsap.set([ring, dot], { xPercent: -50, yPercent: -50, opacity: 0 });

  const dotX = gsap.quickTo(dot, "x", { duration: 0.08, ease: "power2.out" });
  const dotY = gsap.quickTo(dot, "y", { duration: 0.08, ease: "power2.out" });
  const ringX = gsap.quickTo(ring, "x", { duration: 0.45, ease: "power3.out" });
  const ringY = gsap.quickTo(ring, "y", { duration: 0.45, ease: "power3.out" });

  type Mode = "idle" | "link" | "stick" | "label" | "field";
  let mode: Mode | null = null, target: HTMLElement | null = null;
  let px = 0, py = 0, relax = 0;
  const mint = (a: number) => `rgba(96, 224, 130, ${a})`;

  const morph = (vars: gsap.TweenVars) => gsap.to(ring, { duration: 0.45, ease: "power3.out", overwrite: "auto", ...vars });

  function setMode(next: Mode, el: HTMLElement | null) {
    if (next === mode && el === target) return;
    mode = next;
    target = el;
    gsap.to(label, { opacity: next === "label" ? 1 : 0, duration: 0.25 });
    gsap.to(dot, { scale: next === "link" || next === "label" ? 0 : 1, duration: 0.3 });
    ring.style.backdropFilter = next === "label" ? "blur(8px)" : "";
    if (next !== "idle") gsap.to(ring, { rotation: 0, scaleX: 1, scaleY: 1, duration: 0.3, overwrite: "auto" });

    if (next === "stick" && el) {
      const r = el.getBoundingClientRect();
      const radius = parseFloat(getComputedStyle(el).borderRadius) || 12;
      morph({ width: r.width + 14, height: r.height + 14, borderRadius: Math.min(radius + 7, (r.height + 14) / 2), backgroundColor: mint(0.06), borderColor: mint(0.9) });
    } else if (next === "label" && el) {
      label.textContent = el.dataset.cursorLabel ?? "";
      morph({ width: 84, height: 84, borderRadius: 42, backgroundColor: "rgba(10, 24, 51, 0.55)", borderColor: mint(0.8) });
    } else {
      const size = next === "link" ? 60 : next === "field" ? 22 : 36;
      morph({ width: size, height: size, borderRadius: size / 2, backgroundColor: mint(next === "link" ? 0.12 : 0), borderColor: mint(next === "idle" ? 0.6 : 0.9) });
    }
  }

  function follow() {
    if (mode === "stick" && target) {
      const r = target.getBoundingClientRect();
      ringX(r.left + r.width / 2);
      ringY(r.top + r.height / 2);
    } else {
      ringX(px);
      ringY(py);
    }
  }

  addEventListener("pointermove", (e) => {
    const vx = e.clientX - px, vy = e.clientY - py;
    px = e.clientX;
    py = e.clientY;
    dotX(px);
    dotY(py);
    follow();

    // squash & stretch along the direction of travel while idle
    if (mode === "idle") {
      const stretch = Math.min(Math.hypot(vx, vy) / 40, 0.5);
      gsap.to(ring, { rotation: (Math.atan2(vy, vx) * 180) / Math.PI, scaleX: 1 + stretch, scaleY: 1 - stretch * 0.5, duration: 0.25, overwrite: "auto" });
      clearTimeout(relax);
      relax = window.setTimeout(() => gsap.to(ring, { scaleX: 1, scaleY: 1, duration: 0.5, ease: "elastic.out(1, .5)" }), 80);
    }
  });
  addEventListener("pointermove", () => gsap.to([ring, dot], { opacity: 1, duration: 0.4 }), { once: true });
  addEventListener("scroll", follow, { passive: true });

  document.addEventListener("pointerover", (e) => {
    const t = e.target as Element;
    const sticky = t.closest<HTMLElement>("[data-magnetic]");
    const labelled = t.closest<HTMLElement>("[data-cursor-label]");
    const field = t.closest<HTMLElement>("input, textarea, select");
    const link = t.closest<HTMLElement>("a, button, [role='tab'], label");
    if (sticky) setMode("stick", sticky);
    else if (labelled && (!link || link === labelled)) setMode("label", labelled);
    else if (field) setMode("field", field);
    else if (link) setMode("link", link);
    else setMode("idle", null);
  });

  addEventListener("pointerdown", () => gsap.to([ring, dot], { scale: 0.8, duration: 0.15 }));
  addEventListener("pointerup", () => gsap.to([ring, dot], { scale: 1, duration: 0.4, ease: "back.out(3)" }));
  document.documentElement.addEventListener("pointerleave", () => gsap.to([ring, dot], { opacity: 0, duration: 0.3 }));
  document.documentElement.addEventListener("pointerenter", () => gsap.to([ring, dot], { opacity: 1, duration: 0.3 }));
  setMode("idle", null);

  // magnetic buttons
  $$("[data-magnetic]").forEach((el) => {
    const x = gsap.quickTo(el, "x", { duration: 0.8, ease: "elastic.out(1, .35)" });
    const y = gsap.quickTo(el, "y", { duration: 0.8, ease: "elastic.out(1, .35)" });
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      x((e.clientX - r.left - r.width / 2) * 0.35);
      y((e.clientY - r.top - r.height / 2) * 0.45);
    });
    el.addEventListener("pointerleave", () => (x(0), y(0)));
  });

  // 3D tilt (+ optional glare child)
  $$("[data-tilt]").forEach((el) => {
    const max = Number(el.dataset.tilt || 10);
    const rX = gsap.quickTo(el, "rotationX", { duration: 0.6, ease: "power3.out" });
    const rY = gsap.quickTo(el, "rotationY", { duration: 0.6, ease: "power3.out" });
    const glare = el.querySelector<HTMLElement>("[data-glare]");
    const zone = el.closest<HTMLElement>("[data-tilt-zone]") ?? el;
    zone.addEventListener("pointerenter", () => gsap.set(el, { transformPerspective: 1000 }));
    zone.addEventListener("pointermove", (e) => {
      const r = zone.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      rY((px - 0.5) * max * 2);
      rX((0.5 - py) * max * 1.6);
      if (glare) {
        glare.style.setProperty("--gx", `${px * 100}%`);
        glare.style.setProperty("--gy", `${py * 100}%`);
        glare.style.opacity = "1";
      }
    });
    zone.addEventListener("pointerleave", () => {
      if (glare) glare.style.opacity = "0";
      gsap.to(el, { rotationX: 0, rotationY: 0, duration: 0.6, ease: "power3.out", overwrite: true, onComplete: () => gsap.set(el, { clearProps: "transform" }) });
    });
  });

  // spotlight borders: one listener per group lights every card's border relative to the pointer
  const spot = (e: PointerEvent, cards: HTMLElement[]) =>
    cards.forEach((c) => {
      const r = c.getBoundingClientRect();
      c.style.setProperty("--mx", `${e.clientX - r.left}px`);
      c.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  $$("[data-spotlight-group]").forEach((g) => {
    const cards = [...g.querySelectorAll<HTMLElement>(".spotlight")];
    g.addEventListener("pointermove", (e) => spot(e, cards));
  });
  $$(".spotlight:not([data-spotlight-group] .spotlight)").forEach((c) => c.addEventListener("pointermove", (e) => spot(e, [c])));

  // hero cursor glow
  const hero = $("#hero"), glow = $("#cursor-glow");
  if (hero && glow) {
    const gx = gsap.quickTo(glow, "x", { duration: 1, ease: "power3.out" });
    const gy = gsap.quickTo(glow, "y", { duration: 1, ease: "power3.out" });
    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      gx(e.clientX - r.left);
      gy(e.clientY - r.top);
      glow.style.opacity = "1";
    });
    hero.addEventListener("pointerleave", () => (glow.style.opacity = "0"));
  }
});

/* ---------- simple reveal on scroll; [data-stagger] children get incremental delays ---------- */
$$("[data-stagger]").forEach((group) =>
  group.querySelectorAll<HTMLElement>(":scope > [data-reveal]").forEach((el, i) => el.style.setProperty("--d", `${i * 110}ms`)),
);
const io = new IntersectionObserver(
  (entries) =>
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      e.target.dispatchEvent(new CustomEvent("reveal"));
      io.unobserve(e.target);
    }),
  { threshold: 0.15 },
);
$$("[data-reveal]").forEach((el) => io.observe(el));

export { gsap, ScrollTrigger, lenis, reduce, onIdle };
