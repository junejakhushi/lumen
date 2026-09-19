"use client";

import { useState, useEffect } from "react";
import type { PieceRow } from "@/lib/types";

let cachedPieces: PieceRow[] | null = null;

export function usePieces() {
  const [pieces, setPieces] = useState<PieceRow[]>(cachedPieces ?? []);
  const [loading, setLoading] = useState(!cachedPieces);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedPieces) return;

    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/pieces");
        if (!res.ok) throw new Error("Failed to load pieces");
        const data = await res.json();
        if (!cancelled) {
          cachedPieces = data.pieces;
          setPieces(data.pieces);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
          setLoading(false);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return { pieces, loading, error };
}

/** Get a signed asset URL (cached in memory per session) */
const urlCache = new Map<string, { url: string; expires: number }>();

export async function getAssetUrl(
  pieceId: string,
  kind: "web" | "ar" | "thumb"
): Promise<string> {
  const key = `${pieceId}:${kind}`;
  const cached = urlCache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.url;
  }

  const res = await fetch(`/api/pieces/${pieceId}/asset?kind=${kind}`);
  if (!res.ok) throw new Error("Failed to get asset URL");
  const data = await res.json();
  // Cache for 4 minutes (URL expires in 5)
  urlCache.set(key, { url: data.url, expires: Date.now() + 4 * 60 * 1000 });
  return data.url;
}
