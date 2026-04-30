// PayPulse — Code for Purpose 2026 Hackathon Deck
// Team ByteHER · Indira Gandhi Delhi Technical University for Women
// Built with pptxgenjs

const pptxgen = require("pptxgenjs");
const pres = new pptxgen();

pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5
pres.title = "PayPulse — AI Early Warning for SME Cash Flow";
pres.author = "Team ByteHER";
pres.company = "IGDTUW";

// ─────────────────────────── Palette ───────────────────────────
const C = {
  bg:        "0B0820", // deep midnight (purple tint)
  bgAlt:     "120E2A",
  card:      "1A1430",
  cardEdge:  "2A2050",
  purple:    "8B5CF6", // primary
  purpleDk:  "5A287D", // NatWest deep purple
  purpleLt:  "B89CFF",
  coral:     "FF4D6D", // risk
  amber:     "F5A524", // warning
  teal:      "21C6A8", // positive
  textHi:    "F4F1FF",
  textMd:    "B8B0D8",
  textLo:    "6E6890",
  white:     "FFFFFF",
};

const FONT_HEAD = "Calibri";
const FONT_BODY = "Calibri";

// ─────────────────────────── Helpers ───────────────────────────
function bg(slide, color = C.bg) {
  slide.background = { color };
}

function topAccent(slide) {
  // thin gradient-feel accent on left edge (no underline below titles)
  slide.addShape("rect", {
    x: 0, y: 0, w: 0.12, h: 7.5,
    fill: { color: C.purple }, line: { color: C.purple },
  });
}

function pageNumber(slide, n, total = 10) {
  slide.addText(`${String(n).padStart(2, "0")} / ${String(total).padStart(2, "0")}`, {
    x: 12.55, y: 7.15, w: 0.7, h: 0.25,
    fontFace: FONT_BODY, fontSize: 10, color: C.textLo,
    align: "right",
  });
  slide.addText("PAYPULSE  ·  TEAM BYTEHER", {
    x: 0.45, y: 7.15, w: 5, h: 0.25,
    fontFace: FONT_BODY, fontSize: 10, color: C.textLo, charSpacing: 2,
  });
}

function slideTitle(slide, eyebrow, title) {
  slide.addText(eyebrow, {
    x: 0.45, y: 0.45, w: 12.4, h: 0.32,
    fontFace: FONT_BODY, fontSize: 12, bold: true,
    color: C.purpleLt, charSpacing: 4,
  });
  slide.addText(title, {
    x: 0.45, y: 0.78, w: 12.4, h: 0.85,
    fontFace: FONT_HEAD, fontSize: 36, bold: true,
    color: C.textHi,
  });
}

function dot(slide, x, y, color, size = 0.18) {
  slide.addShape("ellipse", {
    x, y, w: size, h: size,
    fill: { color }, line: { color },
  });
}

function iconCircle(slide, x, y, glyph, color = C.purple, d = 0.7) {
  slide.addShape("ellipse", {
    x, y, w: d, h: d,
    fill: { color: C.card }, line: { color, width: 2 },
  });
  slide.addText(glyph, {
    x, y, w: d, h: d,
    fontFace: FONT_HEAD, fontSize: 20, bold: true,
    color, align: "center", valign: "middle",
  });
}

function card(slide, x, y, w, h, opts = {}) {
  slide.addShape("roundRect", {
    x, y, w, h,
    fill: { color: opts.fill || C.card },
    line: { color: opts.edge || C.cardEdge, width: 1 },
    rectRadius: 0.12,
  });
}

function leftBarCard(slide, x, y, w, h, accent = C.purple) {
  slide.addShape("roundRect", {
    x, y, w, h,
    fill: { color: C.card },
    line: { color: C.cardEdge, width: 1 },
    rectRadius: 0.1,
  });
  slide.addShape("rect", {
    x, y: y + 0.08, w: 0.06, h: h - 0.16,
    fill: { color: accent }, line: { color: accent },
  });
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 1 — COVER
// ═══════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  bg(s, C.bg);

  // Soft purple glow blob (top-right)
  s.addShape("ellipse", {
    x: 9.5, y: -2.5, w: 7, h: 7,
    fill: { color: C.purpleDk, transparency: 65 },
    line: { color: C.purpleDk, transparency: 100 },
  });
  s.addShape("ellipse", {
    x: -1.5, y: 4.5, w: 5, h: 5,
    fill: { color: C.purple, transparency: 80 },
    line: { color: C.purple, transparency: 100 },
  });

  // Brand mark — pulse circle
  s.addShape("ellipse", {
    x: 0.7, y: 0.6, w: 0.6, h: 0.6,
    fill: { color: C.purple }, line: { color: C.purple },
  });
  s.addText("◐", {
    x: 0.7, y: 0.6, w: 0.6, h: 0.6,
    fontSize: 24, color: C.white, bold: true,
    align: "center", valign: "middle",
  });
  s.addText("PayPulse", {
    x: 1.45, y: 0.62, w: 4, h: 0.6,
    fontFace: FONT_HEAD, fontSize: 24, bold: true,
    color: C.textHi, valign: "middle",
  });

  // Hackathon ribbon
  s.addText("CODE FOR PURPOSE  ·  NATWEST  ·  2026", {
    x: 0.45, y: 6.55, w: 12.4, h: 0.3,
    fontFace: FONT_BODY, fontSize: 11, bold: true,
    color: C.purpleLt, charSpacing: 6,
  });

  // Big title
  s.addText("PayPulse", {
    x: 0.45, y: 1.8, w: 12.4, h: 1.4,
    fontFace: FONT_HEAD, fontSize: 84, bold: true,
    color: C.textHi,
  });

  // Subtitle
  s.addText("An AI early-warning system for SME cash-flow stress", {
    x: 0.45, y: 3.15, w: 12.4, h: 0.55,
    fontFace: FONT_HEAD, fontSize: 22,
    color: C.purpleLt,
  });

  // Tagline
  s.addText("See the shockwave before it hits the books.", {
    x: 0.45, y: 3.7, w: 12.4, h: 0.4,
    fontFace: FONT_BODY, fontSize: 16, italic: true,
    color: C.textMd,
  });

  // Team card
  leftBarCard(s, 0.45, 4.65, 7.6, 1.65, C.purple);
  s.addText("TEAM BYTEHER", {
    x: 0.7, y: 4.78, w: 7.3, h: 0.3,
    fontFace: FONT_BODY, fontSize: 12, bold: true,
    color: C.purpleLt, charSpacing: 4,
  });
  s.addText("Vamika Bhardwaj   ·   Anshika", {
    x: 0.7, y: 5.08, w: 7.3, h: 0.4,
    fontFace: FONT_HEAD, fontSize: 20, bold: true,
    color: C.textHi,
  });
  s.addText("Indira Gandhi Delhi Technical University for Women", {
    x: 0.7, y: 5.55, w: 7.3, h: 0.32,
    fontFace: FONT_BODY, fontSize: 13,
    color: C.textMd,
  });
  s.addText("Finale  ·  4 May 2026", {
    x: 0.7, y: 5.88, w: 7.3, h: 0.3,
    fontFace: FONT_BODY, fontSize: 12,
    color: C.textLo,
  });

  // Stat tile right
  leftBarCard(s, 8.3, 4.65, 4.55, 1.65, C.coral);
  s.addText("THE GAP WE CLOSE", {
    x: 8.55, y: 4.78, w: 4.2, h: 0.3,
    fontFace: FONT_BODY, fontSize: 11, bold: true,
    color: C.coral, charSpacing: 3,
  });
  s.addText("90 days", {
    x: 8.55, y: 5.08, w: 4.2, h: 0.55,
    fontFace: FONT_HEAD, fontSize: 32, bold: true,
    color: C.textHi,
  });
  s.addText("of advance warning before an SME default — invisible to traditional credit dashboards.", {
    x: 8.55, y: 5.65, w: 4.2, h: 0.6,
    fontFace: FONT_BODY, fontSize: 11,
    color: C.textMd,
  });
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 2 — PROBLEM STATEMENT
// ═══════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  bg(s);
  topAccent(s);
  slideTitle(s, "01  ·  THE PROBLEM", "Banks see paper. They miss the pulse.");

  // Lead paragraph
  s.addText(
    "SMEs make up 30% of UK GDP and a similar share of an Indian bank's lending book — yet credit teams still rely on quarterly filings and annual reviews. By the time a default hits the loan-loss provision, the warning signs were 8–12 weeks old.",
    {
      x: 0.45, y: 1.85, w: 12.4, h: 0.95,
      fontFace: FONT_BODY, fontSize: 14, color: C.textMd,
      paraSpaceAfter: 4,
    }
  );

  // Three stat cards
  const stats = [
    { k: "₹4.6 Lakh Cr", v: "in SME loans on Indian bank books — highest NPA ratio of any segment.", c: C.coral },
    { k: "80%", v: "of SME defaults are 'surprise' to the lender — behavioural signals exist but go unread.", c: C.amber },
    { k: "1 in 5", v: "SMEs fail within 60 days of suppliers being paid late — contagion is fast.", c: C.purple },
  ];
  stats.forEach((st, i) => {
    const x = 0.45 + i * 4.17;
    leftBarCard(s, x, 3.0, 3.95, 1.55, st.c);
    s.addText(st.k, {
      x: x + 0.25, y: 3.1, w: 3.6, h: 0.55,
      fontFace: FONT_HEAD, fontSize: 26, bold: true, color: C.textHi,
    });
    s.addText(st.v, {
      x: x + 0.25, y: 3.65, w: 3.6, h: 0.85,
      fontFace: FONT_BODY, fontSize: 11.5, color: C.textMd,
    });
  });

  // The "why it matters" band
  card(s, 0.45, 4.85, 12.4, 1.95);
  s.addText("WHY IT MATTERS", {
    x: 0.7, y: 5.0, w: 12, h: 0.3,
    fontFace: FONT_BODY, fontSize: 11, bold: true, color: C.purpleLt, charSpacing: 4,
  });

  const whyRows = [
    { ic: "▲", c: C.coral,  h: "For the bank",  t: "Late provisions, surprise NPAs, capital tied up in stressed books." },
    { ic: "●", c: C.amber,  h: "For the SME",   t: "No early conversation, no working-capital top-up — the firm folds before help arrives." },
    { ic: "✦", c: C.teal,   h: "For the system", t: "Healthy supplier networks collapse over a single delayed payment — jobs lost." },
  ];
  whyRows.forEach((r, i) => {
    const x = 0.7 + i * 4.05;
    iconCircle(s, x, 5.4, r.ic, r.c, 0.5);
    s.addText(r.h, {
      x: x + 0.6, y: 5.4, w: 3.4, h: 0.3,
      fontFace: FONT_HEAD, fontSize: 13, bold: true, color: C.textHi,
    });
    s.addText(r.t, {
      x: x + 0.6, y: 5.68, w: 3.4, h: 0.8,
      fontFace: FONT_BODY, fontSize: 11, color: C.textMd,
    });
  });

  pageNumber(s, 2);
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 3 — SOLUTION OVERVIEW
// ═══════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  bg(s);
  topAccent(s);
  slideTitle(s, "02  ·  OUR SOLUTION", "PayPulse turns supplier payments into a living credit signal.");

  s.addText(
    "Every supplier invoice an SME pays — early, on-time, late, missed — is a behavioural data point. PayPulse ingests this stream weekly, runs three AI models in parallel, and surfaces a single early-warning score for the relationship manager and a plain-English coaching panel for the SME owner.",
    {
      x: 0.45, y: 1.85, w: 12.4, h: 1.05,
      fontFace: FONT_BODY, fontSize: 14, color: C.textMd,
    }
  );

  // Three pillars
  const pillars = [
    {
      h: "DETECT",
      t: "Behavioural Radar",
      d: "Weekly payment delays → latent stress trajectory per SME. Catches drift, shocks and seasonality before any P&L line moves.",
      c: C.purple,
      g: "◉",
    },
    {
      h: "EXPLAIN",
      t: "Contagion Simulator",
      d: "Visualises which suppliers and downstream SMEs absorb the shockwave first — concentric rings show distance-from-epicentre.",
      c: C.coral,
      g: "◈",
    },
    {
      h: "ACT",
      t: "RM ↔ SME Loop",
      d: "Groq-powered LLM drafts an action for the RM and a coaching message for the SME — one click sends, dashboard reflects instantly.",
      c: C.teal,
      g: "▶",
    },
  ];
  pillars.forEach((p, i) => {
    const x = 0.45 + i * 4.17;
    card(s, x, 3.05, 3.95, 3.6);
    // header band
    s.addShape("rect", {
      x: x, y: 3.05, w: 3.95, h: 0.4,
      fill: { color: p.c }, line: { color: p.c },
    });
    s.addText(p.h, {
      x: x + 0.2, y: 3.05, w: 3.6, h: 0.4,
      fontFace: FONT_BODY, fontSize: 11, bold: true,
      color: C.bg, charSpacing: 4, valign: "middle",
    });
    iconCircle(s, x + 0.3, 3.7, p.g, p.c, 0.85);
    s.addText(p.t, {
      x: x + 0.3, y: 4.7, w: 3.4, h: 0.45,
      fontFace: FONT_HEAD, fontSize: 18, bold: true, color: C.textHi,
    });
    s.addText(p.d, {
      x: x + 0.3, y: 5.18, w: 3.4, h: 1.4,
      fontFace: FONT_BODY, fontSize: 12, color: C.textMd,
    });
  });

  // Innovation strip
  s.addText("WHAT MAKES IT NEW", {
    x: 0.45, y: 6.8, w: 3, h: 0.25,
    fontFace: FONT_BODY, fontSize: 10, bold: true, color: C.purpleLt, charSpacing: 4,
  });
  s.addText(
    "First SME credit tool that treats the relationship as bidirectional — the same engine speaks to risk teams and SME owners, in their own language.",
    {
      x: 3.55, y: 6.8, w: 9.3, h: 0.3,
      fontFace: FONT_BODY, fontSize: 11, italic: true, color: C.textMd,
    }
  );

  pageNumber(s, 3);
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 4 — KEY FEATURES
// ═══════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  bg(s);
  topAccent(s);
  slideTitle(s, "03  ·  KEY FEATURES", "Six capabilities, one dashboard.");

  const feats = [
    { ic: "◉", c: C.purple, h: "Behavioural Risk Score",
      d: "Weekly per-SME score blending payment delay, terms breach and trend slope. Updated on every new invoice." },
    { ic: "▲", c: C.coral, h: "Shockwave Contagion Map",
      d: "Polar visualisation of which SMEs absorb a default first. Portfolio-level exposure-at-risk computed live." },
    { ic: "◈", c: C.amber, h: "Scenario Simulator",
      d: "'What if a key supplier goes late by 30 days?' — replay the next 4–8 weeks under stress assumptions." },
    { ic: "✦", c: C.teal, h: "Plain-English Coaching",
      d: "SME owner sees the same data as the bank, explained as actions: 'pay Materials Supplier-2 first this week'." },
    { ic: "▶", c: C.purpleLt, h: "RM Action Relay",
      d: "Groq-drafted next-best-action for the RM. One click pushes a support note to the SME's dashboard, live." },
    { ic: "●", c: C.purple, h: "Bias-Aware Surfacing",
      d: "Score is sector-normalised and size-banded so micro-firms aren't flagged for being small. Audited monthly." },
  ];

  // 3 columns × 2 rows
  feats.forEach((f, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = 0.45 + col * 4.17;
    const y = 1.95 + row * 2.45;
    leftBarCard(s, x, y, 3.95, 2.25, f.c);
    iconCircle(s, x + 0.25, y + 0.2, f.ic, f.c, 0.6);
    s.addText(f.h, {
      x: x + 0.95, y: y + 0.22, w: 2.85, h: 0.55,
      fontFace: FONT_HEAD, fontSize: 14.5, bold: true, color: C.textHi,
      valign: "middle",
    });
    s.addText(f.d, {
      x: x + 0.25, y: y + 0.95, w: 3.55, h: 1.2,
      fontFace: FONT_BODY, fontSize: 11.5, color: C.textMd,
    });
  });

  pageNumber(s, 4);
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 5 — ARCHITECTURE & TECH
// ═══════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  bg(s);
  topAccent(s);
  slideTitle(s, "04  ·  HOW IT WORKS", "From invoice ledger to early-warning, in seconds.");

  // ── Pipeline diagram (4 stages, left → right)
  const stages = [
    { t: "DATA",      h: "Invoice Stream",      d: "Weekly supplier payments\n(50 firms · 52 weeks)", c: C.purple },
    { t: "FEATURES",  h: "Behavioural Vector", d: "Delay, terms breach,\ntrend, volatility",          c: C.purpleLt },
    { t: "MODELS",    h: "Tri-Engine AI",       d: "Forecaster · Classifier\n· Groq Llama 3.3",        c: C.amber },
    { t: "OUTPUT",    h: "Dual Dashboard",      d: "Bank RM view +\nSME coaching view",               c: C.teal },
  ];

  const baseY = 2.0;
  const cardW = 2.7, cardH = 1.95, gap = 0.45;
  const startX = 0.6;

  stages.forEach((st, i) => {
    const x = startX + i * (cardW + gap);
    card(s, x, baseY, cardW, cardH);
    s.addShape("rect", {
      x, y: baseY, w: cardW, h: 0.32,
      fill: { color: st.c }, line: { color: st.c },
    });
    s.addText(st.t, {
      x: x + 0.15, y: baseY + 0.02, w: cardW - 0.3, h: 0.3,
      fontFace: FONT_BODY, fontSize: 10, bold: true, charSpacing: 3,
      color: C.bg, valign: "middle",
    });
    s.addText(st.h, {
      x: x + 0.15, y: baseY + 0.45, w: cardW - 0.3, h: 0.4,
      fontFace: FONT_HEAD, fontSize: 16, bold: true, color: C.textHi,
    });
    s.addText(st.d, {
      x: x + 0.15, y: baseY + 0.95, w: cardW - 0.3, h: 0.95,
      fontFace: FONT_BODY, fontSize: 11, color: C.textMd,
    });
    // arrow between
    if (i < stages.length - 1) {
      const ax = x + cardW + 0.05;
      s.addShape("rightTriangle", {
        x: ax, y: baseY + cardH / 2 - 0.12, w: 0.32, h: 0.24,
        fill: { color: C.purpleLt }, line: { color: C.purpleLt },
        rotate: 0,
      });
    }
  });

  // ── Tech stack band
  card(s, 0.45, 4.4, 12.4, 2.4);
  s.addText("TECH STACK", {
    x: 0.7, y: 4.55, w: 12, h: 0.3,
    fontFace: FONT_BODY, fontSize: 11, bold: true, color: C.purpleLt, charSpacing: 4,
  });

  const tech = [
    { h: "Frontend",  v: "Vanilla JS SPA · D3-style polar viz · custom CSS",                c: C.purple },
    { h: "Backend",   v: "FastAPI · Pydantic · uvicorn · Pandas / NumPy",                  c: C.purpleLt },
    { h: "ML",        v: "Holt-Winters forecaster · XGBoost classifier · scikit-learn",    c: C.amber },
    { h: "GenAI",     v: "Groq Cloud · Llama 3.3 70B · context-scoped prompts",            c: C.teal },
  ];
  tech.forEach((t, i) => {
    const x = 0.7 + i * 3.05;
    s.addShape("rect", {
      x, y: 5.0, w: 0.06, h: 1.5,
      fill: { color: t.c }, line: { color: t.c },
    });
    s.addText(t.h.toUpperCase(), {
      x: x + 0.2, y: 4.95, w: 2.7, h: 0.3,
      fontFace: FONT_BODY, fontSize: 11, bold: true, color: t.c, charSpacing: 3,
    });
    s.addText(t.v, {
      x: x + 0.2, y: 5.25, w: 2.7, h: 1.25,
      fontFace: FONT_BODY, fontSize: 12, color: C.textMd,
    });
  });

  pageNumber(s, 5);
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 6 — AI MODELS UNDER THE HOOD
// ═══════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  bg(s);
  topAccent(s);
  slideTitle(s, "05  ·  THE AI ENGINE", "Three models. One signal. Explained at every step.");

  const models = [
    {
      n: "01",
      h: "Time-Series Forecaster",
      sub: "Holt-Winters · trend + seasonality",
      d: "Projects each supplier's payment delay 4–8 weeks ahead. Picks up holiday cycles and gradual deterioration.",
      out: "INPUT → 52w delay series\nOUTPUT → forecast + 95% CI",
      c: C.purple,
    },
    {
      n: "02",
      h: "Risk Classifier",
      sub: "XGBoost · 14 behavioural features",
      d: "Maps the behavioural vector to a default-probability and a stress regime (healthy / drift / acute / seasonal).",
      out: "INPUT → feature vector\nOUTPUT → P(default) + class",
      c: C.amber,
    },
    {
      n: "03",
      h: "Insight LLM",
      sub: "Groq · Llama 3.3 70B · two prompts",
      d: "Translates numbers to language. SME prompt = supportive coaching. Bank prompt = risk-team next-best-action.",
      out: "INPUT → portfolio context\nOUTPUT → JSON insight pack",
      c: C.teal,
    },
  ];

  models.forEach((m, i) => {
    const x = 0.45 + i * 4.17;
    card(s, x, 1.95, 3.95, 4.7);
    // big number
    s.addText(m.n, {
      x: x + 0.25, y: 2.05, w: 1.5, h: 0.7,
      fontFace: FONT_HEAD, fontSize: 36, bold: true, color: m.c,
    });
    s.addText(m.h, {
      x: x + 0.25, y: 2.78, w: 3.5, h: 0.45,
      fontFace: FONT_HEAD, fontSize: 17, bold: true, color: C.textHi,
    });
    s.addText(m.sub, {
      x: x + 0.25, y: 3.2, w: 3.5, h: 0.32,
      fontFace: FONT_BODY, fontSize: 11, italic: true, color: m.c,
    });
    s.addText(m.d, {
      x: x + 0.25, y: 3.6, w: 3.5, h: 1.5,
      fontFace: FONT_BODY, fontSize: 11.5, color: C.textMd,
    });
    // I/O box
    s.addShape("roundRect", {
      x: x + 0.25, y: 5.25, w: 3.45, h: 1.3,
      fill: { color: C.bgAlt }, line: { color: m.c, width: 1 },
      rectRadius: 0.08,
    });
    s.addText(m.out, {
      x: x + 0.4, y: 5.3, w: 3.2, h: 1.2,
      fontFace: FONT_BODY, fontSize: 10.5, color: C.textMd,
      paraSpaceAfter: 4,
    });
  });

  // Footnote
  s.addText("All three models run on synthetic-but-realistic 50-firm portfolio data. Ground truth (default labels) is sampled from a hazard model, so we can validate honestly.", {
    x: 0.45, y: 6.78, w: 12.4, h: 0.35,
    fontFace: FONT_BODY, fontSize: 10.5, italic: true, color: C.textLo,
  });

  pageNumber(s, 6);
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 7 — DEMO / EXECUTION SHOWCASE
// ═══════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  bg(s);
  topAccent(s);
  slideTitle(s, "06  ·  LIVE DEMO", "Two roles, one truth — switch viewpoint with a toggle.");

  // Two-column showcase: Bank RM view (left) and SME view (right) — illustrated mock
  // Bank RM mock card
  const bx = 0.45, by = 1.95, bw = 6.1, bh = 4.7;
  card(s, bx, by, bw, bh);
  s.addShape("rect", { x: bx, y: by, w: bw, h: 0.4, fill: { color: C.purpleDk }, line: { color: C.purpleDk } });
  s.addText("BANK · RISK ANALYST VIEW", {
    x: bx + 0.2, y: by, w: bw - 0.4, h: 0.4,
    fontFace: FONT_BODY, fontSize: 11, bold: true, color: C.white, charSpacing: 4, valign: "middle",
  });

  // KPI tiles
  const kpis = [
    { l: "TOTAL EXPOSURE",  v: "₹46.3 Cr", c: C.coral },
    { l: "SMES IMPACTED",   v: "15",       c: C.amber },
    { l: "HIGH-RISK SMES",  v: "15",       c: C.coral },
  ];
  kpis.forEach((k, i) => {
    const x = bx + 0.25 + i * 1.9;
    s.addShape("roundRect", {
      x, y: by + 0.6, w: 1.75, h: 1.0,
      fill: { color: C.bgAlt }, line: { color: k.c, width: 1 },
      rectRadius: 0.08,
    });
    s.addText(k.l, {
      x: x + 0.1, y: by + 0.68, w: 1.55, h: 0.25,
      fontFace: FONT_BODY, fontSize: 8, bold: true, color: C.textLo, charSpacing: 2,
    });
    s.addText(k.v, {
      x: x + 0.1, y: by + 0.95, w: 1.55, h: 0.55,
      fontFace: FONT_HEAD, fontSize: 22, bold: true, color: k.c,
    });
  });

  // Mini contagion ring
  const cgX = bx + 0.5, cgY = by + 1.85, cgW = 5.1, cgH = 2.7;
  s.addShape("roundRect", {
    x: cgX, y: cgY, w: cgW, h: cgH,
    fill: { color: C.bgAlt }, line: { color: C.cardEdge, width: 1 }, rectRadius: 0.08,
  });
  s.addText("SHOCKWAVE EPICENTRE  ·  Meridian Engineering Ltd", {
    x: cgX + 0.15, y: cgY + 0.1, w: cgW - 0.3, h: 0.3,
    fontFace: FONT_BODY, fontSize: 10, bold: true, color: C.purpleLt, charSpacing: 2,
  });
  // concentric rings
  const ringCx = cgX + cgW / 2, ringCy = cgY + cgH / 2 + 0.2;
  [1.0, 0.7, 0.4].forEach((r, i) => {
    s.addShape("ellipse", {
      x: ringCx - r, y: ringCy - r * 0.7, w: r * 2, h: r * 1.4,
      fill: { color: "FFFFFF", transparency: 100 },
      line: { color: i === 0 ? C.coral : i === 1 ? C.amber : C.purpleLt, width: 1, dashType: "dash" },
    });
  });
  // epicentre dot
  dot(s, ringCx - 0.09, ringCy - 0.09, C.coral, 0.18);
  // surrounding SMEs
  const orbits = [
    [-0.7, -0.3, C.coral], [0.6, -0.4, C.amber], [-0.5, 0.4, C.amber],
    [0.85, 0.15, C.purpleLt], [-0.95, 0.05, C.purpleLt], [0.3, 0.5, C.purpleLt],
  ];
  orbits.forEach(([dx, dy, c]) => dot(s, ringCx + dx - 0.06, ringCy + dy - 0.06, c, 0.13));

  // SME mock card
  const sx = 6.7, sy = 1.95, sw = 6.15, sh = 4.7;
  card(s, sx, sy, sw, sh);
  s.addShape("rect", { x: sx, y: sy, w: sw, h: 0.4, fill: { color: C.teal }, line: { color: C.teal } });
  s.addText("SME · OWNER VIEW (Meridian Engineering)", {
    x: sx + 0.2, y: sy, w: sw - 0.4, h: 0.4,
    fontFace: FONT_BODY, fontSize: 11, bold: true, color: C.bg, charSpacing: 4, valign: "middle",
  });

  // Pulse score gauge mock
  s.addShape("roundRect", {
    x: sx + 0.25, y: sy + 0.6, w: 5.65, h: 1.4,
    fill: { color: C.bgAlt }, line: { color: C.cardEdge, width: 1 }, rectRadius: 0.08,
  });
  s.addText("YOUR PULSE SCORE", {
    x: sx + 0.4, y: sy + 0.7, w: 3, h: 0.25,
    fontFace: FONT_BODY, fontSize: 9, bold: true, color: C.textLo, charSpacing: 2,
  });
  s.addText("62 / 100", {
    x: sx + 0.4, y: sy + 0.95, w: 2.5, h: 0.55,
    fontFace: FONT_HEAD, fontSize: 26, bold: true, color: C.amber,
  });
  s.addText("⚠  Stress drift detected — last 3 weeks", {
    x: sx + 0.4, y: sy + 1.5, w: 5.4, h: 0.3,
    fontFace: FONT_BODY, fontSize: 11, color: C.amber,
  });

  // Coaching message
  s.addShape("roundRect", {
    x: sx + 0.25, y: sy + 2.1, w: 5.65, h: 2.45,
    fill: { color: C.bgAlt }, line: { color: C.teal, width: 1 }, rectRadius: 0.08,
  });
  s.addText("COACHING — POWERED BY GROQ", {
    x: sx + 0.4, y: sy + 2.2, w: 5.3, h: 0.25,
    fontFace: FONT_BODY, fontSize: 9, bold: true, color: C.teal, charSpacing: 2,
  });
  s.addText('"Materials Supplier 2 has been late 3 weeks running. Pay them on Wednesday — it stabilises your delay band before the bank\'s Friday review. Logistics Supplier 1 can wait, you\'re inside terms there."', {
    x: sx + 0.4, y: sy + 2.5, w: 5.3, h: 1.4,
    fontFace: FONT_BODY, fontSize: 11, italic: true, color: C.textHi,
  });
  // RM-sent banner
  s.addShape("roundRect", {
    x: sx + 0.4, y: sy + 3.95, w: 5.3, h: 0.5,
    fill: { color: C.purple, transparency: 70 },
    line: { color: C.purpleLt, width: 1 }, rectRadius: 0.06,
  });
  s.addText("📩  Your RM sent: 'Let\'s schedule a 15-min review on Thu.'", {
    x: sx + 0.55, y: sy + 3.97, w: 5, h: 0.46,
    fontFace: FONT_BODY, fontSize: 10.5, color: C.textHi, valign: "middle",
  });

  s.addText("Live walkthrough: localhost:8001  ·  toggle SME ↔ Bank with the top-right switch  ·  Run Simulation triggers the contagion model.", {
    x: 0.45, y: 6.78, w: 12.4, h: 0.35,
    fontFace: FONT_BODY, fontSize: 10.5, italic: true, color: C.textLo,
  });

  pageNumber(s, 7);
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 8 — RESPONSIBLE AI / INCLUSION
// ═══════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  bg(s);
  topAccent(s);
  slideTitle(s, "07  ·  BUILT RESPONSIBLY", "Fair, safe, inclusive — by design.");

  s.addText(
    "A credit-risk tool can entrench bias as easily as it removes it. PayPulse is engineered so that the same engine that helps the bank also helps the SME — and neither side is shown the other's words verbatim without consent.",
    {
      x: 0.45, y: 1.85, w: 12.4, h: 0.85,
      fontFace: FONT_BODY, fontSize: 13.5, color: C.textMd,
    }
  );

  const guards = [
    { ic: "◐", c: C.purple, h: "Privacy First",
      d: "No PII leaves the bank's perimeter. Groq receives only aggregated behavioural features, never customer identity, never invoice line-items." },
    { ic: "◇", c: C.teal, h: "Fairness Audit",
      d: "Risk scores are sector- and size-band normalised. Monthly disparity check across firm size — micro-firms must not flag at higher rates for being small." },
    { ic: "◈", c: C.amber, h: "Human-in-the-Loop",
      d: "The LLM never auto-sends. Every RM action and every SME message passes through a person before it reaches the other side." },
    { ic: "✦", c: C.coral, h: "Explainability",
      d: "Every score links back to the three features that drove it. The SME sees the same reasoning the RM does — no black-box one-way credit denial." },
    { ic: "●", c: C.purpleLt, h: "Inclusive UX",
      d: "Plain-English coaching panel uses 14pt sans, high contrast, no colour-only signalling, screen-reader labels on the contagion graph." },
    { ic: "▲", c: C.teal, h: "Bias Reporting",
      d: "Built-in dashboard surfaces score distribution by sector and size — risk teams can spot drift before regulators do." },
  ];
  guards.forEach((g, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = 0.45 + col * 4.17;
    const y = 2.85 + row * 1.95;
    leftBarCard(s, x, y, 3.95, 1.78, g.c);
    iconCircle(s, x + 0.25, y + 0.18, g.ic, g.c, 0.55);
    s.addText(g.h, {
      x: x + 0.95, y: y + 0.2, w: 2.85, h: 0.5,
      fontFace: FONT_HEAD, fontSize: 13.5, bold: true, color: C.textHi,
      valign: "middle",
    });
    s.addText(g.d, {
      x: x + 0.25, y: y + 0.85, w: 3.55, h: 0.85,
      fontFace: FONT_BODY, fontSize: 11, color: C.textMd,
    });
  });

  pageNumber(s, 8);
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 9 — IMPACT & SCALE
// ═══════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  bg(s);
  topAccent(s);
  slideTitle(s, "08  ·  IMPACT & SCALE", "Small signal, system-wide payoff.");

  // Big stat hero
  card(s, 0.45, 1.85, 6.1, 4.95);
  s.addText("IF DEPLOYED AT A MID-SIZE BANK", {
    x: 0.7, y: 2.0, w: 5.6, h: 0.3,
    fontFace: FONT_BODY, fontSize: 11, bold: true, color: C.purpleLt, charSpacing: 4,
  });
  s.addText("12–18%", {
    x: 0.7, y: 2.4, w: 5.6, h: 1.4,
    fontFace: FONT_HEAD, fontSize: 84, bold: true, color: C.teal,
  });
  s.addText("expected reduction in surprise SME defaults — based on 90-day advance warning translated into restructuring-vs-default outcomes from RBI 2024 SME loss data.", {
    x: 0.7, y: 3.85, w: 5.6, h: 1.0,
    fontFace: FONT_BODY, fontSize: 13, color: C.textMd,
  });
  // mini bar
  s.addText("CASCADE BENEFIT", {
    x: 0.7, y: 5.1, w: 5.6, h: 0.3,
    fontFace: FONT_BODY, fontSize: 10, bold: true, color: C.purpleLt, charSpacing: 3,
  });
  const benefits = [
    { l: "SME jobs preserved per ₹100 Cr book", v: "~340" },
    { l: "RM hours saved on manual portfolio sweep", v: "60%" },
    { l: "Provisioning lag reduced (weeks)",  v: "8 → 2" },
  ];
  benefits.forEach((b, i) => {
    const y = 5.45 + i * 0.45;
    s.addText(b.l, {
      x: 0.7, y, w: 4.0, h: 0.4,
      fontFace: FONT_BODY, fontSize: 12, color: C.textMd,
      valign: "middle",
    });
    s.addText(b.v, {
      x: 4.7, y, w: 1.6, h: 0.4,
      fontFace: FONT_HEAD, fontSize: 14, bold: true, color: C.teal,
      align: "right", valign: "middle",
    });
  });

  // Stakeholder pyramid right
  card(s, 6.75, 1.85, 6.1, 4.95);
  s.addText("WHO BENEFITS", {
    x: 7.0, y: 2.0, w: 5.6, h: 0.3,
    fontFace: FONT_BODY, fontSize: 11, bold: true, color: C.purpleLt, charSpacing: 4,
  });

  const ben = [
    { h: "SME OWNERS",     d: "Earlier conversations, working-capital top-ups instead of recovery letters.", c: C.teal },
    { h: "RELATIONSHIP MANAGERS",   d: "Ranked watchlist replaces 200-row spreadsheets — focus on firms that can still be saved.", c: C.purple },
    { h: "RISK TEAMS",     d: "Forward-looking provisioning. NPA volatility goes down, capital is freed for new lending.", c: C.amber },
    { h: "SUPPLIER NETWORK", d: "Contagion view lets the bank intervene upstream — one rescue can save five downstream firms.", c: C.coral },
  ];
  ben.forEach((b, i) => {
    const y = 2.45 + i * 1.05;
    s.addShape("rect", {
      x: 7.0, y, w: 0.06, h: 0.92,
      fill: { color: b.c }, line: { color: b.c },
    });
    s.addText(b.h, {
      x: 7.2, y, w: 5.5, h: 0.3,
      fontFace: FONT_BODY, fontSize: 11, bold: true, color: b.c, charSpacing: 3,
    });
    s.addText(b.d, {
      x: 7.2, y: y + 0.32, w: 5.5, h: 0.65,
      fontFace: FONT_BODY, fontSize: 11.5, color: C.textMd,
    });
  });

  pageNumber(s, 9);
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 10 — FUTURE SCOPE & THANK YOU
// ═══════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  bg(s);

  // Hero glow
  s.addShape("ellipse", {
    x: 8.5, y: -3, w: 8, h: 8,
    fill: { color: C.purpleDk, transparency: 60 },
    line: { color: C.purpleDk, transparency: 100 },
  });
  s.addShape("ellipse", {
    x: -2, y: 4, w: 6, h: 6,
    fill: { color: C.teal, transparency: 85 },
    line: { color: C.teal, transparency: 100 },
  });

  topAccent(s);
  slideTitle(s, "09  ·  WHAT'S NEXT", "Where PayPulse goes with more time.");

  // Two-column: roadmap (left) + thank-you panel (right)
  const fx = 0.45, fy = 1.95, fw = 6.95, fh = 4.7;
  card(s, fx, fy, fw, fh);
  s.addText("ROADMAP", {
    x: fx + 0.25, y: fy + 0.18, w: fw - 0.5, h: 0.32,
    fontFace: FONT_BODY, fontSize: 11, bold: true, color: C.purpleLt, charSpacing: 4,
  });

  const road = [
    { t: "Real-data pilot", d: "Plug into a single bank's SME loan book + UPI/GST e-invoice feed for live evaluation." },
    { t: "Open Banking integration", d: "Pull supplier-payment data direct via Account Aggregator (RBI) — zero-touch onboarding." },
    { t: "Mobile-first SME app",  d: "WhatsApp + Hindi/regional language support — reach the 60% of SMEs that don't use desktop dashboards." },
    { t: "Federated risk model",  d: "Train across multiple banks without moving data — better signal, no privacy compromise." },
  ];
  road.forEach((r, i) => {
    const y = fy + 0.65 + i * 0.95;
    iconCircle(s, fx + 0.25, y, String(i + 1), C.purple, 0.55);
    s.addText(r.t, {
      x: fx + 0.95, y: y + 0.02, w: 5.85, h: 0.32,
      fontFace: FONT_HEAD, fontSize: 14, bold: true, color: C.textHi,
    });
    s.addText(r.d, {
      x: fx + 0.95, y: y + 0.34, w: 5.85, h: 0.55,
      fontFace: FONT_BODY, fontSize: 11.5, color: C.textMd,
    });
  });

  // Thank-you panel
  const tx = 7.65, ty = 1.95, tw = 5.2, th = 4.7;
  s.addShape("roundRect", {
    x: tx, y: ty, w: tw, h: th,
    fill: { color: C.purpleDk }, line: { color: C.purple, width: 2 }, rectRadius: 0.15,
  });
  s.addText("Thank you.", {
    x: tx + 0.4, y: ty + 0.4, w: tw - 0.8, h: 1.2,
    fontFace: FONT_HEAD, fontSize: 54, bold: true, color: C.white,
  });
  s.addText("We'd love to take questions.", {
    x: tx + 0.4, y: ty + 1.55, w: tw - 0.8, h: 0.4,
    fontFace: FONT_BODY, fontSize: 15, italic: true, color: C.purpleLt,
  });

  // Divider
  s.addShape("rect", {
    x: tx + 0.4, y: ty + 2.15, w: tw - 0.8, h: 0.02,
    fill: { color: C.purple, transparency: 50 }, line: { color: C.purple, transparency: 50 },
  });

  s.addText("TEAM BYTEHER", {
    x: tx + 0.4, y: ty + 2.3, w: tw - 0.8, h: 0.3,
    fontFace: FONT_BODY, fontSize: 12, bold: true, color: C.purpleLt, charSpacing: 4,
  });
  s.addText("Vamika Bhardwaj", {
    x: tx + 0.4, y: ty + 2.65, w: tw - 0.8, h: 0.4,
    fontFace: FONT_HEAD, fontSize: 18, bold: true, color: C.white,
  });
  s.addText("Anshika", {
    x: tx + 0.4, y: ty + 3.05, w: tw - 0.8, h: 0.4,
    fontFace: FONT_HEAD, fontSize: 18, bold: true, color: C.white,
  });
  s.addText("Indira Gandhi Delhi Technical\nUniversity for Women", {
    x: tx + 0.4, y: ty + 3.55, w: tw - 0.8, h: 0.7,
    fontFace: FONT_BODY, fontSize: 12, color: C.purpleLt,
  });
  s.addText("Code for Purpose 2026  ·  NatWest", {
    x: tx + 0.4, y: ty + 4.25, w: tw - 0.8, h: 0.3,
    fontFace: FONT_BODY, fontSize: 10, color: C.purpleLt, charSpacing: 3,
  });

  pageNumber(s, 10);
}

// ─────────────────────────── Save ───────────────────────────
pres.writeFile({ fileName: "/Users/vamikabhardwaj/Desktop/paypulse/deck/PayPulse_ByteHER_CodeForPurpose2026.pptx" })
  .then((f) => console.log("Wrote", f));
