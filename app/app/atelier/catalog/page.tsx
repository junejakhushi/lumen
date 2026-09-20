"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Chip, GoldDivider, Loader } from "@/components/ui";
import type { CatalogPiece } from "@/lib/atelier/pieces";

type Row = CatalogPiece & { thumbUrl: string | null };

const FILTERS = ["All", "Pending", "Approved", "Hidden", "With warnings"] as const;
type Filter = (typeof FILTERS)[number];

const TYPE_LABELS: Record<string, string> = {
  bracelet: "Bracelet",
  ring: "Ring",
  tops: "Tops",
  unknown: "Unknown",
};

function statusOf(piece: Row): "Approved" | "Hidden" | "Pending" {
  if (piece.approved || piece.review.status === "approved") return "Approved";
  if (piece.review.status === "hidden") return "Hidden";
  return "Pending";
}

function stoneSummary(piece: Row): string {
  const override = piece.review.overrides.stone_d_mm;
  const stones = piece.manifest.stones ?? [];
  if (stones.length === 0) return override ? `Ø ${override.toFixed(2)} mm (set by hand)` : "None found";
  const d = override ?? stones[0].d_mm;
  const carats = stones.reduce((sum, s) => sum + (s.ct_est ?? 0), 0);
  return `${stones.length} × Ø ${d.toFixed(2)} mm · ${carats.toFixed(2)} ct total`;
}

function weight18k(piece: Row): string {
  const g = piece.manifest.weights_g?.["18k_yellow"] ?? piece.manifest.weights_g?.["18k_y"];
  return typeof g === "number" ? `${g.toFixed(2)} g` : "—";
}

export default function AtelierCatalogPage() {
  const [pieces, setPieces] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string>("");
  const [filter, setFilter] = useState<Filter>("All");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/atelier/pieces")
      .then((res) => {
        if (!res.ok) throw new Error("Could not load the catalog.");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setPieces(data.pieces ?? []);
        setSource(data.source ?? "");
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(() => {
    const byStatus = { Approved: 0, Hidden: 0, Pending: 0 };
    let warned = 0;
    for (const p of pieces) {
      byStatus[statusOf(p)] += 1;
      if (p.warnings.length > 0) warned += 1;
    }
    return { ...byStatus, warned };
  }, [pieces]);

  const filtered = useMemo(() => {
    switch (filter) {
      case "Pending":
      case "Approved":
      case "Hidden":
        return pieces.filter((p) => statusOf(p) === filter);
      case "With warnings":
        return pieces.filter((p) => p.warnings.length > 0);
      default:
        return pieces;
    }
  }, [pieces, filter]);

  return (
    <div className="px-margin-m lg:px-margin-d py-12 lg:py-16 max-w-content mx-auto">
      <p className="label-m text-text-muted mb-3">Atelier</p>
      <h1 className="font-display text-display-l-m lg:text-display-l-d text-text mb-3">Catalog</h1>
      <GoldDivider className="w-16 mb-6" />
      <p className="text-body-l-m lg:text-body-l-d text-text-muted mb-8 max-w-measure">
        Every piece the pipeline has produced. Name it, place it in a collection, check what was
        measured, then approve it. Only approved pieces reach the client side.
      </p>

      <div className="flex flex-wrap gap-3 mb-6" role="group" aria-label="Filter the catalog">
        {FILTERS.map((f) => (
          <Chip
            key={f}
            selected={filter === f}
            onClick={() => setFilter(f)}
            count={
              f === "All"
                ? pieces.length
                : f === "With warnings"
                  ? counts.warned
                  : counts[f as "Approved" | "Hidden" | "Pending"]
            }
          >
            {f}
          </Chip>
        ))}
      </div>

      <p className="label-s text-text-muted mb-6" data-testid="catalog-count">
        {filtered.length} {filtered.length === 1 ? "piece" : "pieces"}
        {source === "files" && " · read from the pipeline output (no database configured)"}
      </p>

      {loading && <Loader />}
      {error && (
        <p role="alert" className="text-body-m-m text-ruby">
          {error}
        </p>
      )}

      {!loading && !error && filtered.length === 0 && (
        <p className="text-body-m-m text-text-muted">
          Nothing here yet. Run <code>lumen ingest</code>, then <code>lumen publish</code>.
        </p>
      )}

      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 list-none p-0">
        {filtered.map((piece) => {
          const status = statusOf(piece);
          return (
            <li key={piece.id} data-testid="catalog-card" data-piece-id={piece.id}>
              <Link
                href={`/atelier/catalog/${piece.id}`}
                className="block no-underline group focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
              >
                <div className="aspect-square bg-pearl mb-4 overflow-hidden">
                  {piece.thumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={piece.thumbUrl}
                      alt=""
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full grid place-items-center caption-m text-text-muted">
                      No thumbnail
                    </div>
                  )}
                </div>

                <div className="flex items-baseline justify-between gap-3 mb-1">
                  <h2 className="font-display text-title-s-m text-text m-0">
                    {piece.name ?? "Unnamed"}
                  </h2>
                  <span
                    className={`label-s ${
                      status === "Approved"
                        ? "text-emerald"
                        : status === "Hidden"
                          ? "text-stone"
                          : "text-ruby"
                    }`}
                    data-testid="status"
                  >
                    {status}
                  </span>
                </div>

                <p className="caption-m text-text-muted mb-2">
                  {TYPE_LABELS[piece.type] ?? piece.type}
                  {piece.collection ? ` · ${piece.collection}` : ""} · {piece.id}
                </p>

                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 caption-m text-text-muted m-0">
                  <dt className="m-0">18k yellow</dt>
                  <dd className="m-0 text-text">{weight18k(piece)}</dd>
                  <dt className="m-0">Stones</dt>
                  <dd className="m-0 text-text">{stoneSummary(piece)}</dd>
                </dl>

                {piece.warnings.length > 0 && (
                  <p className="caption-m mt-2 text-ruby" data-testid="warnings">
                    {piece.warnings.length} warning{piece.warnings.length === 1 ? "" : "s"} to read
                  </p>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
