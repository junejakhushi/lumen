"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { blobToDataUrl, type SavedLook } from "@/lib/lookBoard";

/**
 * The Design Brief, on screen (SPEC §5.6).
 *
 * The same document a booking sends to the atelier, drawn from whatever is on the look board
 * at this moment. With nothing saved it shows the worked example instead, so the document can
 * be read before anyone has saved a thing.
 */
export default function BriefPage() {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(true);
  const urlRef = useRef<string | null>(null);

  const build = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const { getLooks } = await import("@/lib/lookBoard");
      const saved: SavedLook[] = await getLooks().catch(() => []);
      const looks = await Promise.all(
        saved.slice(0, 4).map(async (l) => ({
          pieceId: l.pieceId,
          pieceName: l.pieceName,
          pieceType: (["bracelet", "ring", "tops"].includes(l.pieceType)
            ? l.pieceType
            : "unknown") as "bracelet" | "ring" | "tops" | "unknown",
          config: l.config,
          weightG: l.weightG,
          quoteTotal: l.quote?.total,
          snapshot: await blobToDataUrl(l.snapshot),
        }))
      );
      setCount(looks.length);

      const res = await fetch("/api/brief/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ looks }),
      });
      if (!res.ok) throw new Error(String(res.status));

      const blob = await res.blob();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = URL.createObjectURL(blob);
      setUrl(urlRef.current);
    } catch {
      setError("The brief could not be drawn up just now.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    build();
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, [build]);

  return (
    <div className="max-w-content mx-auto px-6 lg:px-margin-d py-8 lg:py-12">
      <p className="label-m text-text-muted mb-2">For your consultation</p>
      <h1 className="font-display text-display-m-m lg:text-display-m-d text-text mb-3">
        Design Brief
      </h1>
      <p className="text-body-m-m text-text-muted max-w-measure mb-6">
        {count === 0
          ? "Nothing is on your look board yet, so this is the worked example the atelier works from."
          : `Drawn from the ${count} ${count === 1 ? "piece" : "pieces"} on your look board — ` +
            "what you chose, what it changes from the catalogue piece, and what it is likely to cost."}
      </p>

      <div className="flex gap-3 mb-6">
        <Button variant="secondary" onClick={build} disabled={busy}>
          {busy ? "Drawing it up…" : "Refresh from my look board"}
        </Button>
        {url && (
          <a href={url} download="design-brief.pdf" className="qh-btn qh-btn--secondary no-underline">
            Download
          </a>
        )}
      </div>

      {error ? (
        <p className="text-body-m-m text-text-muted">{error}</p>
      ) : url ? (
        <iframe
          src={url}
          title="Design Brief"
          className="w-full rounded-sm border border-hairline-quiet bg-pearl"
          style={{ height: "80vh" }}
        />
      ) : (
        <div
          className="w-full rounded-sm bg-pearl animate-pulse"
          style={{ height: "80vh" }}
        />
      )}
    </div>
  );
}
