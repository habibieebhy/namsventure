"use client";

import { useRef, useState } from "react";
import { sessionId, track, utmParams } from "./telemetry";

type State = { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "error"; msg: string };

export default function DealerForm({ categories }: { categories: string[] }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [state, setState] = useState<State>({ kind: "idle" });
  const started = useRef(false);

  function toggle(c: string) {
    setPicked((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));
  }

  function onFirstFocus() {
    if (started.current) return;
    started.current = true;
    track({ type: "form_start", name: "dealer" });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state.kind === "sending") return;
    const form = e.currentTarget;
    const f = new FormData(form);
    setState({ kind: "sending" });
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.get("name"),
          shop: f.get("shop"),
          town: f.get("town"),
          phone: f.get("phone"),
          message: f.get("message"),
          website: f.get("website"),
          categories: picked,
          sid: sessionId(),
          ref: document.referrer,
          utm: utmParams(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setState({ kind: "sent" });
        form.reset();
        setPicked([]);
      } else {
        setState({ kind: "error", msg: data.error || "Something went wrong. Please try again." });
      }
    } catch {
      setState({ kind: "error", msg: "Network problem. Please check your connection and try again." });
    }
  }

  if (state.kind === "sent") {
    return (
      <div className="formDone" role="status">
        <p className="label">Enquiry received</p>
        <h3>Thank you. We&rsquo;ll call you back shortly.</h3>
        <p>
          Our team will contact you on the number you gave us with stock, dealer pricing and
          delivery days for your town.
        </p>
        <button type="button" className="btn" onClick={() => setState({ kind: "idle" })}>
          Send another enquiry
        </button>
      </div>
    );
  }

  return (
    <form className="dealerForm" onSubmit={onSubmit} onFocus={onFirstFocus} data-reveal>
      <div className="fieldRow">
        <label>
          <span>Your name</span>
          <input name="name" required maxLength={80} autoComplete="name" />
        </label>
        <label>
          <span>Shop name</span>
          <input name="shop" required maxLength={120} autoComplete="organization" />
        </label>
      </div>
      <div className="fieldRow">
        <label>
          <span>Town</span>
          <input name="town" required maxLength={80} autoComplete="address-level2" />
        </label>
        <label>
          <span>Phone</span>
          <input
            name="phone"
            required
            type="tel"
            inputMode="tel"
            minLength={10}
            maxLength={16}
            autoComplete="tel"
          />
        </label>
      </div>

      {/* Honeypot for spam bots — hidden from people and screen readers */}
      <div className="hp" aria-hidden="true">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <fieldset>
        <legend>What do you want to stock?</legend>
        <div className="chips">
          {categories.map((c) => (
            <button
              type="button"
              key={c}
              className={picked.includes(c) ? "chip on" : "chip"}
              aria-pressed={picked.includes(c)}
              onClick={() => toggle(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </fieldset>

      <label>
        <span>Anything else</span>
        <textarea name="message" rows={3} maxLength={1500} />
      </label>

      {state.kind === "error" && (
        <p className="formError" role="alert">
          {state.msg}
        </p>
      )}

      <button
        type="submit"
        className="btn btnSolid submit"
        disabled={state.kind === "sending"}
        data-track="submit_enquiry"
      >
        {state.kind === "sending" ? "Sending…" : "Send enquiry"}
        <svg className="arrow" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 12 12 4M5.5 4H12v6.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      </button>
    </form>
  );
}
