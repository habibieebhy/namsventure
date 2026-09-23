import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NAMS Venture — Built Across Industries",
  description:
    "A diversified business group operating across distribution, industry, music and emerging ventures.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
