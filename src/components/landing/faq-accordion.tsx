"use client";

// Smooth FAQ accordion — mirrors the demo's grid-template-rows animation
// (REDESIGN v2): the answer expands with a real height transition instead
// of <details>' instant snap, and the chevron rotates. One item open at a
// time, first item open by default.
import { useState } from "react";

export function FaqAccordion({ faqs }: { faqs: { q: string; a: string }[] }) {
  const [open, setOpen] = useState(0);
  return (
    <div>
      {faqs.map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={f.q} className={`faq-item${isOpen ? " open" : ""}`}>
            <button
              type="button"
              className="faq-q"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? -1 : i)}
            >
              <span>{f.q}</span>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            <div className="faq-a" aria-hidden={!isOpen}>
              <div className="faq-a-inner">
                <p>{f.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
