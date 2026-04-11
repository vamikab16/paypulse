<p align="center">
  <img src="https://img.shields.io/badge/PayPulse-NatWest_AI_Early_Warning-6246ea?style=for-the-badge&labelColor=0a0e1a" alt="PayPulse" />
</p>

<h1 align="center">PayPulse</h1>
<h3 align="center">AI-Powered Early Warning System for SME Financial Stress</h3>

<p align="center">
  <strong>Detects SME distress 4–8 weeks before traditional banking metrics ever change.</strong>
</p>

<p align="center">
  🚀 <a href="YOUR_VERCEL_LINK_HERE"><strong>Live Demo on Vercel</strong></a> &nbsp;·&nbsp;
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Hackathon-NatWest_Code_for_Purpose_India-purple?style=flat-square" />
  <img src="https://img.shields.io/badge/Theme-AI_Predictive_Forecasting-blue?style=flat-square" />
  <img src="https://img.shields.io/badge/Status-Production_Demo-brightgreen?style=flat-square" />
</p>

---

## 💰 The ₹25,000 Crore Problem

> Every year, **₹25,000 crore in SME loans default** across India. In nearly every case, the warning signs were hiding in plain sight — not in the bank's own ledgers, but in the **outgoing payments the SME was making to its suppliers**.

When a business starts struggling, it doesn't miss its bank payment first. It **stretches its suppliers**. It pays the critical ones on time and silently delays the rest. This **payment triage** is the earliest detectable signal of financial distress — appearing **4–8 weeks** before any traditional credit metric changes.

**NatWest already has this signal in its transaction data. It just doesn't use it.**

PayPulse changes that.

---

## 📖 Overview

**PayPulse** is an AI-powered predictive analytics platform that monitors SME supplier payment patterns to detect financial stress before it becomes a crisis.

### What It Does

| Capability | Description |
|---|---|
| **Forecasting** | Predicts future supplier payment timing with confidence intervals — not just a number, but a range of outcomes |
| **Triage Detection** | Identifies when a business starts selectively delaying payments — the hallmark of cash flow pressure |
| **Early Warning** | Flags distress 4–8 weeks before loan defaults, overdraft breaches, or revenue decline |
| **Scenario Simulation** | Models "what-if" scenarios to project how different actions change the risk trajectory |
| **Decision Layer** | Generates actionable recommendations for both bank RMs and SME owners |
| **Explainability** | Every alert comes with plain-English explanations — no black boxes |

### Who It's For

- **Primary:** NatWest SME Credit Risk Teams — proactive intervention before defaults
- **Secondary:** SME Business Owners — visibility into their own financial health
- **Tertiary:** Relationship Managers — data-driven outreach aligned with Consumer Duty

---

## 🎯 The Reveal Moment

This is the demo narrative that defines PayPulse:

```
Traditional Banking View:     ██████████████ GREEN — All loan payments current ✓
                              Revenue stable ✓ Credit score healthy ✓

PayPulse AI View:             ██████████████ AMBER — Payment triage detected ⚠
                              3 suppliers delayed, spread increased 748%
                              Estimated 6-week window before default
```

**The same business. The same data. Two completely different conclusions.**

Traditional metrics say everything is fine. PayPulse sees the hidden bleed — and gives the bank a **6-week head start** to intervene.

---

## ✨ Features (Implemented)

### 🔍 Dual-View Dashboard
- **SME View** — "What's happening to my business?" with supplier-level payment analysis
- **Bank Risk View** — Portfolio-level monitoring across all SME clients with drill-down capability

### 📊 Predictive Payment Forecasting
- Forecasts expected payment timing for each supplier relationship
- Shows **range of outcomes** (confidence intervals), not just point predictions
- Compares against a **rolling baseline** to avoid overfitting
- Visualises trend trajectories with interactive sparkline charts

### ⚡ Early Warning Detection Engine
- **Payment Stretch Detection** — flags when timing exceeds upper bound for 2+ consecutive cycles
- **Payment Triage Detection** — identifies selective prioritisation (some suppliers on time, others systematically delayed)
- **Spread Divergence Tracking** — measures the gap between fastest-paid and slowest-paid suppliers
- **Acceleration Detection** — catches when delays are not just high but getting worse

### 🧪 What-If Scenario Simulator
- Five pre-built scenarios: Continue Trend, Accelerate Payments, Stabilise Now, Revenue Drop, Custom
- Per-supplier delay adjustment with real-time risk projection
- Baseline vs. scenario comparison with confidence bands
- Decision-focused explanations for each outcome

### 📈 Triage Score (0–100)
- Multi-factor composite score combining:
  - Delay variance across supplier portfolio (0–40 pts)
  - Spread deviation from historical baseline (0–35 pts)
  - Stretched-to-favoured supplier ratio (0–25 pts)
- Categories: **LOW** (0–29) · **MEDIUM** (30–69) · **HIGH** (70–100)

### 📋 Per-SME PDF Reports
- Individual risk reports for any SME in the portfolio
- Full portfolio overview report with risk distribution
- Executive summaries, supplier tables, timeline evolution, and recommended actions
- Print-optimised professional formatting

### 💬 Consumer Duty Outreach Assistant
- Auto-generates proactive support messages calibrated to risk severity
- Draft communications ready for RM outreach
- Aligned with NatWest's Consumer Duty obligations

### 🗺️ Risk Evolution Timeline
- Week-by-week visualisation of how risk phases evolved
- Colour-coded phases: Normal → Watch → Triage → Critical
- Historical context for every current risk signal

---

## 🏗️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React, JavaScript | Component-driven UI with reactive state management |
| **Visualisation** | Three.js, Chart.js | High-fidelity data visualisation and interactive charts |
| **Styling** | CSS3 | Premium dark-mode UI with glassmorphism, gradients, and micro-animations |
| **Backend** | Python (Flask) | AI forecasting engine, risk computation, and API layer |
| **Analysis Engine** | Custom JS + Python | Triage detection, risk scoring, scenario simulation, trend analysis |
| **Storage** | LocalStorage | Session persistence and user profile management |
| **Reports** | Dynamic HTML/PDF | Browser-native print-to-PDF report generation |

---

## 🚀 Installation & Setup

### Prerequisites
- Python 3.8+ 
- Node.js 16+ (optional, for development server)

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/PayPulse.git
cd PayPulse

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Start the application
python run.py

# 4. Open in browser
# Navigate to http://localhost:5000
```

### Alternative: Static Frontend Only

```bash
# Serve the frontend directly
cd frontend
python3 -m http.server 8080

# Open http://localhost:8080
```

### Environment Variables (Optional)

```bash
cp .env.example .env
# Edit .env with your configuration
```

---
### Getting Started

1. Open the Live Demo: https://paypulse-app-six.vercel.app/

2. Set up your business:
   - Enter your **Business Name**
   - Click **Continue**

3. Complete onboarding:
   - Select your **Industry**
   - Choose number of **Key Suppliers**
   - Click **Launch Dashboard**

4. You will now enter the PayPulse dashboard.

> 💡 Demo Mode: No real authentication required — this is a simulated onboarding flow.

> 💡 Tip for Judges: Go to the **Simulator tab** to explore how risk changes in real time.

---
## 📱 Usage Examples

### Scenario 1: Bank RM Reviews Portfolio

```
1. Login → Select "I'm a Bank RM"
2. Dashboard loads Portfolio Risk Overview
3. See all 6 SME clients ranked by risk level
4. Click on "Meridian Engineering Ltd" (HIGH risk)
5. Drill into supplier-level payment analysis
6. Generate PDF report for Credit Committee
```

### Scenario 2: Early Warning Detection

```
1. PayPulse detects BetaLogistics Ltd payment delay accelerating +2.8d/week
2. Triage Score reaches 72/100 → HIGH
3. System flags: "Payment spread 748% above baseline"
4. Auto-generates Consumer Duty outreach message
5. Bank intervenes 6 weeks before any loan payment is missed
```

### Scenario 3: What-If Analysis

```
1. Navigate to Simulator → Select "Revenue Drop (20%)"
2. See projected risk change: AMBER → RED
3. 3 suppliers breach critical thresholds
4. Switch to "Accelerate Payments" → risk drops back to AMBER
5. Decision: proactive support is cheaper than default recovery
```

---

## 🧠 Technical Depth: AI & Forecasting

### The Core Algorithm

PayPulse's detection system is built on a **novel signal**: the divergence pattern in outgoing supplier payments.

#### 1. Payment Timing Forecasting

```
For each supplier relationship:
  Expected_Delay(t+1) = Rolling_Baseline(3mo) + Trend_Component + Seasonal_Adjustment

Output: Point prediction + confidence interval [P10, P90]
Baseline comparison: Rolling 3-month average (prevents overfitting)
```

- **Predicts likely values** for future payment timing periods
- **Shows range of outcomes** (10th–90th percentile) to capture uncertainty
- **Compares to rolling baseline** to distinguish real drift from noise

#### 2. Triage Detection (The Key Innovation)

```python
def detect_triage(suppliers):
    """
    Payment triage = the business is selectively prioritising payments.
    Signal: ≥2 suppliers delayed >30d AND ≥1 supplier paid ≤10d
    This divergence is the earliest signal of cash flow pressure.
    """
    delayed = [s for s in suppliers if s.current_delay > 30]
    on_time = [s for s in suppliers if s.current_delay <= 10]
    return len(delayed) >= 2 and len(on_time) >= 1
```

This is **not** just "are payments late?" — it's detecting the **pattern** of selective prioritisation that precedes broader financial distress.

#### 3. Multi-Factor Triage Score

```
Triage Score = Variance_Component(0-40) + Spread_Component(0-35) + Ratio_Component(0-25) + Bank_Bonus(0-5)

Where:
  Variance = (σ_delays / μ_delays) × 60    → Higher variance = more selective payment
  Spread   = (spread_increase / 800) × 35   → Deviation from historical baseline
  Ratio    = (stretched / total) × 40        → Proportion of deprioritised suppliers
  Bonus    = 5 if triage detected with clear split
```

#### 4. Scenario Simulation Engine

The simulator models forward trajectories by applying adjustments to current trend slopes:

| Scenario | Methodology |
|---|---|
| Continue Trend | Extrapolate current `trend_slope` per supplier over 6 weeks |
| Accelerate Payments | Apply −30% correction to all delays |
| Stabilise Now | Freeze all delays at current levels |
| Revenue Drop | Apply +20% stress multiplier to delays with mean-reversion dampening |
| Custom | User-specified per-supplier delay adjustment |

Each scenario outputs: projected risk level, supplier-level impacts, confidence bands, and a decision-focused explanation.

#### 5. Explainability Layer

Every alert and risk signal includes plain-English explanations:

> *"This alert is based on your outgoing payment patterns over the past 12 weeks. Your average supplier delay is 35 days, with a peak of 62 days. The gap between your fastest-paid and slowest-paid suppliers (14d vs 62d) signals cash flow pressure. This pattern — paying some suppliers on time while stretching others — is a recognised early indicator of financial stress."*

No black boxes. No unexplained scores. Every output traces back to observable payment behaviour.

---

## 🏆 Why PayPulse Wins

### 1. Novel Signal
Supplier payment timing is a **leading indicator** that degrades before revenue does. No existing NatWest system monitors this.

### 2. Dramatic ROI
A single early intervention on a ₹5 crore SME loan saves more than the entire system costs. Across NatWest's SME portfolio, the impact is measured in **thousands of crores**.

### 3. 6-Week Early Warning
Traditional credit monitoring catches distress **after** the damage is done. PayPulse catches it **while there's still time to act**.

### 4. Consumer Duty Aligned
The FCA's Consumer Duty requires banks to proactively support customers showing signs of financial difficulty. PayPulse automates this obligation.

### 5. Data Already Exists
NatWest doesn't need to acquire new data. Every outgoing payment an SME makes is already in the bank's transaction records. PayPulse just **reads the signal** that's been there all along.

### 6. Production-Ready Architecture
This isn't a prototype — it's a fully functional dual-perspective dashboard with forecasting, simulation, report generation, and decision support.

---

## 📊 Alignment with Judging Criteria

| Requirement | PayPulse Implementation |
|---|---|
| **Predict likely future values** | ✅ Forecasts payment timing per supplier with trend extrapolation |
| **Show range of outcomes** | ✅ Confidence intervals on all predictions (not just point estimates) |
| **Compare to simple baseline** | ✅ Rolling 3-month average baseline; every prediction measured against it |
| **Detect early warning signs** | ✅ Core innovation — triage detection, stretch alerts, acceleration flags |
| **Explanations for non-experts** | ✅ Plain-English explainability on every alert, score, and recommendation |

---

## 👥 Team

**ByteHER - Vamika Bhardwaj, Anshika**  
**Indira Gandhi Delhi Technical University For Women**

---

<p align="center">
  <sub>Built with conviction that the best risk signal is the one hiding in plain sight.</sub>
</p>
