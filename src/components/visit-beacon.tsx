"use client";

import { useEffect } from "react";

// Silent visit beacon — logs an anonymous page view for super-admin
// analytics. Fire-and-forget; never affects the page.
export function VisitBeacon() {
  useEffect(() => {
    try {
      fetch("/api/track-visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: window.location.pathname }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      // ignore
    }
  }, []);
  return null;
}
