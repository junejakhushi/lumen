"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

const NAV_LINKS = [
  { href: "/collection", label: "Collection" },
  { href: "/looks", label: "Look board" },
  { href: "/book", label: "Book" },
];

export function Nav() {
  const pathname = usePathname();

  // Don't show nav on the gate page or AR page
  if (pathname === "/gate" || pathname?.endsWith("/ar")) return null;

  return (
    <header className="flex items-center justify-between px-margin-m lg:px-margin-d py-4 border-b border-hairline-quiet">
      <Link href="/" aria-label="Lumen home" className="focus-gold rounded-sm">
        <Image
          src="/brand/brand/monogram.svg"
          alt=""
          width={32}
          height={32}
          className="block"
          priority
        />
      </Link>
      <nav aria-label="Main" className="flex items-center gap-5 lg:gap-8">
        {NAV_LINKS.map((link) => {
          const isActive = pathname === link.href || pathname?.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`qh-link text-ui-m-m ${isActive ? "font-medium" : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
