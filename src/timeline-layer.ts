import type {
  LayerTypeDefinition,
  LayerPropertySchema,
  LayerProperties,
  LayerBounds,
  RenderResources,
} from "@genart-dev/core";

const TIMELINE_PROPERTIES: LayerPropertySchema[] = [
  { key: "duration", label: "Duration (sec)", type: "number", default: 3.0, min: 0.1, max: 300, step: 0.1, group: "timeline" },
  { key: "fps", label: "FPS", type: "number", default: 30, min: 1, max: 60, step: 1, group: "timeline" },
  { key: "loop", label: "Loop", type: "boolean", default: true, group: "timeline" },
];

export const timelineLayerType: LayerTypeDefinition = {
  typeId: "animation:timeline",
  displayName: "Animation Timeline",
  icon: "timeline",
  category: "guide",
  properties: TIMELINE_PROPERTIES,
  propertyEditorId: "animation:timeline-editor",

  createDefault(): LayerProperties {
    return { duration: 3.0, fps: 30, loop: true };
  },

  /** Timeline layer has no visual output — it's a settings anchor. */
  render(
    _properties: LayerProperties,
    _ctx: CanvasRenderingContext2D,
    _bounds: LayerBounds,
    _resources: RenderResources,
  ): void {
    // No-op: guide layers don't render
  },

  validate(): null { return null; },
};
