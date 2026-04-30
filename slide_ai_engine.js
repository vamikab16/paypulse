/**
 * PayPulse · "05 · THE AI ENGINE" slide
 * Matches the Canva light-lavender design.
 * Run: NODE_PATH=$(npm root -g) node slide_ai_engine.js
 * Output: ai_engine_slide.pptx
 */

const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9"; // 10" × 5.625"

// ── Palette (light lavender theme) ──
const P = {
  slideBg:    "EDE6F5",   // soft lavender slide background
  cardBg:     "F4EFFA",   // card fill
  cardBorder: "DDD5EE",   // card border
  darkBox:    "2D1F4E",   // dark input/output box
  darkText:   "F0EAF9",   // text inside dark box
  num:        "C890A7",   // large card number (mauve/rose)
  titlePurp:  "3B2870",   // main title + card titles (deep purple)
  eyebrow:    "7B68B0",   // eyebrow label
  subPurp:    "8472B8",   // card sub-label (model name)
  bodyPurp:   "5A4A7A",   // card body text
  footer:     "9E8FC0",   // footer text
  logoCircle: "7B68B0",   // NatWest logo circle fill
  stripe:     "C890A7",   // top stripe on cards
};

const slide = pres.addSlide();

// ── Slide background ──
slide.background = { color: P.slideBg };

// ── Subtle radial glow (bottom-left, top-right) using large low-opacity ovals ──
slide.addShape(pres.shapes.OVAL, {
  x: -1.5, y: 3, w: 5, h: 5,
  fill: { color: "C8A8E0", transparency: 82 },
  line: { color: P.slideBg, width: 0 }
});
slide.addShape(pres.shapes.OVAL, {
  x: 7, y: -1.5, w: 5, h: 5,
  fill: { color: "C8A8E0", transparency: 82 },
  line: { color: P.slideBg, width: 0 }
});

// ── Eyebrow: "05 · THE AI ENGINE" ──
slide.addText("05  ·  THE AI ENGINE", {
  x: 0.52, y: 0.38, w: 3.5, h: 0.22,
  fontSize: 9, color: P.eyebrow, fontFace: "Calibri",
  charSpacing: 3, bold: false, margin: 0
});

// ── NatWest Group logo placeholder (top-right circle) ──
slide.addShape(pres.shapes.OVAL, {
  x: 9.0, y: 0.28, w: 0.62, h: 0.62,
  fill: { color: P.logoCircle }, line: { color: P.logoCircle, width: 0 }
});
slide.addText("NW", {
  x: 9.0, y: 0.28, w: 0.62, h: 0.62,
  fontSize: 10, color: "FFFFFF", bold: true, fontFace: "Calibri",
  align: "center", valign: "middle", margin: 0
});
slide.addText("NatWest\nGroup", {
  x: 8.76, y: 0.93, w: 1.1, h: 0.32,
  fontSize: 7, color: P.eyebrow, fontFace: "Calibri",
  align: "center", margin: 0
});

// ── Main title ──
slide.addText("Three models. One signal. Explained at every step.", {
  x: 0.52, y: 0.62, w: 8.3, h: 0.7,
  fontSize: 30, color: P.titlePurp, bold: true, fontFace: "Calibri",
  margin: 0, wrap: true
});

// ── Helper: draw one model card ──
function modelCard(slide, x, num, title, modelLine, body, inputLine, outputLine) {
  const y = 1.5, w = 2.9, h = 3.82;
  const innerW = w - 0.28;

  // Card background
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h,
    fill: { color: P.cardBg },
    line: { color: P.cardBorder, width: 1 }
  });

  // Top accent stripe
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h: 0.04,
    fill: { color: P.stripe }, line: { color: P.stripe, width: 0 }
  });

  // Large number
  slide.addText(num, {
    x: x + 0.16, y: y + 0.12, w: innerW, h: 0.52,
    fontSize: 34, color: P.num, bold: true, fontFace: "Calibri",
    margin: 0
  });

  // Card title
  slide.addText(title, {
    x: x + 0.16, y: y + 0.68, w: innerW, h: 0.28,
    fontSize: 13, color: P.titlePurp, bold: true, fontFace: "Calibri",
    margin: 0
  });

  // Model / tech line
  slide.addText(modelLine, {
    x: x + 0.16, y: y + 0.97, w: innerW, h: 0.2,
    fontSize: 8.5, color: P.subPurp, fontFace: "Calibri",
    margin: 0
  });

  // Body description
  slide.addText(body, {
    x: x + 0.16, y: y + 1.2, w: innerW, h: 0.92,
    fontSize: 9, color: P.bodyPurp, fontFace: "Calibri",
    margin: 0, wrap: true
  });

  // Dark I/O box
  const boxY = y + h - 1.08;
  slide.addShape(pres.shapes.RECTANGLE, {
    x: x + 0.12, y: boxY, w: w - 0.24, h: 0.98,
    fill: { color: P.darkBox }, line: { color: P.darkBox, width: 0 }
  });
  slide.addText([
    { text: "INPUT", options: { color: P.num, bold: true } },
    { text: "  →  " + inputLine, options: { color: P.darkText, bold: false } },
    { text: "\nOUTPUT", options: { color: P.num, bold: true, breakLine: false } },
    { text: "  →  " + outputLine, options: { color: P.darkText, bold: false } }
  ], {
    x: x + 0.22, y: boxY + 0.12, w: w - 0.44, h: 0.74,
    fontSize: 8.5, fontFace: "Calibri", margin: 0, wrap: true
  });
}

// ── Card 01 — Time-Series Forecaster ──
modelCard(
  slide, 0.52,
  "01",
  "Time-Series Forecaster",
  "Holt-Winters · trend + seasonality",
  "Projects each supplier's payment delay 4–8 weeks ahead. Picks up holiday cycles and gradual deterioration.",
  "52w delay series",
  "forecast + 95% CI"
);

// ── Card 02 — Risk Classifier ──
modelCard(
  slide, 3.55,
  "02",
  "Risk Classifier",
  "XGBoost · 14 behavioural features",
  "Maps the behavioural vector to a default-probability and a stress regime (healthy / drift / acute / seasonal).",
  "feature vector",
  "P(default) + class"
);

// ── Card 03 — Insight LLM ──
modelCard(
  slide, 6.58,
  "03",
  "Insight LLM",
  "Groq · Llama 3.3 70B · two prompts",
  "Translates numbers to language. SME prompt = supportive coaching. Bank prompt = risk-team next-best-action.",
  "portfolio context",
  "JSON insight pack"
);

// ── Footer ──
slide.addShape(pres.shapes.LINE, {
  x: 0.52, y: 5.38, w: 9, h: 0,
  line: { color: P.cardBorder, width: 0.75 }
});
slide.addText("PAYPULSE  ·  BYTEHER", {
  x: 0.52, y: 5.42, w: 9, h: 0.16,
  fontSize: 7.5, color: P.footer, fontFace: "Calibri",
  charSpacing: 2, align: "center", margin: 0
});

// ── Write file ──
pres.writeFile({ fileName: "/Users/vamikabhardwaj/Desktop/paypulse/ai_engine_slide.pptx" })
  .then(() => console.log("✓ ai_engine_slide.pptx written"))
  .catch(e => { console.error(e); process.exit(1); });
