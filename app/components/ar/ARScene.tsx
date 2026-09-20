"use client";

import { useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { StudioEnvironment } from "@/components/viewer/studio";
import * as THREE from "three";
import { METAL_COLORS, type MetalColor } from "@/lib/types";
import type { WristPose } from "@/lib/ar/wristPose";
import type { LightingParams } from "@/lib/ar/lightingMatch";

interface ARSceneProps {
  glbUrl: string | null;
  pose: WristPose | null;
  metalColor: MetalColor;
  innerRadiusMm: number;
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
}: {
  url: string;
  metalColor: MetalColor;
  pose: WristPose | null;
  innerRadiusMm: number;
  pieceType: "bracelet" | "ring";
}) {
  const { scene } = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);
  const occluderRef = useRef<THREE.Mesh>(null);

  // Apply metal material
  useEffect(() => {
    const hex = METAL_COLORS[metalColor];
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(hex),
          metalness: 1,
          roughness: 0.18,
          envMapIntensity: 1.2,
        });
        child.castShadow = false;
        child.renderOrder = 1;
      }
    });
  }, [scene, metalColor]);

  // Scale model to real mm and center
  useEffect(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    // Scale factor: if the model is in mm, we keep it; otherwise normalize
    // The pipeline exports in mm, so 1 unit = 1mm
    const scale = maxDim > 1 ? 1 : 1;
    scene.scale.setScalar(scale);

    const center = box.getCenter(new THREE.Vector3());
    scene.position.sub(center.multiplyScalar(scale));
  }, [scene]);

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
        <primitive object={scene} />
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
}: ARSceneProps) {
  if (!visible || !glbUrl) return null;

  return (
    <Canvas
      style={{
        position: "absolute",
        inset: 0,
        background: "transparent",
        pointerEvents: "none",
      }}
      gl={{
        alpha: true,
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
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
      />
    </Canvas>
  );
}
