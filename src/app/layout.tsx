import type { Metadata } from "next";
import { BRAND } from "@/config/brand";
import { ThemeToggle, THEME_INIT_SCRIPT } from "@/components/theme-toggle";
import "./globals.css";

export const metadata: Metadata = {
  title: BRAND.name,
  description: BRAND.tagline,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* QA audit finding F1: sets `.dark` before first paint so the
            newly-wired theme toggle (src/components/theme-toggle.tsx)
            doesn't flash the wrong theme on load — see that file's
            header comment for why this can't just live in a useEffect. */}
          {/* eslint-disable-next-line react/no-danger -- JSON-LD structured data */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        {children}
        <ThemeToggle />
      </body>
    </html>
  );
}
