import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";

export const alt = `${SITE.name} — electronics distribution across Assam and the Northeast`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/* The preview card shown when the link is shared on WhatsApp, LinkedIn, X, etc. */
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#F7F6F2",
          color: "#2F2F2F",
          padding: "64px 72px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 24,
            letterSpacing: 2,
            borderBottom: "2px solid #2F2F2F",
            paddingBottom: 20,
          }}
        >
          <span style={{ fontWeight: 700 }}>NAMS VENTURE</span>
          <span style={{ color: "#8F8A7F" }}>ELECTRONICS DISTRIBUTION · ASSAM</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 92, fontWeight: 700, lineHeight: 1, letterSpacing: -3 }}>
          <div style={{ display: "flex" }}>From the brand&rsquo;s warehouse</div>
          <div style={{ display: "flex" }}>
            <span>to the dealer&rsquo;s&nbsp;</span>
            <span style={{ color: "#8F8A7F" }}>shelf.</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, fontSize: 24 }}>
          {["Home appliances", "Electronics", "Kitchen", "Electricals", "Batteries"].map((t) => (
            <span
              key={t}
              style={{ border: "2px solid #2F2F2F", padding: "8px 16px", display: "flex" }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
