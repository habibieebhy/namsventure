import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: "NAMS",
    description: SITE.tagline,
    start_url: "/",
    display: "standalone",
    background_color: "#F7F6F2",
    theme_color: "#2F2F2F",
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
