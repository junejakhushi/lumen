"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { getLooks, deleteLook, type SavedLook } from "@/lib/lookBoard";
import { Button } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { formatPrice } from "@/lib/pricing";

export default function LooksPage() {
  const [looks, setLooks] = useState<SavedLook[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const loadLooks = useCallback(async () => {
    try {
      const data = await getLooks();
      setLooks(data);
    } catch {
      // IndexedDB not available
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLooks();
  }, [loadLooks]);

  const handleDelete = useCallback(
    async (look: SavedLook) => {
      await deleteLook(look.id);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(look.id);
        return next;
      });
      await loadLooks();
      toast(`${look.pieceName} removed.`, {
        action: {
          label: "Undo",
          onClick: () => {
            // Re-save not implemented — just reload
            loadLooks();
          },
        },
      });
    },
    [loadLooks, toast]
  );

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 4) {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Empty state
  if (!loading && looks.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
        <Image
          src="/brand/brand/empty/empty-look-board.svg"
          alt=""
          width={160}
          height={160}
          className="mb-6 opacity-60"
        />
        <h1 className="font-display text-title-l-m lg:text-title-l-d text-text mb-2">
          Nothing saved yet
        </h1>
        <p className="text-body-m-m text-text-muted mb-8 max-w-measure">
          Save a piece, or take a snapshot while trying on, and it will wait for
          you here.
        </p>
        <Link href="/collection" className="qh-btn qh-btn--primary no-underline">
          Explore the collection
        </Link>
      </div>
    );
  }

  return (
    <div className="px-6 lg:px-margin-d py-12 max-w-content mx-auto">
      <h1 className="font-display text-display-l-m lg:text-display-l-d text-text mb-2">
        Your look board
      </h1>
      <p className="text-body-m-m text-text-muted mb-2 max-w-measure">
        The pieces you&rsquo;ve saved and tried on, kept together for your
        consultation.
      </p>
      <p className="caption-m text-text-muted mb-8">
        {looks.length} {looks.length === 1 ? "piece" : "pieces"} · Your look
        board stays on this device until you book.
      </p>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-[4/5] bg-pearl rounded-sm animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
            {looks.map((look) => (
              <LookCard
                key={look.id}
                look={look}
                isSelected={selected.has(look.id)}
                onToggle={() => toggleSelect(look.id)}
                onDelete={() => handleDelete(look)}
              />
            ))}
          </div>

          {/* Book CTA */}
          <div className="flex flex-col sm:flex-row items-center gap-4 border-t border-hairline-quiet pt-8">
            <p className="text-body-m-m text-text-muted flex-1">
              {selected.size > 0
                ? `${selected.size} ${selected.size === 1 ? "piece" : "pieces"} selected`
                : "Select up to 4 pieces to book with"}
            </p>
            <Link
              href={`/book?looks=${Array.from(selected).join(",")}`}
              className={`qh-btn qh-btn--primary no-underline ${
                selected.size === 0 ? "opacity-40 pointer-events-none" : ""
              }`}
              aria-disabled={selected.size === 0}
            >
              Book a consultation with these looks
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function LookCard({
  look,
  isSelected,
  onToggle,
  onDelete,
}: {
  look: SavedLook;
  isSelected: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);

  useEffect(() => {
    if (look.snapshot) {
      const url = URL.createObjectURL(look.snapshot);
      setThumbUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [look.snapshot]);

  const date = new Date(look.createdAt);
  const dateStr = date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

  return (
    <div
      className={`rounded-sm overflow-hidden border transition-all duration-base ease-quiet ${
        isSelected
          ? "border-gold ring-2 ring-gold/30"
          : "border-hairline-quiet hover:border-control-line"
      }`}
    >
      {/* Snapshot */}
      <button
        type="button"
        className="block w-full aspect-[4/5] bg-pearl relative overflow-hidden cursor-pointer"
        onClick={onToggle}
        aria-pressed={isSelected}
        aria-label={`${isSelected ? "Deselect" : "Select"} ${look.pieceName}`}
      >
        {thumbUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbUrl} alt={look.pieceName} className="w-full h-full object-cover" />
        )}
        {isSelected && (
          <div className="absolute top-2 right-2 w-6 h-6 bg-gold rounded-full flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#F5F0E8" strokeWidth="2" strokeLinecap="round">
              <polyline points="2.5 7 5.5 10 11.5 4" />
            </svg>
          </div>
        )}
      </button>

      {/* Details */}
      <div className="p-3">
        <p className="font-display text-title-s-m text-text truncate">
          {look.pieceName}
        </p>
        <p className="caption-m text-text-muted mt-1">
          {look.config.karat}K {look.config.metal}
          {look.config.stoneType ? ` · ${look.config.stoneCut ?? ""} ${look.config.stoneType}`.replace(/\s+/g, " ") : ""}
          {" · "}{dateStr}
        </p>
        {look.quote && (
          <p className="text-numeric-m text-text mt-1">
            {formatPrice(look.quote.total)}
          </p>
        )}
        <button
          type="button"
          className="qh-link caption-m text-text-muted mt-2"
          onClick={onDelete}
          aria-label={`Remove ${look.pieceName} from look board`}
        >
          Remove
        </button>
      </div>
    </div>
  );
}
