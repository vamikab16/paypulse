"""Generate the PayPulse 5-minute video submission script as a PDF."""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib.colors import HexColor, black, white
from reportlab.lib.enums import TA_LEFT, TA_JUSTIFY
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    HRFlowable,
)

OUTPUT = "/Users/vamikabhardwaj/Desktop/paypulse/docs/PayPulse_Video_Script.pdf"

# Register Unicode-capable fonts (needed for the rupee symbol ₹)
pdfmetrics.registerFont(TTFont("Body", "/Library/Fonts/Arial Unicode.ttf"))
pdfmetrics.registerFont(TTFont("BodyBold", "/Library/Fonts/Arial Bold.ttf"))
pdfmetrics.registerFont(TTFont("BodyItalic", "/System/Library/Fonts/Supplemental/Arial Italic.ttf"))
pdfmetrics.registerFontFamily("Body", normal="Body", bold="BodyBold", italic="BodyItalic")

# Brand colours
PURPLE = HexColor("#6C5CE7")
DARK = HexColor("#0F1020")
GREY = HexColor("#6B7280")
LIGHT_GREY = HexColor("#F3F4F6")

styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    "Title", parent=styles["Title"], fontName="BodyBold",
    fontSize=24, textColor=PURPLE, alignment=TA_LEFT, spaceAfter=6,
)
subtitle_style = ParagraphStyle(
    "Subtitle", parent=styles["Normal"], fontName="Body",
    fontSize=11, textColor=GREY, alignment=TA_LEFT, spaceAfter=18,
)
section_style = ParagraphStyle(
    "Section", parent=styles["Heading1"], fontName="BodyBold",
    fontSize=14, textColor=white, backColor=PURPLE,
    leftIndent=8, rightIndent=8, spaceBefore=16, spaceAfter=10,
    borderPadding=(6, 8, 6, 8),
)
timing_style = ParagraphStyle(
    "Timing", parent=styles["Normal"], fontName="BodyBold",
    fontSize=9.5, textColor=PURPLE, alignment=TA_LEFT, spaceAfter=4,
)
narration_style = ParagraphStyle(
    "Narration", parent=styles["Normal"], fontName="Body",
    fontSize=11, textColor=black, leading=15, alignment=TA_JUSTIFY,
    leftIndent=14, spaceAfter=8,
)
screen_style = ParagraphStyle(
    "Screen", parent=styles["Normal"], fontName="BodyItalic",
    fontSize=9.5, textColor=GREY, leading=13, alignment=TA_LEFT,
    leftIndent=14, rightIndent=14, spaceAfter=8,
    backColor=LIGHT_GREY, borderPadding=(6, 8, 6, 8),
)
beat_style = ParagraphStyle(
    "Beat", parent=styles["Normal"], fontName="BodyBold",
    fontSize=11, textColor=DARK, alignment=TA_LEFT, spaceBefore=6, spaceAfter=4,
)
note_style = ParagraphStyle(
    "Note", parent=styles["Normal"], fontName="Body",
    fontSize=9, textColor=GREY, leading=12, alignment=TA_LEFT,
    leftIndent=14, spaceAfter=8,
)

DOT = "\u00a0·\u00a0"  # non-breaking spaces around a middle dot

def screen(text):
    return Paragraph(f"<b>ON SCREEN</b>\u00a0\u00a0 {text}", screen_style)

def narr(text):
    return Paragraph(f"\u201C{text}\u201D", narration_style)

def timing(text):
    return Paragraph(text, timing_style)

def section(text):
    return Paragraph(text, section_style)

def beat(text):
    return Paragraph(text, beat_style)

def hr():
    return HRFlowable(width="100%", thickness=0.5, color=GREY, spaceBefore=10, spaceAfter=10)


doc = SimpleDocTemplate(
    OUTPUT, pagesize=A4,
    leftMargin=2 * cm, rightMargin=2 * cm, topMargin=1.8 * cm, bottomMargin=1.8 * cm,
    title="PayPulse — 5-Minute Video Script",
)

story = []

# -------- COVER BLOCK --------
story.append(Paragraph("PayPulse", title_style))
story.append(Paragraph(
    f"5-Minute Video Submission Script{DOT}AI Early-Warning System for SME Financial Stress",
    subtitle_style,
))

meta_data = [
    ["Runtime", "5:00"],
    ["Format", "Voiceover + screen recording"],
    ["Demo SME", "Meridian Engineering Ltd (5 suppliers, construction sector)"],
    ["Live URL", "localhost / deployed build"],
    ["Partner", "NatWest"],
]
meta_table = Table(meta_data, colWidths=[3.5 * cm, 13 * cm])
meta_table.setStyle(TableStyle([
    ("FONTNAME", (0, 0), (0, -1), "BodyBold"),
    ("FONTNAME", (1, 0), (1, -1), "Body"),
    ("FONTSIZE", (0, 0), (-1, -1), 9.5),
    ("TEXTCOLOR", (0, 0), (0, -1), PURPLE),
    ("TEXTCOLOR", (1, 0), (1, -1), DARK),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ("TOPPADDING", (0, 0), (-1, -1), 5),
    ("LINEBELOW", (0, 0), (-1, -2), 0.25, LIGHT_GREY),
]))
story.append(meta_table)
story.append(Spacer(1, 14))

# -------- PART 1: THE PROBLEM --------
story.append(section(f"PART 1{DOT}THE PROBLEM{DOT}0:00 – 0:40"))

story.append(timing(f"0:00 – 0:10{DOT}THE HOOK"))
story.append(screen("Black card. Bold text <b>\u201C\u20B925,000 CRORE\u201D</b> fades in. Subtitle drops below: <b>\u201CLost every year. To SME loan defaults.\u201D</b>"))
story.append(narr("Twenty-five thousand crore rupees."))
story.append(narr("That\u2019s \u20B925,000 crore \u2014 gone, every single year, to SME loan defaults across India. And here\u2019s the frustrating part \u2014 in nearly every case, the warning signs were there. They just weren\u2019t in the places banks were looking."))

story.append(timing(f"0:10 – 0:30{DOT}PAYMENT TRIAGE"))
story.append(screen("Animation: a small business in the centre. Arrow right to <b>\u201CBank Loan\u201D</b> in green (on time). Arrows down to three <b>\u201CSuppliers\u201D</b> in red, with ticking clocks showing delays."))
story.append(narr("When a business starts struggling, it doesn\u2019t miss its bank payment first. It does something much subtler \u2014 it starts <b>stretching its suppliers</b>. It pays the critical ones on time, the bank on time, and silently delays everyone else."))
story.append(narr("This behaviour \u2014 we call it <b>payment triage</b> \u2014 is the earliest detectable signal of financial distress. It appears <b>4 to 8 weeks</b> before any traditional credit metric changes. NatWest already has this signal sitting in its transaction data. It just doesn\u2019t use it."))

story.append(timing(f"0:30 – 0:40{DOT}THE REVEAL"))
story.append(screen("Screen wipes to deep navy. PayPulse logo slams in with purple glow. Tagline below: <b>\u201CSee stress 34 days earlier.\u201D</b>"))
story.append(narr("<b>PayPulse changes that.</b>"))

# -------- PART 2: THE SOLUTION --------
story.append(section(f"PART 2{DOT}THE SOLUTION{DOT}0:40 – 1:25"))

story.append(screen("Five-capability grid animates in. Each tile highlights as it is named; a small glyph (radar / trendline / scatter / sliders / split-screen) sits beside each label."))
story.append(narr("PayPulse is an AI-powered early-warning system for SME financial stress, built around five capabilities."))

story.append(beat(f"1{DOT}Triage Detection"))
story.append(narr("<b>Our core innovation.</b> It identifies when a business is selectively prioritising payments \u2014 the earliest fingerprint of distress."))

story.append(beat(f"2{DOT}ML Forecasting"))
story.append(narr("A gradient-boosting model predicts the next six weeks of supplier delays with ninety-five percent confidence bands."))

story.append(beat(f"3{DOT}Anomaly Detection"))
story.append(narr("An isolation forest flags unusual payment weeks, unsupervised, with no labels needed."))

story.append(beat(f"4{DOT}What-if Simulator"))
story.append(narr("Lets relationship managers model interventions \u2014 a revenue drop or a working-capital line \u2014 in real time."))

story.append(beat(f"5{DOT}Dual Dashboard"))
story.append(narr("One view for the SME owner, another for the bank RM, on the same underlying data."))

story.append(Spacer(1, 4))
story.append(narr("And every alert comes with a plain-English explanation. <b>No black boxes.</b>"))

# -------- PART 3: TECH STACK --------
story.append(section(f"PART 3{DOT}TECH STACK{DOT}1:25 – 1:55"))

story.append(screen("Stack diagram: FastAPI + Python at the core. Radial nodes for Gradient Boosting, Random Forest, Isolation Forest, K-Means, and GRU. Feature-count badge pulses: <b>23 features / supplier / week</b>."))
story.append(narr("On the technology side: <b>Python and FastAPI</b> on the backend. Our machine-learning pipeline uses <b>scikit-learn</b> \u2014 gradient boosting, random forest, isolation forest, and K-Means clustering \u2014 plus a <b>GRU neural network</b> we built from scratch in NumPy."))
story.append(narr("<b>Twenty-three engineered features</b> are computed per supplier per week. The frontend is vanilla JavaScript with Chart.js."))
story.append(narr("<b>Six models. One pipeline. Production-ready.</b>"))
story.append(narr("Now let me show you all of this running live."))

story.append(PageBreak())

# -------- PART 4: LIVE DEMO --------
story.append(section(f"PART 4{DOT}LIVE DEMO{DOT}1:55 – 4:45"))
story.append(Paragraph(
    "Record a clean screen capture of the deployed build. Keep cursor movement deliberate \u2014 narration leads, clicks follow.",
    note_style,
))

# --- 1:55 – 2:20 ---
story.append(timing(f"1:55 – 2:20{DOT}SME VIEW — THE 34-DAY HEAD START"))
story.append(screen("Open app at <b>Portfolio</b> tab, <b>SME View</b> toggle selected. Meridian Engineering dashboard loads. Show the header: <i>\u201CWelcome back, Judge Account\u201D</i> with a pulsing <b>RED</b> status pill."))
story.append(narr("This is Meridian Engineering \u2014 a mid-sized construction SME on NatWest\u2019s books. Their loan is current. Their overdraft is healthy. Their credit score hasn\u2019t moved."))
story.append(screen("Zoom to the banner: <b>\u201CPayPulse detected this stress 34 days before traditional credit signals.\u201D</b>"))
story.append(narr("But PayPulse is already flagging them. <b>Thirty-four days earlier</b> than anything else the bank has."))
story.append(screen("Point to the side-by-side pills: <b>Traditional Banking — GREEN</b>\u00a0\u00a0vs\u00a0\u00a0<b>PayPulse AI — AMBER</b> (with glow)."))
story.append(narr("Side by side \u2014 traditional banking says green. PayPulse says amber. Same data. Different lens."))

# --- 2:20 – 2:50 ---
story.append(timing(f"2:20 – 2:50{DOT}THE EVIDENCE — PAYMENT TRIAGE IN ACTION"))
story.append(screen("Scroll to <b>\u201CSevere Financial Stress Detected\u201D</b> headline. Highlight the insight line: <b>\u201C3 suppliers are being paid 40–62 days late \u2014 31+ days beyond contractual terms.\u201D</b>"))
story.append(narr("Here\u2019s why. Three of Meridian\u2019s suppliers are now being paid forty to sixty-two days late \u2014 that\u2019s thirty-one days beyond their contractual terms."))
story.append(screen("Scroll to <b>Affected Suppliers</b> list. Hover <b>BetaLogistics Ltd — 58d — accelerating +2.8d/week</b>. Then <b>GammaSupplies Co — 40d — drifting +1.2d/week</b>. Then the two green ones: <b>AlphaSteel</b> and <b>EpsilonServices</b>, both on time."))
story.append(narr("BetaLogistics \u2014 fifty-eight days late, and accelerating by almost three days every week. GammaSupplies \u2014 forty days late, drifting upward. But notice this \u2014 AlphaSteel and EpsilonServices are still being paid on time."))
story.append(narr("<b>That\u2019s the triage.</b> Meridian is choosing who to pay and who to starve. That is not a cash-flow accident. That is a business rationing money."))
story.append(screen("Scroll to <b>Payment Triage Score</b> bar \u2014 ACTIVE badge, score elevated."))
story.append(narr("Our triage detector quantifies it. One number. ACTIVE."))

# --- 2:50 – 3:20 ---
story.append(timing(f"2:50 – 3:20{DOT}BANK RISK VIEW — THE RM EXPERIENCE"))
story.append(screen("Toggle <b>Bank Risk View</b>. Load the <b>Portfolio Risk Overview</b>: table of SMEs with RED / AMBER / GREEN badges and sparkline trends."))
story.append(narr("Now switch lenses. This is what the relationship manager sees \u2014 the entire SME portfolio, triaged by risk. Three accounts needing attention. Meridian at the top."))
story.append(screen("Click Meridian row \u2192 drill into the Bank Risk detail. Show the <b>Recommended Actions</b> block."))
story.append(narr("One click, and the RM has their playbook: <b>escalate to Credit Committee, restructure payment terms, schedule urgent outreach.</b> Written in plain English, grounded in the specific signals we detected."))

# --- 3:20 – 4:00 ---
story.append(timing(f"3:20 – 4:00{DOT}AI DETAILS — THE ENGINE ROOM"))
story.append(screen("Open the <b>AI Details</b> sub-tab. Models render one after another."))
story.append(narr("Under the hood, this is what\u2019s running."))
story.append(screen("Show <b>ML Forecast (Gradient Boosting)</b> \u2014 six-week forecast with 95% confidence bands trending upward."))
story.append(narr("Gradient boosting forecasts the next six weeks. Without intervention, BetaLogistics crosses seventy days. The confidence bands tell the RM <i>how sure</i> we are."))
story.append(screen("Show <b>GRU Neural Network Forecast</b> \u2014 orange line, similar upward trajectory."))
story.append(narr("A GRU neural network, built from scratch in NumPy, agrees independently. Different maths. Same conclusion."))
story.append(screen("Show <b>Anomaly Detection (Isolation Forest)</b> \u2014 scatter plot with flagged weeks highlighted."))
story.append(narr("Our isolation forest flags the exact weeks where payment behaviour broke pattern \u2014 unsupervised, no labels needed."))
story.append(screen("Show <b>Model Comparison</b> \u2014 horizontal bar chart of MAE. Callout: <b>\u201CBest MAE: 6.2 days\u201D</b>."))
story.append(narr("Head-to-head, our best model lands at six-point-two days mean absolute error \u2014 dramatically better than baseline."))
story.append(screen("Show <b>K-Means Supplier Clustering</b> \u2014 three colour-coded clusters: Stretched / Delayed / Normal."))
story.append(narr("K-Means clustering groups Meridian\u2019s suppliers automatically \u2014 stretched, delayed, normal \u2014 so the RM sees the <i>shape</i> of the triage, not just a list."))

# --- 4:00 – 4:25 ---
story.append(timing(f"4:00 – 4:25{DOT}WHAT-IF + RISK SPREAD"))
story.append(screen("Jump to <b>Simulator</b>. Drag the <b>Working-Capital Line</b> slider up. Chart re-renders; forecast bends downward into amber then green."))
story.append(narr("The RM doesn\u2019t just get a warning \u2014 they get a sandbox. Inject a working-capital line here, and the forecast bends back. They can model the intervention <i>before</i> they pick up the phone."))
story.append(screen("Click the <b>Risk Spread</b> tab. Shockwave epicentre chart renders: Meridian at centre, concentric rings showing contagion over weeks 1–5."))
story.append(narr("And because SMEs don\u2019t fail alone, Risk Spread shows the contagion. If Meridian defaults, these three suppliers feel it inside two weeks. One bank, one view, whole network."))

# --- 4:25 – 4:45 ---
story.append(timing(f"4:25 – 4:45{DOT}REPORT GENERATION"))
story.append(screen("Top-right \u2014 click <b>Report</b>. Dropdown opens. Select <b>\u201CAll SMEs (Portfolio Report)\u201D</b>. PDF downloads."))
story.append(narr("One click \u2014 and the RM has a board-ready PDF. Executive summary, forecasts, model card, recommended actions. Per SME, or for the whole portfolio."))

# -------- CLOSE --------
story.append(section(f"CLOSE{DOT}4:45 – 5:00"))
story.append(screen(f"Cut back to presenter / PayPulse logo on deep navy. Stat cards animate in: <b>34 days earlier</b>{DOT}<b>6 models</b>{DOT}<b>23 features</b>{DOT}<b>\u20B925,000 cr</b> at stake."))
story.append(narr("Twenty-five thousand crore. Thirty-four days of head start. Six models, twenty-three features, one pipeline \u2014 already compatible with the transaction data NatWest has today."))
story.append(narr("<b>PayPulse. See stress before it shows.</b>"))

story.append(Spacer(1, 10))
story.append(hr())
story.append(Paragraph(
    "Delivery notes: pace narration at ~150 wpm; leave half-second beats after every headline stat. "
    "Keep cursor movement slow in the demo \u2014 viewers need to read the UI copy behind the voice. "
    "If over-running, trim the K-Means and Anomaly beats (3:40–3:55) first \u2014 Gradient Boosting + GRU carry the model story.",
    note_style,
))

doc.build(story)
print(f"Wrote {OUTPUT}")
