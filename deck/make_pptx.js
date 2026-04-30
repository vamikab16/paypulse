const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.title = "PayPulse · NatWest Hackathon 2026";

// ── Palette ──
const C = {
  bg:       "0a0a0a",
  card:     "171717",
  card2:    "1f1f1f",
  cream:    "FBF5E5",
  mauve:    "C890A7",
  mauveDeep:"A35C7A",
  muted:    "a89989",
  line:     "2a2a2a",
  good:     "7fc89a",
  warn:     "e8c578",
  bad:      "e57b94",
  ink:      "FBF5E5",
  rose:     "C890A7",
  cream2:   "1f1c18",
  black:    "000000",
};

// ── Helpers ──
function bg(slide) {
  slide.background = { color: C.bg };
}

function footer(slide, rightText) {
  // footer bar line
  slide.addShape(pres.shapes.LINE, {
    x: 0.5, y: 5.32, w: 9.0, h: 0,
    line: { color: "222222", width: 0.5 }
  });
  // brand
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 5.38, w: 0.18, h: 0.18,
    fill: { color: C.mauveDeep }, line: { color: C.mauveDeep, width: 0 }
  });
  slide.addText("PayPulse", {
    x: 0.72, y: 5.36, w: 2, h: 0.22,
    fontSize: 8, color: C.cream, bold: true, fontFace: "Calibri", margin: 0
  });
  slide.addText(rightText, {
    x: 5, y: 5.36, w: 4.5, h: 0.22,
    fontSize: 8, color: C.muted, align: "right", fontFace: "Calibri", margin: 0
  });
}

function eyebrow(slide, text) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.5, y: 0.35, w: text.length * 0.085 + 0.4, h: 0.22,
    fill: { color: "1a0f14" }, line: { color: "3a1f2d", width: 1 }, rectRadius: 0.1
  });
  slide.addText("● " + text, {
    x: 0.5, y: 0.34, w: text.length * 0.085 + 0.4, h: 0.24,
    fontSize: 7.5, color: C.mauve, bold: true, fontFace: "Courier New",
    charSpacing: 2, align: "center", margin: 0
  });
}

function slideNum(slide, n, total) {
  slide.addText(`${String(n).padStart(2,"0")} / ${total}`, {
    x: 8.5, y: 0.35, w: 1, h: 0.22,
    fontSize: 8, color: C.muted, fontFace: "Courier New", align: "right", margin: 0
  });
}

function title(slide, plain, accent) {
  if (accent) {
    slide.addText([
      { text: plain, options: { color: C.cream, bold: true } },
      { text: " " + accent, options: { color: C.mauve, bold: false, italic: true } }
    ], { x: 0.5, y: 0.62, w: 9, h: 0.7, fontSize: 28, fontFace: "Calibri", margin: 0 });
  } else {
    slide.addText(plain, {
      x: 0.5, y: 0.62, w: 9, h: 0.7,
      fontSize: 28, color: C.cream, bold: true, fontFace: "Calibri", margin: 0
    });
  }
}

function subtitle(slide, text) {
  slide.addText(text, {
    x: 0.5, y: 1.35, w: 9, h: 0.45,
    fontSize: 10.5, color: C.muted, fontFace: "Calibri", margin: 0, wrap: true
  });
}

function card(slide, x, y, w, h, opts = {}) {
  const { accent = false, stripeColor = C.mauve } = opts;
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h,
    fill: { color: C.card },
    line: { color: "252525", width: 0.75 }
  });
  // top accent stripe
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h: 0.04,
    fill: { color: stripeColor }, line: { color: stripeColor, width: 0 }
  });
}

function statBox(slide, x, y, w, val, label) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h: 0.52,
    fill: { color: "181818" }, line: { color: "252525", width: 0.75 }
  });
  slide.addText(val, {
    x: x + 0.12, y: y + 0.03, w: w - 0.24, h: 0.26,
    fontSize: 15, color: C.mauveDeep, bold: true, fontFace: "Courier New", margin: 0
  });
  slide.addText(label, {
    x: x + 0.12, y: y + 0.3, w: w - 0.24, h: 0.18,
    fontSize: 7, color: C.muted, fontFace: "Calibri", margin: 0,
    charSpacing: 1, bold: true
  });
}

// ═══════════════════════════════════════════
// SLIDE 1 — TITLE
// ═══════════════════════════════════════════
{
  const s = pres.addSlide();
  bg(s);

  // Decorative radial glow top-right
  s.addShape(pres.shapes.OVAL, {
    x: 7, y: -1.5, w: 5, h: 5,
    fill: { color: "2a0e1c", transparency: 60 },
    line: { color: "2a0e1c", width: 0 }
  });

  // Logo mark
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 0.55, w: 0.5, h: 0.5,
    fill: { color: C.mauveDeep }, line: { color: C.mauveDeep, width: 0 }
  });
  s.addText("~", {
    x: 0.5, y: 0.55, w: 0.5, h: 0.5,
    fontSize: 18, color: C.cream, bold: true, align: "center", valign: "middle",
    fontFace: "Courier New", margin: 0
  });

  // Title
  s.addText([
    { text: "Pay", options: { color: C.cream, bold: true } },
    { text: "Pulse", options: { color: C.mauve, bold: false, italic: true } },
    { text: ".", options: { color: C.cream, bold: true } }
  ], { x: 0.5, y: 1.15, w: 9, h: 1.6, fontSize: 82, fontFace: "Calibri", margin: 0 });

  // Lead
  s.addText("An early-warning intelligence layer that detects SME payment distress 4–8 weeks before traditional credit metrics — by reading the patterns hidden in supplier payments.", {
    x: 0.5, y: 2.82, w: 7.5, h: 0.65,
    fontSize: 12, color: "c8bca8", fontFace: "Calibri", margin: 0, wrap: true
  });

  // Badges
  const badges = [
    { text: "NatWest Hackathon · 2026", bg: C.card2, color: C.cream },
    { text: "Prototype Round · Submission", bg: C.mauveDeep, color: C.cream },
    { text: "Team · IIIT Delhi", bg: "0d0d0d", color: C.cream },
  ];
  badges.forEach((b, i) => {
    const bx = 0.5 + i * 2.85;
    s.addShape(pres.shapes.RECTANGLE, {
      x: bx, y: 3.6, w: 2.7, h: 0.32,
      fill: { color: b.bg }, line: { color: "333333", width: 0.5 }
    });
    s.addText(b.text, {
      x: bx, y: 3.6, w: 2.7, h: 0.32,
      fontSize: 8.5, color: b.color, align: "center", valign: "middle",
      fontFace: "Courier New", bold: true, margin: 0
    });
  });

  // Bottom meta
  s.addText("LIVE PROTOTYPE", { x: 0.5, y: 4.95, w: 3, h: 0.16, fontSize: 7, color: C.mauve, fontFace: "Courier New", bold: true, charSpacing: 2, margin: 0 });
  s.addText("localhost:8000 · python run.py", { x: 0.5, y: 5.12, w: 3.5, h: 0.16, fontSize: 8, color: C.cream, fontFace: "Courier New", bold: true, margin: 0 });
  s.addText("CODEBASE", { x: 7, y: 4.95, w: 2.5, h: 0.16, fontSize: 7, color: C.mauve, fontFace: "Courier New", bold: true, charSpacing: 2, align: "right", margin: 0 });
  s.addText("23,481 LOC · 29 APIs · 6 ML models", { x: 5.5, y: 5.12, w: 4, h: 0.16, fontSize: 8, color: C.cream, fontFace: "Courier New", bold: true, align: "right", margin: 0 });
}

// ═══════════════════════════════════════════
// SLIDE 2 — THE PROBLEM
// ═══════════════════════════════════════════
{
  const s = pres.addSlide();
  bg(s);
  eyebrow(s, "The Problem");
  slideNum(s, 2, 10);
  title(s, "SME distress hides", "in plain sight.");
  subtitle(s, "When a small business runs out of cash, it doesn't default on the bank first — it stretches its suppliers. That signal arrives weeks before any credit metric moves.");

  const problems = [
    { title: "Banks see only their own repayments", body: "Loan statements show one signal — the borrower's payment to the bank. They never see how that SME is paying its 5–30 suppliers.", stripe: C.mauve },
    { title: "Distress detected 4–8 weeks late", body: "Traditional credit scores lag the underlying behaviour. By the time DSCR breaches, the loss is already locked in.", stripe: C.rose },
    { title: "Payment triage is invisible", body: "Stressed SMEs pay critical vendors on time and stretch the rest. That divergence — the triage signal — is the earliest predictor.", stripe: C.mauveDeep },
    { title: "No view of supply-chain contagion", body: "One delayed buyer cascades through 4–5 supplier tiers. Banks model each loan in isolation; the network effect is unmodelled.", stripe: C.mauve },
    { title: "Reactive, not proactive RM", body: "Relationship Managers learn of distress from missed direct debits. There's no nudge two months earlier when intervention still works.", stripe: C.rose },
    { title: "Consumer Duty gap", body: "FCA's 'avoid foreseeable harm' principle requires proactive support. Today's tooling can't evidence that for SME books.", stripe: C.mauveDeep },
  ];

  const cw = 2.93, ch = 1.12;
  problems.forEach((p, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const cx = 0.5 + col * (cw + 0.08), cy = 1.88 + row * (ch + 0.08);
    card(s, cx, cy, cw, ch, { stripeColor: p.stripe });
    s.addText(p.title, {
      x: cx + 0.12, y: cy + 0.1, w: cw - 0.24, h: 0.22,
      fontSize: 9.5, color: C.cream, bold: true, fontFace: "Calibri", margin: 0, wrap: true
    });
    s.addText(p.body, {
      x: cx + 0.12, y: cy + 0.33, w: cw - 0.24, h: 0.72,
      fontSize: 8, color: C.muted, fontFace: "Calibri", margin: 0, wrap: true
    });
  });

  // Stats
  const stats = [
    { v: "£25K Cr", l: "Annual SME loan defaults · India" },
    { v: "4–8 wk", l: "Lead time bank misses today" },
    { v: "~99%", l: "Of SMEs invisible at supplier level" },
  ];
  stats.forEach((st, i) => {
    statBox(s, 0.5 + i * 3.03, 4.72, 2.9, st.v, st.l);
  });

  footer(s, "The Problem · Hidden Distress Signals");
}

// ═══════════════════════════════════════════
// SLIDE 3 — SOLUTION
// ═══════════════════════════════════════════
{
  const s = pres.addSlide();
  bg(s);
  eyebrow(s, "The Solution");
  slideNum(s, 3, 10);
  title(s, "PayPulse: a payment-triage", "detection engine.");
  subtitle(s, "A full-stack platform that turns a bank's passive supplier-payment data into an active early-warning signal — with explainable AI, contagion modelling, and a dual-lens dashboard.");

  // Pipeline bar background
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 1.84, w: 9, h: 0.38,
    fill: { color: C.cream }, line: { color: C.cream, width: 0 }
  });
  // PayPulse Engine highlight
  s.addShape(pres.shapes.RECTANGLE, {
    x: 3.07, y: 1.84, w: 1.6, h: 0.38,
    fill: { color: C.mauveDeep }, line: { color: C.mauveDeep, width: 0 }
  });
  const pipeSteps = ["Bank's Supplier Payment Stream", "→", "PayPulse Engine", "→", "SME Dashboard", "+", "RM Action Queue"];
  const tcols =     [C.black, C.mauveDeep, C.cream, C.mauveDeep, C.black, C.mauveDeep, C.black];
  let px = 0.5;
  const widths = [2.2, 0.25, 1.6, 0.25, 1.6, 0.25, 2.0];
  pipeSteps.forEach((txt, i) => {
    s.addText(txt, {
      x: px, y: 1.84, w: widths[i], h: 0.38,
      fontSize: 8.5, color: tcols[i], fontFace: "Calibri", bold: i === 2,
      align: "center", valign: "middle", margin: 0
    });
    px += widths[i] + 0.05;
  });

  // 5 solution cards
  const solutions = [
    { n: "01", title: "Triage Pattern Detection", body: "Spots cross-supplier payment divergence — the earliest signal of cash stress.", tag: "⚡ 4–8 wk early", stripe: C.mauve },
    { n: "02", title: "6-Model AI Ensemble", body: "GBR forecaster, RF classifier, IsoForest, KMeans, GRU + SHAP — no black boxes.", tag: "⚡ 99.6% accuracy", stripe: C.rose },
    { n: "03", title: "Contagion Graph", body: "Directed buyer→supplier network with discrete-time stress propagation, £-denominated.", tag: "⚡ Network risk", stripe: C.mauveDeep },
    { n: "04", title: "Scenario Simulator", body: "Five what-if presets project 6-week outcomes with intervention vs baseline overlays.", tag: "⚡ Interactive", stripe: C.mauve },
    { n: "05", title: "Dual-Lens UI", body: "SME owner sees their pulse; RM sees the bank book — same engine, two stories.", tag: "⚡ Consumer Duty", stripe: C.rose },
  ];
  const cw5 = 1.74;
  solutions.forEach((sol, i) => {
    const cx = 0.5 + i * (cw5 + 0.075);
    card(s, cx, 2.3, cw5, 2.75, { stripeColor: sol.stripe });
    s.addText(sol.n, {
      x: cx + cw5 - 0.55, y: 2.32, w: 0.5, h: 0.3,
      fontSize: 20, color: "222222", fontFace: "Courier New", bold: true, margin: 0, align: "right"
    });
    s.addText(sol.title, {
      x: cx + 0.1, y: 2.48, w: cw5 - 0.2, h: 0.38,
      fontSize: 9, color: C.cream, bold: true, fontFace: "Calibri", margin: 0, wrap: true
    });
    s.addText(sol.body, {
      x: cx + 0.1, y: 2.9, w: cw5 - 0.2, h: 0.85,
      fontSize: 7.5, color: C.muted, fontFace: "Calibri", margin: 0, wrap: true
    });
    // tag
    s.addShape(pres.shapes.LINE, {
      x: cx + 0.1, y: 4.84, w: cw5 - 0.2, h: 0,
      line: { color: "333333", width: 0.5, dashType: "dash" }
    });
    s.addText(sol.tag, {
      x: cx + 0.1, y: 4.87, w: cw5 - 0.2, h: 0.16,
      fontSize: 7.5, color: C.mauve, fontFace: "Courier New", bold: true, margin: 0
    });
  });

  footer(s, "Solution · The PayPulse Stack");
}

// ═══════════════════════════════════════════
// SLIDE 4 — HOW IT WORKS
// ═══════════════════════════════════════════
{
  const s = pres.addSlide();
  bg(s);
  eyebrow(s, "End-to-End Flow");
  slideNum(s, 4, 10);
  // Custom shorter title for this slide to avoid 3-line wrap
  s.addText([
    { text: "From a payment file to a ", options: { color: C.cream, bold: true } },
    { text: "£-denominated risk call", options: { color: C.mauve, bold: false, italic: true } },
  ], { x: 0.5, y: 0.62, w: 9, h: 0.52, fontSize: 22, fontFace: "Calibri", margin: 0 });
  subtitle(s, "Four stages, fully automated. Ingest → engineer 23 features → run 6-model ensemble → deliver triage score, forecast, anomaly flag, and explainable narrative to both SME and RM.");

  const stages = [
    {
      n: "01", title: "Ingest & Normalise", stripe: C.mauve,
      feats: ["PDF invoice scanner via pypdfium2", "CSV upload & manual entry", "52-week rolling history per supplier", "In-memory portfolio of 50 SMEs"],
      tag: "PDF · CSV · Manual"
    },
    {
      n: "02", title: "Detect Triage Signal", stripe: C.rose,
      feats: ["Cross-supplier variance & spread", "Trigger: ≥2 stretched + ≥1 paid early", "Composite triage score 0–100", "23 engineered features per row"],
      tag: "The earliest signal"
    },
    {
      n: "03", title: "Predict & Classify", stripe: C.mauveDeep,
      feats: ["Next-week delay forecast (GBR)", "4-class risk: Critical → Healthy", "Anomaly score (IsolationForest)", "SHAP top-5 driver attribution"],
      tag: "99.6% acc · MAE 0.5 d"
    },
    {
      n: "04", title: "Act & Explain", stripe: C.mauve,
      feats: ["RM action queue with severity", "Consumer-Duty SME outreach copy", "5 scenario presets · 6-wk projection", "JSONL audit log (GDPR Art. 22)"],
      tag: "Both lenses · same engine"
    },
  ];

  stages.forEach((st, i) => {
    const cx = 0.5 + i * 2.3, cy = 1.72, cw = 2.16, ch = 3.44;
    card(s, cx, cy, cw, ch, { stripeColor: st.stripe });
    s.addText(st.n, {
      x: cx + cw - 0.5, y: cy + 0.06, w: 0.44, h: 0.28,
      fontSize: 18, color: "222222", fontFace: "Courier New", bold: true, margin: 0, align: "right"
    });
    s.addText(st.title, {
      x: cx + 0.12, y: cy + 0.38, w: cw - 0.24, h: 0.32,
      fontSize: 10.5, color: C.cream, bold: true, fontFace: "Calibri", margin: 0
    });
    // Divider
    s.addShape(pres.shapes.LINE, {
      x: cx + 0.12, y: cy + 0.76, w: cw - 0.24, h: 0,
      line: { color: "2a2a2a", width: 0.5 }
    });
    st.feats.forEach((f, fi) => {
      s.addText("✓  " + f, {
        x: cx + 0.12, y: cy + 0.82 + fi * 0.36, w: cw - 0.24, h: 0.32,
        fontSize: 8, color: "c8bca8", fontFace: "Calibri", margin: 0, wrap: true
      });
    });
    // tag
    s.addShape(pres.shapes.LINE, {
      x: cx + 0.12, y: cy + ch - 0.26, w: cw - 0.24, h: 0,
      line: { color: "333333", width: 0.5, dashType: "dash" }
    });
    s.addText(st.tag, {
      x: cx + 0.12, y: cy + ch - 0.22, w: cw - 0.24, h: 0.18,
      fontSize: 7.5, color: C.mauve, fontFace: "Courier New", bold: true, margin: 0
    });
  });

  footer(s, "How It Works · 4-Stage Pipeline");
}

// ═══════════════════════════════════════════
// SLIDE 5 — SYSTEM ARCHITECTURE
// ═══════════════════════════════════════════
{
  const s = pres.addSlide();
  bg(s);
  eyebrow(s, "System Architecture");
  slideNum(s, 5, 10);
  title(s, "A 4-tier stack", "built for explainability.");
  subtitle(s, "FastAPI · scikit-learn · custom NumPy GRU · Vanilla JS + Chart.js. No magic, no managed ML services — every prediction is reproducible from the audit log.");

  const tiers = [
    { label: "TIER 1", name: "Presentation", stripe: C.mauve,
      chips: ["Vanilla JS SPA", "Chart.js 4.4", "9 routed views", "Responsive dark UI", "localStorage state", "Glassmorphism", "Print-to-PDF"] },
    { label: "TIER 2", name: "Application", stripe: C.rose,
      chips: ["FastAPI 0.135", "Uvicorn ASGI", "29 REST endpoints", "Pydantic v2 schemas", "JSONL audit logger", "PDF parser", "RBAC-ready"] },
    { label: "TIER 3", name: "ML & Detection", stripe: C.mauveDeep,
      chips: ["scikit-learn 1.8", "NumPy GRU (custom)", "SHAP permutation", "Triage detector", "Contagion sim", "Anomaly engine", "23-feature vector"] },
    { label: "TIER 4", name: "Data & Audit", stripe: C.cream,
      chips: ["CSV history (260 rows)", "JSON profiles", "50-SME synthetic portfolio", "JSONL inference log", "GDPR Art. 22"] },
  ];

  tiers.forEach((t, i) => {
    const ty = 1.85 + i * 0.72;
    // row bg
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.5, y: ty, w: 9, h: 0.64,
      fill: { color: C.card }, line: { color: "252525", width: 0.5 }
    });
    // left stripe
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.5, y: ty, w: 0.04, h: 0.64,
      fill: { color: t.stripe }, line: { color: t.stripe, width: 0 }
    });
    // label
    s.addText(t.label, {
      x: 0.62, y: ty + 0.06, w: 1.2, h: 0.14,
      fontSize: 7, color: C.mauve, fontFace: "Courier New", bold: true, charSpacing: 1.5, margin: 0
    });
    s.addText(t.name, {
      x: 0.62, y: ty + 0.22, w: 1.5, h: 0.24,
      fontSize: 11, color: C.cream, fontFace: "Calibri", bold: true, margin: 0
    });
    // chips
    t.chips.forEach((chip, ci) => {
      const chipW = chip.length * 0.075 + 0.25;
      const chipX = 2.2 + ci * 1.28;
      if (chipX + chipW > 9.45) return;
      s.addShape(pres.shapes.RECTANGLE, {
        x: chipX, y: ty + 0.16, w: Math.min(chipW, 1.25), h: 0.26,
        fill: { color: "1a1210" }, line: { color: "2e2e2e", width: 0.5 }
      });
      s.addText("· " + chip, {
        x: chipX, y: ty + 0.16, w: Math.min(chipW, 1.25), h: 0.26,
        fontSize: 7.5, color: C.cream, fontFace: "Courier New",
        align: "center", valign: "middle", margin: 0
      });
    });
  });

  // Stats
  const stats4 = [
    { v: "23,481", l: "Lines of Code" },
    { v: "29", l: "REST Endpoints" },
    { v: "6", l: "ML Models" },
    { v: "9", l: "Frontend Views" },
  ];
  stats4.forEach((st, i) => {
    statBox(s, 0.5 + i * 2.27, 4.72, 2.14, st.v, st.l);
  });

  footer(s, "System Architecture · 4-Tier Stack");
}

// ═══════════════════════════════════════════
// SLIDE 6 — DATA ARCHITECTURE
// ═══════════════════════════════════════════
{
  const s = pres.addSlide();
  bg(s);
  eyebrow(s, "Data Architecture");
  slideNum(s, 6, 10);
  title(s, "23 features. 29 endpoints.", "One auditable pipeline.");
  subtitle(s, "Every supplier-week becomes a 23-dimensional vector. Every inference writes to a tamper-evident JSONL log. Every endpoint maps to a Pydantic schema — typed in, typed out.");

  // Left card — feature vector
  card(s, 0.5, 1.88, 4.4, 2.92);
  s.addText("Feature Vector", {
    x: 0.62, y: 1.94, w: 2.5, h: 0.24,
    fontSize: 12, color: C.cream, bold: true, fontFace: "Calibri", margin: 0
  });
  s.addText("· 23 dims", {
    x: 3.1, y: 1.96, w: 1.2, h: 0.2,
    fontSize: 10, color: C.muted, fontFace: "Calibri", margin: 0
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 3.52, y: 1.96, w: 1.26, h: 0.2,
    fill: { color: "1a1212" }, line: { color: "2e2e2e", width: 0.5 }
  });
  s.addText("PER SUPPLIER · WEEK", {
    x: 3.52, y: 1.96, w: 1.26, h: 0.2,
    fontSize: 6, color: C.cream, bold: true, fontFace: "Courier New",
    align: "center", valign: "middle", margin: 0
  });
  s.addText("Engineered from raw payment timestamps and contractual terms.", {
    x: 0.62, y: 2.2, w: 4.16, h: 0.2,
    fontSize: 8, color: C.muted, fontFace: "Calibri", margin: 0
  });

  const features = [
    "delay_mean_4w / 8w", "delay_std_4w / 8w",
    "delay_min / max", "delay_range",
    "trend_slope_6w", "wow_change",
    "acceleration", "delay_to_terms_ratio",
    "excess_over_terms", "invoice_mean_4w",
    "invoice_volatility", "cross_supplier_std",
    "cross_supplier_spread", "quarter / week_in_q",
    "is_quarter_end",
  ];
  features.forEach((f, fi) => {
    const col = fi % 2, row = Math.floor(fi / 2);
    const fx = 0.62 + col * 2.1, fy = 2.44 + row * 0.24;
    s.addShape(pres.shapes.RECTANGLE, {
      x: fx, y: fy, w: 2.0, h: 0.21,
      fill: { color: "1a1212" }, line: { color: "3a2030", width: 0.5 }
    });
    s.addText("· " + f, {
      x: fx, y: fy, w: 2.0, h: 0.21,
      fontSize: 7, color: C.mauve, fontFace: "Courier New",
      align: "center", valign: "middle", margin: 0
    });
  });

  // Code block
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.62, y: 4.42, w: 4.16, h: 0.3,
    fill: { color: "111111" }, line: { color: "1e1e1e", width: 0.5 }
  });
  s.addText("if stretched ≥ 2 and early ≥ 1:\n    score = 0.40·variance + 0.35·spread + 0.25·ratio", {
    x: 0.72, y: 4.44, w: 4.0, h: 0.26,
    fontSize: 7, color: C.cream, fontFace: "Courier New", margin: 0
  });

  // Right card — API surface
  card(s, 5.06, 1.88, 4.44, 2.92);
  s.addText("REST API Surface", {
    x: 5.18, y: 1.94, w: 2.5, h: 0.24,
    fontSize: 12, color: C.cream, bold: true, fontFace: "Calibri", margin: 0
  });
  s.addText("· 29 routes", {
    x: 7.66, y: 1.96, w: 1.0, h: 0.2,
    fontSize: 10, color: C.muted, fontFace: "Calibri", margin: 0
  });
  s.addText("Grouped by domain — each set is independently versionable.", {
    x: 5.18, y: 2.2, w: 4.2, h: 0.2,
    fontSize: 8, color: C.muted, fontFace: "Calibri", margin: 0
  });

  const routes = [
    { name: "Core Data", routes: "6 routes" },
    { name: "Risk & Scenarios", routes: "4 routes" },
    { name: "AI / ML Inference", routes: "10 routes" },
    { name: "Bank-Grade & Contagion", routes: "4 routes" },
    { name: "Insights & RM Messaging", routes: "5 routes" },
  ];
  routes.forEach((r, ri) => {
    const ry = 2.46 + ri * 0.46;
    s.addShape(pres.shapes.RECTANGLE, {
      x: 5.18, y: ry, w: 4.2, h: 0.38,
      fill: { color: "1a1210" }, line: { color: "2a2a2a", width: 0.5 }
    });
    s.addText(r.name, {
      x: 5.3, y: ry + 0.09, w: 3, h: 0.2,
      fontSize: 9, color: C.cream, bold: true, fontFace: "Calibri", margin: 0
    });
    s.addText(r.routes, {
      x: 8.0, y: ry + 0.09, w: 1.28, h: 0.2,
      fontSize: 9, color: C.mauve, bold: true, fontFace: "Courier New", align: "right", margin: 0
    });
  });

  // Stats
  const stats4 = [
    { v: "23", l: "Engineered features" },
    { v: "52", l: "Weeks rolling history" },
    { v: "417+", l: "Logged inferences" },
    { v: "GDPR", l: "Art. 22 compliant" },
  ];
  stats4.forEach((st, i) => {
    statBox(s, 0.5 + i * 2.27, 4.72, 2.14, st.v, st.l);
  });

  footer(s, "Data Architecture · Features & APIs");
}

// ═══════════════════════════════════════════
// SLIDE 7 — AI INTELLIGENCE
// ═══════════════════════════════════════════
{
  const s = pres.addSlide();
  bg(s);
  eyebrow(s, "AI-Powered Intelligence");
  slideNum(s, 7, 10);
  title(s, "Six real models.", "Zero black boxes.");
  subtitle(s, "No managed ML services, no opaque vendors. Every model trains in-process at server start; every prediction is explained by SHAP and recorded in the audit log.");

  const models = [
    {
      title: "GenAI Forecaster", sub: "· next-week delay", tag: "GBR · 200 TREES", stripe: C.mauve,
      body: "Gradient-boosted regression trained on 23-dim feature vectors. Predicts each supplier's next-week payment delay.",
      stats: [{ l: "MAE", v: "0.5 d" }, { l: "Depth", v: "4" }, { l: "Trees", v: "200" }]
    },
    {
      title: "Risk Classifier", sub: "· 4-class", tag: "RANDOM FOREST", stripe: C.rose,
      body: "150-tree balanced random forest categorising suppliers as Critical / Warning / Watch / Healthy.",
      stats: [{ l: "Accuracy", v: "99.6%" }, { l: "Trees", v: "150" }, { l: "Classes", v: "4" }]
    },
    {
      title: "Anomaly Detector", sub: "· unsupervised", tag: "ISOLATIONFOREST", stripe: C.mauveDeep,
      body: "Flags atypical supplier weeks even when no labelled distress exists — surfaces unknown-unknowns.",
      stats: [{ l: "Estimators", v: "200" }, { l: "Contam.", v: "10%" }, { l: "Score", v: "0–100" }]
    },
    {
      title: "Neural Forecaster", sub: "· deep learning", tag: "GRU · NUMPY", stripe: C.mauve,
      body: "From-scratch GRU (32 hidden units) trained in pure NumPy — auditable byte-by-byte, no PyTorch.",
      stats: [{ l: "Hidden", v: "32" }, { l: "MAE", v: "1.22 d" }, { l: "Params", v: "~7K" }]
    },
  ];

  const cw = 4.46, ch = 1.38;
  models.forEach((m, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const cx = 0.5 + col * (cw + 0.08), cy = 1.88 + row * (ch + 0.1);
    card(s, cx, cy, cw, ch, { stripeColor: m.stripe });
    s.addText(m.title, {
      x: cx + 0.12, y: cy + 0.1, w: cw - 1.3, h: 0.22,
      fontSize: 11, color: C.cream, bold: true, fontFace: "Calibri", margin: 0
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x: cx + cw - 1.28, y: cy + 0.08, w: 1.16, h: 0.22,
      fill: { color: "1a1212" }, line: { color: "2e2e2e", width: 0.5 }
    });
    s.addText(m.tag, {
      x: cx + cw - 1.28, y: cy + 0.08, w: 1.16, h: 0.22,
      fontSize: 6.5, color: C.mauve, fontFace: "Courier New", bold: true,
      align: "center", valign: "middle", margin: 0
    });
    s.addText(m.body, {
      x: cx + 0.12, y: cy + 0.36, w: cw - 0.24, h: 0.38,
      fontSize: 8.5, color: C.muted, fontFace: "Calibri", margin: 0, wrap: true
    });
    // model stats
    m.stats.forEach((ms, mi) => {
      const sw = (cw - 0.3) / 3;
      const sx = cx + 0.12 + mi * sw;
      s.addShape(pres.shapes.RECTANGLE, {
        x: sx, y: cy + ch - 0.46, w: sw - 0.06, h: 0.38,
        fill: { color: "141414" }, line: { color: "252525", width: 0.5 }
      });
      s.addText(ms.l, {
        x: sx + 0.06, y: cy + ch - 0.44, w: sw - 0.18, h: 0.14,
        fontSize: 6.5, color: C.muted, fontFace: "Calibri", bold: true, charSpacing: 1, margin: 0
      });
      s.addText(ms.v, {
        x: sx + 0.06, y: cy + ch - 0.28, w: sw - 0.18, h: 0.22,
        fontSize: 11, color: C.cream, fontFace: "Courier New", bold: true, margin: 0
      });
    });
  });

  // SHAP bar — positioned after row 2 cards (end at 1.88 + 2*1.38 + 0.1 = 4.64)
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 4.72, w: 9, h: 0.46,
    fill: { color: C.cream }, line: { color: C.cream, width: 0 }
  });
  s.addText("+ EXPLAINABILITY LAYER", {
    x: 0.65, y: 4.74, w: 2.4, h: 0.16,
    fontSize: 7, color: C.rose, bold: true, fontFace: "Courier New", charSpacing: 1.5, margin: 0
  });
  s.addText("SHAP Permutation Attribution", {
    x: 0.65, y: 4.9, w: 2.8, h: 0.2,
    fontSize: 10, color: C.black, bold: true, fontFace: "Calibri", margin: 0
  });
  s.addText("every_prediction → top_5_drivers → narrator.py → plain-english_explanation", {
    x: 3.5, y: 4.82, w: 4.0, h: 0.28,
    fontSize: 8.5, color: "444444", fontFace: "Courier New", margin: 0
  });
  // chips side by side
  ["KMeans Clusters", "Triage Score"].forEach((lbl, ci) => {
    s.addShape(pres.shapes.RECTANGLE, {
      x: 7.6 + ci * 0.96, y: 4.79, w: 0.9, h: 0.3,
      fill: { color: ci === 0 ? C.mauve : C.mauveDeep }, line: { color: "000000", width: 0 }
    });
    s.addText(lbl, {
      x: 7.6 + ci * 0.96, y: 4.79, w: 0.9, h: 0.3,
      fontSize: 6.5, color: C.cream, fontFace: "Courier New", bold: true,
      align: "center", valign: "middle", margin: 0
    });
  });

  footer(s, "AI Intelligence · 6 Models + SHAP");
}

// ═══════════════════════════════════════════
// SLIDE 8 — BUSINESS VALUE
// ═══════════════════════════════════════════
{
  const s = pres.addSlide();
  bg(s);
  eyebrow(s, "Business Value");
  slideNum(s, 8, 10);
  title(s, "Direct alignment with", "NatWest's mandate.");
  subtitle(s, "Lower default loss · proactive Consumer Duty evidence · cross-sell intelligence on healthy SMEs · proven on the same data the bank already collects.");

  // Left: Before/After
  card(s, 0.5, 1.88, 4.4, 2.92);
  s.addText("From Reactive → Proactive", {
    x: 0.62, y: 1.96, w: 3.0, h: 0.22,
    fontSize: 11, color: C.cream, bold: true, fontFace: "Calibri", margin: 0
  });
  s.addText("OPS TRANSFORMATION", {
    x: 3.64, y: 1.98, w: 1.15, h: 0.18,
    fontSize: 6.5, color: C.cream, bold: true, fontFace: "Courier New",
    align: "right", margin: 0
  });
  // Column headers
  s.addText("TODAY", { x: 0.62, y: 2.22, w: 1.5, h: 0.16, fontSize: 7, color: C.muted, fontFace: "Courier New", bold: true, charSpacing: 1.5, margin: 0 });
  s.addText("WITH PAYPULSE", { x: 3.0, y: 2.22, w: 1.8, h: 0.16, fontSize: 7, color: C.muted, fontFace: "Courier New", bold: true, charSpacing: 1, margin: 0 });

  const rows = [
    { from: "Default detected after the fact", to: "4–8 wk early warning" },
    { from: "One-bank repayment signal", to: "Cross-supplier intelligence" },
    { from: "Reactive RM outreach", to: "Proactive Consumer-Duty nudges" },
    { from: "Black-box ML scoring", to: "SHAP-explained calls" },
    { from: "Loan-by-loan view", to: "Network-level contagion" },
    { from: "Manual triage by analyst", to: "Auto-ranked RM queue" },
  ];
  rows.forEach((r, ri) => {
    const ry = 2.42 + ri * 0.38;
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.62, y: ry, w: 4.16, h: 0.32,
      fill: { color: "131313" }, line: { color: "252525", width: 0.5 }
    });
    s.addText(r.from, { x: 0.72, y: ry + 0.06, w: 1.8, h: 0.2, fontSize: 7.5, color: C.bad, fontFace: "Calibri", bold: true, margin: 0, wrap: true });
    s.addText("→", { x: 2.54, y: ry + 0.06, w: 0.24, h: 0.2, fontSize: 9, color: C.mauve, bold: true, align: "center", margin: 0 });
    s.addText(r.to, { x: 2.8, y: ry + 0.06, w: 1.9, h: 0.2, fontSize: 7.5, color: C.good, fontFace: "Calibri", bold: true, margin: 0, wrap: true });
  });

  // Right column
  // NatWest alignment card (dark)
  s.addShape(pres.shapes.RECTANGLE, {
    x: 5.06, y: 1.88, w: 4.44, h: 1.42,
    fill: { color: C.cream }, line: { color: C.cream, width: 0 }
  });
  s.addText("NatWest Alignment", {
    x: 5.18, y: 1.94, w: 2.5, h: 0.22,
    fontSize: 11, color: C.black, bold: true, fontFace: "Calibri", margin: 0
  });
  const feats8 = ["Avoid foreseeable harm · evidenced", "Reduces SME loan-loss provisions", "Surfaces cross-sell on healthy book", "RM productivity — auto-prioritised queue", "Auditable ML for PRA SS1/23 scrutiny"];
  feats8.forEach((f, fi) => {
    s.addText("✓  " + f, {
      x: 5.18, y: 2.2 + fi * 0.22, w: 4.2, h: 0.2,
      fontSize: 8.5, color: "333333", fontFace: "Calibri", bold: fi === 0, margin: 0
    });
  });

  // Two metric cards
  card(s, 5.06, 3.38, 2.16, 0.92, { stripeColor: C.mauve });
  s.addText("SME LOAN BOOK", { x: 5.18, y: 3.44, w: 1.9, h: 0.14, fontSize: 6.5, color: C.muted, fontFace: "Courier New", bold: true, charSpacing: 1, margin: 0 });
  s.addText("£25K Cr", { x: 5.18, y: 3.6, w: 1.9, h: 0.46, fontSize: 26, color: C.mauveDeep, bold: true, fontFace: "Courier New", margin: 0 });

  card(s, 7.34, 3.38, 2.16, 0.92, { stripeColor: C.rose });
  s.addText("EARLY-WARNING ARM", { x: 7.46, y: 3.44, w: 1.9, h: 0.14, fontSize: 6.5, color: C.muted, fontFace: "Courier New", bold: true, charSpacing: 1, margin: 0 });
  s.addText("4–8 wk", { x: 7.46, y: 3.6, w: 1.9, h: 0.46, fontSize: 26, color: C.mauveDeep, bold: true, fontFace: "Courier New", margin: 0 });

  // Addressable wedge
  s.addShape(pres.shapes.RECTANGLE, {
    x: 5.06, y: 4.36, w: 4.44, h: 0.44,
    fill: { color: "1a0f14" }, line: { color: "3a1f2d", width: 0.75 }
  });
  s.addText("ADDRESSABLE WEDGE", { x: 5.18, y: 4.38, w: 2, h: 0.16, fontSize: 6.5, color: C.muted, fontFace: "Courier New", bold: true, charSpacing: 1, margin: 0 });
  s.addText("£8K Cr+", { x: 5.18, y: 4.55, w: 1.4, h: 0.2, fontSize: 18, color: C.mauveDeep, bold: true, fontFace: "Courier New", margin: 0 });
  s.addText("SME cash-flow risk · group-bank coordination market", { x: 6.64, y: 4.6, w: 2.78, h: 0.18, fontSize: 8, color: C.mauve, bold: true, fontFace: "Calibri", margin: 0, wrap: true });

  footer(s, "Business Value · Bank Alignment");
}

// ═══════════════════════════════════════════
// SLIDE 9 — WORKING PROTOTYPE
// ═══════════════════════════════════════════
{
  const s = pres.addSlide();
  bg(s);
  eyebrow(s, "Working Prototype");
  slideNum(s, 9, 10);
  title(s, "Not a mockup —", "23,481 lines of working code.");
  subtitle(s, "Every screen ships data from a live FastAPI backend. Every model is trained at startup on real CSV history. Every endpoint returns typed Pydantic responses.");

  // SME table card
  card(s, 0.5, 1.88, 3.8, 2.92);
  s.addText("Live Demo SMEs", {
    x: 0.62, y: 1.96, w: 2.5, h: 0.22,
    fontSize: 11, color: C.cream, bold: true, fontFace: "Calibri", margin: 0
  });
  s.addText("5 SUPPLIERS · 260 ROWS", {
    x: 3.0, y: 1.98, w: 1.18, h: 0.18,
    fontSize: 6.5, color: C.cream, bold: true, fontFace: "Courier New", align: "right", margin: 0
  });
  // Table headers
  s.addShape(pres.shapes.LINE, { x: 0.62, y: 2.22, w: 3.56, h: 0, line: { color: "333333", width: 0.5 } });
  s.addText("SUPPLIER", { x: 0.62, y: 2.24, w: 1.8, h: 0.14, fontSize: 6.5, color: C.muted, fontFace: "Courier New", bold: true, charSpacing: 1, margin: 0 });
  s.addText("DELAY", { x: 2.44, y: 2.24, w: 0.7, h: 0.14, fontSize: 6.5, color: C.muted, fontFace: "Courier New", bold: true, charSpacing: 1, margin: 0 });
  s.addText("STATUS", { x: 3.16, y: 2.24, w: 0.9, h: 0.14, fontSize: 6.5, color: C.muted, fontFace: "Courier New", bold: true, charSpacing: 1, margin: 0 });

  const smes = [
    { name: "Meridian Engineering", delay: "42 d", status: "RED", dc: C.bad, sc: "2a0a0f" },
    { name: "AlphaSteel Ltd", delay: "28 d", status: "AMBER", dc: C.warn, sc: "2a200a" },
    { name: "BetaLogistics", delay: "14 d", status: "GREEN", dc: C.good, sc: "0a1e10" },
    { name: "GammaSupplies", delay: "25 d", status: "AMBER", dc: C.warn, sc: "2a200a" },
    { name: "DeltaParts", delay: "38 d", status: "RED", dc: C.bad, sc: "2a0a0f" },
    { name: "EpsilonServices", delay: "8 d", status: "GREEN", dc: C.good, sc: "0a1e10" },
  ];
  smes.forEach((sme, si) => {
    const sy = 2.42 + si * 0.38;
    s.addShape(pres.shapes.LINE, { x: 0.62, y: sy - 0.02, w: 3.56, h: 0, line: { color: "222222", width: 0.5, dashType: "dash" } });
    s.addText(sme.name, { x: 0.62, y: sy + 0.06, w: 1.8, h: 0.2, fontSize: 8.5, color: C.cream, bold: true, fontFace: "Calibri", margin: 0 });
    s.addText(sme.delay, { x: 2.44, y: sy + 0.06, w: 0.68, h: 0.2, fontSize: 8.5, color: sme.dc, bold: true, fontFace: "Courier New", margin: 0 });
    s.addShape(pres.shapes.RECTANGLE, { x: 3.16, y: sy + 0.06, w: 0.7, h: 0.2, fill: { color: sme.sc }, line: { color: sme.dc, width: 0.5 } });
    s.addText(sme.status, { x: 3.16, y: sy + 0.06, w: 0.7, h: 0.2, fontSize: 7, color: sme.dc, bold: true, fontFace: "Courier New", align: "center", valign: "middle", margin: 0 });
  });

  // Core & AI card
  card(s, 4.44, 1.88, 2.52, 2.92, { stripeColor: C.mauve });
  s.addText("Core & AI", { x: 4.56, y: 1.96, w: 1.8, h: 0.22, fontSize: 11, color: C.cream, bold: true, fontFace: "Calibri", margin: 0 });
  s.addText("SHIPPED", { x: 5.84, y: 1.98, w: 1.0, h: 0.18, fontSize: 6.5, color: C.cream, bold: true, fontFace: "Courier New", align: "right", margin: 0 });
  const coreFeats = ["Triage Detection Engine", "6-Model ML Ensemble", "SHAP Explainability", "Custom NumPy GRU", "Anomaly Scoring 0–100", "Risk Classification", "Contagion Graph & Sim", "PDF Invoice Parser"];
  coreFeats.forEach((f, fi) => {
    s.addText("✓  " + f, { x: 4.56, y: 2.24 + fi * 0.3, w: 2.28, h: 0.26, fontSize: 8, color: "c8bca8", fontFace: "Calibri", margin: 0 });
  });

  // Ops & UX card
  card(s, 7.06, 1.88, 2.44, 2.92, { stripeColor: C.rose });
  s.addText("Ops & UX", { x: 7.18, y: 1.96, w: 1.8, h: 0.22, fontSize: 11, color: C.cream, bold: true, fontFace: "Calibri", margin: 0 });
  s.addText("SHIPPED", { x: 8.1, y: 1.98, w: 1.28, h: 0.18, fontSize: 6.5, color: C.cream, bold: true, fontFace: "Courier New", align: "right", margin: 0 });
  const opsFeats = ["Dual-Lens Dashboard", "5-Preset Scenario Sim", "Severity-Coded Charts", "Custom-SME Onboarding", "RM Action Queue", "Consumer-Duty Outreach", "JSONL Audit Log", "Print-to-PDF Export"];
  opsFeats.forEach((f, fi) => {
    s.addText("✓  " + f, { x: 7.18, y: 2.24 + fi * 0.3, w: 2.2, h: 0.26, fontSize: 8, color: "c8bca8", fontFace: "Calibri", margin: 0 });
  });

  // Stats
  const stats5 = [
    { v: "23,481", l: "LOC" }, { v: "29", l: "APIs" }, { v: "6", l: "ML Models" },
    { v: "9", l: "Views" }, { v: "23", l: "Features" }
  ];
  stats5.forEach((st, i) => {
    statBox(s, 0.5 + i * 1.82, 4.72, 1.7, st.v, st.l);
  });

  footer(s, "Working Prototype · Production-Quality Code");
}

// ═══════════════════════════════════════════
// SLIDE 10 — ROADMAP
// ═══════════════════════════════════════════
{
  const s = pres.addSlide();
  bg(s);
  eyebrow(s, "Roadmap & Vision");
  slideNum(s, 10, 10);
  title(s, "From prototype", "to NatWest's SME early-warning OS.");
  subtitle(s, "A clear 12-month path: harden the prototype, integrate real banking rails, then expand into a multi-bank consortium intelligence layer.");

  const phases = [
    {
      name: "Phase 1 · Production Ready", when: "1–2 mo", stripe: C.mauve,
      items: [
        "Migrate from CSV → PostgreSQL with Prisma/SQLAlchemy",
        "OAuth + RBAC (RM / Risk Officer / Auditor roles)",
        "Replace synthetic portfolio with real bank data sandbox",
        "Containerised deploy (Docker · K8s · Helm chart)",
        "Pen-test & PRA SS1/23 model-risk documentation",
      ]
    },
    {
      name: "Phase 2 · Live Banking Rails", when: "3–6 mo", stripe: C.rose,
      items: [
        "Open Banking integration via TrueLayer / Tink",
        "WebSocket streaming inference for real-time triage",
        "RM mobile app (React Native) for on-the-go nudges",
        "WhatsApp Business API for SME outreach",
        "Champion / challenger A-B model harness",
      ]
    },
    {
      name: "Phase 3 · Consortium & Scale", when: "6–12 mo", stripe: C.mauveDeep,
      items: [
        "Multi-bank consortium graph (federated learning)",
        "Sector-specific risk models (manufacturing / logistics)",
        "White-label SME-facing PayPulse Lite",
        "Causal-inference engine for intervention ROI",
        "Regulator-ready model card & bias audit pipeline",
      ]
    },
  ];

  const pw = 2.93;
  phases.forEach((p, i) => {
    const px = 0.5 + i * (pw + 0.08), py = 1.88;
    // Card bg
    s.addShape(pres.shapes.RECTANGLE, {
      x: px, y: py, w: pw, h: 2.28,
      fill: { color: C.card }, line: { color: "252525", width: 0.75 }
    });
    // top stripe
    s.addShape(pres.shapes.RECTANGLE, {
      x: px, y: py, w: pw, h: 0.04,
      fill: { color: p.stripe }, line: { color: p.stripe, width: 0 }
    });
    // phase header
    s.addText(p.name, {
      x: px + 0.12, y: py + 0.1, w: pw - 0.7, h: 0.22,
      fontSize: 9.5, color: C.mauveDeep, bold: true, fontFace: "Calibri", margin: 0
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x: px + pw - 0.58, y: py + 0.1, w: 0.46, h: 0.22,
      fill: { color: "1a0f14" }, line: { color: "3a1f2d", width: 0.5 }
    });
    s.addText(p.when, {
      x: px + pw - 0.58, y: py + 0.1, w: 0.46, h: 0.22,
      fontSize: 7, color: C.mauveDeep, bold: true, fontFace: "Courier New",
      align: "center", valign: "middle", margin: 0
    });
    p.items.forEach((item, ii) => {
      s.addShape(pres.shapes.LINE, {
        x: px + 0.12, y: py + 0.38 + ii * 0.37, w: pw - 0.24, h: 0,
        line: { color: "1e1e1e", width: 0.5, dashType: "dash" }
      });
      s.addText("→  " + item, {
        x: px + 0.12, y: py + 0.42 + ii * 0.37, w: pw - 0.24, h: 0.32,
        fontSize: 7.5, color: "c0b0a0", fontFace: "Calibri", margin: 0, wrap: true
      });
    });
  });

  // Quote card
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 4.22, w: 9, h: 0.46,
    fill: { color: "1a0f14" }, line: { color: "3a1f2d", width: 0.75 }
  });
  s.addText(`"PayPulse turns a bank's passive payment data into an active duty-of-care signal — protecting the £8,000+ Cr SME book before distress becomes default."`, {
    x: 0.8, y: 4.26, w: 8.4, h: 0.38,
    fontSize: 9.5, color: C.mauve, fontFace: "Calibri", italic: true,
    align: "center", valign: "middle", margin: 0
  });

  // Stats
  const stats5 = [
    { v: "23,481", l: "Lines of Code" }, { v: "29", l: "REST Endpoints" },
    { v: "6", l: "Real ML Models" }, { v: "99.6%", l: "Classifier Accuracy" }, { v: "4–8 wk", l: "Early Warning" }
  ];
  stats5.forEach((st, i) => {
    statBox(s, 0.5 + i * 1.82, 4.72, 1.7, st.v, st.l);
  });

  footer(s, "Built for NatWest · Ready to Ship");
}

// ── Write file ──
pres.writeFile({ fileName: "/Users/vamikabhardwaj/Desktop/paypulse/presentation.pptx" })
  .then(() => console.log("✓ presentation.pptx written"))
  .catch(e => { console.error(e); process.exit(1); });
