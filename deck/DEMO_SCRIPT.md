# PayPulse — Demo Script
**Team ByteHER · Code for Purpose 2026 (NatWest)**
Total runtime: **~5 min pitch + 2 min live demo**

> *Italics in brackets = stage direction.* Spoken lines are in regular text.

---

## SLIDE 01 — TITLE  *(00:00 – 00:20)*

*[Vamika at the mic. Anshika on laptop, ready to switch to live demo.]*

> "We're Team ByteHER. I'm Vamika, this is Anshika.
>
> **PayPulse is an AI-powered early-warning system for financial distress.** It detects stress *before* a business ever defaults — using behavioural and alternative signals, not lagging financial statements."

---

## SLIDE 02 — THE PROBLEM  *(00:20 – 00:55)*

> "Every year, **₹25,000 crore in SME loans default in India**. The warning signs were always there — just not where the bank was looking.
>
> Banks watch **incoming** signals: EMIs, overdraft, revenue. By the time those move, the SME has been bleeding for two months. The real signal is **outgoing** — how the SME pays its own suppliers.
>
> When cash gets tight, an SME doesn't miss its bank EMI. It quietly stretches one supplier, pays another on time, and starts triaging. **That pattern shows up four to eight weeks before any bank metric changes.** NatWest already has this data. It just doesn't read it."

---

## SLIDE 03 — OUR SOLUTION  *(00:55 – 01:30)*

> "So here's what we built. PayPulse takes something every business already does — **paying its suppliers** — and turns it into a **living credit signal.**
>
> Every invoice paid — early, on time, late, or missed — is a behavioural data point. Most banks throw this away. We capture it. **Weekly. Per supplier. Per business.**
>
> And we do three things with it. **Detect. Explain. Act.**"

---

## SLIDE 04 — KEY FEATURES  *(01:30 – 01:55)*
*Eyebrow: "Six capabilities, one dashboard."*

> "**Detect.** Our **Behavioural Radar** tracks weekly payment delays and turns them into a stress trajectory for every business on the bank's book. It catches drift, shocks, and seasonality — before any P&L line moves.
>
> **Explain.** Our **Contagion Simulator.** Because one business failing isn't one business failing. Their suppliers feel it. Their suppliers' suppliers feel it. We visualise that shockwave so the bank can see exactly which firms are downstream of the next default.
>
> **Act.** A **Groq-powered LLM** drafts two messages from the same data — one for the relationship manager, one for the SME owner. One click sends. The dashboard reflects instantly."

---

## SLIDE 05 — HOW IT WORKS  *(01:55 – 02:15)*

> "Pipeline is four steps. We ingest the SME's payment ledger. We compute **23 engineered features** per supplier per week — rolling stats, trend slope, acceleration, cross-supplier spread. We feed those into the AI engine. And we output a **dual-perspective dashboard** — one for the bank, one for the SME."

---

## SLIDE 06 — THE AI ENGINE  *(02:15 – 02:55)*
*Eyebrow: "Three models. One signal. Explained at every step."*

> "Three production ML models — not heuristics.
>
> **Gradient Boosting** forecasts next-week delays with 95% uncertainty bands. MAE: **0.5 days.**
>
> **Random Forest** classifies supplier risk — normal, watch, warning, critical — with calibrated probabilities.
>
> **Isolation Forest** flags anomalous weeks unsupervised.
>
> Every prediction comes with **permutation SHAP** attribution. The SME and the RM see the same drivers. **No black box.** Validated honestly with **AUC, KS, Brier, and Precision-at-k** on a 50-firm portfolio with hazard-sampled defaults."

---

## SLIDE 07 — LIVE DEMO  *(02:55 – 04:55)*
*[Anshika takes over. Browser to localhost.]*

### Beat 1 — Bank view *(15s)*
> "Bank Risk view. Six SME clients ranked by PayPulse score. **DeltaParts and GammaSupplies — both flagged RED.** Their loan repayments? Still current. Revenue? Stable. Every traditional metric says healthy."

*[Click DeltaParts.]*

### Beat 2 — The reveal *(25s)*
> "But PayPulse is reading the supplier ledger. Two suppliers stretched past 30 days. Triage score above 70. Spread widened 700%+ in six weeks. The forecast extends the trend another six weeks before a single bank metric would catch this.
>
> **Same business. Same data. Two completely different conclusions.**"

### Beat 3 — Simulator *(20s)*
*[Click Simulator → Revenue Drop 20%.]*

> "The RM can run this *with* the customer. Apply 20% revenue stress — three suppliers cross critical. Switch to *Accelerate Payments* — risk drops back. The conversation becomes **what action, by when** — not *should we provision*."

### Beat 4 — SME view *(20s)*
*[Toggle SME view, top right.]*

> "Same data, SME side. Pulse score and a coaching panel — *'Materials Supplier 2 has been late three weeks. Pay them Wednesday — it stabilises your delay band before the bank's Friday review.'*
>
> The SME isn't being judged. They're being **coached** — by the same model that gave the RM the alert."

### Beat 5 — Contagion + Act *(40s)*
*[Click contagion graph. Run Simulation.]*

> "And here's where Detect meets Explain meets Act. If DeltaParts defaults, this is the **downstream blast radius** — concentric rings around the epicentre. Five SMEs in NatWest's own book hit within four weeks.
>
> *[Click 'Generate Outreach'.]*
>
> One click — Groq drafts two messages. RM gets a next-best-action brief. The SME gets a plain-English nudge. **Human in the loop sends.** Dashboard updates live.
>
> One early intervention upstream — five recoveries avoided downstream."

---

## SLIDE 08 — BUILT RESPONSIBLY  *(04:55 – 05:15)*
*[Vamika back on mic.]*

> "**No PII leaves the bank's perimeter** — Groq sees only aggregated behavioural features. **Fairness audit** runs monthly across firm-size bands. **No auto-send** — every message passes a human before it leaves the system."

---

## SLIDE 09 — IMPACT & SCALE  *(05:15 – 05:35)*

> "Deployed at a mid-size bank: **12 to 18 percent reduction in surprise SME defaults** — from RBI 2024 SME loss data, translated through 90-day advance warning into restructuring-vs-default outcomes.
>
> Per ₹100 crore SME book: **~340 jobs preserved**. RM portfolio-sweep hours cut 60%. Provisioning lag from 8 weeks to 2."

---

## SLIDE 10 — WHAT'S NEXT + THANK YOU  *(05:35 – 05:50)*

> "Real-data pilot. Account Aggregator integration for zero-touch onboarding. Mobile-first SME app in Hindi and regional languages. Federated risk training across banks — better signal, no data movement.
>
> **NatWest already has the signal. PayPulse is how the bank starts reading it.**
>
> Thank you."

---

## Q&A — anticipated questions

| Question | Answer |
|---|---|
| *"Why won't this just chase noise?"* | Three independent signals must align — stretch, triage, and spread divergence. We validate with AUC and KS, not training accuracy. |
| *"How do you avoid target leakage?"* | Forward-looking labels — features at week *t* see only weeks ≤ *t*; the label is whether the firm enters distress in weeks > *t*. Walk-forward CV with disjoint firm IDs. See `src/models/bank_grade.py`. |
| *"How does the SME consent?"* | The bank already holds the payment data lawfully — it's their own ledger. The coaching layer is opt-in via the SME app. No new collection. |
| *"What if SMEs game the model by paying everyone evenly?"* | Then their actual risk *has* dropped. The behaviour is the cure. |
| *"Where's the regulator-grade audit?"* | `src/api/audit.py` — append-only JSONL, one line per inference. Request UUID, model ID, feature SHA1, output, reason codes. GDPR Article 22 ready. |
| *"What's the false-positive cost?"* | A false positive = an RM courtesy call. A false negative = a defaulted loan. The asymmetry is the entire business case. |

---

## Run-of-show *(15 min before pitch)*

- [ ] `python run.py` running on port 8000 — ML models pre-warmed (`/api/ai/status`)
- [ ] Browser tab 1: localhost:8000 — Bank Risk view, DeltaParts pre-selected
- [ ] Browser tab 2: deck PDF, full-screen, slide 1
- [ ] Laptop on mains, Wi-Fi confirmed
- [ ] Phone silent. Mic checked.
- [ ] Backup: `deck/slide-01.jpg` … `slide-10.jpg`
