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

  // Don't show nav on the gate page
  if (pathname === "/gate") return null;

  return (
    <header className="flex items-center justify-between px-6 lg:px-margin-d py-4 border-b border-hairline-quiet">
      <Link href="/" aria-label="Lumen home">
        <Image
          src="/brand/brand/monogram.svg"
          alt=""
          width={32}
          height={32}
          className="block"
          priority
        />
      </Link>
      <nav aria-label="Main" className="flex items-center gap-6">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`qh-link text-ui-m-m ${
              pathname === link.href ? "font-medium" : ""
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
