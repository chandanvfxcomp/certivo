"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

// Institute-only lead capture — "Request a callback". This funnel is for
// institute/coaching owners only; students get certificates through their
// institute. On submit the lead is saved and the automated follow-up
// sequence starts.
export function LeadForm() {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("busy");
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          email: fd.get("email") || undefined,
          phone: fd.get("phone") || undefined,
          instituteName: fd.get("instituteName"),
          source: "landing",
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!data.ok) throw new Error(data.error ?? "Kuch galat ho gaya");
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kuch galat ho gaya");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <Card className="p-6 text-center">
        <div className="text-4xl">✓</div>
        <h3 className="mt-2 font-semibold">Ho gaya!</h3>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Hamari team jald sampark karegi. Aapko email par bhi details bheji jayengi.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="font-semibold">Institute / Coaching ke liye callback</h3>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Apne institute ke certificates digital karo — QR verification ke saath.
      </p>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <Input name="instituteName" placeholder="Institute / Coaching ka naam *" required autoComplete="organization" />
        <Input name="name" placeholder="Aapka naam (owner/manager) *" required autoComplete="name" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input name="phone" placeholder="Mobile number" inputMode="tel" autoComplete="tel" />
          <Input name="email" type="email" placeholder="Email" autoComplete="email" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={state === "busy"} className="w-full">
          {state === "busy" ? "Bhej rahe hain…" : "Mujhe call karo"}
        </Button>
        <p className="text-xs text-neutral-500">
          Ye form sirf institutes/coachings ke liye hai. Student ho? Apne institute se certificate lo.
          <br />
          Email ya phone — kam se kam ek zaroor dein.
        </p>
      </form>
    </Card>
  );
}
