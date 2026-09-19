"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePieces, getAssetUrl } from "@/lib/hooks/usePieces";
import { Chip } from "@/components/ui";
import type { PieceRow } from "@/lib/types";

const COLLECTIONS = ["All", "Heirloom", "Fine", "Playful"] as const;
const TYPE_LABELS: Record<string, string> = {
  bracelet: "Bracelet",
  ring: "Ring",
  tops: "Tops",
};

export default function CollectionPage() {
  const { pieces, loading } = usePieces();
  const [filter, setFilter] = useState<string>("All");

  const filtered = useMemo(() => {
    if (filter === "All") return pieces;
    return pieces.filter((p) => p.collection === filter);
  }, [pieces, filter]);

  return (
    <div className="px-6 lg:px-margin-d py-12 max-w-content mx-auto">
      <h1 className="font-display text-display-l-m lg:text-display-l-d text-text mb-2">
        The collection
      </h1>
      <p className="text-body-m-m text-text-muted mb-8 max-w-measure">
        Every piece is made to order in the atelier. Try it on here, then make
        it yours.
      </p>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-8" role="group" aria-label="Filter by collection">
        {COLLECTIONS.map((c) => (
          <Chip
            key={c}
            selected={filter === c}
            onClick={() => setFilter(c)}
            count={
              c === "All"
                ? pieces.length
                : pieces.filter((p) => p.collection === c).length
            }
          >
            {c}
          </Chip>
        ))}
      </div>

      {/* Results count */}
      <p className="label-s text-text-muted mb-6">
        {filtered.length} {filtered.length === 1 ? "piece" : "pieces"}
      </p>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[4/5] bg-pearl rounded-sm animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {filtered.map((piece) => (
            <PieceCard key={piece.id} piece={piece} />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-20">
          <p className="text-body-m-m text-text-muted">No pieces to show.</p>
        </div>
      )}
    </div>
  );
}

function PieceCard({ piece }: { piece: PieceRow }) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);

  useEffect(() => {
    getAssetUrl(piece.id, "thumb").then(setThumbUrl).catch(() => {});
  }, [piece.id]);

  const canAR = piece.type === "bracelet" || piece.type === "ring";
  const pieceName = piece.name || piece.manifest?.review?.name || `Piece ${piece.id.slice(2, 8)}`;
  const typeLabel = TYPE_LABELS[piece.type] || piece.type;

  return (
    <Link
      href={`/piece/${piece.id}`}
      className="group block rounded-sm overflow-hidden no-underline"
      aria-label={`${pieceName}, ${piece.collection || ""}`}
    >
      <div className="aspect-[4/5] bg-pearl relative overflow-hidden">
        {thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbUrl}
            alt={pieceName}
            className="w-full h-full object-cover transition-transform duration-slow ease-quiet group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-pearl shimmer" />
        )}
        {canAR && (
          <span className="absolute top-3 right-3 label-s bg-surface-control text-text px-2 py-1 rounded-pill border border-hairline">
            AR
          </span>
        )}
      </div>
      <div className="pt-3 pb-2">
        <p className="font-display text-title-s-m lg:text-title-s-d text-text truncate">
          {pieceName}
        </p>
        <p className="label-s text-text-muted mt-1">
          {piece.collection && `${piece.collection} · `}{typeLabel}
        </p>
      </div>
    </Link>
  );
}
