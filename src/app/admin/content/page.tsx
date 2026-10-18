import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, tokenExpiry } from "@/lib/admin-auth";
import { hasDb } from "@/lib/db";
import { getContent } from "@/lib/content";
import ContentEditor from "./editor";
import "../admin.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Content",
  robots: { index: false, follow: false },
};

export default async function ContentPage() {
  const jar = await cookies();
  if (tokenExpiry(jar.get(ADMIN_COOKIE)?.value) === null) redirect("/admin");

  return (
    <main className="tm">
      <header className="tm-top">
        <div>
          <p className="label">NAMS Venture</p>
          <h1>Content</h1>
        </div>
        <nav className="tm-ranges" aria-label="Admin">
          <a href="/admin">Telemetry</a>
          <a href="/admin/content" aria-current="page">
            Content
          </a>
        </nav>
      </header>

      {hasDb() ? (
        <ContentEditor initial={await getContent()} />
      ) : (
        <div className="tm-notice">
          <h1>Database not connected</h1>
          <p>
            Content is saved in your Postgres. Add <code>DATABASE_URL</code> to the environment and restart.
          </p>
        </div>
      )}
    </main>
  );
}
