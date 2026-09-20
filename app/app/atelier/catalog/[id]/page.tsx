"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Button, Field, GoldDivider, Segmented, SpecTable, useToast } from "@/components/ui";
import { ReviewMarkers, type MarkerToggles } from "@/components/atelier/ReviewMarkers";
import { ViewerBoundary } from "@/components/atelier/ViewerBoundary";
import { getAssetUrl } from "@/lib/hooks/usePieces";
import {
  COLLECTIONS,
  CONNECTORS,
  PIECE_TYPES,
  STONE_SHAPES,
  STORY_MAX,
  type Collection,
  type PieceType,
  type Review,
} from "@/lib/review";
import type { CatalogPiece } from "@/lib/atelier/pieces";

const PieceViewer = dynamic(
  () => import("@/components/viewer/PieceViewer").then((m) => m.PieceViewer),
  { ssr: false, loading: () => <div className="aspect-square bg-pearl animate-pulse" /> }
);

const TYPE_OPTIONS = PIECE_TYPES.map((t) => ({
  value: t,
  label: t.charAt(0).toUpperCase() + t.slice(1),
}));

function mm(value: number | undefined, digits = 2): string {
  return typeof value === "number" ? `${value.toFixed(digits)} mm` : "—";
}

export default function AtelierPieceReviewPage() {
  const params = useParams();
  const pieceId = params.id as string;
  const { toast } = useToast();

  const [piece, setPiece] = useState<(CatalogPiece & { thumbUrl?: string | null }) | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [glbUrl, setGlbUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [review, setReview] = useState<Review | null>(null);
  const [toggles, setToggles] = useState<MarkerToggles>({ heads: true, ends: true, post: true });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/atelier/pieces")
      .then((res) => {
        if (!res.ok) throw new Error("Could not load this piece.");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const found = (data.pieces ?? []).find((p: CatalogPiece) => p.id === pieceId) ?? null;
        setPiece(found);
        setReview(found?.review ?? null);
        if (!found) setLoadError("No such piece.");
      })
      .catch((err: Error) => !cancelled && setLoadError(err.message));
    return () => {
      cancelled = true;
    };
  }, [pieceId]);

  useEffect(() => {
    if (!pieceId) return;
    getAssetUrl(pieceId, "web").then(setGlbUrl).catch(() => setGlbUrl(null));
  }, [pieceId]);

  const manifest = piece?.manifest;

  const update = useCallback((patch: Partial<Review>) => {
    setReview((prev) => (prev ? { ...prev, ...patch } : prev));
    setDirty(true);
  }, []);

  const updateOverride = useCallback(
    (patch: Partial<Review["overrides"]>) => {
      setReview((prev) => (prev ? { ...prev, overrides: { ...prev.overrides, ...patch } } : prev));
      setDirty(true);
    },
    []
  );

  const save = useCallback(
    async (status: Review["status"]) => {
      if (!review) return;
      const body: Review = { ...review, status };
      setSaving(true);
      try {
        const res = await fetch(`/api/atelier/pieces/${pieceId}/review`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not save.");
        setReview(data.review);
        setPiece((prev) =>
          prev ? { ...prev, review: data.review, approved: data.review.status === "approved" } : prev
        );
        setDirty(false);
        toast(
          status === "approved"
            ? "Approved. It is now in the collection."
            : status === "hidden"
              ? "Hidden from clients."
              : "Saved.",
          { variant: "positive" }
        );
      } catch (err) {
        toast(err instanceof Error ? err.message : "Could not save.", { variant: "error" });
      } finally {
        setSaving(false);
      }
    },
    [review, pieceId, toast]
  );

  const specRows = useMemo(() => {
    if (!manifest) return [];
    const rows = [
      { label: "Code", value: manifest.id },
      { label: "Type", value: review?.type ?? manifest.type },
      { label: "Layers", value: `${manifest.layers} × ${manifest.layer_t?.toFixed(4)} mm` },
      { label: "Volume", value: `${manifest.volume_mm3?.toFixed(2)} mm³` },
      { label: "Weight 18k Y", value: `${manifest.weights_g?.["18k_yellow"]?.toFixed(2) ?? "—"} g` },
      { label: "Weight 22k Y", value: `${manifest.weights_g?.["22k_yellow"]?.toFixed(2) ?? "—"} g` },
    ];
    if (manifest.curve) {
      rows.push({ label: "Inner radius", value: mm(manifest.curve.inner_radius_mm) });
      rows.push({ label: "Arc span", value: `${manifest.curve.span_deg?.toFixed(1)}°` });
    }
    if (manifest.segment) {
      rows.push({ label: "Segment arc", value: mm(manifest.segment.arc_len_mm) });
      rows.push({
        label: "Connector",
        value: review?.overrides.connector ?? manifest.segment.connector,
      });
    }
    if (manifest.ring) {
      rows.push({ label: "Inner Ø", value: mm(manifest.ring.inner_d_mm) });
      rows.push({
        label: "Size",
        value: `Indian ${manifest.ring.size_in} · US ${manifest.ring.size_us}`,
      });
      rows.push({ label: "Band", value: `${mm(manifest.ring.band_w_mm)} × ${mm(manifest.ring.band_t_mm)}` });
    }
    if (manifest.tops) {
      rows.push({ label: "Post", value: manifest.tops.post ? "modelled" : "not modelled" });
    }
    if ((manifest.heads ?? []).length > 0) {
      const heads = manifest.heads ?? [];
      rows.push({ label: "Heads", value: `${heads.length} × ${heads[0].prongs} prongs` });
      rows.push({ label: "Prong width", value: mm(heads[0].prong_w_mm) });
    }
    const stones = manifest.stones ?? [];
    if (stones.length > 0) {
      const d = review?.overrides.stone_d_mm ?? stones[0].d_mm;
      // Every stone size is derived rather than modelled, but a shared-prong array has no
      // basket to derive it from: it comes from the spacing between prongs. That is a weaker
      // number, so it is labelled rather than left to pass for the usual one.
      const fromSpacing =
        (manifest.heads ?? []).some((h) => h.shared_prongs) && !review?.overrides.stone_d_mm;
      rows.push({
        label: "Stones",
        value: `${stones.length} × Ø ${d.toFixed(2)} mm${fromSpacing ? " (from spacing)" : ""}`,
      });
      rows.push({
        label: "Carat (est.)",
        value: `${stones.reduce((s, x) => s + (x.ct_est ?? 0), 0).toFixed(2)} ct total`,
      });
    }
    return rows;
  }, [manifest, review]);

  if (loadError) {
    return (
      <div className="px-margin-m lg:px-margin-d py-16 max-w-content mx-auto">
        <p role="alert" className="text-body-l-m text-ruby mb-6">{loadError}</p>
        <Link href="/atelier/catalog" className="qh-link">Back to the catalog</Link>
      </div>
    );
  }

  if (!piece || !review || !manifest) {
    return (
      <div className="px-margin-m lg:px-margin-d py-16 max-w-content mx-auto">
        <p className="text-body-m-m text-text-muted">Opening the piece…</p>
      </div>
    );
  }

  const status = review.status;

  return (
    <div className="px-margin-m lg:px-margin-d py-10 lg:py-14 max-w-content mx-auto">
      <Link href="/atelier/catalog" className="caption-m text-text-muted no-underline">
        ← Catalog
      </Link>

      <div className="flex flex-wrap items-baseline justify-between gap-4 mt-4 mb-2">
        <h1 className="font-display text-display-m-m lg:text-display-m-d text-text m-0">
          {review.name ?? "Unnamed piece"}
        </h1>
        <span
          className={`label-s ${
            status === "approved" ? "text-emerald" : status === "hidden" ? "text-stone" : "text-ruby"
          }`}
          data-testid="review-status"
        >
          {status}
        </span>
      </div>
      <p className="caption-m text-text-muted mb-4">{piece.id}</p>
      <GoldDivider className="w-16 mb-8" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Viewer + markers */}
        <div>
          <div className="aspect-square bg-pearl mb-4" data-testid="viewer">
            <ViewerBoundary>
              <PieceViewer
                glbUrl={glbUrl}
                autoRotate={false}
                className="w-full h-full"
                hint="Drag to turn · markers show what the pipeline measured"
                overlay={(fit) => (
                  <ReviewMarkers manifest={manifest} fit={fit} toggles={toggles} />
                )}
              />
            </ViewerBoundary>
          </div>

          <fieldset className="border-0 p-0 m-0">
            <legend className="label-s text-text-muted mb-2">Show</legend>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 caption-m text-text">
                <input
                  type="checkbox"
                  checked={toggles.heads}
                  onChange={(e) => setToggles((t) => ({ ...t, heads: e.target.checked }))}
                  data-testid="toggle-heads"
                />
                Head markers ({(manifest.heads ?? []).length})
              </label>
              {manifest.segment && (
                <label className="flex items-center gap-2 caption-m text-text">
                  <input
                    type="checkbox"
                    checked={toggles.ends}
                    onChange={(e) => setToggles((t) => ({ ...t, ends: e.target.checked }))}
                    data-testid="toggle-ends"
                  />
                  Segment ends ({(manifest.segment.ends ?? []).length})
                </label>
              )}
              {manifest.tops && (
                <label className="flex items-center gap-2 caption-m text-text">
                  <input
                    type="checkbox"
                    checked={toggles.post}
                    onChange={(e) => setToggles((t) => ({ ...t, post: e.target.checked }))}
                    data-testid="toggle-post"
                  />
                  Post {manifest.tops.post ? "" : "(not modelled)"}
                </label>
              )}
            </div>
          </fieldset>

          <SpecTable caption="Measured" rows={specRows} className="mt-8" />

          {piece.warnings.length > 0 && (
            <div className="mt-8">
              <h2 className="label-s text-ruby mb-2">Warnings from the pipeline</h2>
              <ul className="caption-m text-text-muted pl-4">
                {piece.warnings.map((w) => (
                  <li key={w} className="mb-1">{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Review form */}
        <form
          className="flex flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault();
            void save(review.status === "pending" ? "pending" : review.status);
          }}
        >
          <Segmented
            label="Type"
            options={TYPE_OPTIONS}
            value={review.type}
            onChange={(value) => update({ type: value as PieceType })}
          />
          <p className="caption-m text-text-muted -mt-4">
            From the filename prefix: {manifest.type}. Override it here if the shape says otherwise.
          </p>

          <Field
            label="Name"
            value={review.name ?? ""}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="Kundan Thread"
            hint="Lyrical, never salesy."
            data-testid="field-name"
          />

          <Segmented
            label="Collection"
            options={COLLECTIONS.map((c) => ({ value: c, label: c }))}
            value={(review.collection ?? "") as Collection}
            onChange={(value) => update({ collection: value as Collection })}
          />

          <div className="qh-field">
            <label className="qh-label" htmlFor="story">Story</label>
            <textarea
              id="story"
              className="qh-input"
              rows={2}
              maxLength={STORY_MAX}
              value={review.story ?? ""}
              onChange={(e) => update({ story: e.target.value })}
              placeholder="Two lines on how it is made, or what it is for."
              data-testid="field-story"
            />
            <p className="qh-field__hint">
              {(review.story ?? "").length}/{STORY_MAX}
            </p>
          </div>

          <fieldset className="border-0 p-0 m-0 flex flex-col gap-4">
            <legend className="label-s text-text-muted mb-2">Overrides</legend>

            <div className="qh-field">
              <label className="qh-label" htmlFor="stone-shape">Stone shape</label>
              <select
                id="stone-shape"
                className="qh-select"
                value={review.overrides.stone_shape ?? ""}
                onChange={(e) =>
                  updateOverride({
                    stone_shape: (e.target.value || null) as Review["overrides"]["stone_shape"],
                  })
                }
                data-testid="field-stone-shape"
              >
                <option value="">As measured (round)</option>
                {STONE_SHAPES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <Field
              label="Stone size (mm)"
              type="number"
              step="0.05"
              min="0.5"
              max="25"
              value={review.overrides.stone_d_mm ?? ""}
              onChange={(e) =>
                updateOverride({ stone_d_mm: e.target.value === "" ? null : Number(e.target.value) })
              }
              hint={
                (manifest.stones ?? []).length > 0
                  ? `Measured Ø ${manifest.stones![0].d_mm.toFixed(2)} mm`
                  : "Nothing was measured; set it by hand."
              }
              data-testid="field-stone-size"
            />

            {manifest.segment && (
              <div className="qh-field">
                <label className="qh-label" htmlFor="connector">Connector</label>
                <select
                  id="connector"
                  className="qh-select"
                  value={review.overrides.connector ?? ""}
                  onChange={(e) =>
                    updateOverride({
                      connector: (e.target.value || null) as Review["overrides"]["connector"],
                    })
                  }
                  data-testid="field-connector"
                >
                  <option value="">As measured ({manifest.segment.connector})</option>
                  {CONNECTORS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}
          </fieldset>

          <GoldDivider className="w-full" />

          <div className="flex flex-wrap gap-3 items-center">
            <Button
              type="button"
              variant="primary"
              disabled={saving}
              onClick={() => void save("approved")}
              data-testid="approve"
            >
              {status === "approved" ? "Save changes" : "Approve"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={saving}
              onClick={() => void save("hidden")}
              data-testid="hide"
            >
              Hide
            </Button>
            {dirty && <span className="caption-m text-text-muted">Unsaved changes</span>}
          </div>
          <p className="caption-m text-text-muted">
            A piece needs a name and a collection before it can be approved. Only approved pieces
            appear on the client side.
          </p>
        </form>
      </div>
    </div>
  );
}
