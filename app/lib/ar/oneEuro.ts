/**
 * One-Euro Filter for smoothing noisy signals.
 * Used for position and quaternion smoothing in AR tracking.
 *
 * Reference: Casiez et al., "1€ Filter: A Simple Speed-based
 * Low-pass Filter for Noisy Input in Interactive Systems", CHI 2012.
 */

function smoothingFactor(te: number, cutoff: number): number {
  const r = 2 * Math.PI * cutoff * te;
  return r / (r + 1);
}

function exponentialSmoothing(a: number, x: number, xPrev: number): number {
  return a * x + (1 - a) * xPrev;
}

export class OneEuroFilter {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private xPrev: number | null = null;
  private dxPrev: number = 0;
  private tPrev: number | null = null;

  constructor(minCutoff = 1.0, beta = 0.0, dCutoff = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  filter(x: number, timestamp: number): number {
    if (this.tPrev === null || this.xPrev === null) {
      this.xPrev = x;
      this.tPrev = timestamp;
      return x;
    }

    const te = timestamp - this.tPrev;
    if (te <= 0) return this.xPrev;

    // Estimate derivative
    const aD = smoothingFactor(te, this.dCutoff);
    const dx = (x - this.xPrev) / te;
    const dxHat = exponentialSmoothing(aD, dx, this.dxPrev);
    this.dxPrev = dxHat;

    // Adaptive cutoff
    const cutoff = this.minCutoff + this.beta * Math.abs(dxHat);
    const a = smoothingFactor(te, cutoff);
    const xHat = exponentialSmoothing(a, x, this.xPrev);

    this.xPrev = xHat;
    this.tPrev = timestamp;

    return xHat;
  }

  reset(): void {
    this.xPrev = null;
    this.dxPrev = 0;
    this.tPrev = null;
  }
}

/**
 * One-Euro Filter for 3D vectors (position).
 */
export class OneEuroFilter3 {
  private filters: [OneEuroFilter, OneEuroFilter, OneEuroFilter];

  constructor(minCutoff = 1.0, beta = 0.02) {
    this.filters = [
      new OneEuroFilter(minCutoff, beta),
      new OneEuroFilter(minCutoff, beta),
      new OneEuroFilter(minCutoff, beta),
    ];
  }

  filter(v: [number, number, number], t: number): [number, number, number] {
    return [
      this.filters[0].filter(v[0], t),
      this.filters[1].filter(v[1], t),
      this.filters[2].filter(v[2], t),
    ];
  }

  reset(): void {
    this.filters.forEach((f) => f.reset());
  }
}

/**
 * One-Euro Filter for quaternions (rotation).
 * Filters each component independently, then normalizes.
 */
export class OneEuroFilterQuat {
  private filters: [OneEuroFilter, OneEuroFilter, OneEuroFilter, OneEuroFilter];

  constructor(minCutoff = 1.0, beta = 0.02) {
    this.filters = [
      new OneEuroFilter(minCutoff, beta),
      new OneEuroFilter(minCutoff, beta),
      new OneEuroFilter(minCutoff, beta),
      new OneEuroFilter(minCutoff, beta),
    ];
  }

  filter(
    q: [number, number, number, number],
    t: number
  ): [number, number, number, number] {
    const raw: [number, number, number, number] = [
      this.filters[0].filter(q[0], t),
      this.filters[1].filter(q[1], t),
      this.filters[2].filter(q[2], t),
      this.filters[3].filter(q[3], t),
    ];
    // Normalize
    const len = Math.sqrt(raw[0] ** 2 + raw[1] ** 2 + raw[2] ** 2 + raw[3] ** 2);
    if (len < 1e-10) return [0, 0, 0, 1];
    return [raw[0] / len, raw[1] / len, raw[2] / len, raw[3] / len];
  }

  reset(): void {
    this.filters.forEach((f) => f.reset());
  }
}
