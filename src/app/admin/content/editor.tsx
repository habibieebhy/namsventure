"use client";

import { useRef, useState } from "react";
import type { Category, Content } from "@/lib/content";

type Status = { kind: "idle" | "saving" | "saved" | "error"; msg?: string };

function Field({
  label,
  hint,
  value,
  onChange,
  multiline,
  max,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  max?: number;
}) {
  return (
    <label className="ce-field">
      <span>
        {label}
        {hint ? <small>{hint}</small> : null}
      </span>
      {multiline ? (
        <textarea value={value} maxLength={max} rows={3} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input value={value} maxLength={max} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

function Uploader({ image, onChange }: { image?: string; onChange: (url?: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function upload(file: File) {
    setBusy(true);
    setErr("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/media", { method: "POST", body: fd }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(false);
    if (res?.ok && data?.url) onChange(data.url);
    else setErr(data?.error || "Upload failed.");
  }

  return (
    <div className="ce-img">
      <button
        type="button"
        className="ce-thumb"
        onClick={() => input.current?.click()}
        aria-label={image ? "Replace image" : "Upload image"}
        data-busy={busy || undefined}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" />
        ) : (
          <span>{busy ? "…" : "+ PNG"}</span>
        )}
      </button>
      {image ? (
        <button type="button" className="tm-link ce-small" onClick={() => onChange(undefined)}>
          Remove
        </button>
      ) : null}
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          e.target.value = "";
        }}
      />
      {err ? <small className="tm-err">{err}</small> : null}
    </div>
  );
}

export default function ContentEditor({ initial }: { initial: Content }) {
  const [c, setC] = useState<Content>(initial);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const dirty = JSON.stringify(c) !== JSON.stringify(initial) && status.kind !== "saved";

  const set = <K extends keyof Content>(k: K, v: Content[K]) => {
    setStatus({ kind: "idle" });
    setC((prev) => ({ ...prev, [k]: v }));
  };
  const setCat = (i: number, cat: Category) =>
    set(
      "categories",
      c.categories.map((x, j) => (j === i ? cat : x)),
    );

  async function save() {
    setStatus({ kind: "saving" });
    const res = await fetch("/api/admin/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: c }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (res?.ok && data?.content) {
      setC(data.content);
      setStatus({ kind: "saved", msg: "Saved. The website is updated." });
    } else {
      setStatus({ kind: "error", msg: data?.error || "Couldn't save. Check the database connection." });
    }
  }

  const move = (i: number, d: -1 | 1) => {
    const next = [...c.categories];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    set("categories", next);
  };

  return (
    <div className="ce">
      <div className="ce-bar">
        <p>
          Wrap a word in <code>*asterisks*</code> to highlight it in red. Press Enter in a heading for a new line.
        </p>
        <div className="ce-barRight">
          {status.msg ? (
            <span className={status.kind === "error" ? "tm-err" : "ce-ok"} role="status">
              {status.msg}
            </span>
          ) : dirty ? (
            <span className="ce-dirty">Unsaved changes</span>
          ) : null}
          <a className="tm-link" href="/" target="_blank" rel="noopener">
            View site ↗
          </a>
          <button className="btn btnSolid" type="button" onClick={save} disabled={status.kind === "saving"}>
            {status.kind === "saving" ? "Saving…" : "Save & publish"}
          </button>
        </div>
      </div>

      {/* PRODUCTS */}
      <section className="ce-sec">
        <header>
          <h2>Products we carry</h2>
          <p>Categories and the product lines in each. Add a PNG for any line — it shows next to the name on the site.</p>
        </header>

        {c.categories.map((cat, ci) => (
          <div className="ce-cat" key={ci}>
            <div className="ce-catHead">
              <span className="ce-code">CAT / {String(ci + 1).padStart(2, "0")}</span>
              <input
                className="ce-catName"
                value={cat.name}
                maxLength={60}
                aria-label="Category name"
                onChange={(e) => setCat(ci, { ...cat, name: e.target.value })}
              />
              <div className="ce-catTools">
                <button type="button" className="tm-link ce-small" onClick={() => move(ci, -1)} disabled={ci === 0}>
                  ↑
                </button>
                <button
                  type="button"
                  className="tm-link ce-small"
                  onClick={() => move(ci, 1)}
                  disabled={ci === c.categories.length - 1}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="tm-link ce-small ce-danger"
                  onClick={() => {
                    if (confirm(`Remove "${cat.name}" and all its products?`))
                      set(
                        "categories",
                        c.categories.filter((_, j) => j !== ci),
                      );
                  }}
                >
                  Remove category
                </button>
              </div>
            </div>

            <ul className="ce-items">
              {cat.items.map((it, ii) => (
                <li key={ii}>
                  <Uploader
                    image={it.image}
                    onChange={(url) =>
                      setCat(ci, {
                        ...cat,
                        items: cat.items.map((x, k) => (k === ii ? { name: x.name, ...(url ? { image: url } : {}) } : x)),
                      })
                    }
                  />
                  <input
                    value={it.name}
                    maxLength={60}
                    aria-label="Product name"
                    placeholder="e.g. Air conditioners"
                    onChange={(e) =>
                      setCat(ci, {
                        ...cat,
                        items: cat.items.map((x, k) => (k === ii ? { ...x, name: e.target.value } : x)),
                      })
                    }
                  />
                  <button
                    type="button"
                    className="tm-link ce-small ce-danger"
                    aria-label={`Remove ${it.name}`}
                    onClick={() => setCat(ci, { ...cat, items: cat.items.filter((_, k) => k !== ii) })}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
            {cat.items.length < 16 ? (
              <button
                type="button"
                className="tm-link ce-small"
                onClick={() => setCat(ci, { ...cat, items: [...cat.items, { name: "" }] })}
              >
                + Add product
              </button>
            ) : null}
          </div>
        ))}

        {c.categories.length < 12 ? (
          <button
            type="button"
            className="btn"
            onClick={() =>
              set("categories", [
                ...c.categories,
                { code: String(c.categories.length + 1).padStart(2, "0"), name: "New category", items: [{ name: "" }] },
              ])
            }
          >
            + Add category
          </button>
        ) : null}
      </section>

      {/* HERO */}
      <section className="ce-sec">
        <header>
          <h2>Top of the page</h2>
        </header>
        <div className="ce-grid">
          <Field label="Small line above the headline" value={c.heroMeta} max={60} onChange={(v) => set("heroMeta", v)} />
          {c.heroLines.map((l, i) => (
            <Field
              key={i}
              label={`Headline, line ${i + 1}`}
              value={l}
              max={60}
              onChange={(v) => {
                const next = [...c.heroLines] as Content["heroLines"];
                next[i] = v;
                set("heroLines", next);
              }}
            />
          ))}
          <Field label="Paragraph under the headline" value={c.heroLede} max={400} multiline onChange={(v) => set("heroLede", v)} />
          <Field
            label="Scrolling ticker"
            hint="One per line"
            value={c.ticker.join("\n")}
            multiline
            max={1000}
            onChange={(v) => set("ticker", v.split("\n"))}
          />
        </div>
      </section>

      {/* SECTIONS */}
      <section className="ce-sec">
        <header>
          <h2>Section headings</h2>
          <p>
            In the products heading, <code>{"{count}"}</code> becomes the number of categories in words.
          </p>
        </header>
        <div className="ce-grid">
          <Field label="Why we exist — label" value={c.statementLabel} max={60} onChange={(v) => set("statementLabel", v)} />
          <Field label="Why we exist — statement" value={c.statement} max={600} multiline onChange={(v) => set("statement", v)} />
          <Field label="Products — label" value={c.rangeLabel} max={60} onChange={(v) => set("rangeLabel", v)} />
          <Field label="Products — heading" value={c.rangeTitle} max={80} onChange={(v) => set("rangeTitle", v)} />
          <Field label="Products — highlighted line" value={c.rangeHighlight} max={80} onChange={(v) => set("rangeHighlight", v)} />
          <Field label="Brands — label" value={c.brandsLabel} max={60} onChange={(v) => set("brandsLabel", v)} />
          <Field label="Brands — note" value={c.brandNote} max={300} multiline onChange={(v) => set("brandNote", v)} />
          <Field label="How it works — label" value={c.processLabel} max={60} onChange={(v) => set("processLabel", v)} />
          <Field label="How it works — heading" value={c.processTitle} max={80} multiline onChange={(v) => set("processTitle", v)} />
          <Field label="Where we deliver — label" value={c.reachLabel} max={60} onChange={(v) => set("reachLabel", v)} />
          <Field label="Where we deliver — under the big number" value={c.reachSub} max={80} onChange={(v) => set("reachSub", v)} />
          <Field label="FAQ — label" value={c.faqLabel} max={60} onChange={(v) => set("faqLabel", v)} />
          <Field label="FAQ — heading" value={c.faqTitle} max={80} multiline onChange={(v) => set("faqTitle", v)} />
          <Field label="Dealers — label" value={c.dealersLabel} max={60} onChange={(v) => set("dealersLabel", v)} />
          <Field label="Dealers — heading" value={c.dealersTitle} max={80} multiline onChange={(v) => set("dealersTitle", v)} />
          <Field label="Dealers — paragraph" value={c.dealersBody} max={400} multiline onChange={(v) => set("dealersBody", v)} />
        </div>
      </section>
    </div>
  );
}
