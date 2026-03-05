import type { KeyframeEasing } from "./types.js";

/** Evaluate a cubic bezier at t ∈ [0,1] using Newton-Raphson. */
function cubicBezier(p1x: number, p1y: number, p2x: number, p2y: number, t: number): number {
  function sampleCurve(a: number, b: number, c: number, t: number) {
    return ((a * t + b) * t + c) * t;
  }
  const cx = 3 * p1x;
  const bx = 3 * (p2x - p1x) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * p1y;
  const by = 3 * (p2y - p1y) - cy;
  const ay = 1 - cy - by;

  // Solve for t given x (Newton-Raphson)
  let guess = t;
  for (let i = 0; i < 8; i++) {
    const slope = sampleCurve(3 * ax, 2 * bx, cx, guess);
    if (Math.abs(slope) < 1e-6) break;
    guess -= (sampleCurve(ax, bx, cx, guess) - t) / slope;
  }

  return sampleCurve(ay, by, cy, guess);
}

export function applyKeyframeEasing(t: number, easing: KeyframeEasing): number {
  if (Array.isArray(easing)) {
    return cubicBezier(easing[0], easing[1], easing[2], easing[3], t);
  }
  switch (easing) {
    case "linear": return t;
    case "ease-in": return t * t * t;
    case "ease-out": return 1 - Math.pow(1 - t, 3);
    case "ease-in-out": return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    case "ease-in-cubic": return t * t * t;
    case "ease-out-cubic": return 1 - Math.pow(1 - t, 3);
    case "ease-in-out-cubic": return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    case "step-start": return t > 0 ? 1 : 0;
    case "step-end": return t >= 1 ? 1 : 0;
  }
}
