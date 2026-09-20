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
  /** Re-attach the stream, for when the <video> mounts after permission is granted. */
  attachStream: () => void;
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
        // The stream is attached by the effect below, once the <video> exists.
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

  /**
   * Attach the stream to the video element.
   *
   * The element is only rendered once permission has been granted, so at the moment
   * getUserMedia resolves there is nothing to attach to yet. Doing it here covers both
   * orders: element first, or stream first.
   */
  const attach = useCallback(() => {
    const video = videoRef.current;
    if (!video || !stream) return;
    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }
    if (video.paused) {
      void video.play().catch(() => {
        // Autoplay can be refused until the next gesture; the controls still work.
      });
    }
  }, [stream]);

  useEffect(() => {
    attach();
    // The element mounts a render after the stream arrives, so try again next frame too.
    const id = requestAnimationFrame(attach);
    return () => cancelAnimationFrame(id);
  }, [attach]);

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
    attachStream: attach,
    stream,
    facing,
    hasPermission,
    error,
    requestCamera,
    flipCamera,
    stopCamera,
  };
}
