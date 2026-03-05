import type { Keyframe, KeyframeMap, LayerPropertyValue } from "./types.js";
import { applyKeyframeEasing } from "./easing.js";

function lerpNumber(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Interpolate Oklab colors (same implementation as ADR 036). */
function linearize(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function delinearize(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}
function hexToOklab(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const r = linearize(parseInt(h.slice(0, 2), 16) / 255);
  const g = linearize(parseInt(h.slice(2, 4), 16) / 255);
  const b = linearize(parseInt(h.slice(4, 6), 16) / 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ];
}
function oklabToHex(lab: [number, number, number]): string {
  const l = lab[0] + 0.3963377774 * lab[1] + 0.2158037573 * lab[2];
  const m = lab[0] - 0.1055613458 * lab[1] - 0.0638541728 * lab[2];
  const s = lab[0] - 0.0894841775 * lab[1] - 1.2914855480 * lab[2];
  const r = delinearize(+4.0767416621 * l * l * l - 3.3077115913 * m * m * m + 0.2309699292 * s * s * s);
  const g = delinearize(-1.2684380046 * l * l * l + 2.6097574011 * m * m * m - 0.3413193965 * s * s * s);
  const b = delinearize(-0.0041960863 * l * l * l - 0.7034186147 * m * m * m + 1.7076147010 * s * s * s);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255)));
  return `#${clamp(r).toString(16).padStart(2, "0")}${clamp(g).toString(16).padStart(2, "0")}${clamp(b).toString(16).padStart(2, "0")}`;
}

function isHex(v: unknown): v is string {
  return typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);
}

/** Interpolate between two keyframe values. */
export function interpolateValue(
  a: LayerPropertyValue,
  b: LayerPropertyValue,
  t: number,
): LayerPropertyValue {
  if (typeof a === "number" && typeof b === "number") {
    return lerpNumber(a, b, t);
  }
  if (isHex(a) && isHex(b)) {
    const labA = hexToOklab(a);
    const labB = hexToOklab(b);
    return oklabToHex([
      lerpNumber(labA[0], labB[0], t),
      lerpNumber(labA[1], labB[1], t),
      lerpNumber(labA[2], labB[2], t),
    ]);
  }
  // boolean, select: step at midpoint
  return t < 0.5 ? a : b;
}

/** Interpolate a single property at time t given its keyframes (must be sorted by time). */
export function interpolateProperty(keyframes: Keyframe[], t: number): LayerPropertyValue {
  if (keyframes.length === 0) throw new Error("No keyframes");
  if (keyframes.length === 1) return keyframes[0]!.value;

  // Before first keyframe
  if (t <= keyframes[0]!.time) return keyframes[0]!.value;
  // After last keyframe
  if (t >= keyframes[keyframes.length - 1]!.time) return keyframes[keyframes.length - 1]!.value;

  // Find surrounding keyframes
  let lo = 0;
  let hi = keyframes.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (keyframes[mid]!.time <= t) lo = mid;
    else hi = mid;
  }

  const k0 = keyframes[lo]!;
  const k1 = keyframes[hi]!;
  const segDuration = k1.time - k0.time;
  const progress = segDuration === 0 ? 1 : (t - k0.time) / segDuration;
  const eased = applyKeyframeEasing(progress, k0.easing);

  return interpolateValue(k0.value, k1.value, eased);
}

/** Resolve all animated properties for a layer at time t. */
export function resolveLayerProperties(
  properties: Record<string, unknown>,
  keyframes: KeyframeMap | undefined,
  t: number,
): Record<string, unknown> {
  if (!keyframes || Object.keys(keyframes).length === 0) return properties;

  const resolved = { ...properties };
  for (const [key, kfs] of Object.entries(keyframes)) {
    if (kfs.length > 0) {
      resolved[key] = interpolateProperty(kfs, t);
    }
  }
  return resolved;
}
