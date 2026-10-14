"use client";

import { useState } from "react";

export default function LeadStatus({
  id,
  initial,
  options,
}: {
  id: number;
  initial: string;
  options: readonly string[];
}) {
  const [value, setValue] = useState(initial);
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");

  async function change(next: string) {
    const prev = value;
    setValue(next);
    setState("saving");
    const res = await fetch("/api/admin/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: next }),
    }).catch(() => null);
    if (res?.ok) setState("idle");
    else {
      setValue(prev);
      setState("error");
    }
  }

  return (
    <span className="ad-status">
      <select
        value={value}
        onChange={(e) => change(e.target.value)}
        data-status={value}
        aria-label="Lead status"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {state === "saving" && <small>saving…</small>}
      {state === "error" && <small>failed</small>}
    </span>
  );
}
