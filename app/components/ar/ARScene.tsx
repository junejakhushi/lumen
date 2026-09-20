"use client";

import { useRef, useEffect, useMemo, useCallback, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { StudioEnvironment } from "@/components/viewer/studio";
import * as THREE from "three";
import { METAL_COLORS, type MetalColor } from "@/lib/types";
import type { WristPose } from "@/lib/ar/wristPose";
import type { LightingParams } from "@/lib/ar/lightingMatch";
import { disposePlaced, placePiece, type PieceCurve } from "@/lib/ar/placePiece";

export type { PieceCurve } from "@/lib/ar/placePiece";

interface ARSceneProps {
  glbUrl: string | null;
  pose: WristPose | null;
  metalColor: MetalColor;
  innerRadiusMm: number;
  /** Null for a piece the pipeline could not fit a circle to. */
  curve?: PieceCurve | null;
  /** How many copies of the segment make the bracelet at the chosen size. */
  segmentCount?: number;
  fovDeg: number;
  videoAspect: number;
  lighting: LightingParams;
  pieceType: "bracelet" | "ring";
  visible: boolean;
}

function ARPiece({
  url,
  metalColor,
  pose,
  innerRadiusMm,
  pieceType,
  curve,
  segmentCount,
}: {
  url: string;
  metalColor: MetalColor;
  pose: WristPose | null;
  innerRadiusMm: number;
  pieceType: "bracelet" | "ring";
  curve?: PieceCurve | null;
  segmentCount: number;
}) {
  const { scene } = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);
  const occluderRef = useRef<THREE.Mesh>(null);

  // Bend the piece to the wearer's size and lay it round the wrist (lib/ar/placePiece).
  const placed = useMemo(
    () =>
      placePiece(scene, {
        curve,
        wornRadiusMm: innerRadiusMm,
        pieceType,
        segmentCount,
      }),
    [scene, curve, innerRadiusMm, pieceType, segmentCount]
  );

  useEffect(() => {
    const hex = METAL_COLORS[metalColor];
    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(hex),
      metalness: 1,
      roughness: 0.18,
      envMapIntensity: 1.2,
    });
    placed.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = material;
        child.castShadow = false;
        child.renderOrder = 1;
      }
    });
    return () => material.dispose();
  }, [placed, metalColor]);

  useEffect(() => () => disposePlaced(placed), [placed]);

  // Update pose every frame
  useFrame(() => {
    if (!groupRef.current) return;

    if (pose) {
      groupRef.current.visible = true;
      groupRef.current.position.set(
        pose.position[0],
        pose.position[1],
        pose.position[2]
      );
      groupRef.current.quaternion.set(
        pose.quaternion[0],
        pose.quaternion[1],
        pose.quaternion[2],
        pose.quaternion[3]
      );
    } else {
      groupRef.current.visible = false;
    }

    // Update occluder position to match
    if (occluderRef.current && pose) {
      occluderRef.current.position.copy(groupRef.current.position);
      occluderRef.current.quaternion.copy(groupRef.current.quaternion);
      occluderRef.current.visible = true;
    } else if (occluderRef.current) {
      occluderRef.current.visible = false;
    }
  });

  // Occluder geometry
  const occluderGeom = useMemo(() => {
    const r = innerRadiusMm * 0.95;
    if (pieceType === "bracelet") {
      // Elliptical cylinder (1.25:1 ratio), 70mm long
      const geom = new THREE.CylinderGeometry(r, r, 70, 32);
      geom.scale(1.25, 1, 1);
      return geom;
    } else {
      // Ring: cylinder along finger, 30mm
      return new THREE.CylinderGeometry(r * 0.92, r * 0.92, 30, 16);
    }
  }, [innerRadiusMm, pieceType]);

  return (
    <>
      {/* Occluder: depth-only, renders first */}
      <mesh
        ref={occluderRef}
        geometry={occluderGeom}
        renderOrder={-1}
        visible={false}
      >
        <meshBasicMaterial colorWrite={false} depthWrite={true} />
      </mesh>

      {/* Piece */}
      <group ref={groupRef} visible={false}>
        <primitive object={placed} />
      </group>
    </>
  );
}

function CameraSync({
  fovDeg,
  videoAspect,
}: {
  fovDeg: number;
  videoAspect: number;
}) {
  const { camera } = useThree();

  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = fovDeg;
      camera.aspect = videoAspect;
      camera.near = 1;
      camera.far = 10000;
      camera.updateProjectionMatrix();
    }
  }, [camera, fovDeg, videoAspect]);

  return null;
}

function LightingSync({ lighting }: { lighting: LightingParams }) {
  const { scene } = useThree();

  useEffect(() => {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshPhysicalMaterial) {
        child.material.envMapIntensity = lighting.envMapIntensity;
      }
    });
  }, [scene, lighting]);

  return null;
}

export function ARScene({
  glbUrl,
  pose,
  metalColor,
  innerRadiusMm,
  fovDeg,
  videoAspect,
  lighting,
  pieceType,
  visible,
  curve,
  segmentCount,
}: ARSceneProps) {
  /**
   * A canvas whose GL context has been lost paints as an opaque black rectangle — on this
   * screen, right over the camera. Hide it, and build a fresh one, so a lost context costs
   * the piece for a moment instead of the whole view.
   */
  const [contextLost, setContextLost] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCreated = useCallback((state: { gl: THREE.WebGLRenderer }) => {
    const canvas = state.gl.domElement;
    canvas.addEventListener("webglcontextlost", (event: Event) => {
      // Without preventDefault the browser will not try to give the context back.
      event.preventDefault();
      console.warn("[ar] WebGL context lost; hiding the piece and rebuilding the canvas");
      setContextLost(true);
      if (retryRef.current) clearTimeout(retryRef.current);
      retryRef.current = setTimeout(() => {
        setEpoch((n) => n + 1);
        setContextLost(false);
      }, 1200);
    });
    canvas.addEventListener("webglcontextrestored", () => {
      if (retryRef.current) clearTimeout(retryRef.current);
      setContextLost(false);
    });
  }, []);

  useEffect(() => () => {
    if (retryRef.current) clearTimeout(retryRef.current);
  }, []);

  if (!visible || !glbUrl) return null;

  return (
    <Canvas
      key={epoch}
      onCreated={handleCreated}
      style={{
        position: "absolute",
        inset: 0,
        background: "transparent",
        pointerEvents: "none",
        // Keep the camera visible rather than a black rectangle over it.
        visibility: contextLost ? "hidden" : "visible",
      }}
      gl={{
        alpha: true,
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        // The piece is jewellery on a camera feed; losing the context costs more than
        // the extra quality a discrete GPU would buy here.
        powerPreference: "default",
        failIfMajorPerformanceCaveat: false,
      }}
      camera={{ fov: fovDeg, near: 1, far: 10000 }}
    >
      <CameraSync fovDeg={fovDeg} videoAspect={videoAspect} />
      <LightingSync lighting={lighting} />
      <StudioEnvironment />
      <ambientLight intensity={0.3 * lighting.envMapIntensity} />
      <directionalLight
        position={[5, 5, 5]}
        intensity={0.8 * lighting.envMapIntensity}
        color={new THREE.Color(lighting.tintR, lighting.tintG, lighting.tintB)}
      />
      <ARPiece
        url={glbUrl}
        metalColor={metalColor}
        pose={pose}
        innerRadiusMm={innerRadiusMm}
        pieceType={pieceType}
        curve={curve}
        segmentCount={segmentCount ?? 1}
      />
    </Canvas>
  );
}
