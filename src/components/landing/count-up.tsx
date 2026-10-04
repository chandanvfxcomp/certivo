"use client";

// Animated number counter — mirrors the demo's initCountUps() (REDESIGN v2):
// eases from 0 to the target with requestAnimationFrame once visible.
// Respects prefers-reduced-motion (jumps straight to the target).
import { useEffect, useRef } from "react";

export function CountUp({
  target,
  prefix = "",
  suffix = "",
  durationMs = 900,
}: {
  target: number;
  prefix?: string;
  suffix?: string;
  durationMs?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const render = (v: number) =>
      (el.textContent = `${prefix}${Math.round(v).toLocaleString("en-IN")}${suffix}`);
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("requestAnimationFrame" in window)
    ) {
      render(target);
      return;
    }
    if (!("IntersectionObserver" in window)) {
      render(target);
      return;
    }
    let raf = 0;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          obs.disconnect();
          const t0 = performance.now();
          const step = (t: number) => {
            const p = Math.min(1, (t - t0) / durationMs);
            render(target * (1 - Math.pow(1 - p, 3)));
            if (p < 1) raf = requestAnimationFrame(step);
          };
          raf = requestAnimationFrame(step);
        });
      },
      { threshold: 0.4 },
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [target, prefix, suffix, durationMs]);

  return (
    <span ref={ref} className="stat-num">
      {prefix}0{suffix}
    </span>
  );
}
