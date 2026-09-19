import type { Metadata } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { ToastProvider } from "@/components/ui/Toast";
import "@/public/brand/tokens/tokens.css";
import "@/public/brand/design-system/components/bundle.css";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const jost = Jost({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ui",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lumen — Wear it before it's made",
  description:
    "A private AR try-on experience for fine jewellery. Browse, wear, customise, and book a consultation.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-theme="paper"
      className={`${cormorant.variable} ${jost.variable}`}
    >
      <body className="bg-surface text-text font-ui antialiased">
        <a
          href="#main"
          className="qh-sr focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-surface focus:text-text"
        >
          Skip to content
        </a>
        <ToastProvider>
          <Nav />
          <main id="main" className="page-enter">
            {children}
          </main>
          <Footer />
        </ToastProvider>
      </body>
    </html>
  );
}
