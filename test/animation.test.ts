import { describe, it, expect, vi } from "vitest";
import animationPlugin, {
  timelineLayerType,
  interpolateProperty,
  applyKeyframeEasing,
  resolveLayerProperties,
} from "../src/index.js";
import type { McpToolContext, DesignLayer } from "@genart-dev/core";
import type { Keyframe } from "../src/types.js";

function makeMockContext(layers: DesignLayer[] = []) {
  const layerMap = new Map(layers.map((l) => [l.id, l]));
  return {
    layers: {
      add: vi.fn((layer: DesignLayer) => { layerMap.set(layer.id, layer); }),
      get: vi.fn((id: string) => layerMap.get(id)),
      updateProperties: vi.fn((id: string, updates: Record<string, unknown>) => {
        const layer = layerMap.get(id);
        if (layer) Object.assign(layer.properties, updates);
      }),
    },
    emitChange: vi.fn(),
  } as unknown as McpToolContext;
}

describe("animationPlugin", () => {
  it("exports a valid DesignPlugin", () => {
    expect(animationPlugin.id).toBe("animation");
    expect(animationPlugin.tier).toBe("free");
    expect(animationPlugin.layerTypes).toHaveLength(2);
    expect(animationPlugin.mcpTools).toHaveLength(9);
  });
});

describe("timelineLayerType", () => {
  it("createDefault has 3s 30fps looping", () => {
    const props = timelineLayerType.createDefault();
    expect(props.duration).toBe(3.0);
    expect(props.fps).toBe(30);
    expect(props.loop).toBe(true);
  });

  it("is a guide category layer", () => {
    expect(timelineLayerType.category).toBe("guide");
  });
});

describe("applyKeyframeEasing", () => {
  it("linear returns t unchanged", () => {
    expect(applyKeyframeEasing(0.5, "linear")).toBe(0.5);
    expect(applyKeyframeEasing(0, "linear")).toBe(0);
    expect(applyKeyframeEasing(1, "linear")).toBe(1);
  });

  it("ease-in is slower at start", () => {
    expect(applyKeyframeEasing(0.5, "ease-in")).toBeLessThan(0.5);
  });

  it("ease-out is faster at start", () => {
    expect(applyKeyframeEasing(0.5, "ease-out")).toBeGreaterThan(0.5);
  });

  it("step-start returns 0 at t=0, 1 after", () => {
    expect(applyKeyframeEasing(0, "step-start")).toBe(0);
    expect(applyKeyframeEasing(0.1, "step-start")).toBe(1);
  });

  it("step-end returns 0 until t=1", () => {
    expect(applyKeyframeEasing(0.9, "step-end")).toBe(0);
    expect(applyKeyframeEasing(1, "step-end")).toBe(1);
  });
});

describe("interpolateProperty", () => {
  const kfs: Keyframe[] = [
    { time: 0, value: 0, easing: "linear" },
    { time: 1, value: 100, easing: "linear" },
  ];

  it("returns first value before first keyframe", () => {
    expect(interpolateProperty(kfs, -1)).toBe(0);
  });

  it("returns last value after last keyframe", () => {
    expect(interpolateProperty(kfs, 2)).toBe(100);
  });

  it("interpolates at t=0.5 linearly", () => {
    expect(interpolateProperty(kfs, 0.5)).toBeCloseTo(50);
  });

  it("handles color interpolation", () => {
    const colorKfs: Keyframe[] = [
      { time: 0, value: "#000000", easing: "linear" },
      { time: 1, value: "#ffffff", easing: "linear" },
    ];
    const mid = interpolateProperty(colorKfs, 0.5) as string;
    expect(mid).toMatch(/^#[0-9a-f]{6}$/);
    // Mid-gray should have roughly equal channels
    const r = parseInt(mid.slice(1, 3), 16);
    const g = parseInt(mid.slice(3, 5), 16);
    const b = parseInt(mid.slice(5, 7), 16);
    expect(r).toBeCloseTo(g, 5);
    expect(g).toBeCloseTo(b, 5);
  });

  it("steps for boolean at midpoint", () => {
    const boolKfs: Keyframe[] = [
      { time: 0, value: false, easing: "linear" },
      { time: 1, value: true, easing: "linear" },
    ];
    expect(interpolateProperty(boolKfs, 0.49)).toBe(false);
    expect(interpolateProperty(boolKfs, 0.51)).toBe(true);
  });
});

describe("resolveLayerProperties", () => {
  it("returns unchanged properties when no keyframes", () => {
    const props = { opacity: 0.5, color: "#ff0000" };
    const resolved = resolveLayerProperties(props, undefined, 0.5);
    expect(resolved).toEqual(props);
  });

  it("resolves animated property at time t", () => {
    const props = { opacity: 1.0 };
    const keyframes = {
      opacity: [
        { time: 0, value: 0, easing: "linear" as const },
        { time: 2, value: 1, easing: "linear" as const },
      ],
    };
    const resolved = resolveLayerProperties(props, keyframes, 1.0);
    expect(resolved.opacity).toBeCloseTo(0.5);
  });
});

describe("create_timeline tool", () => {
  it("creates a timeline layer", async () => {
    const context = makeMockContext();
    const tool = animationPlugin.mcpTools.find((t) => t.name === "create_timeline")!;
    const result = await tool.handler({ duration: 5, fps: 24, loop: false }, context);
    expect(context.layers.add).toHaveBeenCalled();
    expect(result.isError).toBeFalsy();
  });
});

describe("set_keyframe tool", () => {
  it("adds a keyframe to a layer", async () => {
    const existing: DesignLayer = {
      id: "layer-1", type: "shapes:rect", name: "Rect", visible: true, locked: false,
      opacity: 1, blendMode: "normal",
      transform: { x: 0, y: 0, width: 200, height: 200, rotation: 0, scaleX: 1, scaleY: 1, anchorX: 0.5, anchorY: 0.5 },
      properties: { fillColor: "#ff0000" },
    };
    const context = makeMockContext([existing]);
    const tool = animationPlugin.mcpTools.find((t) => t.name === "set_keyframe")!;
    const result = await tool.handler({ layerId: "layer-1", property: "opacity", time: 0, value: 0 }, context);
    expect(context.layers.updateProperties).toHaveBeenCalled();
    expect(result.isError).toBeFalsy();
  });

  it("returns error for unknown layer", async () => {
    const context = makeMockContext();
    const tool = animationPlugin.mcpTools.find((t) => t.name === "set_keyframe")!;
    const result = await tool.handler({ layerId: "not-found", property: "opacity", time: 0, value: 0 }, context);
    expect(result.isError).toBe(true);
  });
});

describe("list_keyframes tool", () => {
  it("returns no-keyframes message for clean layer", async () => {
    const existing: DesignLayer = {
      id: "layer-1", type: "shapes:rect", name: "Rect", visible: true, locked: false,
      opacity: 1, blendMode: "normal",
      transform: { x: 0, y: 0, width: 200, height: 200, rotation: 0, scaleX: 1, scaleY: 1, anchorX: 0.5, anchorY: 0.5 },
      properties: {},
    };
    const context = makeMockContext([existing]);
    const tool = animationPlugin.mcpTools.find((t) => t.name === "list_keyframes")!;
    const result = await tool.handler({ layerId: "layer-1" }, context);
    expect(result.content[0]?.text).toContain("No keyframes");
  });
});

describe("clear_keyframes tool", () => {
  it("clears all keyframes", async () => {
    const existing: DesignLayer = {
      id: "layer-1", type: "shapes:rect", name: "Rect", visible: true, locked: false,
      opacity: 1, blendMode: "normal",
      transform: { x: 0, y: 0, width: 200, height: 200, rotation: 0, scaleX: 1, scaleY: 1, anchorX: 0.5, anchorY: 0.5 },
      properties: { __keyframes: JSON.stringify({ opacity: [{ time: 0, value: 0, easing: "linear" }] }) },
    };
    const context = makeMockContext([existing]);
    const tool = animationPlugin.mcpTools.find((t) => t.name === "clear_keyframes")!;
    const result = await tool.handler({ layerId: "layer-1" }, context);
    expect(context.layers.updateProperties).toHaveBeenCalled();
    expect(result.isError).toBeFalsy();
  });
});
