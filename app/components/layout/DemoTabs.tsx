"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * A bar along the bottom holding the two documents the atelier works from — the Design Brief
 * a client's choices produce, and the insight sheet those choices add up to. They are
 * reachable from anywhere rather than buried a few taps into the atelier, because both are
 * meant to be opened and read in front of someone.
 */
const TABS = [
  { href: "/brief", label: "Design Brief", note: "What one client asked for" },
  { href: "/insights", label: "Insight sheet", note: "What all of them did" },
];

export function DemoTabs() {
  const pathname = usePathname();

  // The gate has nothing to show yet, and the try-on needs the whole screen.
  if (pathname === "/gate" || pathname?.endsWith("/ar")) return null;

  return (
    <nav
      aria-label="Documents"
      className="sticky bottom-0 z-40 border-t border-hairline-quiet bg-ivory/95 backdrop-blur-sm"
    >
      <div className="max-w-content mx-auto px-6 lg:px-margin-d grid grid-cols-2 divide-x divide-hairline-quiet">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={`no-underline py-3 px-4 text-center transition-colors focus-gold ${
                isActive ? "bg-pearl" : "hover:bg-pearl/60"
              }`}
            >
              <span
                className={`block text-ui-m-m text-text ${isActive ? "font-medium" : ""}`}
              >
                {tab.label}
              </span>
              <span className="block caption-m text-text-muted">{tab.note}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
