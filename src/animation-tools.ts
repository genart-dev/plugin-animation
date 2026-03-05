import type {
  McpToolDefinition,
  McpToolContext,
  McpToolResult,
  JsonSchema,
  DesignLayer,
  LayerTransform,
  LayerProperties,
  BlendMode,
} from "@genart-dev/core";
import type { Keyframe, KeyframeEasing, LayerPropertyValue } from "./types.js";

function textResult(text: string): McpToolResult {
  return { content: [{ type: "text", text }] };
}

function errorResult(text: string): McpToolResult {
  return { content: [{ type: "text", text }], isError: true };
}

function generateLayerId(): string {
  return `layer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Read keyframes stored in layer.properties as JSON. */
function getLayerKeyframes(layer: DesignLayer): Record<string, Keyframe[]> {
  const raw = layer.properties.__keyframes;
  if (!raw) return {};
  try { return JSON.parse(raw as string); } catch { return {}; }
}

/** Write keyframes back into layer.properties as JSON. */
function setLayerKeyframes(
  context: McpToolContext,
  layerId: string,
  keyframes: Record<string, Keyframe[]>,
): void {
  context.layers.updateProperties(layerId, {
    __keyframes: JSON.stringify(keyframes),
  } as Partial<LayerProperties>);
}

export const createTimelineTool: McpToolDefinition = {
  name: "create_timeline",
  description: "Add an animation timeline to the sketch (sets global duration, fps, and loop).",
  inputSchema: {
    type: "object",
    properties: {
      duration: { type: "number", description: "Total duration in seconds. Default 3.0." },
      fps: { type: "number", description: "Frame rate for export. 1–60. Default 30." },
      loop: { type: "boolean", description: "Whether the animation loops. Default true." },
    },
  } satisfies JsonSchema,

  async handler(input: Record<string, unknown>, context: McpToolContext): Promise<McpToolResult> {
    const id = generateLayerId();
    const layer: DesignLayer = {
      id,
      type: "animation:timeline",
      name: "Animation Timeline",
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: "normal" as BlendMode,
      transform: { x: 0, y: 0, width: 0, height: 0, rotation: 0, scaleX: 1, scaleY: 1, anchorX: 0.5, anchorY: 0.5 } satisfies LayerTransform,
      properties: {
        duration: (input.duration as number) ?? 3.0,
        fps: (input.fps as number) ?? 30,
        loop: (input.loop as boolean) ?? true,
      },
    };
    context.layers.add(layer);
    context.emitChange("layer-added");
    return textResult(`Created animation timeline layer '${id}' (${layer.properties.duration}s, ${layer.properties.fps}fps, loop=${layer.properties.loop}).`);
  },
};

export const setKeyframeTool: McpToolDefinition = {
  name: "set_keyframe",
  description: "Add or replace a keyframe on a layer property.",
  inputSchema: {
    type: "object",
    properties: {
      layerId: { type: "string", description: "ID of the layer to animate." },
      property: { type: "string", description: 'Property key to animate (e.g. "opacity", "color", "fontSize").' },
      time: { type: "number", description: "Time in seconds from animation start." },
      value: { description: "Property value at this time (number, string, or boolean)." },
      easing: { description: 'Easing function name or cubic-bezier array. Default "ease-in-out".' },
    },
    required: ["layerId", "property", "time", "value"],
  } satisfies JsonSchema,

  async handler(input: Record<string, unknown>, context: McpToolContext): Promise<McpToolResult> {
    const layerId = input.layerId as string;
    const layer = context.layers.get(layerId);
    if (!layer) return errorResult(`Layer '${layerId}' not found.`);

    const keyframes = getLayerKeyframes(layer);
    const prop = input.property as string;
    if (!keyframes[prop]) keyframes[prop] = [];

    const kf: Keyframe = {
      time: input.time as number,
      value: input.value as LayerPropertyValue,
      easing: (input.easing as KeyframeEasing) ?? "ease-in-out",
    };

    // Replace existing keyframe at same time, or insert sorted
    const arr = keyframes[prop]!;
    const idx = arr.findIndex((k) => k.time === kf.time);
    if (idx >= 0) arr[idx] = kf;
    else {
      arr.push(kf);
      arr.sort((a, b) => a.time - b.time);
    }

    setLayerKeyframes(context, layerId, keyframes);
    context.emitChange("layer-updated");
    return textResult(`Set keyframe on '${layerId}' property '${prop}' at t=${kf.time}s.`);
  },
};

export const removeKeyframeTool: McpToolDefinition = {
  name: "remove_keyframe",
  description: "Remove a specific keyframe from a layer property.",
  inputSchema: {
    type: "object",
    properties: {
      layerId: { type: "string" },
      property: { type: "string" },
      time: { type: "number" },
    },
    required: ["layerId", "property", "time"],
  } satisfies JsonSchema,

  async handler(input: Record<string, unknown>, context: McpToolContext): Promise<McpToolResult> {
    const layerId = input.layerId as string;
    const layer = context.layers.get(layerId);
    if (!layer) return errorResult(`Layer '${layerId}' not found.`);

    const keyframes = getLayerKeyframes(layer);
    const prop = input.property as string;
    const time = input.time as number;
    if (!keyframes[prop]) return errorResult(`No keyframes on property '${prop}'.`);
    keyframes[prop] = keyframes[prop]!.filter((k) => k.time !== time);
    if (keyframes[prop]!.length === 0) delete keyframes[prop];

    setLayerKeyframes(context, layerId, keyframes);
    context.emitChange("layer-updated");
    return textResult(`Removed keyframe at t=${time}s on property '${prop}'.`);
  },
};

export const clearKeyframesTool: McpToolDefinition = {
  name: "clear_keyframes",
  description: "Remove all keyframes from a layer property (or all properties if property omitted).",
  inputSchema: {
    type: "object",
    properties: {
      layerId: { type: "string" },
      property: { type: "string", description: "Omit to clear all animated properties." },
    },
    required: ["layerId"],
  } satisfies JsonSchema,

  async handler(input: Record<string, unknown>, context: McpToolContext): Promise<McpToolResult> {
    const layerId = input.layerId as string;
    const layer = context.layers.get(layerId);
    if (!layer) return errorResult(`Layer '${layerId}' not found.`);

    const keyframes = getLayerKeyframes(layer);
    const prop = input.property as string | undefined;
    if (prop) {
      delete keyframes[prop];
    } else {
      for (const key of Object.keys(keyframes)) delete keyframes[key];
    }

    setLayerKeyframes(context, layerId, keyframes);
    context.emitChange("layer-updated");
    return textResult(prop ? `Cleared keyframes for property '${prop}'.` : `Cleared all keyframes on layer '${layerId}'.`);
  },
};

export const listKeyframesTool: McpToolDefinition = {
  name: "list_keyframes",
  description: "List all keyframes on a layer.",
  inputSchema: {
    type: "object",
    properties: { layerId: { type: "string" } },
    required: ["layerId"],
  } satisfies JsonSchema,

  async handler(input: Record<string, unknown>, context: McpToolContext): Promise<McpToolResult> {
    const layerId = input.layerId as string;
    const layer = context.layers.get(layerId);
    if (!layer) return errorResult(`Layer '${layerId}' not found.`);

    const keyframes = getLayerKeyframes(layer);
    if (Object.keys(keyframes).length === 0) return textResult("No keyframes on this layer.");

    const lines: string[] = [];
    for (const [prop, kfs] of Object.entries(keyframes)) {
      const kfStrs = kfs.map((k) => `t=${k.time}s → ${JSON.stringify(k.value)} [${typeof k.easing === "string" ? k.easing : "cubic-bezier"}]`);
      lines.push(`${prop}:\n  ${kfStrs.join("\n  ")}`);
    }
    return textResult(`Keyframes on '${layerId}':\n${lines.join("\n")}`);
  },
};

export const previewAtTool: McpToolDefinition = {
  name: "preview_at",
  description: "Set the current animation time for preview. Returns the time that was set.",
  inputSchema: {
    type: "object",
    properties: {
      time: { type: "number", description: "Time in seconds." },
      format: { type: "string", enum: ["png", "jpeg"], description: 'Output format hint. Default "png".' },
    },
    required: ["time"],
  } satisfies JsonSchema,

  async handler(input: Record<string, unknown>, context: McpToolContext): Promise<McpToolResult> {
    const time = input.time as number;
    // Set currentTime in sketch state via context if available
    const ctx = context as unknown as Record<string, unknown>;
    if (typeof ctx.setCurrentTime === "function") {
      (ctx.setCurrentTime as (t: number) => void)(time);
    }
    return textResult(`Animation time set to ${time}s. Render to see the result.`);
  },
};

export const exportGifTool: McpToolDefinition = {
  name: "export_gif",
  description: "Export the animation as a GIF. Returns metadata about the export.",
  inputSchema: {
    type: "object",
    properties: {
      quality: { type: "string", enum: ["draft", "standard", "high"], description: 'Default "standard".' },
      width: { type: "number", description: "Export width. Default: sketch canvas width." },
      height: { type: "number", description: "Export height. Default: sketch canvas height." },
      loop: { type: "boolean", description: "Override timeline loop setting." },
    },
  } satisfies JsonSchema,

  async handler(input: Record<string, unknown>, context: McpToolContext): Promise<McpToolResult> {
    // Find timeline layer for settings
    const ctx = context as unknown as Record<string, unknown>;
    const allLayers = (typeof ctx.getLayers === "function"
      ? (ctx.getLayers as () => DesignLayer[])()
      : []) as DesignLayer[];

    const timeline = allLayers.find((l) => l.type === "animation:timeline");
    const duration = (timeline?.properties.duration as number) ?? 3.0;
    const fps = (timeline?.properties.fps as number) ?? 30;
    const frameCount = Math.ceil(duration * fps);

    const quality = (input.quality as string) ?? "standard";
    const paletteSize = quality === "draft" ? 64 : quality === "standard" ? 128 : 256;

    return textResult(
      `GIF export ready: ${frameCount} frames at ${fps}fps (${duration}s), quality=${quality} (${paletteSize}-color palette). ` +
      `Use the CLI \`genart gif\` command to render the full export from the .genart file.`,
    );
  },
};

export const exportFramesTool: McpToolDefinition = {
  name: "export_frames",
  description: "Export individual frames as PNG/JPEG. Returns frame metadata.",
  inputSchema: {
    type: "object",
    properties: {
      format: { type: "string", enum: ["png", "jpeg"], description: 'Default "png".' },
      frameRange: { type: "array", description: "[start, end] frame indices. Default: all.", items: { type: "number" } },
      width: { type: "number" },
      height: { type: "number" },
    },
  } satisfies JsonSchema,

  async handler(input: Record<string, unknown>, context: McpToolContext): Promise<McpToolResult> {
    const ctx = context as unknown as Record<string, unknown>;
    const allLayers = (typeof ctx.getLayers === "function"
      ? (ctx.getLayers as () => DesignLayer[])()
      : []) as DesignLayer[];

    const timeline = allLayers.find((l) => l.type === "animation:timeline");
    const duration = (timeline?.properties.duration as number) ?? 3.0;
    const fps = (timeline?.properties.fps as number) ?? 30;
    const totalFrames = Math.ceil(duration * fps);

    const frameRange = input.frameRange as [number, number] | undefined;
    const start = frameRange?.[0] ?? 0;
    const end = frameRange?.[1] ?? totalFrames - 1;
    const count = end - start + 1;
    const format = (input.format as string) ?? "png";

    return textResult(
      `Frame export: ${count} frames (${start}–${end}), format=${format}. ` +
      `Use the CLI \`genart frames\` command to render from the .genart file.`,
    );
  },
};

export const animationMcpTools: McpToolDefinition[] = [
  createTimelineTool,
  setKeyframeTool,
  removeKeyframeTool,
  clearKeyframesTool,
  listKeyframesTool,
  previewAtTool,
  exportGifTool,
  exportFramesTool,
];
