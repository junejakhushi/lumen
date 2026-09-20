"use client";

import { Suspense, useRef, useState, useEffect, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  ContactShadows,
  useGLTF,
} from "@react-three/drei";
import { StudioEnvironment } from "./studio";
import * as THREE from "three";
import { METAL_COLORS, type MetalColor } from "@/lib/types";

/** How the loaded model was centred and scaled, so callers can place markers on it. */
export interface ModelFit {
  center: [number, number, number];
  scale: number;
}

interface PieceViewerProps {
  glbUrl: string | null;
  metalColor?: MetalColor;
  className?: string;
  autoRotate?: boolean;
  /** Extra objects drawn in the model's space (atelier review markers). */
  overlay?: (fit: ModelFit) => ReactNode;
  hint?: string;
}

function PieceModel({
  url,
  metalColor = "yellow",
  onFit,
}: {
  url: string;
  metalColor: MetalColor;
  onFit?: (fit: ModelFit) => void;
}) {
  const { scene } = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);

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
        child.castShadow = true;
      }
    });
  }, [scene, metalColor]);

  // Center and scale the model
  useEffect(() => {
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
  }, [scene, onFit]);

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
}: PieceViewerProps) {
  const [hasError, setHasError] = useState(false);
  const [fit, setFit] = useState<ModelFit | null>(null);

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
    <div className={`relative ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 4], fov: 35 }}
        style={{ background: "#F5F0E8" }}
        onError={() => setHasError(true)}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      >
        <Suspense fallback={<LoadingFallback />}>
          <PieceModel url={glbUrl} metalColor={metalColor} onFit={setFit} />
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
