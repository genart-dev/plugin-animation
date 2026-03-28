import { describe, it, expect, vi } from "vitest";
import { motionPathLayerType, sampleMotionPath } from "../src/motion-path-layer.js";
import { timelineLayerType } from "../src/timeline-layer.js";
import animationPlugin from "../src/index.js";
import type { LayerBounds, RenderResources, McpToolContext, DesignLayer, BlendMode } from "@genart-dev/core";

const BOUNDS: LayerBounds = { x: 0, y: 0, width: 400, height: 400, rotation: 0, scaleX: 1, scaleY: 1 };
const RESOURCES: RenderResources = { getFont: () => null, getImage: () => null, theme: "dark", pixelRatio: 1 };

function createMockCtx() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    setLineDash: vi.fn(),
    strokeStyle: "",
    fillStyle: "",
    lineWidth: 1,
    globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D;
}

function makeMockToolContext(): McpToolContext {
  return {
    layers: { add: vi.fn(), get: vi.fn() },
    canvasWidth: 800,
    canvasHeight: 600,
    emitChange: vi.fn(),
  } as unknown as McpToolContext;
}

// ---------------------------------------------------------------------------
// Timeline loop modes
// ---------------------------------------------------------------------------
describe("timeline loopMode property", () => {
  it("createDefault includes loopMode", () => {
    const d = timelineLayerType.createDefault();
    expect(d.loopMode).toBe("repeat");
  });

  it("has loopMode property schema with 3 options", () => {
    const loopProp = timelineLayerType.properties.find((p) => p.key === "loopMode");
    expect(loopProp).toBeDefined();
    expect(loopProp!.type).toBe("select");
    expect((loopProp as any).options).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// Motion Path Layer
// ---------------------------------------------------------------------------
describe("animation:motion-path", () => {
  it("has correct metadata", () => {
    expect(motionPathLayerType.typeId).toBe("animation:motion-path");
    expect(motionPathLayerType.category).toBe("guide");
  });

  it("creates defaults", () => {
    const d = motionPathLayerType.createDefault();
    expect(d.path).toBe("[]");
    expect(d.alignRotation).toBe(true);
    expect(d.showPath).toBe(true);
    expect(d.easing).toBe("linear");
  });

  it("renders path guide when showPath is true", () => {
    const ctx = createMockCtx();
    const points = [{ x: 10, y: 10 }, { x: 100, y: 100 }, { x: 200, y: 50 }];
    motionPathLayerType.render(
      { ...motionPathLayerType.createDefault(), path: JSON.stringify(points), showPath: true },
      ctx, BOUNDS, RESOURCES,
    );
    expect(ctx.moveTo).toHaveBeenCalled();
    expect(ctx.lineTo).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
    // Control points drawn
    expect(ctx.arc).toHaveBeenCalledTimes(3);
  });

  it("skips rendering when showPath is false", () => {
    const ctx = createMockCtx();
    motionPathLayerType.render(
      { ...motionPathLayerType.createDefault(), showPath: false },
      ctx, BOUNDS, RESOURCES,
    );
    expect(ctx.beginPath).not.toHaveBeenCalled();
  });

  it("skips rendering with fewer than 2 points", () => {
    const ctx = createMockCtx();
    motionPathLayerType.render(
      { ...motionPathLayerType.createDefault(), path: JSON.stringify([{ x: 0, y: 0 }]) },
      ctx, BOUNDS, RESOURCES,
    );
    expect(ctx.moveTo).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// sampleMotionPath utility
// ---------------------------------------------------------------------------
describe("sampleMotionPath", () => {
  const path = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }];

  it("returns start point at t=0", () => {
    const { x, y } = sampleMotionPath(path, 0);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(0);
  });

  it("returns end point at t=1", () => {
    const { x, y } = sampleMotionPath(path, 1);
    expect(x).toBeCloseTo(100);
    expect(y).toBeCloseTo(100);
  });

  it("returns midpoint at t=0.5 (on the L-shaped path)", () => {
    const { x, y } = sampleMotionPath(path, 0.5);
    expect(x).toBeCloseTo(100);
    expect(y).toBeCloseTo(0);
  });

  it("returns correct angle for horizontal segment", () => {
    const { angle } = sampleMotionPath(path, 0.25);
    expect(angle).toBeCloseTo(0); // moving right
  });

  it("returns correct angle for vertical segment", () => {
    const { angle } = sampleMotionPath(path, 0.75);
    expect(angle).toBeCloseTo(90); // moving down
  });

  it("handles single-point path", () => {
    const { x, y } = sampleMotionPath([{ x: 50, y: 50 }], 0.5);
    expect(x).toBe(50);
    expect(y).toBe(50);
  });

  it("handles empty path", () => {
    const { x, y } = sampleMotionPath([], 0.5);
    expect(x).toBe(0);
    expect(y).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// create_motion_path tool
// ---------------------------------------------------------------------------
describe("create_motion_path tool", () => {
  it("creates a motion path layer", async () => {
    const ctx = makeMockToolContext();
    const tool = animationPlugin.mcpTools.find((t) => t.name === "create_motion_path")!;
    expect(tool).toBeDefined();
    const result = await tool.handler(
      { points: [{ x: 0, y: 0 }, { x: 100, y: 100 }] },
      ctx,
    );
    expect(result.isError).toBeFalsy();
    expect(ctx.layers.add).toHaveBeenCalled();
  });

  it("rejects fewer than 2 points", async () => {
    const ctx = makeMockToolContext();
    const tool = animationPlugin.mcpTools.find((t) => t.name === "create_motion_path")!;
    const result = await tool.handler({ points: [{ x: 0, y: 0 }] }, ctx);
    expect(result.isError).toBe(true);
  });
});
