# @genart-dev/plugin-animation

Keyframe animation and export plugin for [genart.dev](https://genart.dev) — animate any design layer property with easing curves, preview in real time, and export as GIF or frame sequences. Includes MCP tools for AI-agent control.

Part of [genart.dev](https://genart.dev) — a generative art platform with an MCP server, desktop app, and IDE extensions.

## Install

```bash
npm install @genart-dev/plugin-animation
```

## Usage

```typescript
import animationPlugin from "@genart-dev/plugin-animation";
import { createDefaultRegistry } from "@genart-dev/core";

const registry = createDefaultRegistry();
registry.registerPlugin(animationPlugin);

// Or access individual exports
import {
  timelineLayerType,
  animationMcpTools,
  interpolateProperty,
  resolveLayerProperties,
  applyKeyframeEasing,
} from "@genart-dev/plugin-animation";
```

## Timeline Layer

Adds an `"animation:timeline"` guide layer that anchors global animation settings. Keyframes are stored on individual layers in `properties.__keyframes`.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `duration` | number | `3.0` | Duration in seconds (0.1–300) |
| `fps` | number | `30` | Frames per second (1–60) |
| `loop` | boolean | `true` | Whether the animation loops |

### Keyframe Easing

Supported easing values: `"linear"`, `"ease-in"`, `"ease-out"`, `"ease-in-out"`, `"ease-in-cubic"`, `"ease-out-cubic"`, `"ease-in-out-cubic"`, `"step-start"`, `"step-end"`, or a custom cubic-bezier `[x1, y1, x2, y2]`.

Color values interpolate in Oklab color space for perceptually uniform transitions. Numbers use linear interpolation. Booleans and selects step at the midpoint.

## MCP Tools (8)

Exposed to AI agents through the MCP server when this plugin is registered:

| Tool | Description |
|------|-------------|
| `create_timeline` | Add an animation timeline layer (sets duration, fps, loop) |
| `set_keyframe` | Add or replace a keyframe on a layer property |
| `remove_keyframe` | Remove a specific keyframe from a layer property |
| `clear_keyframes` | Remove all keyframes from a property (or all properties) |
| `list_keyframes` | List all keyframes on a layer |
| `preview_at` | Set the current animation time for preview |
| `export_gif` | Export animation as GIF (draft/standard/high quality) |
| `export_frames` | Export individual frames as PNG or JPEG |

## API Reference

### `interpolateProperty(keyframes, t)`

Interpolate a single property value at time `t` using the keyframe array.

### `resolveLayerProperties(properties, keyframes, t)`

Resolve all animated properties for a layer at time `t`.

### `applyKeyframeEasing(t, easing)`

Apply an easing function to a normalized time value.

## Related Packages

| Package | Purpose |
|---------|---------|
| [`@genart-dev/core`](https://github.com/genart-dev/core) | Plugin host, layer system (dependency) |
| [`@genart-dev/mcp-server`](https://github.com/genart-dev/mcp-server) | MCP server that surfaces plugin tools to AI agents |

## Support

Questions, bugs, or feedback — [support@genart.dev](mailto:support@genart.dev) or [open an issue](https://github.com/genart-dev/plugin-animation/issues).

## License

MIT
