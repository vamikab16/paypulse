"""Generate the PayPulse 5-minute demo speech as a formatted PDF."""
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    PageBreak,
    HRFlowable,
    ListFlowable,
    ListItem,
)

OUTPUT = "/Users/vamikabhardwaj/Desktop/paypulse/docs/PayPulse_Demo_Script.pdf"

# ---------------------------------------------------------------------------
# Styles
# ---------------------------------------------------------------------------
base = getSampleStyleSheet()

title_style = ParagraphStyle(
    "Title",
    parent=base["Title"],
    fontName="Helvetica-Bold",
    fontSize=26,
    leading=30,
    textColor=colors.HexColor("#1a1a2e"),
    alignment=TA_CENTER,
    spaceAfter=6,
)

subtitle_style = ParagraphStyle(
    "Subtitle",
    parent=base["Normal"],
    fontName="Helvetica",
    fontSize=12,
    leading=16,
    textColor=colors.HexColor("#555"),
    alignment=TA_CENTER,
    spaceAfter=4,
)

meta_style = ParagraphStyle(
    "Meta",
    parent=base["Normal"],
    fontName="Helvetica-Oblique",
    fontSize=10,
    leading=14,
    textColor=colors.HexColor("#6b6b82"),
    alignment=TA_CENTER,
    spaceAfter=24,
)

section_style = ParagraphStyle(
    "Section",
    parent=base["Heading2"],
    fontName="Helvetica-Bold",
    fontSize=14,
    leading=18,
    textColor=colors.HexColor("#4b3d99"),
    spaceBefore=14,
    spaceAfter=8,
)

part_style = ParagraphStyle(
    "Part",
    parent=base["Heading1"],
    fontName="Helvetica-Bold",
    fontSize=11,
    leading=14,
    textColor=colors.white,
    backColor=colors.HexColor("#4b3d99"),
    alignment=TA_CENTER,
    spaceBefore=22,
    spaceAfter=14,
    borderPadding=(8, 8, 8, 8),
)

body_style = ParagraphStyle(
    "Body",
    parent=base["Normal"],
    fontName="Helvetica",
    fontSize=12,
    leading=19,
    textColor=colors.HexColor("#1a1a2e"),
    alignment=TA_JUSTIFY,
    spaceAfter=12,
    firstLineIndent=0,
)

emphasis_style = ParagraphStyle(
    "Emphasis",
    parent=body_style,
    fontName="Helvetica-Oblique",
    textColor=colors.HexColor("#3a3a52"),
)

footer_style = ParagraphStyle(
    "Footer",
    parent=base["Normal"],
    fontName="Helvetica",
    fontSize=9,
    leading=12,
    textColor=colors.HexColor("#888"),
    alignment=TA_CENTER,
)


def hr():
    return HRFlowable(
        width="100%",
        thickness=0.6,
        color=colors.HexColor("#d0d0d8"),
        spaceBefore=4,
        spaceAfter=14,
    )


# ---------------------------------------------------------------------------
# Speech content — written to be read aloud, naturally, one paragraph at a time
# ---------------------------------------------------------------------------

SPEECHES = [
    (
        "Part 1 \u2014 Problem, Solution, and Tech Stack  (2 minutes)",
        [],
    ),
    (
        "The Problem",
        [
            "Good afternoon.",
            "Every year in India, twenty-five thousand crore rupees in SME loans "
            "default. And in nearly every one of those cases, the warning signs "
            "were there. Hiding in plain sight.",
            "Here is what actually happens when a small business begins to "
            "struggle. It does not miss its bank payment first. It quietly "
            "stretches its suppliers. It pays the critical ones on time, and "
            "silently delays the rest. This pattern is called payment triage, "
            "and it shows up four to eight weeks before any traditional credit "
            "metric changes. NatWest already has this data flowing through its "
            "rails. It is just not being read as a risk signal.",
            "PayPulse changes that.",
        ],
    ),
    (
        "The Solution",
        [
            "PayPulse is an AI-powered early-warning system for SME financial "
            "stress, built around five capabilities:",
            [
                "<b>Triage detection</b> \u2014 our core innovation \u2014 "
                "identifies when a business is selectively prioritising payments.",
                "<b>ML forecasting</b> \u2014 a gradient-boosting model predicts "
                "the next six weeks of supplier delays with ninety-five percent "
                "confidence bands.",
                "<b>Anomaly detection</b> \u2014 an isolation forest flags "
                "unusual payment weeks unsupervised, with no labels needed.",
                "<b>What-if simulator</b> \u2014 lets relationship managers "
                "model interventions, like a revenue drop or a working-capital "
                "line, in real time.",
                "<b>Dual dashboard</b> \u2014 one view for the SME owner, "
                "another for the bank RM, on the same underlying data.",
            ],
            "And every alert comes with a plain-English explanation. No black "
            "boxes.",
        ],
    ),
    (
        "The Tech Stack",
        [
            "On the technology side: Python and FastAPI on the backend. Our "
            "machine-learning pipeline uses scikit-learn \u2014 gradient "
            "boosting, random forest, isolation forest, and K-Means clustering "
            "\u2014 plus a GRU neural network we built from scratch in NumPy. "
            "Twenty-three engineered features are computed per supplier per "
            "week. The frontend is vanilla JavaScript with Chart.js. "
            "Six models. One pipeline. Production-ready.",
            "Now let me show you all of this running live.",
        ],
    ),
    (
        "Part 2 \u2014 Live Demo  (3 minutes)",
        [],
    ),
    (
        "SME View \u2014 The Reveal Moment",
        [
            "We start in the SME view. I am logged in as Meridian Engineering "
            "Limited \u2014 a real SME in our dataset.",
            "The first thing on screen is the dual-status banner. The "
            "traditional banking view says green. Loan payments current. "
            "Revenue stable. Credit score healthy. By every metric NatWest "
            "tracks today, this customer looks fine. The PayPulse view says "
            "amber. Payment triage detected. That contradiction is the entire "
            "pitch on a single line.",
            "Below that, my supplier list. BetaLogistics, sixty-two days late, "
            "trend accelerating. GammaSupplies, forty days late and drifting "
            "up. The system has already flagged the pattern.",
        ],
    ),
    (
        "Bank Risk View \u2014 Portfolio Drill-Down",
        [
            "Now I switch to the bank risk view with a single toggle. I am "
            "instantly looking at an entire portfolio of SME clients, ranked "
            "by risk. Meridian sits at high risk, with a clear reason next to "
            "it \u2014 spread divergence at seven hundred and forty-eight "
            "percent above baseline. One click drills into the supplier-level "
            "evidence behind that rating. One more click generates a printable "
            "PDF for the credit committee.",
        ],
    ),
    (
        "AI Models Tab \u2014 The Machine Learning",
        [
            "Next, the AI Models tab. This is where the machine learning is "
            "exposed. I select BetaLogistics from the dropdown and click Run "
            "Analysis. Three model outputs come back together. The "
            "random-forest classifier returns: critical risk, ninety-nine "
            "percent confidence. Gradient boosting projects payment delays of "
            "fifty-five to fifty-seven days across the next six weeks, with "
            "confidence bands plotted on the chart. The isolation forest has "
            "flagged seven anomalous weeks in this supplier's history \u2014 "
            "visible as red dots on the timeline. And SHAP tells us the top "
            "driver of that risk rating is the four-week rolling delay mean.",
        ],
    ),
    (
        "Simulator \u2014 The Decision Layer",
        [
            "Now to the simulator \u2014 the decision layer. I run a "
            "revenue-drop scenario at twenty percent. The projection flips "
            "from amber to red. Three suppliers cross critical thresholds. "
            "I then switch to the accelerate-payments scenario, modelling "
            "what happens if the bank steps in early with a temporary "
            "working-capital line. The risk drops back to amber. The "
            "simulator gives the bank a concrete cost-benefit number: "
            "proactive support is far cheaper than default recovery.",
        ],
    ),
    (
        "Closing",
        [
            "That is PayPulse, end to end. Detect the triage signal early. "
            "Forecast where it is heading. Explain why. And give the "
            "relationship manager a tool to model the cheapest possible "
            "intervention \u2014 weeks before traditional metrics would have "
            "caught the problem.",
            "A single early intervention on one five-crore loan pays for the "
            "entire system. Across NatWest's SME portfolio, that means "
            "thousands of crores in recovered lending.",
            "We are ByteHER, from IGDTUW. Thank you \u2014 we would love to "
            "take your questions.",
        ],
    ),
]


# ---------------------------------------------------------------------------
# Build document
# ---------------------------------------------------------------------------

def build() -> None:
    doc = SimpleDocTemplate(
        OUTPUT,
        pagesize=A4,
        leftMargin=2.2 * cm,
        rightMargin=2.2 * cm,
        topMargin=2.0 * cm,
        bottomMargin=2.0 * cm,
        title="PayPulse Demo Script",
        author="ByteHER — Vamika Bhardwaj, Anshika",
    )

    story = []

    # Cover header
    story.append(Paragraph("PayPulse", title_style))
    story.append(Paragraph(
        "Five-Minute Demo Speech",
        subtitle_style,
    ))
    story.append(Paragraph(
        "AI-Powered Early Warning System for SME Financial Stress",
        subtitle_style,
    ))
    story.append(Paragraph(
        "Team ByteHER &nbsp;&middot;&nbsp; Vamika Bhardwaj &nbsp;&amp;&nbsp; Anshika "
        "&nbsp;&middot;&nbsp; IGDTUW",
        meta_style,
    ))
    story.append(hr())

    for heading, paragraphs in SPEECHES:
        # Empty-paragraph entries are part dividers (Part 1 / Part 2 banners).
        if not paragraphs:
            story.append(Paragraph(heading.upper(), part_style))
            continue
        story.append(Paragraph(heading, section_style))
        for para in paragraphs:
            # Nested list -> render as a bullet list.
            if isinstance(para, list):
                items = [
                    ListItem(
                        Paragraph(item, body_style),
                        leftIndent=14,
                        spaceAfter=6,
                    )
                    for item in para
                ]
                story.append(
                    ListFlowable(
                        items,
                        bulletType="bullet",
                        bulletFontName="Helvetica-Bold",
                        bulletFontSize=11,
                        bulletColor=colors.HexColor("#4b3d99"),
                        leftIndent=18,
                        bulletOffsetY=-1,
                    )
                )
                story.append(Spacer(1, 6))
            else:
                story.append(Paragraph(para, body_style))
        story.append(Spacer(1, 6))

    story.append(Spacer(1, 10))
    story.append(hr())
    story.append(Paragraph(
        "Runtime target: 5 minutes \u2014 2 min intro + 3 min live demo. "
        "Approx. 150 words per minute. Pause at each paragraph break.",
        footer_style,
    ))

    doc.build(story)
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    build()
