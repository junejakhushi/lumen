"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { getAssetUrl, usePieces } from "@/lib/hooks/usePieces";
import { assembleForType } from "@/lib/assembly";
import { computePrice, formatPrice, formatPriceRange } from "@/lib/pricing";
import { Button, SpecTable, PricePill, Segmented, Swatch, Stepper, Sheet } from "@/components/ui";
import { METAL_COLORS, type MetalColor, RING_SIZES } from "@/lib/types";
import type { PieceManifest } from "@/lib/types";
import { allowedRingSizes } from "@/lib/assembly/ring";
import { cmToIn, inToCm, toQuarterInch, WRIST_IN, formatWristIn } from "@/lib/units";
import { recordQuote } from "@/lib/recordQuote";
import { GEM_COLOURS, GEM_CUTS, type GemCut, type GemType } from "@/lib/ar/gems";

const PieceViewer = dynamic(
  () => import("@/components/viewer/PieceViewer").then((m) => m.PieceViewer),
  { ssr: false, loading: () => <div className="aspect-square bg-pearl animate-pulse rounded-sm" /> }
);

// Default gold rate (US$/g for 24K) — will come from DB later
const DEFAULT_RATE_24K = 85;

export default function PieceDetailPage() {
  const params = useParams();
  const pieceId = params.id as string;
  const { pieces } = usePieces();
  const piece = pieces.find((p) => p.id === pieceId);
  const manifest = piece?.manifest as PieceManifest | undefined;

  const [glbUrl, setGlbUrl] = useState<string | null>(null);
  const [metal, setMetal] = useState<MetalColor>("yellow");
  const [karat, setKarat] = useState("18");
  const [wristCm, setWristCm] = useState(16);
  const [ringSizeIn, setRingSizeIn] = useState(13);
  const [customiseOpen, setCustomiseOpen] = useState(false);
  // The pipeline measures settings, not stones, so which stone goes in them is the client's
  // to choose here just as it is in the try-on (SPEC §4.6).
  const [stoneType, setStoneType] = useState<GemType>("diamond");
  const [stoneCut, setStoneCut] = useState<GemCut>("round");
  const [stoneScale, setStoneScale] = useState(1);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const captureRef = useRef<(() => Promise<Blob | null>) | null>(null);

  // Load GLB
  useEffect(() => {
    if (!pieceId) return;
    getAssetUrl(pieceId, "web").then(setGlbUrl).catch(() => {});
  }, [pieceId]);

  // Opening a piece is the interest the try-on either holds or loses (SPEC §5.7).
  useEffect(() => {
    if (!pieceId) return;
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "piece_view", piece_id: pieceId }),
    }).catch(() => {});
  }, [pieceId]);

  // Set initial ring size from manifest
  useEffect(() => {
    if (manifest?.ring?.size_in) {
      setRingSizeIn(manifest.ring.size_in);
    }
  }, [manifest]);

  // Compute assembly + pricing
  const assembly = useMemo(() => {
    if (!manifest) return null;
    return assembleForType(manifest, metal, karat, { wristCm, ringSizeIn });
  }, [manifest, metal, karat, wristCm, ringSizeIn]);

  const price = useMemo(() => {
    if (!assembly) return null;
    return computePrice({
      weight_g: assembly.totalWeight,
      metal,
      karat,
      rate24_per_g: DEFAULT_RATE_24K,
      stones: manifest?.stones?.map((s) => ({
        ct_est: s.ct_est,
        type: s.source,
      })),
    });
  }, [assembly, metal, karat, manifest]);

  const priceLow = useMemo(() => {
    if (!manifest) return 0;
    const a = assembleForType(manifest, metal, "14", { wristCm, ringSizeIn });
    return computePrice({
      weight_g: a.totalWeight,
      metal,
      karat: "14",
      rate24_per_g: DEFAULT_RATE_24K,
    }).total;
  }, [manifest, metal, wristCm, ringSizeIn]);

  const priceHigh = useMemo(() => {
    if (!manifest) return 0;
    const a = assembleForType(manifest, metal, "22", { wristCm, ringSizeIn });
    return computePrice({
      weight_g: a.totalWeight,
      metal,
      karat: "22",
      rate24_per_g: DEFAULT_RATE_24K,
    }).total;
  }, [manifest, metal, wristCm, ringSizeIn]);

  // Ring sizes for this piece
  const ringSizes = useMemo(() => {
    if (!manifest || manifest.type !== "ring") return [];
    return allowedRingSizes(manifest);
  }, [manifest]);

  const currentRingSize = RING_SIZES.find((s) => s.indian === ringSizeIn);

  // Write down what the client settled on, so the insight sheet counts choices.
  useEffect(() => {
    if (!price || !manifest) return;
    recordQuote(
      pieceId,
      {
        metal,
        karat,
        ...(manifest.type === "bracelet" ? { wrist_cm: wristCm } : {}),
        ...(manifest.type === "ring" ? { ring_size_in: ringSizeIn } : {}),
        ...((manifest.heads?.length ?? 0) > 0
          ? { stone_type: stoneType, stone_cut: stoneCut, stone_scale: stoneScale }
          : {}),
      },
      price
    );
  }, [pieceId, manifest, price, metal, karat, wristCm, ringSizeIn, stoneType, stoneCut, stoneScale]);

  const handleSizeChange = useCallback((val: number) => {
    if (manifest?.type === "bracelet") setWristCm(val);
  }, [manifest]);

  const handleRingSizeChange = useCallback(
    (val: number) => setRingSizeIn(val),
    []
  );

  /**
   * Keep the design, not a photograph of one.
   *
   * The look board holds what the client chose — metal, karat, size and stone — together with
   * a picture of the piece rendered as they configured it. The try-on saves the same thing
   * over a camera frame; both carry the configuration, so the atelier reads a specification
   * rather than guessing from an image.
   */
  const handleSaveLook = useCallback(async () => {
    setSaveState("saving");
    try {
      const snapshot = (await captureRef.current?.()) ?? null;
      const { saveLook } = await import("@/lib/lookBoard");
      await saveLook({
        pieceId,
        pieceName: piece?.name || "Piece",
        pieceType: manifest?.type || "unknown",
        snapshot: snapshot as Blob,
        config: {
          metal,
          karat,
          ...(manifest?.type === "bracelet" ? { wristCm } : {}),
          ...(manifest?.type === "ring" ? { ringSizeIn } : {}),
          ...((manifest?.heads?.length ?? 0) > 0
            ? { stoneType, stoneCut, stoneScale }
            : {}),
        },
        quote: price ? { total: price.total, breakdown: price } : undefined,
        weightG: assembly?.totalWeight,
      });
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2400);
    } catch (err) {
      console.error("Could not save the look:", err);
      setSaveState("failed");
      setTimeout(() => setSaveState("idle"), 2400);
    }
  }, [
    pieceId, piece, manifest, metal, karat, wristCm, ringSizeIn,
    stoneType, stoneCut, stoneScale, price, assembly,
  ]);

  if (!piece || !manifest) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <p className="text-body-m-m text-text-muted">Loading piece…</p>
      </div>
    );
  }

  const pieceName = piece.name || manifest.review?.name || `Piece ${pieceId.slice(2, 8)}`;
  const typeLabel = manifest.type === "bracelet" ? "Bracelet" : manifest.type === "ring" ? "Ring" : manifest.type === "tops" ? "Tops" : manifest.type;
  const canAR = manifest.type === "bracelet" || manifest.type === "ring";

  const specRows = [
    { label: "Code", value: pieceId.toUpperCase() },
    { label: "Collection", value: piece.collection || "—" },
    { label: "Metal", value: `${karat}K ${metal.charAt(0).toUpperCase() + metal.slice(1)} Gold` },
    { label: "Weight", value: assembly ? `${assembly.totalWeight.toFixed(1)} g` : "—" },
    ...(manifest.type === "bracelet" ? [{ label: "Wrist", value: formatWristIn(wristCm) }] : []),
    ...(manifest.type === "ring" && currentRingSize
      ? [{ label: "Size", value: `US ${currentRingSize.us}` }]
      : []),
    ...(assembly && assembly.totalStones > 0
      ? [
          {
            label: "Stones",
            value: `${assembly.totalStones} (${assembly.totalCarats.toFixed(2)} ct est.)`,
          },
          {
            label: "Stone",
            value: `${stoneCut[0].toUpperCase()}${stoneCut.slice(1)} ${stoneType}` +
              (manifest.stones?.[0]
                ? ` · Ø ${(manifest.stones[0].d_mm * stoneScale).toFixed(2)} mm`
                : ""),
          },
        ]
      : []),
    ...(manifest.bbox_mm?.size
      ? [{
          label: "Dimensions",
          value: manifest.bbox_mm.size.map((n) => n.toFixed(1)).join(" × ") + " mm",
        }]
      : []),
  ];

  return (
    <div className="max-w-content mx-auto px-6 lg:px-margin-d py-8 lg:py-16">
      <div className="lg:grid lg:grid-cols-2 lg:gap-16">
        {/* 3D Viewer */}
        <div className="mb-8 lg:mb-0">
          <PieceViewer
            glbUrl={glbUrl}
            metalColor={metal}
            heads={manifest?.heads}
            stoneDiameters={manifest?.stones?.map((s) => s.d_mm)}
            stoneType={stoneType}
            stoneCut={stoneCut}
            stoneScale={stoneScale}
            captureRef={captureRef}
            assemble={
              manifest && (manifest.type === "bracelet" || manifest.type === "ring")
                ? {
                    curve: manifest.curve ?? null,
                    pieceType: manifest.type,
                    wornRadiusMm:
                      manifest.type === "ring"
                        ? (RING_SIZES.find((r) => r.indian === ringSizeIn)?.inner_d_mm ?? 17) / 2
                        : (wristCm * 10 + 12) / (2 * Math.PI),
                  }
                : null
            }
            className="aspect-square rounded-sm overflow-hidden"
          />
        </div>

        {/* Details */}
        <div>
          <p className="label-m text-text-muted mb-2">
            {piece.collection && `${piece.collection} · `}{typeLabel}
          </p>
          <h1 className="font-display text-display-m-m lg:text-display-m-d text-text mb-4">
            {pieceName}
          </h1>

          {manifest.review?.story && (
            <p className="text-body-m-m text-text-muted mb-6 max-w-measure font-display italic">
              {manifest.review.story}
            </p>
          )}

          {/* Price pill */}
          {price && (
            <div className="mb-6">
              <PricePill value={formatPriceRange(priceLow, priceHigh)} />
              <p className="caption-m text-text-muted mt-2">
                Indicative, including estimated sales tax, at today&rsquo;s gold rate. Confirmed
                at consultation.
              </p>
            </div>
          )}

          {/* Quick metal swatches */}
          <div className="flex items-center gap-2 mb-6">
            <span className="label-s text-text-muted mr-2">Metal</span>
            {(Object.keys(METAL_COLORS) as MetalColor[])
              .filter((m) => m !== "platinum")
              .map((m) => (
                <Swatch
                  key={m}
                  color={METAL_COLORS[m]}
                  name={m.charAt(0).toUpperCase() + m.slice(1)}
                  selected={metal === m}
                  onClick={() => setMetal(m)}
                />
              ))}
          </div>

          {/* Spec table */}
          <SpecTable caption="Specifications" rows={specRows} className="mb-8" />

          {/* Price breakdown */}
          {price && (
            <div className="mb-8">
              <SpecTable
                caption="How the price is made"
                rows={[
                  { label: "Gold value", value: formatPrice(price.metal_value) },
                  { label: "Making (18%)", value: formatPrice(price.making) },
                  ...(price.stones_value > 0
                    ? [{ label: "Stones", value: formatPrice(price.stones_value) }]
                    : []),
                  {
                    label: `Sales tax (est. ${Math.round(price.tax_pct * 100)}%)`,
                    value: formatPrice(price.tax),
                  },
                  { label: "Indicative total", value: formatPrice(price.total) },
                ]}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            {canAR ? (
              <Link
                href={`/piece/${pieceId}/ar`}
                className="qh-btn qh-btn--primary flex-1 no-underline"
              >
                Try it on
              </Link>
            ) : (
              <span className="qh-btn qh-btn--primary flex-1 opacity-50 cursor-default">
                View in 3D
              </span>
            )}
            <Button
              variant="secondary"
              onClick={() => setCustomiseOpen(true)}
              className="flex-1"
            >
              Customise
            </Button>
          </div>

          <div className="mb-6">
            <Button
              variant="secondary"
              block
              onClick={handleSaveLook}
              disabled={saveState === "saving"}
            >
              {saveState === "saved"
                ? "Saved to your look board"
                : saveState === "failed"
                  ? "Could not save — try again"
                  : saveState === "saving"
                    ? "Saving…"
                    : "Save this design"}
            </Button>
            <p className="caption-m text-text-muted mt-2">
              Keeps the piece as you have set it — metal, size and stone — on your look board,
              ready for your design brief.
            </p>
          </div>
        </div>
      </div>

      {/* Customise Sheet */}
      <Sheet
        open={customiseOpen}
        onClose={() => setCustomiseOpen(false)}
        title="Make it yours"
        footer={
          <Button variant="primary" block onClick={() => setCustomiseOpen(false)}>
            Apply
          </Button>
        }
      >
        <div className="flex flex-col gap-6">
          <p className="text-body-s-m text-text-muted">
            Changes here go into your design brief. The atelier confirms each one with you.
          </p>

          {/* Metal */}
          <Segmented
            label="Metal"
            options={[
              { value: "yellow" as const, label: "Yellow", dotColor: METAL_COLORS.yellow },
              { value: "white" as const, label: "White", dotColor: METAL_COLORS.white },
              { value: "rose" as const, label: "Rose", dotColor: METAL_COLORS.rose },
            ]}
            value={metal}
            onChange={(v) => setMetal(v as MetalColor)}
          />

          {/* Karat */}
          <Segmented
            label="Karat"
            options={[
              { value: "14", label: "14K" },
              { value: "18", label: "18K" },
              { value: "22", label: "22K" },
            ]}
            value={karat}
            onChange={setKarat}
          />

          {/* Stone — the settings are measured, the stone in them is chosen (SPEC §4.6) */}
          {(manifest.heads?.length ?? 0) > 0 && (
            <div className="flex flex-col gap-4 border-t border-hairline-quiet pt-6">
              <div>
                <span className="label-m text-text-muted block mb-2">Stone</span>
                <div className="flex gap-2">
                  {(["diamond", "ruby", "emerald", "sapphire", "polki"] as GemType[]).map((g) => (
                    <Swatch
                      key={g}
                      color={GEM_COLOURS[g]}
                      name={g.charAt(0).toUpperCase() + g.slice(1)}
                      selected={stoneType === g}
                      onClick={() => setStoneType(g)}
                    />
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto -mx-1 px-1">
                <Segmented
                  label="Cut"
                  options={GEM_CUTS.map((c) => ({
                    value: c,
                    label: c.charAt(0).toUpperCase() + c.slice(1),
                  }))}
                  value={stoneCut}
                  onChange={(v) => setStoneCut(v as GemCut)}
                />
              </div>

              <Stepper
                label="Stone size"
                value={stoneScale}
                min={0.7}
                max={1.6}
                step={0.1}
                formatValue={(v) =>
                  `${((manifest.stones?.[0]?.d_mm ?? 3) * v).toFixed(2)} mm`
                }
                onChange={setStoneScale}
              />
            </div>
          )}

          {/* Size */}
          {manifest.type === "bracelet" && (
            <Stepper
              label="Wrist size"
              value={toQuarterInch(cmToIn(wristCm))}
              min={WRIST_IN.min}
              max={WRIST_IN.max}
              step={WRIST_IN.step}
              formatValue={(v) => `${v} in`}
              onChange={(inches) => handleSizeChange(inToCm(inches))}
            />
          )}

          {manifest.type === "ring" && ringSizes.length > 0 && (
            <Stepper
              label="Ring size"
              value={ringSizeIn}
              min={ringSizes[0].indian}
              max={ringSizes[ringSizes.length - 1].indian}
              step={1}
              formatValue={(v) => {
                const s = RING_SIZES.find((rs) => rs.indian === v);
                return s ? `US ${s.us}` : `${v}`;
              }}
              onChange={handleRingSizeChange}
            />
          )}

          {/* Live weight + price */}
          {assembly && price && (
            <div className="border-t border-hairline-quiet pt-4">
              <div className="flex justify-between items-baseline mb-2">
                <span className="label-m text-text-muted">Weight</span>
                <span className="text-numeric-m">{assembly.totalWeight.toFixed(1)} g</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="label-m text-text-muted">Indicative</span>
                <span className="text-numeric-m font-medium">{formatPrice(price.total)}</span>
              </div>
            </div>
          )}
        </div>
      </Sheet>
    </div>
  );
}
