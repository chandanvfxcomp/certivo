"use client";

// src/components/idle-logout.tsx
//
// Auto sign-out after inactivity — per the user's explicit "students id
// auto sign out ho jayega agar usmein koi kaam na ho tab". Scoped to the
// student portal for now (mounted from
// src/app/student/(protected)/layout.tsx); nothing stops reusing it for
// the admin console later if asked.
//
// Client-only: tracks real user activity (mouse, keyboard, touch, scroll)
// and calls the logoutStudent Server Action after IDLE_TIMEOUT_MS with no
// activity. logoutStudent() redirects server-side; calling it from a
// client component still triggers that navigation. Renders nothing.
import { useEffect, useRef } from "react";

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"] as const;

export function IdleLogout({ onIdle }: { onIdle: () => void }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function reset() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(onIdle, IDLE_TIMEOUT_MS);
    }

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, reset, { passive: true });
    }
    reset();

    return () => {
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, reset);
      }
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [onIdle]);

  return null;
}
