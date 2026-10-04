"use client";

// src/app/student/(protected)/idle-logout-trigger.tsx
//
// Wires the generic IdleLogout component (src/components/idle-logout.tsx)
// to this app's actual student logout action. Kept separate from
// IdleLogout itself so that component stays reusable (e.g. for the admin
// console later) without needing to know which Server Action to call.
import { IdleLogout } from "@/components/idle-logout";
import { logoutStudent } from "@/app/student/actions";

export function StudentIdleLogoutTrigger() {
  return <IdleLogout onIdle={() => void logoutStudent()} />;
}
