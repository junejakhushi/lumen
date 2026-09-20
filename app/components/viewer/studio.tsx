"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/**
 * Local, offline replacements for drei's two default network fetches.
 *
 * The pipeline's GLBs are Draco-compressed and drei loads the Draco decoder from
 * gstatic.com by default; `Environment preset="studio"` pulls an HDR from a GitHub CDN.
 * Both are blocked by our CSP (SPEC §9: self + Spaces + MediaPipe only) and both are
 * third-party fetches we do not want in a private viewing. The decoder is served from
 * /draco, and the environment is generated in the browser from three's own room scene,
 * so nothing leaves the origin.
 */

useGLTF.setDecoderPath("/draco/");

/** Soft box lighting in the round, so metal reads as metal. Nothing is downloaded. */
export function StudioEnvironment({ intensity = 1 }: { intensity?: number }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    pmrem.compileEquirectangularShader();
    const room = new RoomEnvironment();
    const texture = pmrem.fromScene(room, 0.04).texture;
    const previous = scene.environment;
    scene.environment = texture;
    scene.environmentIntensity = intensity;
    return () => {
      scene.environment = previous;
      texture.dispose();
      room.dispose?.();
      pmrem.dispose();
    };
  }, [gl, scene, intensity]);

  return null;
}
