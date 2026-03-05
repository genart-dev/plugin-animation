import { describe, it, expect, vi } from "vitest";
import { timelineLayerType } from "../src/index.js";
import type { LayerBounds, RenderResources } from "@genart-dev/core";

const BOUNDS: LayerBounds = { x: 0, y: 0, width: 400, height: 300 };
const RESOURCES: RenderResources = {} as RenderResources;

function makeMockCtx() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    getImageData: vi.fn(),
    putImageData: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

describe("timelineLayerType render", () => {
  it("is a no-op (guide layer)", () => {
    const ctx = makeMockCtx();
    timelineLayerType.render(timelineLayerType.createDefault(), ctx, BOUNDS, RESOURCES);
    expect(ctx.save).not.toHaveBeenCalled();
    expect(ctx.fillRect).not.toHaveBeenCalled();
    expect(ctx.getImageData).not.toHaveBeenCalled();
    expect(ctx.drawImage).not.toHaveBeenCalled();
  });

  it("does not throw with any property values", () => {
    const ctx = makeMockCtx();
    expect(() =>
      timelineLayerType.render({ duration: 10, fps: 60, loop: false }, ctx, BOUNDS, RESOURCES),
    ).not.toThrow();
  });

  it("does not throw with zero-size bounds", () => {
    const ctx = makeMockCtx();
    expect(() =>
      timelineLayerType.render(timelineLayerType.createDefault(), ctx, { x: 0, y: 0, width: 0, height: 0 }, RESOURCES),
    ).not.toThrow();
  });
});
