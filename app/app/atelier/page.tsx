import Link from "next/link";
import { GoldDivider } from "@/components/ui";

/**
 * Atelier home. S1.4 ships the catalog; consultations, insights, sessions and security
 * arrive with S1.5.
 */
export default function AtelierHomePage() {
  return (
    <div className="px-margin-m lg:px-margin-d py-12 lg:py-16 max-w-content mx-auto">
      <p className="label-m text-text-muted mb-3">Atelier</p>
      <h1 className="font-display text-display-l-m lg:text-display-l-d text-text mb-3">
        The studio side
      </h1>
      <GoldDivider className="w-16 mb-8" />

      <ul className="list-none p-0 m-0 grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-measure">
        <li>
          <Link href="/atelier/catalog" className="qh-link text-body-l-m">
            Catalog
          </Link>
          <p className="caption-m text-text-muted mt-1">
            Review what the pipeline measured, name each piece, approve it for clients.
          </p>
        </li>
      </ul>
    </div>
  );
}
