"use client";

import { useEffect } from "react";
import { useReportWebVitals } from "next/web-vitals";

/*
  First-party, cookieless analytics. Sends tiny beacons to /api/t.
  Tracks: pageview, engaged time, scroll depth (25/50/75/100),
  which sections were seen, CTA clicks ([data-track]), form starts,
  and Core Web Vitals (LCP, INP, CLS, FCP, TTFB).
*/

type Ev = {
  type: string;
  name?: string;
  value?: number;
  path?: string;
  sid?: string;
  ref?: string;
  utm?: Record<string, string>;
  meta?: Record<string, unknown>;
};

export function sessionId() {
  try {
    let s = sessionStorage.getItem("nams_sid");
    if (!s) {
      s = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem("nams_sid", s);
    }
    return s;
  } catch {
    return "nosession";
  }
}

export function utmParams() {
  const p = new URLSearchParams(location.search);
  const utm: Record<string, string> = {};
  for (const k of ["source", "medium", "campaign"]) {
    const v = p.get(`utm_${k}`);
    if (v) utm[k] = v;
  }
  return utm;
}

let queue: Ev[] = [];
let pageviewSent = false;
let timer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  if (!queue.length) return;
  const body = JSON.stringify({ events: queue });
  queue = [];
  try {
    if (navigator.sendBeacon?.(
      "/api/t",
      new Blob([body], { type: "text/plain" }),
    )) return;
  } catch {
    /* fall through to fetch */
  }
  fetch("/api/t", { method: "POST", body, keepalive: true }).catch(() => {});
}

export function track(ev: Ev) {
  if (typeof window === "undefined") return;
  if (navigator.webdriver) return;
  queue.push({ path: location.pathname, sid: sessionId(), ...ev });
  if (timer) clearTimeout(timer);
  timer = setTimeout(flush, 1500);
}

export default function Telemetry() {
  useReportWebVitals((m) => {
    track({ type: "vital", name: m.name, value: Math.round(m.name === "CLS" ? m.value * 1000 : m.value) });
  });

  useEffect(() => {
    // Pageview (guarded so dev-mode double effects don't count twice)
    if (!pageviewSent) {
      pageviewSent = true;
      track({ type: "pageview", ref: document.referrer, utm: utmParams() });
    }

    // Engaged (visible) time
    let visibleSince = document.visibilityState === "visible" ? performance.now() : 0;
    let pending = 0;
    const sendEngaged = () => {
      if (visibleSince) {
        pending += performance.now() - visibleSince;
        visibleSince = document.visibilityState === "visible" ? performance.now() : 0;
      }
      if (pending > 500) {
        track({ type: "engage", value: Math.round(pending) });
        pending = 0;
      }
      flush();
    };
    const onVis = () => {
      if (document.visibilityState === "hidden") sendEngaged();
      else visibleSince = performance.now();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", sendEngaged);

    // Scroll depth
    const marks = [25, 50, 75, 100];
    const hit = new Set<number>();
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      const pct = max > 0 ? (scrollY / max) * 100 : 100;
      for (const m of marks) {
        if (pct >= m - 2 && !hit.has(m)) {
          hit.add(m);
          track({ type: "scroll", value: m });
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // Sections seen (>=40% visible)
    const seen = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = (e.target as HTMLElement).dataset.section;
          if (e.isIntersecting && id && !seen.has(id)) {
            seen.add(id);
            track({ type: "section", name: id });
          }
        }
      },
      { threshold: 0.4 },
    );
    document.querySelectorAll<HTMLElement>("[data-section]").forEach((el) => io.observe(el));

    // Clicks on anything marked data-track
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement)?.closest<HTMLElement>("[data-track]");
      if (el?.dataset.track) track({ type: "click", name: el.dataset.track });
    };
    document.addEventListener("click", onClick);

    return () => {
      sendEngaged();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", sendEngaged);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onClick);
      io.disconnect();
    };
  }, []);

  return null;
}
