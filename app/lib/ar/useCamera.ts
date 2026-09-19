"use client";

import { useRef, useState, useCallback, useEffect } from "react";

export type CameraFacing = "user" | "environment";

export interface UseCameraResult {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
  facing: CameraFacing;
  hasPermission: boolean | null; // null = not asked yet
  error: string | null;
  requestCamera: () => Promise<void>;
  flipCamera: () => Promise<void>;
  stopCamera: () => void;
}

export function useCamera(): UseCameraResult {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facing, setFacing] = useState<CameraFacing>("user");
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
  }, [stream]);

  const startCamera = useCallback(
    async (facingMode: CameraFacing) => {
      try {
        // Stop existing stream
        if (stream) {
          stream.getTracks().forEach((t) => t.stop());
        }

        const newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          },
          audio: false,
        });

        setStream(newStream);
        setFacing(facingMode);
        setHasPermission(true);
        setError(null);

        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
          await videoRef.current.play();
        }
      } catch (err) {
        setHasPermission(false);
        if (err instanceof DOMException) {
          if (err.name === "NotAllowedError") {
            setError("Camera access was denied. Please allow camera access in your browser settings.");
          } else if (err.name === "NotFoundError") {
            setError("No camera found on this device.");
          } else {
            setError(`Camera error: ${err.message}`);
          }
        } else {
          setError("Could not start the camera.");
        }
      }
    },
    [stream]
  );

  const requestCamera = useCallback(async () => {
    await startCamera(facing);
  }, [startCamera, facing]);

  const flipCamera = useCallback(async () => {
    const newFacing = facing === "user" ? "environment" : "user";
    await startCamera(newFacing);
  }, [facing, startCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    videoRef,
    stream,
    facing,
    hasPermission,
    error,
    requestCamera,
    flipCamera,
    stopCamera,
  };
}
