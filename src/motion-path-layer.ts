import type {
  LayerTypeDefinition,
  LayerPropertySchema,
  LayerProperties,
  LayerBounds,
  RenderResources,
} from "@genart-dev/core";

const MOTION_PATH_PROPERTIES: LayerPropertySchema[] = [
  {
    key: "path",
    label: "Path Points",
    type: "string",
    default: '[]',
    group: "motion",
  },
  {
    key: "targetLayerId",
    label: "Target Layer ID",
    type: "string",
    default: "",
    group: "motion",
  },
  {
    key: "alignRotation",
    label: "Align to Path",
    type: "boolean",
    default: true,
    group: "motion",
  },
  {
    key: "easing",
    label: "Path Easing",
    type: "select",
    default: "linear",
    options: [
      { value: "linear", label: "Linear (constant speed)" },
      { value: "ease-in", label: "Ease In" },
      { value: "ease-out", label: "Ease Out" },
      { value: "ease-in-out", label: "Ease In-Out" },
    ],
    group: "motion",
  },
  {
    key: "showPath",
    label: "Show Path Guide",
    type: "boolean",
    default: true,
    group: "display",
  },
  {
    key: "pathColor",
    label: "Path Color",
    type: "color",
    default: "#0088ff",
    group: "display",
  },
];

export const motionPathLayerType: LayerTypeDefinition = {
  typeId: "animation:motion-path",
  displayName: "Motion Path",
  icon: "motion-path",
  category: "guide",
  properties: MOTION_PATH_PROPERTIES,
  propertyEditorId: "animation:motion-path-editor",

  createDefault(): LayerProperties {
    const props: LayerProperties = {};
    for (const schema of MOTION_PATH_PROPERTIES) {
      props[schema.key] = schema.default;
    }
    return props;
  },

  render(
    properties: LayerProperties,
    ctx: CanvasRenderingContext2D,
    bounds: LayerBounds,
    _resources: RenderResources,
  ): void {
    const showPath = (properties.showPath as boolean) ?? true;
    if (!showPath) return;

    const pathJson = (properties.path as string) ?? "[]";
    let points: Array<{ x: number; y: number }>;
    try {
      points = JSON.parse(pathJson);
    } catch {
      return;
    }
    if (!Array.isArray(points) || points.length < 2) return;

    const pathColor = (properties.pathColor as string) ?? "#0088ff";

    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = pathColor;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.7;

    ctx.beginPath();
    ctx.moveTo(points[0]!.x, points[0]!.y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i]!.x, points[i]!.y);
    }
    ctx.stroke();

    // Draw control points
    ctx.setLineDash([]);
    ctx.fillStyle = pathColor;
    for (const pt of points) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  },

  validate(): null { return null; },
};

/**
 * Sample a position along a polyline path at parameter t ∈ [0, 1].
 * Returns {x, y, angle} where angle is the direction of travel.
 */
export function sampleMotionPath(
  points: Array<{ x: number; y: number }>,
  t: number,
): { x: number; y: number; angle: number } {
  if (points.length === 0) return { x: 0, y: 0, angle: 0 };
  if (points.length === 1) return { x: points[0]!.x, y: points[0]!.y, angle: 0 };

  // Compute cumulative arc lengths
  const lens: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    const dx = points[i]!.x - points[i - 1]!.x;
    const dy = points[i]!.y - points[i - 1]!.y;
    lens.push(lens[i - 1]! + Math.sqrt(dx * dx + dy * dy));
  }
  const totalLen = lens[lens.length - 1]!;
  if (totalLen === 0) return { x: points[0]!.x, y: points[0]!.y, angle: 0 };

  const targetLen = Math.max(0, Math.min(1, t)) * totalLen;

  // Find segment
  let lo = 0;
  for (let i = 1; i < lens.length; i++) {
    if (lens[i]! >= targetLen) { lo = i - 1; break; }
    lo = i - 1;
  }

  const segLen = lens[lo + 1]! - lens[lo]!;
  const segT = segLen > 0 ? (targetLen - lens[lo]!) / segLen : 0;
  const p0 = points[lo]!;
  const p1 = points[lo + 1]!;

  return {
    x: p0.x + segT * (p1.x - p0.x),
    y: p0.y + segT * (p1.y - p0.y),
    angle: Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180 / Math.PI,
  };
}
