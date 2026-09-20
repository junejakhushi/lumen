"use client";

import { Suspense, useRef, useState, useEffect, useMemo, type MutableRefObject, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  ContactShadows,
  useGLTF,
} from "@react-three/drei";
import { StudioEnvironment } from "./studio";
import * as THREE from "three";
import { METAL_COLORS, type MetalColor } from "@/lib/types";
import { buildGems, disposeGems, type GemType, type GemCut, type HeadPlacement } from "@/lib/ar/gems";
import { disposePlaced, placePiece, type PieceCurve } from "@/lib/ar/placePiece";

/** How the loaded model was centred and scaled, so callers can place markers on it. */
export interface ModelFit {
  center: [number, number, number];
  scale: number;
}

interface PieceViewerProps {
  glbUrl: string | null;
  metalColor?: MetalColor;
  /** Settings the pipeline measured; their stones are drawn procedurally (SPEC §4.6). */
  heads?: HeadPlacement[];
  stoneDiameters?: number[];
  stoneType?: GemType;
  stoneCut?: GemCut;
  /** Multiplies the measured stone size, for a client who wants a larger stone. */
  stoneScale?: number;
  /** A bracelet is shown as the whole piece, assembled from its segment (SPEC §5.1). */
  assemble?: {
    curve?: PieceCurve | null;
    pieceType: "bracelet" | "ring";
    wornRadiusMm: number;
  } | null;
  className?: string;
  autoRotate?: boolean;
  /** Filled with a function that renders the piece as it stands to a PNG. */
  captureRef?: MutableRefObject<(() => Promise<Blob | null>) | null>;
  /** Extra objects drawn in the model's space (atelier review markers). */
  overlay?: (fit: ModelFit) => ReactNode;
  hint?: string;
}

function PieceModel({
  url,
  metalColor = "yellow",
  onFit,
  heads,
  stoneDiameters,
  stoneType,
  stoneCut,
  stoneScale,
  assemble,
}: {
  url: string;
  metalColor: MetalColor;
  onFit?: (fit: ModelFit) => void;
  heads?: HeadPlacement[];
  stoneDiameters?: number[];
  stoneType?: GemType;
  stoneCut?: GemCut;
  stoneScale?: number;
  assemble?: PieceViewerProps["assemble"];
}) {
  const loaded = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);

  const scene = useMemo(() => {
    if (!assemble) return loaded.scene;
    return placePiece(loaded.scene, {
      curve: assemble.curve,
      wornRadiusMm: assemble.wornRadiusMm,
      pieceType: assemble.pieceType,
      heads,
      stoneDiameters,
      stoneType,
      stoneCut,
      stoneScale,
    });
  }, [loaded.scene, assemble, heads, stoneDiameters, stoneType, stoneCut, stoneScale]);

  useEffect(() => {
    if (!assemble) return;
    const group = scene;
    return () => disposePlaced(group);
  }, [scene, assemble]);

  // The stones ride with the model, so they keep their settings as it turns.
  useEffect(() => {
    if (assemble || !heads || heads.length === 0) return;
    const gems = buildGems(heads, stoneDiameters ?? [], {
      type: stoneType,
      cut: stoneCut,
      sizeScale: stoneScale,
      transformPoint: (p) => p.clone(),
      transformDirection: (_origin, dir) => dir.clone(),
    });
    scene.add(gems);
    return () => {
      scene.remove(gems);
      disposeGems(gems);
    };
  }, [scene, heads, stoneDiameters, stoneType, stoneCut, stoneScale, assemble]);

  useEffect(() => {
    const hex = METAL_COLORS[metalColor];
    scene.traverse((child) => {
      // renderOrder 2 marks a stone; only the metal takes the metal colour.
      if (child instanceof THREE.Mesh && child.renderOrder !== 2) {
        child.material = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(hex),
          metalness: 1,
          roughness: 0.18,
          envMapIntensity: 1.2,
        });
        child.castShadow = true;
      }
    });
  }, [scene, metalColor]);

  // Center and scale the model
  useEffect(() => {
    // An assembled piece turns about +Y, so head-on it is a thin edge. Tilt it to show the
    // band the way you would hold it up to look at.
    scene.rotation.set(assemble ? -1.05 : 0, 0, 0);
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 2 / maxDim; // fit into a 2-unit sphere

    // Scale first, then recentre in the scaled space: a piece whose CAD origin sits far
    // from its bounding-box centre (most of them) would otherwise land off camera.
    scene.scale.setScalar(scale);
    scene.position.copy(center).multiplyScalar(-scale);
    onFit?.({ center: [center.x, center.y, center.z], scale });
  }, [scene, onFit, assemble]);

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
}

function LoadingFallback() {
  return (
    <mesh>
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshStandardMaterial color="#E8E2D8" wireframe />
    </mesh>
  );
}

export function PieceViewer({
  glbUrl,
  metalColor = "yellow",
  className = "",
  autoRotate = true,
  overlay,
  hint = "Drag to turn · Pinch to zoom",
  heads,
  stoneDiameters,
  stoneType,
  stoneCut,
  stoneScale,
  assemble,
  captureRef,
}: PieceViewerProps) {
  const [hasError, setHasError] = useState(false);
  const [fit, setFit] = useState<ModelFit | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Hand the caller a way to take a picture of the piece as it stands. The drawing buffer is
  // preserved for it: WebGL clears the buffer once a frame has been composited, so reading the
  // canvas at any other moment returns an empty image.
  useEffect(() => {
    if (!captureRef) return;
    captureRef.current = async () => {
      const canvas = containerRef.current?.querySelector("canvas");
      if (!canvas) return null;
      // toBlob rather than a data URL: the page's connect-src does not allow data:, so
      // fetching one back to a Blob is refused by the content security policy.
      return new Promise<Blob | null>((resolve) => {
        try {
          canvas.toBlob((blob) => resolve(blob), "image/png");
        } catch {
          resolve(null);
        }
      });
    };
    return () => {
      captureRef.current = null;
    };
  }, [captureRef]);

  if (!glbUrl || hasError) {
    return (
      <div
        className={`bg-pearl flex items-center justify-center text-text-muted font-ui text-body-s-m ${className}`}
      >
        <p>Bringing the piece to the light…</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 4], fov: 35 }}
        style={{ background: "#F5F0E8" }}
        onError={() => setHasError(true)}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          // So a look can be saved as a picture of the piece; see captureRef.
          preserveDrawingBuffer: true,
        }}
      >
        <Suspense fallback={<LoadingFallback />}>
          <PieceModel
            url={glbUrl}
            metalColor={metalColor}
            onFit={setFit}
            heads={heads}
            stoneDiameters={stoneDiameters}
            stoneType={stoneType}
            stoneCut={stoneCut}
            stoneScale={stoneScale}
            assemble={assemble}
          />
        </Suspense>
        {overlay && fit && overlay(fit)}
        <StudioEnvironment />
        <ContactShadows
          position={[0, -1.2, 0]}
          opacity={0.3}
          scale={5}
          blur={2}
          far={4}
        />
        <OrbitControls
          autoRotate={autoRotate}
          autoRotateSpeed={1.5}
          enablePan={false}
          minDistance={2}
          maxDistance={8}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI * 5 / 6}
        />
      </Canvas>
      <p className="absolute bottom-3 left-1/2 -translate-x-1/2 caption-m text-text-muted pointer-events-none select-none">
        {hint}
      </p>
    </div>
  );
}
