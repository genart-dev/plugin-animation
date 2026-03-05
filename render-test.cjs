/**
 * Render test: Animation plugin visual outputs
 * 1. Easing curves chart (all easing types)
 * 2. Color interpolation strip (Oklab)
 */
const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");

const { applyKeyframeEasing, interpolateProperty } = require("./dist/index.cjs");

const outDir = path.join(__dirname, "test-renders");
fs.mkdirSync(outDir, { recursive: true });

// ─── 1. Easing Curves ───
{
  const CW = 160, CH = 140, PAD = 12, LABEL_H = 24;
  const COLS = 4, ROWS = 3;
  const W = COLS * CW + (COLS + 1) * PAD;
  const H = ROWS * (CH + LABEL_H) + (ROWS + 1) * PAD;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, W, H);

  const easings = [
    ["linear", "linear"],
    ["ease-in", "ease-in"],
    ["ease-out", "ease-out"],
    ["ease-in-out", "ease-in-out"],
    ["ease-in-cubic", "ease-in-cubic"],
    ["ease-out-cubic", "ease-out-cubic"],
    ["ease-in-out-cubic", "ease-in-out-cubic"],
    ["step-start", "step-start"],
    ["step-end", "step-end"],
    ["cubic-bezier(.17,.67,.83,.33)", [0.17, 0.67, 0.83, 0.33]],
    ["cubic-bezier(0,.8,1,.2)", [0, 0.8, 1, 0.2]],
    ["cubic-bezier(.5,0,.5,1)", [0.5, 0, 0.5, 1]],
  ];

  const colors = [
    "#4ecdc4", "#ff6b6b", "#ffd93d", "#6bcb77",
    "#4d96ff", "#ff6fb7", "#c084fc", "#f97316",
    "#14b8a6", "#a78bfa", "#fb923c", "#2dd4bf",
  ];

  easings.forEach(([label, easing], idx) => {
    const col = idx % COLS;
    const row = Math.floor(idx / COLS);
    const x0 = PAD + col * (CW + PAD);
    const y0 = PAD + row * (CH + LABEL_H + PAD);

    // Background cell
    ctx.fillStyle = "#16213e";
    ctx.fillRect(x0, y0 + LABEL_H, CW, CH);

    // Grid lines
    ctx.strokeStyle = "#0f3460";
    ctx.lineWidth = 0.5;
    for (let g = 0.25; g < 1; g += 0.25) {
      ctx.beginPath();
      ctx.moveTo(x0, y0 + LABEL_H + CH * (1 - g));
      ctx.lineTo(x0 + CW, y0 + LABEL_H + CH * (1 - g));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x0 + CW * g, y0 + LABEL_H);
      ctx.lineTo(x0 + CW * g, y0 + LABEL_H + CH);
      ctx.stroke();
    }

    // Label
    ctx.fillStyle = "#e0e0e0";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText(label, x0 + 4, y0 + 16);

    // Draw curve
    ctx.strokeStyle = colors[idx];
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const steps = 100;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const v = applyKeyframeEasing(t, easing);
      const px = x0 + t * CW;
      const py = y0 + LABEL_H + CH * (1 - v);
      if (s === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Dot at t=0.5
    const midV = applyKeyframeEasing(0.5, easing);
    ctx.fillStyle = colors[idx];
    ctx.beginPath();
    ctx.arc(x0 + 0.5 * CW, y0 + LABEL_H + CH * (1 - midV), 4, 0, Math.PI * 2);
    ctx.fill();
  });

  fs.writeFileSync(path.join(outDir, "easing-curves.png"), canvas.toBuffer("image/png"));
  console.log("Wrote easing-curves.png");
}

// ─── 2. Color Interpolation Strip ───
{
  const W = 700, H = 200;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, W, H);

  const pairs = [
    ["#ff0000", "#0000ff", "Red → Blue"],
    ["#ff6b6b", "#4ecdc4", "Coral → Teal"],
    ["#000000", "#ffffff", "Black → White"],
    ["#ffd93d", "#6b1d9e", "Gold → Purple"],
  ];

  const stripH = 32;
  const gap = 8;
  const margin = 20;
  const stripW = W - margin * 2;

  pairs.forEach(([c1, c2, label], row) => {
    const y = margin + row * (stripH + gap + 16);

    ctx.fillStyle = "#b0b0b0";
    ctx.font = "11px sans-serif";
    ctx.fillText(label, margin, y + 10);

    const kfs = [
      { time: 0, value: c1, easing: "linear" },
      { time: 1, value: c2, easing: "linear" },
    ];

    for (let px = 0; px < stripW; px++) {
      const t = px / (stripW - 1);
      const color = interpolateProperty(kfs, t);
      ctx.fillStyle = color;
      ctx.fillRect(margin + px, y + 14, 1, stripH);
    }

    // Border
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    ctx.strokeRect(margin, y + 14, stripW, stripH);
  });

  fs.writeFileSync(path.join(outDir, "color-interpolation.png"), canvas.toBuffer("image/png"));
  console.log("Wrote color-interpolation.png");
}
