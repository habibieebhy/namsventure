"use client";

import { useEffect } from "react";

/*
  All scroll motion for the page, in one place, no libraries.
  - [data-reveal]   fades/slides in once when it enters the viewport
  - [data-scroll]   gets a --p variable (0 → 1) as it passes through the viewport
  - [data-hscroll]  pinned section whose [data-htrack] scrolls sideways
  - [data-nav]      hides on scroll down, returns on scroll up
  - [data-count]    counts up from 0 when revealed
*/
export default function Motion() {
  useEffect(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Reveal on enter
    const revealEls = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target as HTMLElement;
          el.classList.add("is-in");
          el.querySelectorAll<HTMLElement>("[data-count]").forEach(countUp);
          io.unobserve(el);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    revealEls.forEach((el) => io.observe(el));

    function countUp(el: HTMLElement) {
      const target = Number(el.dataset.count || 0);
      if (reduce || !target) return;
      const start = performance.now();
      const dur = 1100;
      const tick = (t: number) => {
        const k = Math.min(1, (t - start) / dur);
        const eased = 1 - Math.pow(1 - k, 3);
        el.textContent = String(Math.round(target * eased)).padStart(2, "0");
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }

    // Hero title lines
    requestAnimationFrame(() => root.classList.add("is-loaded"));

    if (reduce) {
      revealEls.forEach((el) => el.classList.add("is-in"));
      return () => io.disconnect();
    }

    const scrollEls = Array.from(document.querySelectorAll<HTMLElement>("[data-scroll]"));
    const hscroll = document.querySelector<HTMLElement>("[data-hscroll]");
    const track = hscroll?.querySelector<HTMLElement>("[data-htrack]") ?? null;
    const bar = hscroll?.querySelector<HTMLElement>("[data-progress]") ?? null;
    const nav = document.querySelector<HTMLElement>("[data-nav]");

    let lastY = window.scrollY;
    let ticking = false;
    const desktop = window.matchMedia("(min-width: 900px)");

    function sizeHScroll() {
      if (!hscroll || !track) return;
      if (!desktop.matches) {
        hscroll.style.height = "";
        track.style.transform = "";
        return;
      }
      const distance = track.scrollWidth - window.innerWidth;
      hscroll.style.height = `${Math.max(distance, 0) + window.innerHeight}px`;
    }

    function update() {
      ticking = false;
      const vh = window.innerHeight;

      for (const el of scrollEls) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -vh || r.top > vh * 2) continue;
        const p = (vh - r.top) / (vh + r.height);
        el.style.setProperty("--p", Math.min(1, Math.max(0, p)).toFixed(4));
      }

      if (hscroll && track && desktop.matches) {
        const r = hscroll.getBoundingClientRect();
        const total = r.height - vh;
        const p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
        const distance = track.scrollWidth - window.innerWidth;
        track.style.transform = `translate3d(${-p * distance}px,0,0)`;
        if (bar) bar.style.transform = `scaleX(${p})`;
      }

      if (nav) {
        const y = window.scrollY;
        nav.classList.toggle("is-solid", y > 40);
        nav.classList.toggle("is-hidden", y > lastY && y > 200);
        lastY = y;
      }
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }

    function onResize() {
      sizeHScroll();
      update();
    }

    sizeHScroll();
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    // fonts can change the track width after load
    document.fonts?.ready.then(onResize);

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return null;
}
