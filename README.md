<p align="center">
  <img src="https://img.shields.io/badge/PayPulse-NatWest_AI_Early_Warning-6246ea?style=for-the-badge&labelColor=0a0e1a" alt="PayPulse" />
</p>

<h1 align="center">PayPulse</h1>
<h3 align="center">AI-Powered Early Warning System for SME Financial Stress</h3>

<p align="center">
  <strong>Detects SME distress 4–8 weeks before traditional banking metrics ever change.</strong>
</p>

<p align="center">
  🚀 <a href="https://paypulse-rb6h.onrender.com"><strong>Live Demo</strong></a> &nbsp;·&nbsp;
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Hackathon-NatWest_Code_for_Purpose_India-purple?style=flat-square" />
  <img src="https://img.shields.io/badge/Theme-AI_Predictive_Forecasting-blue?style=flat-square" />
  <img src="https://img.shields.io/badge/Status-Production_Demo-brightgreen?style=flat-square" />
  <img src="https://img.shields.io/badge/ML-Scikit--Learn_Pipeline-orange?style=flat-square" />
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
| **ML Forecasting** | Gradient Boosting model predicts future supplier payment delays with 95% confidence intervals |
| **AI Risk Classification** | Random Forest classifier categorises suppliers into risk tiers with probability scores |
| **Anomaly Detection** | Isolation Forest detects unusual payment patterns via unsupervised learning |
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

## 🤖 AI / Machine Learning Models

PayPulse uses **six real AI/ML models** trained on supplier payment data — including a neural network built from scratch in NumPy (no PyTorch/TensorFlow dependency).

### Model Architecture

| # | Model | Algorithm | Task | Key Metric |
|---|---|---|---|---|
| 1 | **Forecaster** | `GradientBoostingRegressor` (200 trees, depth=4) | Predict next-week payment delays | MAE: **0.5 days** |
| 2 | **Risk Classifier** | `RandomForestClassifier` (150 trees, depth=6) | Classify supplier risk level | Accuracy: **99.6%** |
| 3 | **Anomaly Detector** | `IsolationForest` (200 estimators) | Flag unusual payment patterns | Unsupervised |
| 4 | **Supplier Clusterer** | `KMeans` (auto-tuned k, silhouette-optimised) | Segment suppliers by behaviour | Silhouette: **0.34** |
| 5 | **Neural Forecaster** | `GRU Neural Network` (hidden=32, from-scratch NumPy) | Deep learning delay forecasting | MAE: **1.22 days** |
| 6 | **Explainability** | `Permutation SHAP` (custom implementation) | Per-prediction feature attribution | Top-5 drivers |

### Feature Engineering Pipeline

All three models are powered by **23 engineered features** extracted from raw payment history:

```
Rolling Statistics (4w & 8w windows)
├── delay_mean, delay_std, delay_min, delay_max, delay_range

Trend & Momentum
├── trend_slope_6w        — Linear regression slope over last 6 weeks
├── wow_change            — Week-over-week delay change
├── acceleration          — Change in slope (2nd derivative)

Contractual Context
├── delay_to_terms_ratio  — Current delay ÷ contractual terms
├── excess_over_terms     — Days beyond contractual deadline

Invoice Signals
├── invoice_mean_4w       — Rolling invoice amount average
├── invoice_volatility    — Invoice amount standard deviation

Time Features
├── quarter, week_in_quarter, is_quarter_end

Cross-Supplier Signals (Triage Detection)
├── cross_supplier_std    — Delay standard deviation across all suppliers
├── cross_supplier_spread — Max delay − min delay across suppliers
```

### How Each Model Works

**1. Gradient Boosting Forecaster**
- Trains on all supplier data with next-week delay as the target
- Generates multi-step forecasts via iterative one-step-ahead prediction
- Each prediction is fed back as input for the next step
- Uncertainty bands computed from residual standard deviation (±1.96σ)

**2. Random Forest Risk Classifier**
- Labels derived from contractual terms: `normal → watch → warning → critical`
- Uses `class_weight="balanced"` to handle class imbalance
- Returns probability distribution across all four risk categories
- Confidence score = probability of the predicted class

**3. Isolation Forest Anomaly Detector**
- Learns the "normal" distribution of payment patterns unsupervised
- Contamination rate set to 10% (expects ~10% anomalous data points)
- Anomaly scores normalised to 0–100 scale (0 = most anomalous)
- Flags anomalous weeks with red indicators on the timeline

### API Endpoints

```
GET  /api/ai/status            — Model training metrics and feature importances (6 models)
GET  /api/ai/forecast/{id}     — ML forecast with confidence bands (Gradient Boosting)
GET  /api/ai/risk/{id}         — Risk classification with probabilities (Random Forest)
GET  /api/ai/anomalies/{id}    — Anomaly detection with score timeline (Isolation Forest)
GET  /api/ai/neural/{id}       — GRU neural network forecast (deep learning)
GET  /api/ai/explain/{id}      — Permutation SHAP feature explanations
GET  /api/ai/clusters          — K-Means supplier behaviour segmentation
GET  /api/ai/compare/{id}      — Head-to-head model comparison (MAE benchmarking)
GET  /api/ai/simulate          — Real-time data simulation (trend extrapolation)
GET  /api/ai/analysis/{id}     — Full AI analysis (all 6 models combined)
GET  /api/ai/dashboard         — Portfolio AI overview for all suppliers
```

### Example API Response: `/api/ai/analysis/S2`

```json
{
  "supplier_name": "BetaLogistics Ltd",
  "ai_risk": { "predicted_risk": "critical", "confidence": 99.0, "method": "random_forest_classifier" },
  "ai_forecast": { "expected": [55.0, 56.2, 54.7, ...], "method": "gradient_boosting", "model_mae": 0.5 },
  "ai_neural_forecast": { "expected": [42.5, 38.2, 35.9, ...], "method": "gru_neural_network" },
  "ai_anomalies": { "is_anomalous": true, "total_anomalies_detected": 7, "method": "isolation_forest" },
  "ai_shap": { "top_drivers": ["delay_mean_4w", "delay_max_4w", "delay_mean_8w"], "method": "permutation_shap" },
  "ai_cluster": { "cluster_label": "Critical Deterioration", "recommended_action": "Escalate to Credit Committee." },
  "ai_model_comparison": { "best_model": "GRU Neural Net", "improvement_over_baseline": 15.2 },
  "model_info": { "total_models": 6 }
}
```

---

## ✨ Features (Implemented)

### 🔍 Dual-View Dashboard
- **SME View** — "What's happening to my business?" with supplier-level payment analysis
- **Bank Risk View** — Portfolio-level monitoring across all SME clients with drill-down capability

### 🤖 AI Intelligence Dashboard
- **Model Status Cards** — Live training metrics for Forecaster (MAE), Classifier (accuracy), and Anomaly Detector
- **Supplier AI Analysis** — Select any supplier and run full ML analysis with one click
- **Risk Classification Visualisation** — Risk badge with confidence %, probability distribution bar chart
- **ML Forecast Chart** — Interactive Chart.js line chart with 95% confidence interval bands
- **Anomaly Score Timeline** — 52-week chart with red-flagged anomalous weeks
- **Feature Importance Bars** — Visual ranking of which features drive predictions

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
| **Frontend** | JavaScript, HTML5, CSS3 | Component-driven UI with reactive state management |
| **Visualisation** | Chart.js | High-fidelity data visualisation and interactive charts |
| **Styling** | CSS3 | Premium dark-mode UI with glassmorphism, gradients, and micro-animations |
| **Backend** | Python, FastAPI, Uvicorn | AI forecasting engine, risk computation, and API layer |
| **ML Pipeline** | scikit-learn | GradientBoosting, RandomForest, IsolationForest model training and inference |
| **Statistical Models** | statsmodels, scipy | Holt-Winters exponential smoothing, linear regression trend analysis |
| **Data Processing** | pandas, NumPy | Feature engineering, data transformation, rolling statistics |
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
# Serve the frontend directly (AI features use fallback demo data)
cd public
python3 -m http.server 8080
# Open http://localhost:8080
```

### AI Models — Full Backend

```bash
# Start with FastAPI for live ML predictions
pip install -r requirements.txt
uvicorn src.api.server:app --reload --port 5000

# AI models auto-train on first request
# Test: curl http://localhost:5000/api/ai/status
```

---

### Getting Started

1. Open the Live Demo: https://paypulse-rb6h.onrender.com or https://vamikab16.github.io/paypulse/public/index.html
2. Set up your business:
   - Enter your **Business Name**
   - Click **Continue**
3. Complete onboarding:
   - Select your **Industry**
   - Choose number of **Key Suppliers**
   - Click **Launch Dashboard**
4. You will now enter the PayPulse dashboard.

> 💡 Tip for Judges: Check the **AI Models tab** to see real ML predictions in action, then go to the **Simulator tab** to explore how risk changes in real time.

---

## 🔐 Demo Login

To explore the platform quickly:
- **Email:** `admin@nat`
- **Password:** `123456`

Or you can **create a new account** via the onboarding flow.

> 💡 Note: Authentication is simulated for demo purposes — no real backend auth required.

---

## 🖥️ Dashboard Experience

For demonstration simplicity:
- Both **SME View** and **Bank Risk View** are available **on a single page**
- The **AI Models tab** provides a dedicated ML intelligence dashboard
- This enables instant switching and comparison between perspectives
- Designed to help judges/users quickly grasp the **dual insight model of PayPulse**

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

### Scenario 2: AI-Powered Early Warning
```
1. Navigate to AI Models tab
2. Select "BetaLogistics Ltd" → Run AI Analysis
3. Risk Classifier: CRITICAL (99.0% confidence)
4. Gradient Boosting forecasts delays at 55–57 days over 6 weeks
5. Isolation Forest flags 7 anomalous weeks in payment history
6. AI Summary: "Immediate attention required"
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

#### 1. ML Payment Forecasting (Gradient Boosting)

```
Input:  23 engineered features per supplier per week
Model:  GradientBoostingRegressor(n_estimators=200, max_depth=4, lr=0.05)
Output: Multi-step forecast with uncertainty bands

Feature Engineering:
  rolling_stats(4w, 8w) + trend_slope + acceleration + terms_ratio
  + invoice_signals + time_features + cross_supplier_spread

Prediction Loop:
  For each step in horizon:
    prediction[t+1] = model.predict(features[t])
    features[t+1]   = update_rolling_features(prediction[t+1])
    uncertainty[t+1] = ±1.96σ × (1 + 0.15 × step)
```

- **Training MAE: 0.5 days** — significantly outperforms the rolling-average baseline
- Iterative one-step-ahead prediction feeds forecasts back as inputs
- Uncertainty widens naturally for further-out predictions

#### 2. Risk Classification (Random Forest)

```
Input:   Same 23 features
Labels:  Derived from delay vs contractual terms
         normal (≤0 excess) → watch (≤7d) → warning (≤15d) → critical (>15d)
Model:   RandomForestClassifier(n_estimators=150, max_depth=6, balanced)
Output:  Risk class + probability distribution + confidence %

Training Accuracy: 99.6%
```

#### 3. Anomaly Detection (Isolation Forest)

```
Input:   10 selected features (delay stats + trend + cross-supplier signals)
Model:   IsolationForest(n_estimators=200, contamination=0.1)
Output:  Anomaly score (0-100), binary flag, anomalous week timeline

Key Insight: Unsupervised — no labels needed. Learns "normal" patterns
and flags deviations automatically.
```

#### 4. Triage Detection (The Key Innovation)

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

#### 5. Multi-Factor Triage Score

```
Triage Score = Variance_Component(0-40) + Spread_Component(0-35) + Ratio_Component(0-25) + Bank_Bonus(0-5)

Where:
  Variance = (σ_delays / μ_delays) × 60    → Higher variance = more selective payment
  Spread   = (spread_increase / 800) × 35   → Deviation from historical baseline
  Ratio    = (stretched / total) × 40        → Proportion of deprioritised suppliers
  Bonus    = 5 if triage detected with clear split
```

#### 6. Scenario Simulation Engine

The simulator models forward trajectories by applying adjustments to current trend slopes:

| Scenario | Methodology |
|---|---|
| Continue Trend | Extrapolate current `trend_slope` per supplier over 6 weeks |
| Accelerate Payments | Apply −30% correction to all delays |
| Stabilise Now | Freeze all delays at current levels |
| Revenue Drop | Apply +20% stress multiplier to delays with mean-reversion dampening |
| Custom | User-specified per-supplier delay adjustment |

Each scenario outputs: projected risk level, supplier-level impacts, confidence bands, and a decision-focused explanation.

#### 7. Explainability Layer

Every alert and risk signal includes plain-English explanations:

> *"AI Risk Assessment: BetaLogistics Ltd is classified as CRITICAL risk with 99.0% confidence. Immediate attention required. Forecast: Payment delays predicted to remain at 55–57 days over the next 6 weeks. Anomaly Alert: Current payment pattern flagged as anomalous — 7 anomalous weeks detected in history."*

No black boxes. No unexplained scores. Every output traces back to observable payment behaviour and ML model outputs.

---

## 📂 Project Structure

```
PayPulse/
├── public/                    # Frontend
│   ├── index.html             # Main app (landing, dashboard, AI, simulator, explainer)
│   ├── app.js                 # All frontend logic including AI page rendering
│   └── styles.css             # Full styling including AI Intelligence page
├── src/
│   ├── api/
│   │   └── server.py          # FastAPI backend — all endpoints including /api/ai/*
│   ├── models/
│   │   ├── ml_engine.py       # 🤖 ML Engine — GradientBoosting + RandomForest + IsolationForest
│   │   ├── forecaster.py      # Holt-Winters exponential smoothing (statistical baseline)
│   │   ├── baseline.py        # Rolling average baseline for comparison
│   │   └── scenarios.py       # What-if scenario simulation engine
│   ├── detection/
│   │   ├── anomaly.py         # Threshold breach + trend detection (rule-based)
│   │   └── triage.py          # Payment triage detection algorithm
│   ├── explainability/
│   │   └── narrator.py        # Plain-English explanation generator
│   ├── data/
│   │   ├── generator.py       # Synthetic data generator (5 suppliers × 52 weeks)
│   │   └── schemas.py         # Data schemas, constants, validation
│   └── utils/
│       └── helpers.py         # JSON sanitisation and utility functions
├── data/
│   ├── payment_history.csv    # Generated payment data (260 rows)
│   └── company_profile.json   # Company metadata
├── requirements.txt           # Python dependencies (FastAPI, scikit-learn, statsmodels, etc.)
├── run.py                     # Application entry point
└── README.md                  # This file
```

---

## 🏆 Why PayPulse Wins

### 1. Real AI — Not Just Statistics
Three production ML models (Gradient Boosting, Random Forest, Isolation Forest) with **23 engineered features**, not just rolling averages or simple thresholds.

### 2. Novel Signal
Supplier payment timing is a **leading indicator** that degrades before revenue does. No existing NatWest system monitors this.

### 3. Dramatic ROI
A single early intervention on a ₹5 crore SME loan saves more than the entire system costs. Across NatWest's SME portfolio, the impact is measured in **thousands of crores**.

### 4. 6-Week Early Warning
Traditional credit monitoring catches distress **after** the damage is done. PayPulse catches it **while there's still time to act**.

### 5. Consumer Duty Aligned
The FCA's Consumer Duty requires banks to proactively support customers showing signs of financial difficulty. PayPulse automates this obligation.

### 6. Data Already Exists
NatWest doesn't need to acquire new data. Every outgoing payment an SME makes is already in the bank's transaction records. PayPulse just **reads the signal** that's been there all along.

### 7. Production-Ready Architecture
This isn't a prototype — it's a fully functional dual-perspective dashboard with ML forecasting, risk classification, anomaly detection, simulation, report generation, and decision support.

---

## 📊 Alignment with Judging Criteria

| Requirement | PayPulse Implementation |
|---|---|
| **Predict likely future values** | ✅ GradientBoosting forecasts payment delays per supplier with iterative multi-step prediction |
| **Show range of outcomes** | ✅ 95% confidence intervals on all ML forecasts (not just point estimates) |
| **Compare to simple baseline** | ✅ Rolling average baseline; every ML prediction measured against it with MAE comparison |
| **Detect early warning signs** | ✅ IsolationForest anomaly detection + triage detection + RandomForest risk classification |
| **Explanations for non-experts** | ✅ Natural-language AI summaries combining all three model signals into plain English |
| **Real ML models** | ✅ scikit-learn pipeline: GradientBoosting + RandomForest + IsolationForest with 23 features |

---

## 👥 Team

**ByteHER - Vamika Bhardwaj, Anshika**  
**Indira Gandhi Delhi Technical University For Women**

---

<p align="center">
  <sub>Built with conviction that the best risk signal is the one hiding in plain sight.</sub>
</p>
