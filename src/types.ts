/** Layer property value types that can be keyframed. */
export type LayerPropertyValue = number | string | boolean;

/** Easing specification for a keyframe. */
export type KeyframeEasing =
  | "linear"
  | "ease-in"
  | "ease-out"
  | "ease-in-out"
  | "ease-in-cubic"
  | "ease-out-cubic"
  | "ease-in-out-cubic"
  | "step-start"
  | "step-end"
  | [number, number, number, number]; // cubic-bezier control points

export interface Keyframe {
  /** Time in seconds from animation start. */
  time: number;
  value: LayerPropertyValue;
  easing: KeyframeEasing;
}

/** Per-layer keyframe map: propertyKey → sorted Keyframe array. */
export type KeyframeMap = Record<string, Keyframe[]>;

/** Loop mode for animation playback. */
export type LoopMode = "repeat" | "ping-pong" | "once";

/** Global animation settings stored in the timeline layer. */
export interface AnimationSettings {
  duration: number;
  fps: number;
  loop: boolean;
  loopMode: LoopMode;
}

/** Point on a motion path. */
export interface MotionPathPoint {
  x: number;
  y: number;
  /** Optional rotation at this point (degrees). */
  rotation?: number;
}
