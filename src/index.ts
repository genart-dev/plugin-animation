import type { DesignPlugin, PluginContext } from "@genart-dev/core";
import { timelineLayerType } from "./timeline-layer.js";
import { animationMcpTools } from "./animation-tools.js";

const animationPlugin: DesignPlugin = {
  id: "animation",
  name: "Animation",
  version: "0.1.0",
  tier: "free",
  description: "Keyframe animation and export for design layers.",

  layerTypes: [timelineLayerType],
  tools: [],
  exportHandlers: [],
  mcpTools: animationMcpTools,

  async initialize(_context: PluginContext): Promise<void> {},
  dispose(): void {},
};

export default animationPlugin;
export { timelineLayerType } from "./timeline-layer.js";
export { animationMcpTools } from "./animation-tools.js";
export { interpolateProperty, resolveLayerProperties } from "./interpolate.js";
export { applyKeyframeEasing } from "./easing.js";
export type { Keyframe, KeyframeEasing, KeyframeMap, AnimationSettings, LayerPropertyValue } from "./types.js";
