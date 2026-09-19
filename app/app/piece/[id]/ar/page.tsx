"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Image from "next/image";
import { usePieces, getAssetUrl } from "@/lib/hooks/usePieces";
import { useCamera } from "@/lib/ar/useCamera";
import { useHandTracking } from "@/lib/ar/useHandTracking";
import { solveWristPose, solveRingPose } from "@/lib/ar/wristPose";
import { OneEuroFilter3, OneEuroFilterQuat } from "@/lib/ar/oneEuro";
import { sampleLighting, type LightingParams } from "@/lib/ar/lightingMatch";
import { assembleForType } from "@/lib/assembly";
import { computePrice, formatPrice } from "@/lib/pricing";
import { Swatch, Segmented, Stepper, PricePill } from "@/components/ui";
import { METAL_COLORS, type MetalColor, RING_SIZES } from "@/lib/types";
import type { PieceManifest } from "@/lib/types";
import { allowedRingSizes } from "@/lib/assembly/ring";

const ARScene = dynamic(
  () => import("@/components/ar/ARScene").then((m) => m.ARScene),
  { ssr: false }
);

const CAMERA_FOV_DEG = Number(process.env.NEXT_PUBLIC_CAMERA_FOV_DEG || 60);
const PALM_WIDTH_MM = Number(process.env.NEXT_PUBLIC_PALM_WIDTH_MM || 80);
const DEFAULT_RATE_24K = 7200;

type TrackingLabel = "Finding you\u2026" | "Looking good" | "Move a little closer" | "We've lost you for a moment. Hold still.";

export default function ARPage() {
  const params = useParams();
  const router = useRouter();
  const pieceId = params.id as string;
  const { pieces } = usePieces();
  const piece = pieces.find((p) => p.id === pieceId);
  const manifest = piece?.manifest as PieceManifest | undefined;

  // Camera
  const { videoRef, hasPermission, error: camError, requestCamera, flipCamera, stopCamera, facing } = useCamera();

  // Hand tracking
  const { landmarks, status: trackingStatus, fps, start: startTracking, stop: stopTracking, error: trackingError } = useHandTracking();

  // State
  const [glbUrl, setGlbUrl] = useState<string | null>(null);
  const [metal, setMetal] = useState<MetalColor>("yellow");
  const [karat, setKarat] = useState("18");
  const [wristCm, setWristCm] = useState(16);
  const [ringSizeIn, setRingSizeIn] = useState(13);
  const [lighting, setLighting] = useState<LightingParams>({
    envMapIntensity: 1, tintR: 1, tintG: 1, tintB: 1,
  });
  const [showPermission, setShowPermission] = useState(true);
  const [snapshotFlash, setSnapshotFlash] = useState(false);
  const [lowFps, setLowFps] = useState(false);

  // Smoothing filters
  const posFilterRef = useRef(new OneEuroFilter3(1.0, 0.02));
  const quatFilterRef = useRef(new OneEuroFilterQuat(
    manifest?.type === "ring" ? 0.7 : 1.0, 0.02
  ));

  // AR start time for events
  const arStartRef = useRef<number>(0);

  // Load AR GLB
  useEffect(() => {
    if (!pieceId) return;
    getAssetUrl(pieceId, "ar").then(setGlbUrl).catch(() => {});
  }, [pieceId]);

  // Set initial ring size
  useEffect(() => {
    if (manifest?.ring?.size_in) setRingSizeIn(manifest.ring.size_in);
  }, [manifest]);

  // Start tracking when video is ready
  useEffect(() => {
    if (hasPermission && videoRef.current) {
      const video = videoRef.current;
      const handleReady = () => {
        if (video.videoWidth > 0) startTracking(video);
      };
      video.addEventListener("loadeddata", handleReady);
      if (video.readyState >= 2) handleReady();
      arStartRef.current = Date.now();
      return () => video.removeEventListener("loadeddata", handleReady);
    }
  }, [hasPermission, startTracking, videoRef]);

  // Lighting match every 500ms
  useEffect(() => {
    if (!hasPermission || !videoRef.current) return;
    const interval = setInterval(() => {
      if (videoRef.current) {
        setLighting(sampleLighting(videoRef.current));
      }
    }, 500);
    return () => clearInterval(interval);
  }, [hasPermission, videoRef]);

  // Low FPS fallback detection
  useEffect(() => {
    if (fps > 0 && fps < 15) {
      const timer = setTimeout(() => setLowFps(true), 3000);
      return () => clearTimeout(timer);
    } else {
      setLowFps(false);
    }
  }, [fps]);

  // Solve pose
  const pose = useMemo(() => {
    if (!landmarks || !videoRef.current) return null;
    const vw = videoRef.current.videoWidth;
    const vh = videoRef.current.videoHeight;
    if (vw === 0) return null;

    const rawPose = manifest?.type === "ring"
      ? solveRingPose(landmarks, vw, vh, CAMERA_FOV_DEG, PALM_WIDTH_MM)
      : solveWristPose(landmarks, vw, vh, CAMERA_FOV_DEG, PALM_WIDTH_MM);

    if (!rawPose) return null;

    // Apply smoothing
    const t = performance.now() / 1000;
    const pos = posFilterRef.current.filter(rawPose.position, t);
    const quat = quatFilterRef.current.filter(rawPose.quaternion, t);

    return { ...rawPose, position: pos, quaternion: quat };
  }, [landmarks, manifest?.type, videoRef]);

  // Assembly + pricing
  const assembly = useMemo(() => {
    if (!manifest) return null;
    return assembleForType(manifest, metal, karat, { wristCm, ringSizeIn });
  }, [manifest, metal, karat, wristCm, ringSizeIn]);

  const price = useMemo(() => {
    if (!assembly) return null;
    return computePrice({
      weight_g: assembly.totalWeight, metal, karat,
      rate24_per_g: DEFAULT_RATE_24K,
    });
  }, [assembly, metal, karat]);

  // Inner radius for occluder
  const innerRadiusMm = useMemo(() => {
    if (manifest?.type === "ring") {
      const s = RING_SIZES.find((rs) => rs.indian === ringSizeIn);
      return (s?.inner_d_mm ?? 17) / 2;
    }
    return (wristCm * 10 + 12) / (2 * Math.PI);
  }, [manifest?.type, wristCm, ringSizeIn]);

  const videoAspect = videoRef.current
    ? videoRef.current.videoWidth / (videoRef.current.videoHeight || 1)
    : 16 / 9;

  // Snapshot
  const handleSnapshot = useCallback(async () => {
    if (!videoRef.current) return;
    setSnapshotFlash(true);
    setTimeout(() => setSnapshotFlash(false), 300);

    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Draw video frame
      if (facing === "user") {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0);

      // Overlay the WebGL canvas
      const glCanvas = document.querySelector("canvas:not(video ~ canvas)") as HTMLCanvasElement | null;
      if (glCanvas) {
        if (facing === "user") {
          ctx.setTransform(-1, 0, 0, 1, canvas.width, 0);
        } else {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
        }
        ctx.drawImage(glCanvas, 0, 0, canvas.width, canvas.height);
      }

      // Save to IndexedDB
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
      if (blob) {
        const { saveLook } = await import("@/lib/lookBoard");
        await saveLook({
          pieceId,
          pieceName: piece?.name || "Piece",
          pieceType: manifest?.type || "unknown",
          snapshot: blob,
          config: { metal, karat, wristCm, ringSizeIn },
          quote: price ? { total: price.total, breakdown: price } : undefined,
        });
      }
    } catch (err) {
      console.error("Snapshot failed:", err);
    }
  }, [videoRef, facing, pieceId, piece, manifest, metal, karat, wristCm, ringSizeIn, price]);

  // Close AR
  const handleClose = useCallback(() => {
    stopTracking();
    stopCamera();
    // Emit ar_stop event
    const seconds = (Date.now() - arStartRef.current) / 1000;
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "ar_stop",
        piece_id: pieceId,
        payload: { seconds: Math.round(seconds) },
      }),
    }).catch(() => {});
    router.back();
  }, [stopTracking, stopCamera, pieceId, router]);

  // Ring sizes
  const ringSizes = useMemo(() => {
    if (!manifest || manifest.type !== "ring") return [];
    return allowedRingSizes(manifest);
  }, [manifest]);

  // Tops redirect
  if (manifest?.type === "tops") {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center text-ivory px-6 text-center" data-theme="evening">
        <div>
          <p className="font-display text-title-m-m mb-4">Ear try-on coming soon</p>
          <p className="text-body-m-m text-text-muted mb-6">
            Tops are shown in 3D for now.
          </p>
          <button onClick={() => router.back()} className="qh-btn qh-btn--secondary">
            View in 3D
          </button>
        </div>
      </div>
    );
  }

  // Permission screen
  if (showPermission && hasPermission !== true) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 text-center">
        <Image
          src="/brand/brand/illus/camera-permission.svg"
          alt=""
          width={200}
          height={200}
          className="mb-8"
        />
        <h2 className="font-display text-title-l-m mb-2">Try it on</h2>
        <p className="text-body-m-m text-text-muted mb-2 max-w-measure">
          We&rsquo;ll use your camera to place the piece on you, live.
        </p>
        <div className="flex items-center gap-2 mb-8">
          <Image src="/brand/brand/icons/eye-off.svg" alt="" width={16} height={16} className="opacity-50" />
          <p className="caption-m text-text-muted">
            Your camera stays on this device. Nothing is recorded or uploaded.
          </p>
        </div>
        {camError && (
          <p className="text-status-error text-body-s-m mb-4">{camError}</p>
        )}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            className="qh-btn qh-btn--primary qh-btn--block"
            onClick={async () => {
              await requestCamera();
              setShowPermission(false);
            }}
          >
            Allow camera
          </button>
          <button
            className="qh-btn qh-btn--secondary qh-btn--block"
            onClick={() => router.back()}
          >
            Not now, show it in 3D
          </button>
        </div>
      </div>
    );
  }

  // Low FPS fallback
  if (lowFps) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center text-ivory px-6 text-center" data-theme="evening">
        <div>
          <p className="font-display text-title-m-m mb-4">AR runs better on a faster device</p>
          <p className="text-body-m-m text-text-muted mb-6">
            Running at {fps} fps. Try it in 3D instead for the best experience.
          </p>
          <button onClick={() => router.back()} className="qh-btn qh-btn--secondary">
            View in 3D instead
          </button>
        </div>
      </div>
    );
  }

  // Tracking status label
  const trackingLabel: TrackingLabel =
    trackingStatus === "finding" ? "Finding you\u2026" :
    trackingStatus === "tracking" ? "Looking good" :
    trackingStatus === "lost" ? "We've lost you for a moment. Hold still." :
    "Finding you\u2026";

  const trackingVariant =
    trackingStatus === "tracking" ? "qh-track--good" :
    trackingStatus === "lost" ? "qh-track--closer" : "";

  const pieceName = piece?.name || manifest?.review?.name || `Piece`;

  return (
    <div className="fixed inset-0 bg-ink" data-theme="evening">
      {/* Video */}
      <video
        ref={videoRef as React.RefObject<HTMLVideoElement>}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: facing === "user" ? "scaleX(-1)" : "none" }}
      />

      {/* 3D overlay */}
      <ARScene
        glbUrl={glbUrl}
        pose={pose}
        metalColor={metal}
        innerRadiusMm={innerRadiusMm}
        fovDeg={CAMERA_FOV_DEG}
        videoAspect={videoAspect}
        lighting={lighting}
        pieceType={manifest?.type === "ring" ? "ring" : "bracelet"}
        visible={trackingStatus === "tracking"}
      />

      {/* Snapshot flash */}
      {snapshotFlash && (
        <div className="absolute inset-0 bg-ivory/50 pointer-events-none z-40 animate-pulse" />
      )}

      {/* Top bar */}
      <div className="qh-artop absolute top-0 left-0 right-0 z-20">
        <button className="qh-artop__close" onClick={handleClose} aria-label="Close try-on">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round">
            <line x1="5" y1="5" x2="15" y2="15" /><line x1="15" y1="5" x2="5" y2="15" />
          </svg>
        </button>
        <div className="qh-artop__title">
          <h2 className="qh-artop__name">{pieceName}</h2>
          <span className="qh-artop__detail">
            {karat}K {metal} · {assembly ? `${assembly.totalWeight.toFixed(1)} g` : ""}
          </span>
        </div>
        <span className="qh-rough">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1"><circle cx="7" cy="7" r="5" strokeDasharray="2 2" /></svg>
          Rough preview
        </span>
      </div>

      {/* Tracking pill */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20">
        <div className={`qh-track ${trackingVariant}`} aria-live="polite">
          <span className="qh-track__ind">
            {trackingStatus === "finding" && (
              <span className="qh-track__dots"><i /><i /><i /></span>
            )}
            {trackingStatus === "tracking" && (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="8" r="4" /></svg>
            )}
            {trackingStatus === "lost" && (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="4" /></svg>
            )}
          </span>
          {trackingLabel}
        </div>
      </div>

      {/* Price pill — floating top right */}
      {price && (
        <div className="absolute top-20 right-4 z-20">
          <PricePill value={formatPrice(price.total)} />
        </div>
      )}

      {/* Controls rail */}
      <div className="qh-rail absolute bottom-0 left-0 right-0 z-20">
        {/* Metal swatches */}
        <div className="qh-rail__section">
          <div className="qh-rail__row">
            <span className="qh-rail__side">Metal</span>
            <div className="flex gap-1 ml-3">
              {(["yellow", "white", "rose"] as MetalColor[]).map((m) => (
                <Swatch
                  key={m}
                  color={METAL_COLORS[m]}
                  selected={metal === m}
                  onClick={() => setMetal(m)}
                />
              ))}
            </div>
            <div className="qh-rail__div" />
            <Segmented
              options={[
                { value: "14", label: "14K" },
                { value: "18", label: "18K" },
                { value: "22", label: "22K" },
              ]}
              value={karat}
              onChange={setKarat}
            />
          </div>
        </div>

        {/* Size stepper */}
        <div className="qh-rail__section">
          <div className="qh-rail__row">
            {manifest?.type === "bracelet" && (
              <Stepper
                label="Wrist"
                value={wristCm}
                min={14}
                max={20}
                step={0.5}
                formatValue={(v) => `${v} cm`}
                onChange={setWristCm}
              />
            )}
            {manifest?.type === "ring" && ringSizes.length > 0 && (
              <Stepper
                label="Size"
                value={ringSizeIn}
                min={ringSizes[0].indian}
                max={ringSizes[ringSizes.length - 1].indian}
                step={1}
                formatValue={(v) => {
                  const s = RING_SIZES.find((rs) => rs.indian === v);
                  return s ? `IN ${s.indian}` : `${v}`;
                }}
                onChange={setRingSizeIn}
              />
            )}
          </div>
        </div>

        {/* Bottom: flip + shutter + placeholder */}
        <div className="qh-rail__foot">
          <button
            className="qh-iconbtn"
            onClick={flipCamera}
            aria-label="Flip camera"
          >
            <Image src="/brand/brand/icons/flip-camera.svg" alt="" width={24} height={24} />
          </button>
          <button
            className="qh-shutter"
            onClick={handleSnapshot}
            aria-label="Take a snapshot"
          />
          <div />
        </div>
      </div>

      {trackingError && (
        <div className="absolute bottom-32 left-4 right-4 z-30">
          <div className="qh-toast qh-toast--error">
            <span className="qh-toast__mark" />
            <span className="qh-toast__msg">{trackingError}</span>
          </div>
        </div>
      )}
    </div>
  );
}
