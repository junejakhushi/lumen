"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { ModelFit } from "@/components/viewer/PieceViewer";
import type { PieceManifest } from "@/lib/types";

/**
 * Markers over the 3D piece so the atelier can check what the pipeline measured:
 * head axes and inferred stones, segment ends (bracelets) and the post (tops).
 *
 * Manifest coordinates are millimetres in the original CAD frame. The viewer scales the
 * loaded model by s and recentres it, so a point p lands at s·(p − centre).
 */

const GOLD = "#A8844A";
const RUBY = "#6E1E2A";
const EMERALD = "#1E4638";

export interface MarkerToggles {
  heads: boolean;
  ends: boolean;
  post: boolean;
}

function useProject(fit: ModelFit) {
  return useMemo(() => {
    const center = new THREE.Vector3(...fit.center);
    return (p: number[] | undefined) =>
      p && p.length === 3
        ? new THREE.Vector3(p[0], p[1], p[2]).sub(center).multiplyScalar(fit.scale)
        : null;
  }, [fit]);
}

function quaternionFor(axis: number[] | undefined): THREE.Quaternion {
  const q = new THREE.Quaternion();
  if (!axis || axis.length !== 3) return q;
  const dir = new THREE.Vector3(axis[0], axis[1], axis[2]).normalize();
  return q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
}

/** A ring on the stone seat plus a pin along the head axis. */
function HeadMarker({
  origin,
  axis,
  stoneD,
  rIn,
  scale,
}: {
  origin: THREE.Vector3;
  axis: number[] | undefined;
  stoneD: number;
  rIn: number;
  scale: number;
}) {
  const quat = quaternionFor(axis);
  const ringRadius = Math.max(rIn, stoneD / 2) * scale;
  const pinLength = 2.2 * scale * Math.max(stoneD, 2);
  return (
    <group position={origin} quaternion={quat}>
      <mesh position={[0, pinLength / 2, 0]}>
        <cylinderGeometry args={[0.004, 0.004, pinLength, 8]} />
        <meshBasicMaterial color={GOLD} toneMapped={false} depthTest={false} transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, pinLength * 0.62, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[ringRadius, 0.006, 8, 32]} />
        <meshBasicMaterial color={RUBY} toneMapped={false} depthTest={false} transparent opacity={0.95} />
      </mesh>
    </group>
  );
}

function EndMarker({ position, tangent, size }: { position: THREE.Vector3; tangent: number[] | undefined; size: number }) {
  return (
    <group position={position} quaternion={quaternionFor(tangent)}>
      <mesh>
        <sphereGeometry args={[size * 0.06, 12, 12]} />
        <meshBasicMaterial color={EMERALD} toneMapped={false} depthTest={false} />
      </mesh>
      <mesh position={[0, size * 0.12, 0]}>
        <cylinderGeometry args={[size * 0.012, size * 0.012, size * 0.24, 8]} />
        <meshBasicMaterial color={EMERALD} toneMapped={false} depthTest={false} transparent opacity={0.85} />
      </mesh>
    </group>
  );
}

export function ReviewMarkers({
  manifest,
  fit,
  toggles,
}: {
  manifest: PieceManifest;
  fit: ModelFit;
  toggles: MarkerToggles;
}) {
  const project = useProject(fit);
  const stones = manifest.stones ?? [];

  return (
    <group>
      {toggles.heads &&
        (manifest.heads ?? []).map((head, i) => {
          const origin = project(head.origin as unknown as number[]);
          if (!origin) return null;
          return (
            <HeadMarker
              key={`head-${i}`}
              origin={origin}
              axis={head.axis as unknown as number[]}
              stoneD={stones[i]?.d_mm ?? 2 * head.r_in_mm}
              rIn={head.r_in_mm}
              scale={fit.scale}
            />
          );
        })}

      {toggles.ends &&
        (manifest.segment?.ends ?? []).map((end, i) => {
          const position = project(end.center);
          if (!position) return null;
          return <EndMarker key={`end-${i}`} position={position} tangent={end.tangent} size={1} />;
        })}

      {toggles.post && manifest.tops?.post
        ? (() => {
            const origin = project(manifest.tops.post.origin as unknown as number[]);
            if (!origin) return null;
            return (
              <group position={origin} quaternion={quaternionFor(manifest.tops.post.axis as unknown as number[])}>
                <mesh position={[0, 0.18, 0]}>
                  <cylinderGeometry args={[0.012, 0.012, 0.36, 10]} />
                  <meshBasicMaterial color={GOLD} toneMapped={false} depthTest={false} />
                </mesh>
              </group>
            );
          })()
        : null}
    </group>
  );
}
