/**
 * Lighting match: sample frame luminance and warmth every 500ms.
 * Adjusts envMapIntensity (0.6–1.4) and a warm/cool tint.
 */

const SAMPLE_SIZE = 32;

export interface LightingParams {
  envMapIntensity: number;
  tintR: number;
  tintG: number;
  tintB: number;
}

let canvas: OffscreenCanvas | HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;

function getCanvas(): { canvas: OffscreenCanvas | HTMLCanvasElement; ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D } | null {
  if (canvas && ctx) return { canvas, ctx };
  try {
    if (typeof OffscreenCanvas !== "undefined") {
      canvas = new OffscreenCanvas(SAMPLE_SIZE, SAMPLE_SIZE);
      ctx = canvas.getContext("2d");
    } else {
      canvas = document.createElement("canvas");
      canvas.width = SAMPLE_SIZE;
      canvas.height = SAMPLE_SIZE;
      ctx = canvas.getContext("2d");
    }
    if (!ctx) return null;
    return { canvas, ctx };
  } catch {
    return null;
  }
}

export function sampleLighting(video: HTMLVideoElement): LightingParams {
  const c = getCanvas();
  if (!c || video.videoWidth === 0) {
    return { envMapIntensity: 1.0, tintR: 1, tintG: 1, tintB: 1 };
  }

  c.ctx.drawImage(video, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
  const imageData = c.ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
  const data = imageData.data;

  let totalR = 0, totalG = 0, totalB = 0;
  const pixelCount = SAMPLE_SIZE * SAMPLE_SIZE;

  for (let i = 0; i < data.length; i += 4) {
    totalR += data[i];
    totalG += data[i + 1];
    totalB += data[i + 2];
  }

  const avgR = totalR / pixelCount / 255;
  const avgG = totalG / pixelCount / 255;
  const avgB = totalB / pixelCount / 255;

  // Luminance (perceived)
  const luminance = 0.299 * avgR + 0.587 * avgG + 0.114 * avgB;

  // Map luminance to envMapIntensity (0.6–1.4)
  const envMapIntensity = Math.max(0.6, Math.min(1.4, 0.6 + luminance * 0.8));

  // Warmth: ratio of red to blue
  const warmth = avgB > 0.01 ? avgR / avgB : 1;

  // Subtle tint adjustment
  let tintR = 1, tintG = 1, tintB = 1;
  if (warmth > 1.2) {
    // Warm scene: slight warm tint
    tintR = 1.05;
    tintB = 0.95;
  } else if (warmth < 0.8) {
    // Cool scene: slight cool tint
    tintR = 0.95;
    tintB = 1.05;
  }

  return { envMapIntensity, tintR, tintG, tintB };
}
