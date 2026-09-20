"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import type { Landmark } from "./wristPose";

// MediaPipe HandLandmarker CDN URLs
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

export type TrackingStatus = "loading" | "finding" | "tracking" | "lost";

export interface UseHandTrackingResult {
  landmarks: Landmark[] | null;
  status: TrackingStatus;
  fps: number;
  start: (video: HTMLVideoElement) => Promise<void>;
  stop: () => void;
  error: string | null;
}

export function useHandTracking(): UseHandTrackingResult {
  const [landmarks, setLandmarks] = useState<Landmark[] | null>(null);
  const [status, setStatus] = useState<TrackingStatus>("loading");
  const [fps, setFps] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handLandmarkerRef = useRef<unknown>(null);
  const rafIdRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const fpsFramesRef = useRef<number[]>([]);
  const lostTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runningRef = useRef(false);
  /** "Lost" only means something once a hand has actually been seen. */
  const everSeenRef = useRef(false);
  const detectErrorsRef = useRef(0);

  const stop = useCallback(() => {
    runningRef.current = false;
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = 0;
    }
    if (lostTimerRef.current) {
      clearTimeout(lostTimerRef.current);
      lostTimerRef.current = null;
    }
  }, []);

  const start = useCallback(
    async (video: HTMLVideoElement) => {
      try {
        setStatus("loading");
        setError(null);

        // Dynamically import MediaPipe
        const { FilesetResolver, HandLandmarker } = await import(
          "@mediapipe/tasks-vision"
        );

        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        const create = (delegate: "GPU" | "CPU") =>
          HandLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: MODEL_URL, delegate },
            runningMode: "VIDEO",
            numHands: 1,
          });

        // The page already runs a WebGL canvas for the piece; where that stops the GPU
        // delegate from starting, CPU still tracks well enough to wear something.
        let handLandmarker;
        try {
          handLandmarker = await create("GPU");
        } catch (gpuError) {
          console.warn("[ar] GPU hand tracking unavailable, falling back to CPU", gpuError);
          handLandmarker = await create("CPU");
        }

        handLandmarkerRef.current = handLandmarker;
        runningRef.current = true;
        setStatus("finding");

        // Detection loop
        const detect = () => {
          if (!runningRef.current) return;

          const now = performance.now();

          // Skip if video isn't ready
          if (video.readyState < 2 || video.videoWidth === 0) {
            rafIdRef.current = requestAnimationFrame(detect);
            return;
          }

          // Skip frames if behind (avoid stacking)
          if (now - lastTimeRef.current < 16) {
            rafIdRef.current = requestAnimationFrame(detect);
            return;
          }

          try {
            const result = (handLandmarker as { detectForVideo: (v: HTMLVideoElement, t: number) => { landmarks: Array<Array<{ x: number; y: number; z: number }>> } }).detectForVideo(video, now);
            lastTimeRef.current = now;

            // FPS tracking
            fpsFramesRef.current.push(now);
            const cutoff = now - 1000;
            fpsFramesRef.current = fpsFramesRef.current.filter((t) => t > cutoff);
            setFps(fpsFramesRef.current.length);

            if (result.landmarks && result.landmarks.length > 0) {
              const hand = result.landmarks[0];
              everSeenRef.current = true;
              setLandmarks(hand);
              setStatus("tracking");

              // Clear lost timer
              if (lostTimerRef.current) {
                clearTimeout(lostTimerRef.current);
                lostTimerRef.current = null;
              }
            } else if (!lostTimerRef.current) {
              // Hold briefly before reacting, so a dropped frame does not flicker the piece.
              lostTimerRef.current = setTimeout(() => {
                // Nothing has been seen yet: still looking, not lost.
                setStatus(everSeenRef.current ? "lost" : "finding");
                setLandmarks(null);
                lostTimerRef.current = null;
              }, 300);
            }
          } catch (detectError) {
            // One bad frame is nothing; every frame failing means tracking is not working,
            // and staying silent about it is how this looked like "no hand in view".
            detectErrorsRef.current += 1;
            if (detectErrorsRef.current === 30) {
              const message =
                detectError instanceof Error ? detectError.message : String(detectError);
              console.error(`[ar] hand detection is failing on every frame: ${message}`);
              setError("Hand tracking could not run on this device.");
            }
          }

          rafIdRef.current = requestAnimationFrame(detect);
        }

        rafIdRef.current = requestAnimationFrame(detect);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to initialize hand tracking"
        );
        setStatus("lost");
      }
    },
    []
  );

  // Cleanup
  useEffect(() => {
    return () => {
      stop();
      const hl = handLandmarkerRef.current;
      if (hl && typeof (hl as { close: () => void }).close === "function") {
        (hl as { close: () => void }).close();
      }
    };
  }, [stop]);

  return { landmarks, status, fps, start, stop, error };
}
