"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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

const PieceViewer = dynamic(
  () => import("@/components/viewer/PieceViewer").then((m) => m.PieceViewer),
  { ssr: false, loading: () => <div className="aspect-square bg-pearl animate-pulse rounded-sm" /> }
);

// Default gold rate (₹/g for 24K) — will come from DB later
const DEFAULT_RATE_24K = 7200;

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

  // Load GLB
  useEffect(() => {
    if (!pieceId) return;
    getAssetUrl(pieceId, "web").then(setGlbUrl).catch(() => {});
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

  const handleSizeChange = useCallback((val: number) => {
    if (manifest?.type === "bracelet") setWristCm(val);
  }, [manifest]);

  const handleRingSizeChange = useCallback(
    (val: number) => setRingSizeIn(val),
    []
  );

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
    ...(manifest.type === "bracelet" ? [{ label: "Wrist", value: `${wristCm} cm` }] : []),
    ...(manifest.type === "ring" && currentRingSize
      ? [{ label: "Size", value: `IN ${currentRingSize.indian} · US ${currentRingSize.us}` }]
      : []),
    ...(assembly && assembly.totalStones > 0
      ? [{ label: "Stones", value: `${assembly.totalStones} (${assembly.totalCarats.toFixed(2)} ct est.)` }]
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
                Indicative, including GST, at today&rsquo;s gold rate. Confirmed
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
                  { label: "GST (3%)", value: formatPrice(price.gst) },
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

          {/* Size */}
          {manifest.type === "bracelet" && (
            <Stepper
              label="Wrist size"
              value={wristCm}
              min={14}
              max={20}
              step={0.5}
              formatValue={(v) => `${v} cm`}
              onChange={handleSizeChange}
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
                return s ? `IN ${s.indian} · US ${s.us}` : `IN ${v}`;
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
