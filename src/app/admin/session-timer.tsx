"use client";

import { useEffect } from "react";

/* Reloads the page when the session expires, which drops you back to the login screen. */
export default function SessionTimer({ exp }: { exp: number }) {
  useEffect(() => {
    const ms = exp * 1000 - Date.now();
    const t = setTimeout(() => location.reload(), Math.max(ms, 0) + 1000);
    return () => clearTimeout(t);
  }, [exp]);
  return null;
}
