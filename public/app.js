/**
 * PayPulse — NatWest SME Risk Intelligence Platform
 * Auth + Onboarding + Dashboard (SME + Bank Risk) + Simulator + Profile
 */

const API_BASE = '';

// ── Global State ──
let companyData = null;
let suppliersData = null;
let triageData = null;
let bankRiskData = null;
let trendChart = null;
let bankTrendChart = null;
let scenarioChart = null;
let currentViewMode = 'sme'; // 'sme' or 'bank'

// ── Fallback demo data ──
const FALLBACK = {
    company: {
        profile: {
            company_name: 'Meridian Engineering Ltd',
            traditional_risk_status: 'GREEN \u2014 all loan payments current',
            paypulse_risk_status: 'AMBER \u2014 supplier payment triage detected',
        },
        risk_level: 'AMBER',
        executive_summary: 'PayPulse has detected early signs of financial stress through supplier payment pattern analysis.',
    },
    suppliers: {
        suppliers: [
            { supplier_id: 'S1', supplier_name: 'AlphaSteel Corp', current_delay: 15, contractual_terms: 21, severity: 'normal', trend: 'stable', sparkline: [14,13,15,14,16,15,14,15,14,15,15,15] },
            { supplier_id: 'S2', supplier_name: 'BetaLogistics Ltd', current_delay: 58, contractual_terms: 30, severity: 'critical', trend: 'accelerating', sparkline: [28,30,33,36,39,42,45,48,51,54,56,58], trend_slope: 2.8 },
            { supplier_id: 'S3', supplier_name: 'GammaSupplies Co', current_delay: 40, contractual_terms: 21, severity: 'critical', trend: 'drifting', sparkline: [20,21,22,22,24,26,28,30,33,35,38,40], trend_slope: 1.2 },
            { supplier_id: 'S4', supplier_name: 'DeltaParts Inc', current_delay: 45, contractual_terms: 30, severity: 'warning', trend: 'drifting', sparkline: [30,31,32,33,34,36,37,39,41,42,44,45], trend_slope: 0.9 },
            { supplier_id: 'S5', supplier_name: 'EpsilonServices', current_delay: 14, contractual_terms: 14, severity: 'normal', trend: 'stable', sparkline: [12,13,13,14,13,14,14,13,14,14,13,14], trend_slope: 0.1 },
        ],
    },
    triage: {
        triage_detected: true,
        triage_severity: 'active',
        stretched_suppliers: [
            { supplier_id: 'S2', supplier_name: 'BetaLogistics Ltd', current_delay: 58 },
            { supplier_id: 'S3', supplier_name: 'GammaSupplies Co', current_delay: 40 },
            { supplier_id: 'S4', supplier_name: 'DeltaParts Inc', current_delay: 45 },
        ],
        favored_suppliers: [
            { supplier_id: 'S1', supplier_name: 'AlphaSteel Corp', current_delay: 15 },
        ],
        baseline_spread: 5.2,
        current_spread: 44.1,
        spread_increase_pct: 748,
        explanation: 'Payment triage detected: some suppliers are being paid on time while others are significantly delayed.',
    },
    scenario: {
        scenario_type: 'continue_trend',
        scenario_name: 'Current Trend Continues',
        forecast_weeks: [53,54,55,56,57,58],
        baseline_forecast: { S2: [60,63,66,69,72,76] },
        scenario_forecast: { S2: [60,63,66,69,72,76] },
        comparison_summary: 'Without intervention, 3 of 5 suppliers would see worsening delays over 6 weeks. 3 supplier(s) would exceed critical thresholds.',
        risk_delta: 'Overall risk INCREASES. Risk level: AMBER \u2192 RED',
        supplier_impacts: [
            { supplier_id: 'S1', supplier_name: 'AlphaSteel Corp', baseline_end: 15, scenario_end: 15.6, delta: 0.6, impact: 'similar' },
            { supplier_id: 'S2', supplier_name: 'BetaLogistics Ltd', baseline_end: 66, scenario_end: 76, delta: 10, impact: 'worse' },
            { supplier_id: 'S3', supplier_name: 'GammaSupplies Co', baseline_end: 42, scenario_end: 47.2, delta: 5.2, impact: 'worse' },
            { supplier_id: 'S4', supplier_name: 'DeltaParts Inc', baseline_end: 50, scenario_end: 55.4, delta: 5.4, impact: 'worse' },
            { supplier_id: 'S5', supplier_name: 'EpsilonServices', baseline_end: 14, scenario_end: 14.6, delta: 0.6, impact: 'similar' },
        ],
        intervention_impact: { text: 'No action: risk escalates to critical levels. Immediate intervention required.', type: 'negative', direction: 'deteriorating' },
    },
    bankRisk: {
        default_risk_level: 'HIGH',
        intervention_window_weeks: 0,
        intervention_window_text: 'Immediate — already critical',
        accounts_at_risk: 3,
        total_accounts: 5,
        priority_accounts: [
            {
                supplier_id: 'S2', supplier_name: 'BetaLogistics Ltd', severity: 'critical',
                current_delay: 58, contractual_terms: 21, excess_days: 37, trend: 'accelerating', slope_per_week: 2.8,
                recommended_action: 'Escalate to Credit Committee. Restructure payment terms immediately. Schedule urgent RM outreach.',
                risk_signals: ['Payment delay 37 days beyond contractual terms', 'Delays accelerating at +2.8 days/week', 'Identified as deprioritised in payment triage pattern'],
            },
            {
                supplier_id: 'S3', supplier_name: 'GammaSupplies Co', severity: 'critical',
                current_delay: 40, contractual_terms: 14, excess_days: 26, trend: 'drifting', slope_per_week: 1.2,
                recommended_action: 'Schedule RM outreach within 48 hours. Review credit line and overdraft utilisation.',
                risk_signals: ['Payment delay 26 days beyond contractual terms', 'Gradual upward drift of +1.2 days/week'],
            },
            {
                supplier_id: 'S4', supplier_name: 'DeltaParts Inc', severity: 'warning',
                current_delay: 45, contractual_terms: 21, excess_days: 24, trend: 'drifting', slope_per_week: 0.9,
                recommended_action: 'Contact client for proactive support. Offer NatWest cash flow advisory services.',
                risk_signals: ['Payment delay 24 days beyond contractual terms', 'Gradual upward drift of +0.9 days/week'],
            },
            {
                supplier_id: 'S1', supplier_name: 'AlphaSteel Corp', severity: 'normal',
                current_delay: 15, contractual_terms: 15, excess_days: 0, trend: 'stable', slope_per_week: 0.1,
                recommended_action: 'No action required. Continue standard monitoring.',
                risk_signals: [],
            },
            {
                supplier_id: 'S5', supplier_name: 'EpsilonServices', severity: 'normal',
                current_delay: 14, contractual_terms: 7, excess_days: 7, trend: 'stable', slope_per_week: 0.1,
                recommended_action: 'No action required. Continue standard monitoring.',
                risk_signals: [],
            },
        ],
        early_warning_signals: [
            { type: 'Risk Signal', label: 'Payment Triage Detected', detail: 'Selective supplier prioritisation identified. Payment spread increased 748% vs baseline.', severity: 'active' },
            { type: 'Risk Signal', label: 'Accelerating Payment Delays', detail: 'BetaLogistics Ltd showing accelerating delay trajectory.', severity: 'warning' },
            { type: 'Bank Insight', label: '2 Accounts in Critical Delay', detail: 'BetaLogistics Ltd and GammaSupplies Co exceeding contractual terms by 15+ days.', severity: 'critical' },
            { type: 'Intervention Window', label: 'Action Required Within Immediate — already critical', detail: 'Based on current trajectory, proactive engagement recommended before further deterioration.', severity: 'critical' },
        ],
        bank_narrative: 'PayPulse risk assessment for this SME lending relationship: HIGH. Early warning signal detected: the borrower is selectively delaying payments to 3 of their key suppliers while maintaining timely payments to others. This payment triage pattern is a recognised precursor to broader financial distress. 2 supplier relationships are now in critical delay territory, indicating significant cash flow pressure. The borrower has already breached multiple critical thresholds. Immediate RM outreach and credit review recommended. This intelligence is derived from supplier payment behaviour analysis — a signal invisible to traditional credit monitoring systems.',
        triage_severity: 'active',
    },
};

// ══════════════════════════════════════
//  ANALYSIS ENGINE — Pure functions, no hardcoded outputs
// ══════════════════════════════════════

const AnalysisEngine = {
    /**
     * Calculate risk level from an array of delay values.
     * @param {number[]} delays
     * @returns {'RED'|'AMBER'|'GREEN'}
     */
    calculateRisk(delays) {
        if (!delays || delays.length === 0) return 'GREEN';
        const avg = delays.reduce((a, b) => a + b, 0) / delays.length;
        if (avg > 40) return 'RED';
        if (avg > 20) return 'AMBER';
        return 'GREEN';
    },

    /**
     * Detect payment triage behaviour from suppliers.
     * Returns true if >= 2 suppliers have delay > 30 AND >= 1 has delay <= 10.
     * @param {Array} suppliers — [{current_delay, ...}]
     * @returns {boolean}
     */
    detectTriage(suppliers) {
        if (!suppliers || suppliers.length === 0) return false;
        const delayed = suppliers.filter(s => s.current_delay > 30).length;
        const onTime = suppliers.filter(s => s.current_delay <= 10).length;
        return delayed >= 2 && onTime >= 1;
    },

    /**
     * Normalize average delay to a 0-100 triage score.
     * @param {number[]} delays
     * @returns {number}
     */
    calculateTriageScore(delays) {
        if (!delays || delays.length === 0) return 0;
        const avg = delays.reduce((a, b) => a + b, 0) / delays.length;
        return Math.min(100, Math.round(avg * 2));
    },

    /**
     * Dynamically generate insight text from raw data. Never hardcoded.
     * Uses randomised phrasing for variety across SMEs.
     * @param {object} data — { suppliers: {suppliers: [...]}, name: string }
     * @returns {string}
     */
    generateInsight(data) {
        const suppliers = (data.suppliers && data.suppliers.suppliers) || [];
        if (suppliers.length === 0) return 'Insufficient data to generate insight.';

        const delays = suppliers.map(s => s.current_delay);
        const avg = delays.reduce((a, b) => a + b, 0) / delays.length;
        const maxDelay = Math.max(...delays);
        const minDelay = Math.min(...delays);
        const triageDetected = this.detectTriage(suppliers);
        const risk = this.calculateRisk(delays);
        const delayedCount = suppliers.filter(s => s.current_delay > 30).length;
        const onTimeCount = suppliers.filter(s => s.current_delay <= 10).length;

        // Build insight from computed values — varied phrasing
        const phrases = {
            avgOpeners: [
                `Average supplier delay is ${Math.round(avg)} days`,
                `Supplier payments are averaging ${Math.round(avg)} days`,
                `Mean payment delay across ${suppliers.length} suppliers stands at ${Math.round(avg)} days`,
            ],
            peakPhrases: [
                `, with a peak of ${maxDelay} days.`,
                `, reaching up to ${maxDelay} days for the most delayed supplier.`,
                ` and the longest delay extends to ${maxDelay} days.`,
            ],
            triagePhrases: [
                ` Uneven payment behavior suggests early-stage financial stress.`,
                ` Selective prioritisation of ${onTimeCount} supplier${onTimeCount !== 1 ? 's' : ''} over ${delayedCount} delayed one${delayedCount !== 1 ? 's' : ''} indicates payment triage.`,
                ` The gap between fastest-paid and slowest-paid suppliers (${minDelay}d vs ${maxDelay}d) signals cash flow pressure.`,
            ],
            stablePhrases: [
                ` Payment patterns are consistent across all suppliers — no triage signal detected.`,
                ` All suppliers are being paid within a narrow range — no selective behaviour observed.`,
                ` No significant divergence in payment timing across the supplier portfolio.`,
            ],
            redWarnings: [
                ` Multiple suppliers are significantly beyond contractual terms — immediate attention warranted.`,
                ` ${delayedCount} supplier${delayedCount !== 1 ? 's exceed' : ' exceeds'} 30-day thresholds, indicating severe cash flow strain.`,
                ` This level of delay concentration typically precedes broader financial distress.`,
            ],
            amberWarnings: [
                ` Emerging drift in payment timing warrants close monitoring.`,
                ` Early warning signs present — supplier relationships may be under growing pressure.`,
                ` Payment spread is widening, suggesting the business is beginning to prioritise selectively.`,
            ],
        };

        // Pick pseudo-random variant using data characteristics as seed
        const seed = Math.round(avg * 100 + maxDelay * 10 + suppliers.length);
        const pick = (arr) => arr[seed % arr.length];

        let insight = pick(phrases.avgOpeners) + pick(phrases.peakPhrases);

        if (triageDetected) {
            insight += pick(phrases.triagePhrases);
        } else if (risk === 'GREEN') {
            insight += pick(phrases.stablePhrases);
        }

        if (risk === 'RED') {
            insight += pick(phrases.redWarnings);
        } else if (risk === 'AMBER') {
            insight += pick(phrases.amberWarnings);
        }

        return insight;
    },

    /**
     * Derive trend direction from supplier sparkline data.
     * @param {Array} suppliers
     * @returns {'increasing'|'stable'|'decreasing'}
     */
    deriveTrend(suppliers) {
        if (!suppliers || suppliers.length === 0) return 'stable';
        let totalSlope = 0;
        let count = 0;
        for (const s of suppliers) {
            if (s.trend_slope !== undefined) {
                totalSlope += s.trend_slope;
                count++;
            } else if (s.sparkline && s.sparkline.length >= 2) {
                const last = s.sparkline[s.sparkline.length - 1];
                const first = s.sparkline[0];
                totalSlope += (last - first) / s.sparkline.length;
                count++;
            }
        }
        if (count === 0) return 'stable';
        const avgSlope = totalSlope / count;
        if (avgSlope > 0.5) return 'increasing';
        if (avgSlope < -0.5) return 'decreasing';
        return 'stable';
    },

    /**
     * Derive priority from risk level.
     * @param {'RED'|'AMBER'|'GREEN'} risk
     * @returns {'High'|'Medium'|'Low'}
     */
    derivePriority(risk) {
        if (risk === 'RED') return 'High';
        if (risk === 'AMBER') return 'Medium';
        return 'Low';
    },

    /**
     * Generate a short reason string for the portfolio view.
     * @param {object} smeData — raw SME data object
     * @returns {string}
     */
    deriveReason(smeData) {
        const suppliers = (smeData.suppliers && smeData.suppliers.suppliers) || [];
        const delays = suppliers.map(s => s.current_delay);
        const risk = this.calculateRisk(delays);
        const triageDetected = this.detectTriage(suppliers);
        const trend = this.deriveTrend(suppliers);
        const avgDelay = delays.length > 0 ? Math.round(delays.reduce((a, b) => a + b, 0) / delays.length) : 0;
        const maxDelay = delays.length > 0 ? Math.max(...delays) : 0;
        const delayedCount = suppliers.filter(s => s.current_delay > 30).length;

        if (risk === 'RED' && triageDetected) {
            return `Payment triage detected — ${delayedCount} supplier${delayedCount !== 1 ? 's' : ''} delayed (avg ${avgDelay}d)`;
        }
        if (risk === 'RED') {
            return `Supplier delays averaging ${avgDelay}d, peak at ${maxDelay}d`;
        }
        if (risk === 'AMBER' && trend === 'increasing') {
            return `Gradual drift in payment timing — avg delay ${avgDelay}d`;
        }
        if (risk === 'AMBER') {
            return `Borderline payment spread — monitoring recommended`;
        }
        return `Stable payment performance — avg delay ${avgDelay}d`;
    },

    /**
     * Build full company data object from raw SME data.
     * Replaces all hardcoded company.profile and company.risk_level.
     * @param {object} smeData — raw SME data with name, suppliers
     * @returns {object} companyData
     */
    buildCompanyData(smeData) {
        const suppliers = (smeData.suppliers && smeData.suppliers.suppliers) || [];
        const delays = suppliers.map(s => s.current_delay);
        const risk = this.calculateRisk(delays);
        const insight = this.generateInsight(smeData);

        const riskStatusMap = {
            RED: `RED \u2014 severe supplier payment stress`,
            AMBER: `AMBER \u2014 supplier payment triage detected`,
            GREEN: `GREEN \u2014 stable payment behaviour`,
        };

        return {
            profile: {
                company_name: smeData.name,
                traditional_risk_status: 'GREEN \u2014 all loan payments current',
                paypulse_risk_status: riskStatusMap[risk],
            },
            risk_level: risk,
            executive_summary: insight,
        };
    },

    /**
     * Build triage data object from raw supplier data.
     * Replaces all hardcoded triage sections.
     * @param {object} smeData
     * @returns {object} triageData
     */
    buildTriageData(smeData) {
        const suppliers = (smeData.suppliers && smeData.suppliers.suppliers) || [];
        const delays = suppliers.map(s => s.current_delay);
        const triageDetected = this.detectTriage(suppliers);

        const stretched = suppliers
            .filter(s => s.current_delay > 30)
            .map(s => ({ supplier_id: s.supplier_id, supplier_name: s.supplier_name, current_delay: s.current_delay }));

        const favored = suppliers
            .filter(s => s.current_delay <= 15)
            .map(s => ({ supplier_id: s.supplier_id, supplier_name: s.supplier_name, current_delay: s.current_delay }));

        // Compute baseline and current spread
        const minDelay = delays.length > 0 ? Math.min(...delays) : 0;
        const maxDelay = delays.length > 0 ? Math.max(...delays) : 0;
        const currentSpread = maxDelay - minDelay;

        // Estimate baseline spread from early sparkline data
        let baselineSpread = 4.0;
        const earlyDelays = suppliers
            .filter(s => s.sparkline && s.sparkline.length >= 2)
            .map(s => s.sparkline[0]);
        if (earlyDelays.length >= 2) {
            baselineSpread = Math.max(1, Math.max(...earlyDelays) - Math.min(...earlyDelays));
        }

        const spreadIncreasePct = baselineSpread > 0 ? Math.round(((currentSpread - baselineSpread) / baselineSpread) * 100) : 0;

        // Compute average delay once for reuse
        const avgDelay = delays.length > 0 ? Math.round(delays.reduce((a, b) => a + b, 0) / delays.length) : 0;

        // Dynamic triage severity
        let triageSeverity = 'none';
        if (triageDetected) {
            triageSeverity = avgDelay > 35 ? 'active' : 'emerging';
        }

        // Dynamic explanation
        let explanation;
        if (triageDetected) {
            explanation = `Payment triage detected: ${stretched.length} supplier${stretched.length !== 1 ? 's are' : ' is'} being delayed (avg ${avgDelay}d) while ${favored.length} ${favored.length !== 1 ? 'are' : 'is'} paid on time.`;
        } else if (this.calculateRisk(delays) === 'GREEN') {
            explanation = `No payment triage detected \u2014 all suppliers paid within a consistent range (spread: ${currentSpread}d).`;
        } else {
            explanation = `Emerging payment divergence detected \u2014 spread of ${currentSpread}d across suppliers warrants monitoring.`;
        }

        return {
            triage_detected: triageDetected,
            triage_severity: triageSeverity,
            stretched_suppliers: stretched,
            favored_suppliers: favored,
            baseline_spread: parseFloat(baselineSpread.toFixed(1)),
            current_spread: parseFloat(currentSpread.toFixed(1)),
            spread_increase_pct: Math.max(0, spreadIncreasePct),
            explanation,
        };
    },
};

// ══════════════════════════════════════
//  STORAGE HELPERS
// ══════════════════════════════════════

const Storage = {
    getUsers()    { return JSON.parse(localStorage.getItem('pp_users') || '{}'); },
    saveUsers(u)  { localStorage.setItem('pp_users', JSON.stringify(u)); },
    getSession()  { return JSON.parse(localStorage.getItem('pp_session') || 'null'); },
    saveSession(s){ localStorage.setItem('pp_session', JSON.stringify(s)); },
    clearSession(){ localStorage.removeItem('pp_session'); },
    getProfile(email) {
        const users = this.getUsers();
        return users[email] || null;
    },
    saveProfile(email, data) {
        const users = this.getUsers();
        users[email] = { ...(users[email] || {}), ...data };
        this.saveUsers(users);
    },
    getSavedScenarios(email) {
        return JSON.parse(localStorage.getItem(`pp_scenarios_${email}`) || '[]');
    },
    saveScenarioResult(email, result) {
        const list = this.getSavedScenarios(email);
        list.unshift({ ...result, timestamp: Date.now() });
        if (list.length > 10) list.length = 10;
        localStorage.setItem(`pp_scenarios_${email}`, JSON.stringify(list));
    },
};

// ══════════════════════════════════════
//  ROUTING
// ══════════════════════════════════════

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const el = document.getElementById(viewId);
    if (el) el.classList.add('active');
}

function showPage(pageId) {
    document.querySelectorAll('#view-app .page').forEach(p => p.classList.remove('active'));
    const el = document.getElementById(`page-${pageId}`);
    if (el) el.classList.add('active');

    document.querySelectorAll('#main-nav .nav-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.page === pageId);
    });

    // Show/hide toggle bar on dashboard
    const toggleBar = document.querySelector('.view-toggle-bar');
    if (toggleBar) {
        toggleBar.style.display = pageId === 'dashboard' ? 'flex' : 'none';
    }

    window.scrollTo(0, 0);
}

// ══════════════════════════════════════
//  INIT
// ══════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    setupLandingListeners();
    setupAuthListeners();
    setupOnboardingListeners();
    setupNavListeners();
    setupScenarioListeners();
    setupProfileListeners();
    setupProfileDropdown();
    setupWhyToggle();
    setupViewToggle();
    setupOutreachListeners();
    setupBackToPortfolio();
    setupTourListeners();
    setupAlertToast();
    setupReportButton();

    // Check if logged in — if yes, skip to app; otherwise show landing
    const session = Storage.getSession();
    if (session && session.email) {
        const profile = Storage.getProfile(session.email);
        if (profile && profile.businessName) {
            enterApp(session.email);
        } else {
            showView('view-onboarding');
        }
    } else {
        showView('view-landing');
    }
});

// ══════════════════════════════════════
//  AUTH
// ══════════════════════════════════════

function setupAuthListeners() {
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('signup-form').addEventListener('submit', handleSignup);

    document.getElementById('goto-signup').addEventListener('click', (e) => {
        e.preventDefault();
        showView('view-signup');
    });

    document.getElementById('goto-login').addEventListener('click', (e) => {
        e.preventDefault();
        showView('view-login');
    });
}

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');

    const users = Storage.getUsers();
    const user = users[email];

    if (!user) {
        errorEl.textContent = 'No account found with this email.';
        return;
    }

    if (user.passwordHash !== simpleHash(password)) {
        errorEl.textContent = 'Incorrect password.';
        return;
    }

    errorEl.textContent = '';
    Storage.saveSession({ email, loggedInAt: Date.now() });

    if (user.businessName) {
        enterApp(email);
    } else {
        showView('view-onboarding');
    }
}

function handleSignup(e) {
    e.preventDefault();
    const email = document.getElementById('signup-email').value.trim().toLowerCase();
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-confirm').value;
    const errorEl = document.getElementById('signup-error');

    if (password !== confirm) {
        errorEl.textContent = 'Passwords do not match.';
        return;
    }

    const users = Storage.getUsers();
    if (users[email]) {
        errorEl.textContent = 'An account with this email already exists.';
        return;
    }

    errorEl.textContent = '';
    Storage.saveProfile(email, {
        passwordHash: simpleHash(password),
        createdAt: Date.now(),
    });
    Storage.saveSession({ email, loggedInAt: Date.now() });
    showView('view-onboarding');
}

function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return 'h_' + Math.abs(hash).toString(36);
}

// ══════════════════════════════════════
//  ONBOARDING
// ══════════════════════════════════════

function setupOnboardingListeners() {
    document.getElementById('ob-next').addEventListener('click', () => {
        const biz = document.getElementById('ob-business').value.trim();
        if (!biz) {
            document.getElementById('ob-business').focus();
            return;
        }
        // Move to step 2
        document.getElementById('ob-step-1').classList.remove('active');
        document.getElementById('ob-step-2').classList.add('active');
        document.querySelectorAll('.step-dot')[0].classList.remove('active');
        document.querySelectorAll('.step-dot')[1].classList.add('active');
    });

    document.getElementById('onboarding-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const session = Storage.getSession();
        if (!session) return;

        const businessName = document.getElementById('ob-business').value.trim();
        const industry = document.getElementById('ob-industry').value;
        const supplierCount = document.getElementById('ob-suppliers').value;

        Storage.saveProfile(session.email, { businessName, industry, supplierCount });
        enterApp(session.email);
    });
}

// ══════════════════════════════════════
//  ENTER APP
// ══════════════════════════════════════

function enterApp(email) {
    showView('view-app');
    showPage('dashboard');

    const profile = Storage.getProfile(email);

    // Set welcome message
    const name = profile.businessName || 'there';
    document.getElementById('welcome-msg').textContent = `Welcome back, ${name}`;

    // Show loading
    document.getElementById('dashboard-loader').style.display = 'flex';
    document.getElementById('dashboard-content').style.display = 'none';

    loadDashboard();
    renderProfile(email, profile);
}

// ══════════════════════════════════════
//  NAV
// ══════════════════════════════════════

function setupNavListeners() {
    document.querySelectorAll('#main-nav .nav-btn').forEach(btn => {
        btn.addEventListener('click', () => showPage(btn.dataset.page));
    });
}

// ══════════════════════════════════════
//  VIEW TOGGLE (SME / Bank Risk)
// ══════════════════════════════════════

function setupViewToggle() {
    const toggleContainer = document.getElementById('view-toggle');
    if (!toggleContainer) return;

    toggleContainer.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            if (mode === currentViewMode) return;

            currentViewMode = mode;

            // Update toggle button states
            toggleContainer.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Move slider
            if (mode === 'bank') {
                toggleContainer.classList.add('bank-active');
            } else {
                toggleContainer.classList.remove('bank-active');
            }

            // Update mode indicator (label + subtitle + styling)
            const modeIndicator = document.getElementById('mode-indicator');
            const modeLabel = document.getElementById('mode-indicator-label');
            const modeSub = document.getElementById('mode-indicator-sub');
            if (modeIndicator && modeLabel) {
                modeLabel.textContent = mode === 'bank' ? 'Bank Risk View' : 'SME View';
                modeIndicator.className = 'mode-indicator' + (mode === 'bank' ? ' mode-bank' : '');
            }
            if (modeSub) {
                modeSub.textContent = mode === 'bank'
                    ? 'Which businesses need attention?'
                    : 'What is happening to my business?';
            }

            // Toggle welcome bar visibility
            const welcomeBar = document.getElementById('welcome-bar');
            if (welcomeBar) welcomeBar.style.display = mode === 'bank' ? 'none' : 'flex';

            // Hide Simulator nav in Bank mode (it's SME-only)
            const simNav = document.querySelector('.nav-btn[data-page="simulator"]');
            if (simNav) simNav.style.display = mode === 'bank' ? 'none' : '';

            // If in bank mode, force dashboard page
            if (mode === 'bank') {
                showPage('dashboard');
            }

            // Switch views
            const smeView = document.getElementById('sme-view');
            const bankView = document.getElementById('bank-risk-view');

            if (mode === 'bank') {
                smeView.style.display = 'none';
                bankView.style.display = 'block';
                bankView.style.animation = 'fadeIn 0.3s ease';
                renderBankRiskView();
            } else {
                smeView.style.display = 'block';
                smeView.style.animation = 'fadeIn 0.3s ease';
                bankView.style.display = 'none';
            }
        });
    });
}

// ══════════════════════════════════════
//  PROFILE
// ══════════════════════════════════════

function setupProfileListeners() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            Storage.clearSession();
            // Close dropdown
            const dd = document.getElementById('profile-dropdown');
            if (dd) dd.classList.remove('open');
            showView('view-landing');
            // Clear form inputs
            document.querySelectorAll('.auth-form input').forEach(i => { i.value = ''; });
            document.querySelectorAll('.auth-error').forEach(e => { e.textContent = ''; });
        });
    }
}

function setupProfileDropdown() {
    const trigger = document.getElementById('profile-trigger');
    const dropdown = document.getElementById('profile-dropdown');
    if (trigger && dropdown) {
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('open');
        });
        dropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        document.addEventListener('click', () => {
            dropdown.classList.remove('open');
        });
    }
}

function setupAlertToast() {
    const closeBtn = document.getElementById('alert-toast-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            const toast = document.getElementById('alert-toast');
            if (toast) {
                toast.classList.add('dismissing');
                setTimeout(() => { toast.style.display = 'none'; toast.classList.remove('dismissing'); }, 300);
            }
        });
    }
}

// ══════════════════════════════════════
//  LANDING PAGE LISTENERS
// ══════════════════════════════════════

function setupLandingListeners() {
    const enterSme = document.getElementById('enter-sme');
    const enterBank = document.getElementById('enter-bank');
    const backToLanding = document.getElementById('back-to-landing');
    const loginBack = document.getElementById('login-back-to-landing');
    const signupBack = document.getElementById('signup-back-to-landing');

    if (enterSme) {
        enterSme.addEventListener('click', () => {
            showView('view-login');
        });
    }
    if (enterBank) {
        enterBank.addEventListener('click', () => {
            showView('view-login');
        });
    }
    if (backToLanding) {
        backToLanding.addEventListener('click', () => {
            Storage.clearSession();
            const dd = document.getElementById('profile-dropdown');
            if (dd) dd.classList.remove('open');
            showView('view-landing');
            document.querySelectorAll('.auth-form input').forEach(i => { i.value = ''; });
            document.querySelectorAll('.auth-error').forEach(e => { e.textContent = ''; });
        });
    }
    if (loginBack) {
        loginBack.addEventListener('click', () => showView('view-landing'));
    }
    if (signupBack) {
        signupBack.addEventListener('click', () => showView('view-landing'));
    }
}

// ══════════════════════════════════════
//  GUIDED TOUR
// ══════════════════════════════════════

const TOUR_STEPS = [
    {
        title: 'Welcome to PayPulse',
        desc: 'PayPulse is an AI-powered early warning system that detects SME financial stress through supplier payment pattern analysis — 4 to 8 weeks before traditional banking metrics ever change.',
    },
    {
        title: 'The Hidden Signal',
        desc: 'When businesses face cash flow pressure, they start selectively prioritising which suppliers to pay. This "payment triage" creates a measurable divergence that PayPulse detects automatically.',
    },
    {
        title: 'SME Owner View',
        desc: 'As an SME owner, you can see exactly how your business health is perceived — including which suppliers are under strain, risk timelines, and actionable recommendations.',
    },
    {
        title: 'Bank Risk Manager View',
        desc: 'Bank relationship managers get a portfolio-wide risk overview — seeing which SME clients need attention, with drill-down into individual business stress patterns.',
    },
    {
        title: 'Scenario Simulator',
        desc: 'The what-if simulator lets you explore how different actions (or inaction) change the risk outlook — helping both SMEs and banks make informed decisions.',
    },
];

let tourStep = 0;

function setupTourListeners() {
    const startBtn = document.getElementById('start-tour');
    const skipBtn = document.getElementById('tour-skip');
    const prevBtn = document.getElementById('tour-prev');
    const nextBtn = document.getElementById('tour-next');
    const backdrop = document.getElementById('tour-backdrop');

    if (startBtn) startBtn.addEventListener('click', startTour);
    if (skipBtn) skipBtn.addEventListener('click', endTour);
    if (backdrop) backdrop.addEventListener('click', endTour);
    if (prevBtn) prevBtn.addEventListener('click', () => navigateTour(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => {
        if (tourStep >= TOUR_STEPS.length - 1) {
            endTour();
            // After tour, go to login
            showView('view-login');
        } else {
            navigateTour(1);
        }
    });
}

function startTour() {
    tourStep = 0;
    const overlay = document.getElementById('tour-overlay');
    if (overlay) {
        overlay.style.display = 'block';
        renderTourStep();
    }
}

function endTour() {
    const overlay = document.getElementById('tour-overlay');
    if (overlay) overlay.style.display = 'none';
}

function navigateTour(direction) {
    tourStep = Math.max(0, Math.min(TOUR_STEPS.length - 1, tourStep + direction));
    renderTourStep();
}

function renderTourStep() {
    const step = TOUR_STEPS[tourStep];
    document.getElementById('tour-step-count').textContent = `Step ${tourStep + 1} of ${TOUR_STEPS.length}`;
    document.getElementById('tour-title').textContent = step.title;
    document.getElementById('tour-desc').textContent = step.desc;

    const prevBtn = document.getElementById('tour-prev');
    const nextBtn = document.getElementById('tour-next');
    if (prevBtn) prevBtn.style.display = tourStep > 0 ? 'inline-flex' : 'none';
    if (nextBtn) nextBtn.textContent = tourStep >= TOUR_STEPS.length - 1 ? 'Get Started' : 'Next';

    // Re-trigger tooltip animation
    const tooltip = document.getElementById('tour-tooltip');
    if (tooltip) {
        tooltip.style.animation = 'none';
        tooltip.offsetHeight; // force reflow
        tooltip.style.animation = 'fadeInUp 0.3s ease both';
    }
}

function renderProfile(email, profile) {
    document.getElementById('profile-business').textContent = profile.businessName || 'Not set';
    document.getElementById('profile-email').textContent = email;
    document.getElementById('profile-avatar').textContent = (profile.businessName || 'U')[0].toUpperCase();

    const industryMap = {
        construction: 'Construction & Engineering',
        manufacturing: 'Manufacturing',
        retail: 'Retail & E-commerce',
        services: 'Professional Services',
        technology: 'Technology',
        healthcare: 'Healthcare',
        food: 'Food & Hospitality',
        transport: 'Transport & Logistics',
        other: 'Other',
    };
    document.getElementById('profile-industry').textContent = industryMap[profile.industry] || 'Not specified';
    document.getElementById('profile-suppliers').textContent = profile.supplierCount || '-';

    if (profile.createdAt) {
        document.getElementById('profile-since').textContent = new Date(profile.createdAt).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric',
        });
    }
}

// ══════════════════════════════════════
//  "WHY AM I SEEING THIS?"
// ══════════════════════════════════════

function setupWhyToggle() {
    const toggle = document.getElementById('why-toggle');
    if (!toggle) return;
    toggle.addEventListener('click', () => {
        toggle.classList.toggle('open');
        document.getElementById('why-content').classList.toggle('open');
    });
}

function renderWhySection() {
    const list = document.getElementById('why-list');
    if (!list) return;

    const reasons = [];
    const stretched = triageData.stretched_suppliers || [];
    const favored = triageData.favored_suppliers || [];

    if (stretched.length > 0 && favored.length > 0) {
        reasons.push(`<strong>${favored.length} supplier${favored.length > 1 ? 's are' : ' is'}</strong> being paid on time, while <strong>${stretched.length}</strong> ${stretched.length > 1 ? 'are' : 'is'} being delayed. This gap is a classic stress signal.`);
    }

    if (triageData.spread_increase_pct) {
        reasons.push(`The payment spread across suppliers has increased by <strong>${triageData.spread_increase_pct}%</strong> compared to the healthy baseline.`);
    }

    const criticalSuppliers = (suppliersData.suppliers || []).filter(s => s.severity === 'critical');
    if (criticalSuppliers.length > 0) {
        const names = criticalSuppliers.map(s => s.supplier_name).join(', ');
        reasons.push(`<strong>${names}</strong> ${criticalSuppliers.length > 1 ? 'have' : 'has'} exceeded contractual payment terms significantly.`);
    }

    const accelerating = (suppliersData.suppliers || []).filter(s => s.trend === 'accelerating');
    if (accelerating.length > 0) {
        reasons.push(`Payment delays to <strong>${accelerating[0].supplier_name}</strong> are accelerating \u2014 getting worse each week.`);
    }

    reasons.push('Traditional banking metrics (loan payments, revenue) still show <strong>GREEN</strong>. PayPulse detects stress before those metrics catch it.');

    list.innerHTML = reasons.map(r => `<li>${r}</li>`).join('');
}

// ══════════════════════════════════════
//  DASHBOARD DATA
// ══════════════════════════════════════

function setupBackToPortfolio() {
    const backBtn = document.getElementById('viewing-sme-back');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            switchToBankView();
        });
    }
}

async function loadDashboard() {
    // Determine which SME to load (default to meridian)
    const savedSME = localStorage.getItem('selectedSME') || 'meridian';
    const sme = SME_DATA[savedSME];

    // Try API first, fall back to SME_DATA with dynamic computation
    try {
        const [company, suppliers, triage] = await Promise.all([
            fetch(`${API_BASE}/api/company`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
            fetch(`${API_BASE}/api/suppliers`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
            fetch(`${API_BASE}/api/triage`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
        ]);
        companyData = company;
        suppliersData = suppliers;
        triageData = triage;
    } catch (err) {
        console.warn('API unavailable, computing from SME data:', err.message);
        // DYNAMIC: Compute all values from raw data using AnalysisEngine
        if (sme) {
            companyData = AnalysisEngine.buildCompanyData(sme);
            suppliersData = sme.suppliers;
            triageData = AnalysisEngine.buildTriageData(sme);
            selectedSME = savedSME;
        } else {
            companyData = FALLBACK.company;
            suppliersData = FALLBACK.suppliers;
            triageData = FALLBACK.triage;
        }
    }

    // Load bank risk data
    try {
        const bankRisk = await fetch(`${API_BASE}/api/bank-risk`).then(r => {
            if (!r.ok) throw new Error(r.status);
            return r.json();
        });
        bankRiskData = bankRisk;
    } catch (err) {
        console.warn('Bank risk API unavailable, using fallback:', err.message);
        bankRiskData = FALLBACK.bankRisk;
    }

    // Hide loader, show content
    document.getElementById('dashboard-loader').style.display = 'none';
    document.getElementById('dashboard-content').style.display = 'block';

    // Show viewing bar if an SME was previously selected
    if (selectedSME && sme) {
        const viewingBar = document.getElementById('viewing-sme-bar');
        const viewingName = document.getElementById('viewing-sme-name');
        if (viewingBar && viewingName) {
            viewingName.textContent = sme.name;
            viewingBar.style.display = 'flex';
        }
    }

    renderInsightPage();
    renderOutreach();
    renderWhySection();
    renderTriageScore();
    renderRiskTimeline();
    populateSupplierDropdown();

    // If currently on bank view, render it
    if (currentViewMode === 'bank') {
        renderBankRiskView();
    }

    // Trigger live alert simulation after a short delay
    scheduleLiveAlerts();
}

// ══════════════════════════════════════
//  DASHBOARD RENDERING (SME VIEW)
// ══════════════════════════════════════

function renderInsightPage() {
    const profile = companyData.profile;
    const riskLevel = companyData.risk_level;

    // Dynamic hero title based on risk
    const heroTitle = document.getElementById('hero-title');
    if (heroTitle) {
        if (riskLevel === 'RED') heroTitle.textContent = 'Severe Financial Stress Detected';
        else if (riskLevel === 'AMBER') heroTitle.textContent = 'Hidden Financial Stress Detected';
        else heroTitle.textContent = 'Business Health: Stable';
    }

    // Risk badge in welcome bar
    const badge = document.getElementById('risk-badge');
    const dot = document.getElementById('risk-dot');
    const label = document.getElementById('risk-label');
    badge.className = `risk-badge ${riskLevel.toLowerCase()}`;
    dot.className = `status-dot ${riskLevel.toLowerCase()}`;
    label.textContent = riskLevel;

    // Status pills
    const tradText = profile.traditional_risk_status || 'GREEN';
    const ppText = profile.paypulse_risk_status || 'AMBER';
    document.getElementById('traditional-status').textContent = tradText.includes('\u2014') ? tradText.split('\u2014')[0].trim() : (tradText.includes('—') ? tradText.split('—')[0].trim() : tradText);
    document.getElementById('paypulse-status').textContent = ppText.includes('\u2014') ? ppText.split('\u2014')[0].trim() : (ppText.includes('—') ? ppText.split('—')[0].trim() : ppText);

    const ppPill = document.getElementById('paypulse-pill');
    const rl = riskLevel.toLowerCase();
    ppPill.className = `status-pill ${rl}`;
    ppPill.querySelector('.status-dot').className = `status-dot ${rl}`;

    // Key insight
    const stretched = triageData.stretched_suppliers || [];
    if (stretched.length > 0) {
        const delays = stretched.map(s => Math.round(s.current_delay));
        const minDelay = Math.min(...delays);
        const maxDelay = Math.max(...delays);
        const terms = stretched.map(s => {
            const sup = suppliersData.suppliers.find(x => x.supplier_id === s.supplier_id);
            return sup ? sup.contractual_terms : 21;
        });
        const avgTerms = Math.round(terms.reduce((a, b) => a + b, 0) / terms.length);
        const avgDelay = Math.round(delays.reduce((a, b) => a + b, 0) / delays.length);
        const avgOver = avgDelay - avgTerms;
        const delayRange = minDelay === maxDelay ? `${minDelay}` : `${minDelay}\u2013${maxDelay}`;
        document.getElementById('key-insight').textContent =
            `${stretched.length} supplier${stretched.length > 1 ? 's are' : ' is'} being paid ${delayRange} days late \u2014 ${Math.abs(avgOver)}+ days beyond contractual terms.`;
    } else {
        document.getElementById('key-insight').textContent = companyData.executive_summary;
    }

    // Action recommendation
    const actionEl = document.getElementById('action-rec');
    actionEl.className = 'action-rec';
    if (riskLevel === 'RED') {
        actionEl.textContent = 'Urgent: Immediate intervention required';
        actionEl.classList.add('red');
    } else if (riskLevel === 'AMBER') {
        actionEl.textContent = 'Intervene now to avoid escalation to RED';
    } else {
        actionEl.textContent = 'No immediate action required \u2014 continue monitoring';
        actionEl.classList.add('green');
    }

    renderTrendChart();
    renderAffectedList();
}

function renderTrendChart() {
    const canvas = document.getElementById('trend-chart');
    if (!canvas) return;

    const severityOrder = { critical: 4, warning: 3, watch: 2, normal: 1 };
    const sorted = [...suppliersData.suppliers].sort((a, b) => {
        const d = (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
        return d !== 0 ? d : b.current_delay - a.current_delay;
    });

    const topSuppliers = sorted.filter(s => s.sparkline && s.sparkline.length > 0).slice(0, 2);
    if (topSuppliers.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (trendChart) trendChart.destroy();

    const maxLen = Math.max(...topSuppliers.map(s => s.sparkline.length));
    const labels = Array.from({ length: maxLen }, (_, i) => `W${52 - maxLen + 1 + i}`);

    const lineColors = [
        { border: '#ffab00', bg: 'rgba(255,171,0,0.08)' },
        { border: '#ff1744', bg: 'rgba(255,23,68,0.08)' },
    ];

    const datasets = topSuppliers.map((s, i) => ({
        label: s.supplier_name,
        data: [...Array(maxLen - s.sparkline.length).fill(null), ...s.sparkline],
        borderColor: lineColors[i].border,
        backgroundColor: lineColors[i].bg,
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.35,
        fill: true,
    }));

    const topTerms = topSuppliers[0].contractual_terms;
    if (topTerms) {
        datasets.push({
            label: `Contract Terms (${topTerms}d)`,
            data: labels.map(() => topTerms),
            borderColor: 'rgba(0,230,118,0.25)',
            borderDash: [4, 6],
            borderWidth: 1,
            pointRadius: 0,
            fill: false,
        });
    }

    trendChart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: 'index' },
            plugins: {
                legend: { position: 'bottom', labels: { color: '#8b86a3', font: { family: 'Inter', size: 11 }, boxWidth: 10, padding: 16 } },
                tooltip: {
                    backgroundColor: 'rgba(10,14,26,0.95)',
                    titleColor: '#e8e6f0',
                    bodyColor: '#8b86a3',
                    borderColor: 'rgba(124,92,252,0.15)',
                    borderWidth: 1,
                    padding: 10,
                    callbacks: { label: function(c) { return `${c.dataset.label}: ${c.parsed.y}d`; } },
                },
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#5a5672', font: { family: 'Inter', size: 10 }, maxTicksLimit: 8 } },
                y: {
                    grid: { color: 'rgba(124,92,252,0.04)' },
                    ticks: { color: '#5a5672', font: { family: 'Inter', size: 10 }, callback: function(v) { return v + 'd'; } },
                    title: { display: true, text: 'Payment Delay (days)', color: '#5a5672', font: { family: 'Inter', size: 11 } },
                },
            },
        },
    });
}

function renderAffectedList() {
    const list = document.getElementById('affected-list');
    if (!list) return;

    const stretched = triageData.stretched_suppliers || [];
    let affected = stretched.length > 0
        ? stretched.map(s => ({ ...s, ...(suppliersData.suppliers.find(x => x.supplier_id === s.supplier_id) || {}) }))
        : suppliersData.suppliers.filter(s => s.severity === 'warning' || s.severity === 'critical');

    if (affected.length === 0) {
        list.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem;text-align:center;padding:24px;">All suppliers are being paid within normal terms.</p>';
        return;
    }

    list.innerHTML = affected.map(s => {
        const terms = s.contractual_terms || 30;
        const delay = Math.round(s.current_delay);
        const color = delay > terms * 1.5 ? 'red' : delay > terms ? 'amber' : 'green';
        const trend = s.trend || '';
        const trendText = trend === 'accelerating' ? 'Worsening fast' : trend === 'drifting' ? 'Getting worse' : trend === 'stable' ? 'Stable' : trend === 'improving' ? 'Improving' : '';
        return `<div class="affected-item"><div><div class="affected-name">${s.supplier_name}</div><div class="affected-detail">Terms: ${terms}d</div></div><div><div class="affected-delay ${color}">${delay}d</div>${trendText ? `<div class="affected-trend">${trendText}</div>` : ''}</div></div>`;
    }).join('');
}

// ══════════════════════════════════════
//  SME DATA — UNIQUE DATA PER BUSINESS
// ══════════════════════════════════════

const SME_DATA = {
    meridian: {
        name: 'Meridian Engineering Ltd',
        suppliers: {
            suppliers: [
                { supplier_id: 'S1', supplier_name: 'BetaLogistics Ltd', current_delay: 62, contractual_terms: 30, severity: 'critical', trend: 'accelerating', sparkline: [28,32,36,40,44,48,52,55,58,60,61,62], trend_slope: 3.1 },
                { supplier_id: 'S2', supplier_name: 'GammaSupplies Co', current_delay: 40, contractual_terms: 21, severity: 'critical', trend: 'drifting', sparkline: [18,20,22,25,27,29,31,33,35,37,39,40], trend_slope: 1.4 },
                { supplier_id: 'S3', supplier_name: 'DeltaParts Inc', current_delay: 47, contractual_terms: 30, severity: 'warning', trend: 'drifting', sparkline: [25,28,30,32,35,37,39,41,43,44,46,47], trend_slope: 1.1 },
                { supplier_id: 'S4', supplier_name: 'AlphaSteel Corp', current_delay: 15, contractual_terms: 21, severity: 'normal', trend: 'stable', sparkline: [14,14,15,14,15,15,14,15,14,15,15,15] },
                { supplier_id: 'S5', supplier_name: 'EpsilonServices', current_delay: 14, contractual_terms: 14, severity: 'normal', trend: 'stable', sparkline: [13,13,14,14,13,14,14,13,14,14,13,14], trend_slope: 0.1 },
            ],
        },
    },
    deltaparts: {
        name: 'DeltaParts Ltd',
        suppliers: {
            suppliers: [
                { supplier_id: 'S1', supplier_name: 'SteelWorks Ltd', current_delay: 47, contractual_terms: 21, severity: 'critical', trend: 'accelerating', sparkline: [15,18,22,25,28,32,35,38,41,43,45,47], trend_slope: 2.6 },
                { supplier_id: 'S2', supplier_name: 'IronHub Co', current_delay: 32, contractual_terms: 14, severity: 'warning', trend: 'drifting', sparkline: [12,14,16,18,20,22,24,26,28,29,31,32], trend_slope: 1.5 },
                { supplier_id: 'S3', supplier_name: 'FastenTech', current_delay: 18, contractual_terms: 21, severity: 'normal', trend: 'stable', sparkline: [16,17,17,18,17,18,18,17,18,18,17,18] },
            ],
        },
    },
    gammasupplies: {
        name: 'GammaSupplies Co',
        suppliers: {
            suppliers: [
                { supplier_id: 'S1', supplier_name: 'QuickTransport', current_delay: 40, contractual_terms: 21, severity: 'warning', trend: 'drifting', sparkline: [10,12,15,18,20,24,27,30,33,36,38,40], trend_slope: 1.8 },
                { supplier_id: 'S2', supplier_name: 'SupplyChainX', current_delay: 28, contractual_terms: 14, severity: 'warning', trend: 'drifting', sparkline: [8,10,12,14,16,18,20,22,24,25,27,28], trend_slope: 1.2 },
                { supplier_id: 'S3', supplier_name: 'PackRight Inc', current_delay: 12, contractual_terms: 14, severity: 'normal', trend: 'stable', sparkline: [11,11,12,12,11,12,12,11,12,12,11,12] },
            ],
        },
    },
    betalogistics: {
        name: 'BetaLogistics Ltd',
        suppliers: {
            suppliers: [
                { supplier_id: 'S1', supplier_name: 'FuelCorp', current_delay: 30, contractual_terms: 14, severity: 'warning', trend: 'drifting', sparkline: [8,10,12,14,16,18,20,22,24,26,28,30], trend_slope: 1.4 },
                { supplier_id: 'S2', supplier_name: 'TyrePlus', current_delay: 18, contractual_terms: 21, severity: 'normal', trend: 'stable', sparkline: [16,17,17,18,17,18,18,17,18,18,17,18] },
                { supplier_id: 'S3', supplier_name: 'RouteMaster', current_delay: 14, contractual_terms: 14, severity: 'normal', trend: 'stable', sparkline: [13,13,14,14,13,14,14,13,14,14,13,14] },
            ],
        },
    },
    alphasteel: {
        name: 'AlphaSteel Corp',
        suppliers: {
            suppliers: [
                { supplier_id: 'S1', supplier_name: 'RawMaterials Ltd', current_delay: 12, contractual_terms: 14, severity: 'normal', trend: 'stable', sparkline: [10,11,11,12,11,12,12,11,12,12,11,12] },
                { supplier_id: 'S2', supplier_name: 'MetalWorks Co', current_delay: 8, contractual_terms: 14, severity: 'normal', trend: 'stable', sparkline: [7,7,8,8,7,8,8,7,8,8,7,8] },
            ],
        },
    },
    epsilonservices: {
        name: 'EpsilonServices',
        suppliers: {
            suppliers: [
                { supplier_id: 'S1', supplier_name: 'CloudInfra Ltd', current_delay: 10, contractual_terms: 14, severity: 'normal', trend: 'stable', sparkline: [9,9,10,10,9,10,10,9,10,10,9,10] },
                { supplier_id: 'S2', supplier_name: 'TechSupport Co', current_delay: 7, contractual_terms: 7, severity: 'normal', trend: 'stable', sparkline: [6,7,7,7,6,7,7,6,7,7,6,7] },
            ],
        },
    },
};

// Currently selected SME (null = default/meridian)
let selectedSME = null;

/**
 * Load data for a specific SME into the global state and re-render the dashboard.
 */
function loadSMEData(smeId) {
    const sme = SME_DATA[smeId];
    if (!sme) return;

    selectedSME = smeId;
    localStorage.setItem('selectedSME', smeId);

    // DYNAMIC: Compute all values from raw data using AnalysisEngine
    companyData = AnalysisEngine.buildCompanyData(sme);
    suppliersData = sme.suppliers;
    triageData = AnalysisEngine.buildTriageData(sme);

    // Update welcome message
    document.getElementById('welcome-msg').textContent = `Welcome back, ${sme.name}`;

    // Show the viewing-sme label
    const viewingBar = document.getElementById('viewing-sme-bar');
    const viewingName = document.getElementById('viewing-sme-name');
    if (viewingBar && viewingName) {
        viewingName.textContent = sme.name;
        viewingBar.style.display = 'flex';
    }

    // Re-render all SME dashboard components
    renderInsightPage();
    renderOutreach();
    renderWhySection();
    renderTriageScore();
    renderRiskTimeline();
    populateSupplierDropdown();
}

/**
 * Switch from bank view to SME view for a specific business.
 */
function switchToSMEView(smeId) {
    // Load the selected SME's data
    loadSMEData(smeId);

    // Switch to SME view mode
    currentViewMode = 'sme';
    const toggleContainer = document.getElementById('view-toggle');
    if (toggleContainer) {
        toggleContainer.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        toggleContainer.querySelector('[data-mode="sme"]').classList.add('active');
        toggleContainer.classList.remove('bank-active');
    }
    // Update mode indicator
    const modeIndicator = document.getElementById('mode-indicator');
    const modeLabel = document.getElementById('mode-indicator-label');
    const modeSub = document.getElementById('mode-indicator-sub');
    if (modeIndicator && modeLabel) {
        modeLabel.textContent = 'SME View';
        modeIndicator.className = 'mode-indicator';
    }
    if (modeSub) {
        modeSub.textContent = 'What is happening to my business?';
    }
    // Show welcome bar
    const welcomeBar = document.getElementById('welcome-bar');
    if (welcomeBar) welcomeBar.style.display = 'flex';
    // Restore Simulator nav
    const simNav = document.querySelector('.nav-btn[data-page="simulator"]');
    if (simNav) simNav.style.display = '';
    // Switch content
    document.getElementById('sme-view').style.display = 'block';
    document.getElementById('bank-risk-view').style.display = 'none';
    window.scrollTo(0, 0);
}

/**
 * Switch back to bank portfolio view from SME view.
 */
function switchToBankView() {
    selectedSME = null;
    localStorage.removeItem('selectedSME');

    // Hide viewing label
    const viewingBar = document.getElementById('viewing-sme-bar');
    if (viewingBar) viewingBar.style.display = 'none';

    // Switch to bank view mode
    currentViewMode = 'bank';
    const toggleContainer = document.getElementById('view-toggle');
    if (toggleContainer) {
        toggleContainer.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        toggleContainer.querySelector('[data-mode="bank"]').classList.add('active');
        toggleContainer.classList.add('bank-active');
    }
    // Update mode indicator
    const modeIndicator = document.getElementById('mode-indicator');
    const modeLabel = document.getElementById('mode-indicator-label');
    const modeSub = document.getElementById('mode-indicator-sub');
    if (modeIndicator && modeLabel) {
        modeLabel.textContent = 'Bank Risk View';
        modeIndicator.className = 'mode-indicator mode-bank';
    }
    if (modeSub) {
        modeSub.textContent = 'Which businesses need attention?';
    }
    // Hide welcome bar
    const welcomeBar = document.getElementById('welcome-bar');
    if (welcomeBar) welcomeBar.style.display = 'none';
    // Hide Simulator nav
    const simNav = document.querySelector('.nav-btn[data-page="simulator"]');
    if (simNav) simNav.style.display = 'none';
    // Force dashboard page
    showPage('dashboard');
    // Switch content
    document.getElementById('sme-view').style.display = 'none';
    document.getElementById('bank-risk-view').style.display = 'block';
    renderBankRiskView();
    window.scrollTo(0, 0);
}

// Dynamically derive PORTFOLIO_BUSINESSES from SME_DATA using AnalysisEngine
function getPortfolioBusinesses() {
    return Object.entries(SME_DATA).map(([id, sme]) => {
        const suppliers = (sme.suppliers && sme.suppliers.suppliers) || [];
        const delays = suppliers.map(s => s.current_delay);
        const risk = AnalysisEngine.calculateRisk(delays);
        const trend = AnalysisEngine.deriveTrend(suppliers);
        const priority = AnalysisEngine.derivePriority(risk);
        const reason = AnalysisEngine.deriveReason(sme);
        return { id, name: sme.name, risk, trend, priority, reason };
    });
}

function renderBankRiskView() {
    const businesses = getPortfolioBusinesses();

    // Summary counts
    const redCount = businesses.filter(b => b.risk === 'RED').length;
    const amberCount = businesses.filter(b => b.risk === 'AMBER').length;
    const greenCount = businesses.filter(b => b.risk === 'GREEN').length;

    const summaryEl = document.getElementById('portfolio-summary');
    if (summaryEl) {
        summaryEl.innerHTML = `
            <div class="portfolio-stat ps-red"><span class="ps-count">${redCount}</span><span class="ps-label">High Risk</span></div>
            <div class="portfolio-stat ps-amber"><span class="ps-count">${amberCount}</span><span class="ps-label">Medium Risk</span></div>
            <div class="portfolio-stat ps-green"><span class="ps-count">${greenCount}</span><span class="ps-label">Low Risk</span></div>
        `;
    }

    // Render list
    const listEl = document.getElementById('portfolio-list');
    if (!listEl) return;

    const trendArrows = { increasing: '\u2191', stable: '\u2192', decreasing: '\u2193' };
    const riskColors = { RED: 'red', AMBER: 'amber', GREEN: 'green' };
    const priorityClasses = { High: 'high', Medium: 'medium', Low: 'low' };

    listEl.innerHTML = businesses.map(b => `
        <div class="portfolio-row">
            <div class="portfolio-row-main">
                <div class="portfolio-biz">
                    <span class="portfolio-biz-name">${b.name}</span>
                    <span class="portfolio-biz-reason">${b.reason}</span>
                </div>
                <div class="portfolio-meta">
                    <span class="portfolio-risk-tag ${riskColors[b.risk]}">${b.risk}</span>
                    <span class="portfolio-trend ${b.trend}">${trendArrows[b.trend] || '\u2192'}</span>
                    <span class="portfolio-priority ${priorityClasses[b.priority]}">${b.priority}</span>
                </div>
            </div>
            <button class="portfolio-details-btn" data-business="${b.id}">View Details</button>
        </div>
    `).join('');

    // Attach click handlers for "View Details"
    listEl.querySelectorAll('.portfolio-details-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const smeId = btn.dataset.business;
            switchToSMEView(smeId);
        });
    });
}

function renderEarlyWarningSignals(signals) {
    const list = document.getElementById('ews-list');
    if (!list) return;

    if (signals.length === 0) {
        list.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:20px;">No active warning signals.</p>';
        return;
    }

    const icons = {
        critical: '⚠',
        warning: '◈',
        active: '◈',
        emerging: '◉',
    };

    list.innerHTML = signals.map(s => {
        const sevClass = s.severity || 'warning';
        const icon = icons[sevClass] || '◉';
        return `
            <div class="ews-item severity-${sevClass}">
                <div class="ews-icon ${sevClass}">${icon}</div>
                <div class="ews-body">
                    <div class="ews-type ${sevClass}">${s.type}</div>
                    <div class="ews-label">${s.label}</div>
                    <div class="ews-detail">${s.detail}</div>
                </div>
            </div>
        `;
    }).join('');
}

function renderPriorityAccounts(accounts) {
    const list = document.getElementById('priority-list');
    if (!list) return;

    list.innerHTML = accounts.map(a => {
        const sevClass = a.severity || 'normal';
        const delay = Math.round(a.current_delay);
        const terms = a.contractual_terms;
        const excess = Math.round(a.excess_days);
        const trendArrow = a.trend === 'accelerating' ? '↗' : a.trend === 'drifting' ? '→↗' : a.trend === 'improving' ? '↘' : '→';
        const trendLabel = a.trend === 'accelerating' ? 'Accelerating' : a.trend === 'drifting' ? 'Drifting up' : a.trend === 'improving' ? 'Improving' : 'Stable';

        const signalTags = (a.risk_signals || []).map(sig =>
            `<span class="priority-signal-tag">${sig}</span>`
        ).join('');

        return `
            <div class="priority-item severity-${sevClass}">
                <div class="priority-header">
                    <span class="priority-name">${a.supplier_name}</span>
                    <span class="priority-severity ${sevClass}">${sevClass.toUpperCase()}</span>
                </div>
                <div class="priority-stats">
                    <div class="priority-stat">
                        <span class="priority-stat-label">Current Delay</span>
                        <span class="priority-stat-value ${delay > terms + 15 ? 'red' : delay > terms ? 'amber' : ''}">${delay}d</span>
                    </div>
                    <div class="priority-stat">
                        <span class="priority-stat-label">Terms</span>
                        <span class="priority-stat-value">${terms}d</span>
                    </div>
                    <div class="priority-stat">
                        <span class="priority-stat-label">Excess</span>
                        <span class="priority-stat-value ${excess > 0 ? 'amber' : ''}">${excess > 0 ? '+' + excess + 'd' : 'On time'}</span>
                    </div>
                    <div class="priority-stat">
                        <span class="priority-stat-label">Trend</span>
                        <span class="priority-stat-value">${trendArrow} ${trendLabel}</span>
                    </div>
                </div>
                ${signalTags ? `<div class="priority-signals">${signalTags}</div>` : ''}
                <div class="priority-action">
                    <div class="priority-action-label">Recommended Action</div>
                    ${a.recommended_action}
                </div>
            </div>
        `;
    }).join('');
}

function renderBankTrendChart() {
    const canvas = document.getElementById('bank-trend-chart');
    if (!canvas || !suppliersData) return;

    const severityOrder = { critical: 4, warning: 3, watch: 2, normal: 1 };
    const sorted = [...suppliersData.suppliers].sort((a, b) => {
        const d = (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
        return d !== 0 ? d : b.current_delay - a.current_delay;
    });

    const topSuppliers = sorted.filter(s => s.sparkline && s.sparkline.length > 0).slice(0, 3);
    if (topSuppliers.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (bankTrendChart) bankTrendChart.destroy();

    const maxLen = Math.max(...topSuppliers.map(s => s.sparkline.length));
    const labels = Array.from({ length: maxLen }, (_, i) => `W${52 - maxLen + 1 + i}`);

    const lineColors = [
        { border: '#ff1744', bg: 'rgba(255,23,68,0.08)' },
        { border: '#ffab00', bg: 'rgba(255,171,0,0.08)' },
        { border: '#7c5cfc', bg: 'rgba(124,92,252,0.06)' },
    ];

    const datasets = topSuppliers.map((s, i) => ({
        label: s.supplier_name,
        data: [...Array(maxLen - s.sparkline.length).fill(null), ...s.sparkline],
        borderColor: lineColors[i].border,
        backgroundColor: lineColors[i].bg,
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.35,
        fill: true,
    }));

    bankTrendChart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: 'index' },
            plugins: {
                legend: { position: 'bottom', labels: { color: '#8b86a3', font: { family: 'Inter', size: 11 }, boxWidth: 10, padding: 16 } },
                tooltip: {
                    backgroundColor: 'rgba(10,14,26,0.95)',
                    titleColor: '#e8e6f0',
                    bodyColor: '#8b86a3',
                    borderColor: 'rgba(124,92,252,0.15)',
                    borderWidth: 1,
                    padding: 10,
                    callbacks: { label: function(c) { return `${c.dataset.label}: ${c.parsed.y}d`; } },
                },
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#5a5672', font: { family: 'Inter', size: 10 }, maxTicksLimit: 8 } },
                y: {
                    grid: { color: 'rgba(124,92,252,0.04)' },
                    ticks: { color: '#5a5672', font: { family: 'Inter', size: 10 }, callback: function(v) { return v + 'd'; } },
                    title: { display: true, text: 'Payment Delay (days)', color: '#5a5672', font: { family: 'Inter', size: 11 } },
                },
            },
        },
    });
}

// ══════════════════════════════════════
//  SCENARIO SIMULATOR
// ══════════════════════════════════════

function setupScenarioListeners() {
    const btn = document.getElementById('run-scenario-btn');
    if (btn) btn.addEventListener('click', runScenario);

    // Toggle custom controls visibility based on scenario type
    const scenarioSelect = document.getElementById('scenario-select');
    if (scenarioSelect) {
        scenarioSelect.addEventListener('change', () => {
            const customControls = document.getElementById('sim-custom-controls');
            if (customControls) {
                customControls.style.display = scenarioSelect.value === 'custom' ? 'block' : 'none';
            }
            // Hide previous results when scenario changes
            const resultEl = document.getElementById('sim-result');
            if (resultEl) resultEl.style.display = 'none';
        });
    }

    // Delay slider value display
    const slider = document.getElementById('scenario-delay-slider');
    const sliderValue = document.getElementById('scenario-delay-value');
    if (slider && sliderValue) {
        slider.addEventListener('input', () => {
            const v = parseInt(slider.value);
            sliderValue.textContent = (v >= 0 ? '+' : '') + v + ' days';
            sliderValue.className = 'sim-slider-value' + (v > 10 ? ' high' : v > 0 ? ' medium' : ' low');
        });
    }

    // Populate supplier dropdown when data is available
    populateSupplierDropdown();
}

function populateSupplierDropdown() {
    const select = document.getElementById('scenario-supplier-select');
    if (!select) return;

    const suppliers = (suppliersData && suppliersData.suppliers) || FALLBACK.suppliers.suppliers;
    select.innerHTML = suppliers.map(s =>
        `<option value="${s.supplier_id}">${s.supplier_name} (${s.current_delay}d delay)</option>`
    ).join('');
}

function getCurrentRiskLevel() {
    return (companyData && companyData.risk_level) || 'AMBER';
}

function getCurrentAvgDelay() {
    const suppliers = (suppliersData && suppliersData.suppliers) || [];
    if (suppliers.length === 0) return 0;
    const sum = suppliers.reduce((acc, s) => acc + s.current_delay, 0);
    return Math.round(sum / suppliers.length);
}

async function runScenario() {
    const scenarioType = document.getElementById('scenario-select').value;
    const resultEl = document.getElementById('sim-result');
    const summaryEl = document.getElementById('sim-summary');
    const explanationEl = document.getElementById('sim-explanation');
    const btn = document.getElementById('run-scenario-btn');

    // Build params for custom scenario
    let params = {};
    if (scenarioType === 'custom') {
        const supplierId = document.getElementById('scenario-supplier-select').value;
        const adjustment = parseInt(document.getElementById('scenario-delay-slider').value);
        params = { supplier_id: supplierId, adjustment };
    }

    // Button loading state
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-sm"></span>Running...';
    summaryEl.textContent = '';
    explanationEl.textContent = '';
    resultEl.style.display = 'block';

    let result;
    try {
        const res = await fetch(`${API_BASE}/api/scenario`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scenario_type: scenarioType, params }),
        });
        if (!res.ok) throw new Error(res.status);
        result = await res.json();
    } catch (err) {
        console.warn('Scenario API failed, using fallback:', err.message);
        result = FALLBACK.scenario;
    }

    btn.disabled = false;
    btn.textContent = 'Run Scenario';

    // Parse projected risk from risk_delta
    let projectedRisk = 'AMBER';
    const dt = result.risk_delta || '';
    if (dt.includes('\u2192') || dt.includes('→')) {
        const after = dt.split(/\u2192|→/).pop().trim();
        if (after.includes('RED')) projectedRisk = 'RED';
        else if (after.includes('GREEN')) projectedRisk = 'GREEN';
        else if (after.includes('AMBER')) projectedRisk = 'AMBER';
    } else if (dt.includes('RED')) {
        projectedRisk = 'RED';
    } else if (dt.includes('GREEN')) {
        projectedRisk = 'GREEN';
    }

    // Calculate scenario average delay from forecasts
    const scenarioForecasts = result.scenario_forecast || {};
    const supplierImpacts = result.supplier_impacts || [];
    let scenarioAvgDelay = 0;
    if (supplierImpacts.length > 0) {
        scenarioAvgDelay = Math.round(supplierImpacts.reduce((acc, s) => acc + s.scenario_end, 0) / supplierImpacts.length);
    } else {
        const allEndVals = Object.values(scenarioForecasts).map(arr => arr[arr.length - 1] || 0);
        scenarioAvgDelay = allEndVals.length > 0 ? Math.round(allEndVals.reduce((a, b) => a + b, 0) / allEndVals.length) : 0;
    }

    // Calculate forecast range
    const allScenarioEnds = Object.values(scenarioForecasts).map(arr => arr[arr.length - 1] || 0);
    const forecastMin = Math.round(Math.min(...allScenarioEnds));
    const forecastMax = Math.round(Math.max(...allScenarioEnds));

    // Determine direction
    const currentRisk = getCurrentRiskLevel();
    const currentAvg = getCurrentAvgDelay();
    const delayDelta = scenarioAvgDelay - currentAvg;
    const riskOrder = { GREEN: 0, AMBER: 1, RED: 2 };
    const riskImproved = riskOrder[projectedRisk] < riskOrder[currentRisk];
    const riskWorsened = riskOrder[projectedRisk] > riskOrder[currentRisk];

    // Populate CURRENT card
    const currentRiskEl = document.getElementById('sim-current-risk');
    currentRiskEl.textContent = currentRisk;
    currentRiskEl.className = `sim-compare-value ${currentRisk.toLowerCase()}`;
    document.getElementById('sim-current-avg').textContent = currentAvg + 'd';

    // Populate SCENARIO card
    const scenarioRiskEl = document.getElementById('sim-scenario-risk');
    scenarioRiskEl.textContent = projectedRisk;
    scenarioRiskEl.className = `sim-compare-value ${projectedRisk.toLowerCase()}`;
    document.getElementById('sim-scenario-avg').textContent = scenarioAvgDelay + 'd';

    // Direction arrow between cards
    const arrowEl = document.getElementById('sim-compare-arrow');
    if (riskImproved) {
        arrowEl.textContent = '\u2193';
        arrowEl.className = 'sim-compare-arrow improving';
    } else if (riskWorsened) {
        arrowEl.textContent = '\u2191';
        arrowEl.className = 'sim-compare-arrow deteriorating';
    } else {
        arrowEl.textContent = '\u2192';
        arrowEl.className = 'sim-compare-arrow stable';
    }

    // Scenario card border color based on direction
    const scenarioCard = document.getElementById('sim-compare-scenario-card');
    scenarioCard.className = 'sim-compare-card scenario' + (riskImproved ? ' improving' : riskWorsened ? ' deteriorating' : '');

    // Delay delta indicator
    const deltaEl = document.getElementById('sim-delay-delta');
    if (delayDelta !== 0) {
        const arrow = delayDelta > 0 ? '\u2191' : '\u2193';
        const cls = delayDelta > 0 ? 'worse' : 'better';
        deltaEl.textContent = `${arrow}${Math.abs(delayDelta)}d`;
        deltaEl.className = `sim-compare-delta ${cls}`;
    } else {
        deltaEl.textContent = '';
    }

    // Forecast range display
    const forecastRangeEl = document.getElementById('sim-forecast-range');
    const forecastValueEl = document.getElementById('sim-forecast-value');
    if (forecastMin > 0) {
        forecastRangeEl.style.display = 'flex';
        forecastValueEl.textContent = forecastMin === forecastMax ? `${forecastMin} days` : `${forecastMin}\u2013${forecastMax} days`;
    }

    // Intervention impact line
    const interventionEl = document.getElementById('sim-intervention');
    const interventionIcon = document.getElementById('sim-intervention-icon');
    const interventionText = document.getElementById('sim-intervention-text');
    const intervention = result.intervention_impact;
    if (intervention && intervention.text) {
        interventionEl.style.display = 'flex';
        interventionEl.className = `sim-intervention ${intervention.type || 'neutral'}`;
        interventionIcon.textContent = intervention.type === 'positive' ? '\u2713' : intervention.type === 'negative' ? '\u26A0' : '\u2014';
        interventionText.textContent = intervention.text;
    } else {
        interventionEl.style.display = 'none';
    }

    // Summary
    summaryEl.textContent = result.comparison_summary;

    // Generate decision-focused explanation
    const explanation = generateScenarioExplanation(scenarioType, params, result, projectedRisk, currentRisk, delayDelta);
    explanationEl.textContent = explanation;

    // Save to localStorage
    const session = Storage.getSession();
    if (session) Storage.saveScenarioResult(session.email, { type: scenarioType, risk: projectedRisk, summary: result.comparison_summary });

    renderScenarioChart(result);
}

function generateScenarioExplanation(scenarioType, params, result, projectedRisk, currentRisk, delayDelta) {
    const suppliers = (suppliersData && suppliersData.suppliers) || [];
    const riskOrder = { GREEN: 0, AMBER: 1, RED: 2 };
    const riskImproved = riskOrder[projectedRisk] < riskOrder[currentRisk];
    const riskWorsened = riskOrder[projectedRisk] > riskOrder[currentRisk];
    const impacts = result.supplier_impacts || [];
    const betterCount = impacts.filter(s => s.impact === 'better').length;
    const worseCount = impacts.filter(s => s.impact === 'worse').length;

    if (scenarioType === 'custom' && params.supplier_id) {
        const supplier = suppliers.find(s => s.supplier_id === params.supplier_id);
        const name = supplier ? supplier.supplier_name : params.supplier_id;
        const adj = params.adjustment;

        if (adj > 0) {
            return riskWorsened
                ? `Increasing ${name}'s delay by ${adj} days pushes ${worseCount} supplier(s) beyond critical thresholds, escalating risk from ${currentRisk} to ${projectedRisk}.`
                : `Adding ${adj} days to ${name} increases pressure on supplier payments but risk remains at ${currentRisk}.`;
        } else if (adj < 0) {
            return riskImproved
                ? `Reducing ${name}'s delay by ${Math.abs(adj)} days brings ${betterCount} supplier(s) back within terms, improving risk from ${currentRisk} to ${projectedRisk}.`
                : `Reducing ${name}'s delay by ${Math.abs(adj)} days eases pressure but more suppliers need attention to shift overall risk.`;
        }
        return `No change applied to ${name}.`;
    }

    if (scenarioType === 'continue_trend') {
        return riskWorsened
            ? `Without action, ${worseCount} supplier(s) deteriorate further \u2014 risk escalates from ${currentRisk} to ${projectedRisk}. Early intervention is critical.`
            : `Current trajectory holds risk at ${currentRisk}, but ${worseCount} supplier(s) continue worsening. Monitoring recommended.`;
    }
    if (scenarioType === 'accelerate_payments') {
        return riskImproved
            ? `Active intervention reduces delays across ${betterCount} supplier(s), bringing risk from ${currentRisk} down to ${projectedRisk}. Sustained effort required to maintain improvement.`
            : `Accelerating payments improves ${betterCount} supplier relationship(s) but current stress levels require more aggressive action to shift overall risk.`;
    }
    if (scenarioType === 'stabilize_now') {
        return `Freezing delays at current levels prevents further deterioration but ${worseCount > 0 ? 'does not resolve' : 'leaves'} existing overdue balances. Risk holds at ${projectedRisk}.`;
    }
    if (scenarioType === 'revenue_drop') {
        return riskWorsened
            ? `A 20% revenue decline cascades through supplier payments \u2014 ${worseCount} supplier(s) breach critical thresholds, pushing risk to ${projectedRisk}.`
            : `Revenue pressure would strain supplier relationships but existing buffers may absorb the initial shock.`;
    }
    return '';
}

function renderScenarioChart(data) {
    const canvas = document.getElementById('scenario-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (scenarioChart) scenarioChart.destroy();

    let focusId = 'S2';
    // For custom scenarios, focus on the selected supplier
    const scenarioType = document.getElementById('scenario-select').value;
    if (scenarioType === 'custom') {
        focusId = document.getElementById('scenario-supplier-select').value || 'S2';
    } else if (triageData && triageData.stretched_suppliers && triageData.stretched_suppliers.length > 0) {
        focusId = triageData.stretched_suppliers[0].supplier_id;
    }

    const weeks = (data.forecast_weeks || []).map(w => `W${w}`);
    const baseline = (data.baseline_forecast || {})[focusId] || [];
    const scenario = (data.scenario_forecast || {})[focusId] || [];
    if (weeks.length === 0 || baseline.length === 0) return;

    let name = focusId;
    if (suppliersData && suppliersData.suppliers) {
        const f = suppliersData.suppliers.find(s => s.supplier_id === focusId);
        if (f) name = f.supplier_name;
    }

    // Pick scenario line color based on direction
    const isImproving = scenario.length > 0 && baseline.length > 0 && scenario[scenario.length - 1] < baseline[baseline.length - 1];
    const scenarioColor = isImproving ? '#00e676' : '#ff1744';

    scenarioChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: weeks,
            datasets: [
                { label: `${name} \u2014 Current Path`, data: baseline, borderColor: '#7c5cfc', borderWidth: 2.5, pointRadius: 3, pointBackgroundColor: '#7c5cfc', tension: 0.3, fill: false },
                { label: `${name} \u2014 ${data.scenario_name || 'Scenario'}`, data: scenario, borderColor: scenarioColor, borderWidth: 2.5, borderDash: [5,3], pointRadius: 3, pointBackgroundColor: scenarioColor, tension: 0.3, fill: false },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#8b86a3', font: { family: 'Inter', size: 11 }, boxWidth: 10, padding: 14 } },
                tooltip: {
                    backgroundColor: 'rgba(10,14,26,0.95)',
                    titleColor: '#e8e6f0',
                    bodyColor: '#8b86a3',
                    callbacks: { label: function(c) { return `${c.dataset.label}: ${c.parsed.y.toFixed(1)}d`; } },
                },
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#5a5672', font: { family: 'Inter', size: 10 } } },
                y: { grid: { color: 'rgba(124,92,252,0.04)' }, ticks: { color: '#5a5672', font: { family: 'Inter', size: 10 }, callback: function(v) { return v + 'd'; } } },
            },
        },
    });
}

// ══════════════════════════════════════
//  TRIAGE SCORE
// ══════════════════════════════════════

function computeTriageScore() {
    if (!triageData || !suppliersData) return null;

    const suppliers = suppliersData.suppliers || [];
    if (suppliers.length === 0) return null;

    // Component 1: Delay variance (0-40 points)
    // Higher variance = more selective payment = higher score
    const delays = suppliers.map(s => s.current_delay);
    const meanDelay = delays.reduce((a, b) => a + b, 0) / delays.length;
    const variance = delays.reduce((acc, d) => acc + Math.pow(d - meanDelay, 2), 0) / delays.length;
    const stdDev = Math.sqrt(variance);
    const varianceScore = Math.min(40, (stdDev / Math.max(meanDelay, 1)) * 60);

    // Component 2: Spread deviation from baseline (0-35 points)
    const spreadIncrease = triageData.spread_increase_pct || 0;
    const spreadScore = Math.min(35, (spreadIncrease / 800) * 35);

    // Component 3: Stretched vs favored ratio (0-25 points)
    const stretched = (triageData.stretched_suppliers || []).length;
    const favored = (triageData.favored_suppliers || []).length;
    const total = suppliers.length;
    const ratioScore = total > 0 ? Math.min(25, (stretched / total) * 40) : 0;

    // Bank payment signal: if triage is detected (bank on time, suppliers delayed)
    // this is the core signal — boost score when there's a clear split
    const bankBonus = (triageData.triage_detected && favored > 0 && stretched > 0) ? 5 : 0;

    const rawScore = varianceScore + spreadScore + ratioScore + bankBonus;
    const score = Math.min(100, Math.max(0, Math.round(rawScore)));

    let category, explanation;
    if (score >= 70) {
        category = 'HIGH';
        explanation = 'Business is prioritizing bank payments over suppliers \u2014 early distress signal detected.';
    } else if (score >= 30) {
        category = 'MEDIUM';
        explanation = 'Some selective payment behavior detected \u2014 monitor supplier payment patterns closely.';
    } else {
        category = 'LOW';
        explanation = 'Payment behavior appears consistent across suppliers \u2014 no significant triage signal.';
    }

    return { score, category, explanation };
}

function renderTriageScore() {
    const result = computeTriageScore();
    const section = document.getElementById('triage-score-section');
    if (!result || !section) return;

    section.style.display = 'block';

    const scoreEl = document.getElementById('triage-score-number');
    const badgeEl = document.getElementById('triage-score-badge');
    const barEl = document.getElementById('triage-score-bar');
    const explainEl = document.getElementById('triage-score-explanation');

    scoreEl.textContent = result.score;
    badgeEl.textContent = result.category;
    badgeEl.className = `triage-score-badge ${result.category.toLowerCase()}`;

    const colorClass = result.category === 'HIGH' ? 'red' : result.category === 'MEDIUM' ? 'amber' : 'green';
    scoreEl.className = `triage-score-number ${colorClass}`;
    barEl.className = `triage-score-bar ${colorClass}`;
    barEl.style.width = result.score + '%';

    explainEl.textContent = result.explanation;
}

// ══════════════════════════════════════
//  CONSUMER DUTY OUTREACH ASSISTANT
// ══════════════════════════════════════

function shouldShowOutreach() {
    const riskLevel = (companyData && companyData.risk_level) || 'GREEN';
    const triageScore = computeTriageScore();
    const stretched = (triageData && triageData.stretched_suppliers) || [];

    return riskLevel === 'RED' || riskLevel === 'AMBER' ||
           (triageScore && triageScore.score >= 70) ||
           stretched.length >= 2;
}

function getOutreachSeverity() {
    const riskLevel = (companyData && companyData.risk_level) || 'GREEN';
    const triageScore = computeTriageScore();
    if (riskLevel === 'RED' || (triageScore && triageScore.score >= 70)) return 'high';
    return 'moderate';
}

function getOutreachContext() {
    const suppliers = (suppliersData && suppliersData.suppliers) || [];
    const stretched = (triageData && triageData.stretched_suppliers) || [];
    const profile = (companyData && companyData.profile) || {};
    const businessName = profile.company_name || 'your business';
    return { suppliers, stretched, businessName, count: stretched.length };
}

function generateOutreachPreview(severity) {
    if (severity === 'high') {
        return "We\u2019ve noticed some signs of financial pressure in your recent payment activity. Your NatWest relationship manager is here to help \u2014 we\u2019d like to discuss options that could ease your cash flow and support your business.";
    }
    return "We\u2019ve noticed some early changes in your payment patterns. This is completely normal for growing businesses \u2014 we\u2019re reaching out because we may be able to help with cash flow planning or flexible payment options.";
}

function generateFullOutreachMessage(severity, ctx) {
    const name = ctx.businessName;
    const count = ctx.count;

    if (severity === 'high') {
        return `<p class="outreach-greeting">Dear ${name} Team,</p>

<p>Thank you for being a valued NatWest customer. We\u2019re writing because our systems have identified some changes in your recent supplier payment activity that suggest your business may be experiencing cash flow pressure.</p>

<p><strong>We want you to know: this is not unusual, and we\u2019re here to help.</strong> Many businesses go through periods of financial strain, and early support can make a real difference.</p>

<p>We\u2019d like to offer you the following, at no obligation:</p>

<ul>
<li><strong>Business Health Check</strong> \u2014 A confidential review of your cash flow position with one of our SME specialists.</li>
<li><strong>Payment Flexibility</strong> \u2014 We can discuss adjusting your existing NatWest payment schedules to free up working capital.</li>
<li><strong>Financing Options</strong> \u2014 Short-term overdraft adjustments or invoice financing to bridge any gaps.</li>
<li><strong>Debt Advice Referral</strong> \u2014 If helpful, we can connect you with free, independent advice services.</li>
</ul>

<p>${count > 0 ? `We can see that ${count} of your key supplier relationship${count > 1 ? 's are' : ' is'} currently under pressure. Acting now can help protect those relationships and your business reputation.` : 'Acting early can help protect your supplier relationships and your business reputation.'}</p>

<p>Please reply to this message or call your relationship manager directly. Everything you share will be treated in confidence.</p>

<p class="outreach-sign">Warm regards,<br><strong>NatWest SME Support Team</strong></p>`;
    }

    return `<p class="outreach-greeting">Dear ${name} Team,</p>

<p>Thank you for banking with NatWest. We\u2019re reaching out because we\u2019ve noticed some recent changes in your payment patterns. This kind of shift is common as businesses grow or navigate seasonal changes \u2014 and it\u2019s exactly the kind of moment where a little support can go a long way.</p>

<p><strong>There\u2019s no cause for alarm.</strong> We simply want to make sure you know what\u2019s available to you:</p>

<ul>
<li><strong>Cash Flow Review</strong> \u2014 A quick, confidential look at your payment cycles with an SME advisor.</li>
<li><strong>Flexible Payment Options</strong> \u2014 We may be able to adjust existing NatWest payment schedules.</li>
<li><strong>Working Capital Solutions</strong> \u2014 Short-term options like invoice financing or overdraft adjustments.</li>
</ul>

<p>Think of this as a check-in, not an intervention. ${count > 0 ? `We can see ${count} supplier payment${count > 1 ? 's have' : ' has'} shifted recently \u2014 getting ahead of this now is always the best approach.` : 'Getting ahead of any potential issues is always the best approach.'}</p>

<p>Feel free to reply to this message or speak with your relationship manager at any time. We\u2019re here when you need us.</p>

<p class="outreach-sign">Best wishes,<br><strong>NatWest Business Support</strong></p>`;
}

function renderOutreach() {
    const section = document.getElementById('outreach-section');
    if (!section) return;

    if (!shouldShowOutreach()) {
        section.style.display = 'none';
        return;
    }

    const severity = getOutreachSeverity();
    const ctx = getOutreachContext();

    section.style.display = 'block';
    section.className = `outreach-section ${severity}`;

    // Subtitle
    document.getElementById('outreach-subtitle').textContent =
        severity === 'high'
            ? 'Consumer Duty \u2014 Priority Outreach Recommended'
            : 'Consumer Duty \u2014 Proactive Support Available';

    // Preview
    document.getElementById('outreach-preview').textContent = generateOutreachPreview(severity);

    // Full message (pre-generated, shown on expand)
    document.getElementById('outreach-message').innerHTML = generateFullOutreachMessage(severity, ctx);

    // Reset expand state
    const fullEl = document.getElementById('outreach-full');
    const expandBtn = document.getElementById('outreach-expand-btn');
    fullEl.style.display = 'none';
    expandBtn.textContent = 'Generate Full Message';
}

function setupOutreachListeners() {
    const expandBtn = document.getElementById('outreach-expand-btn');
    if (expandBtn) {
        expandBtn.addEventListener('click', () => {
            const fullEl = document.getElementById('outreach-full');
            const isVisible = fullEl.style.display !== 'none';
            fullEl.style.display = isVisible ? 'none' : 'block';
            expandBtn.textContent = isVisible ? 'Generate Full Message' : 'Hide Message';
            if (!isVisible) fullEl.style.animation = 'fadeIn 0.3s ease';
        });
    }

    const copyBtn = document.getElementById('outreach-copy-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const msgEl = document.getElementById('outreach-message');
            const text = msgEl.innerText || msgEl.textContent;
            navigator.clipboard.writeText(text).then(() => {
                const copied = document.getElementById('outreach-copied');
                copied.style.display = 'inline';
                setTimeout(() => { copied.style.display = 'none'; }, 2000);
            });
        });
    }
}

// ══════════════════════════════════════
//  FEATURE: RISK TIMELINE (week-over-week stress evolution)
// ══════════════════════════════════════

function buildRiskTimelineData() {
    const suppliers = (suppliersData && suppliersData.suppliers) || [];
    if (suppliers.length === 0) return [];

    // Use sparkline data (last 12 weeks) to reconstruct weekly risk phases
    const maxLen = Math.max(...suppliers.map(s => (s.sparkline || []).length));
    if (maxLen === 0) return [];

    const phases = [];
    for (let i = 0; i < maxLen; i++) {
        const weekNum = 52 - maxLen + 1 + i;
        const delays = suppliers.map(s => {
            const sp = s.sparkline || [];
            return sp[i] !== undefined ? sp[i] : s.current_delay;
        });
        const terms = suppliers.map(s => s.contractual_terms || 21);

        // Compute spread: difference between max and min delay
        const maxDelay = Math.max(...delays);
        const minDelay = Math.min(...delays);
        const spread = maxDelay - minDelay;

        // Count how many exceed terms
        const overTerms = delays.filter((d, idx) => d > terms[idx] + 5).length;
        const criticalCount = delays.filter((d, idx) => d > terms[idx] * 1.5).length;

        // Derive phase severity
        let severity, label;
        if (criticalCount >= 2 || spread > 35) {
            severity = 'red';
            label = 'Critical';
        } else if (overTerms >= 2 || spread > 20) {
            severity = 'amber';
            label = 'Triage';
        } else if (overTerms >= 1 || spread > 10) {
            severity = 'amber-light';
            label = 'Watch';
        } else {
            severity = 'green';
            label = 'Normal';
        }

        phases.push({ week: weekNum, severity, label, spread: Math.round(spread), avgDelay: Math.round(delays.reduce((a, b) => a + b, 0) / delays.length) });
    }

    return phases;
}

function renderRiskTimeline() {
    const container = document.getElementById('risk-timeline');
    if (!container) return;

    const phases = buildRiskTimelineData();
    if (phases.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);font-size:0.8rem;text-align:center;padding:16px;">No timeline data available.</p>';
        return;
    }

    // Group consecutive weeks with same severity into ranges
    const groups = [];
    let current = { severity: phases[0].severity, label: phases[0].label, startWeek: phases[0].week, endWeek: phases[0].week, peakSpread: phases[0].spread };
    for (let i = 1; i < phases.length; i++) {
        if (phases[i].severity === current.severity) {
            current.endWeek = phases[i].week;
            current.peakSpread = Math.max(current.peakSpread, phases[i].spread);
        } else {
            groups.push({ ...current });
            current = { severity: phases[i].severity, label: phases[i].label, startWeek: phases[i].week, endWeek: phases[i].week, peakSpread: phases[i].spread };
        }
    }
    groups.push({ ...current });

    // Build event descriptions for each phase
    const eventDescriptions = {
        'green': 'All suppliers paid within normal terms',
        'amber-light': 'Early divergence in payment timing',
        'amber': 'Selective payment delays emerging',
        'red': 'Multiple suppliers in critical delay',
    };

    container.innerHTML = groups.map((g, i) => {
        const weekRange = g.startWeek === g.endWeek ? `W${g.startWeek}` : `W${g.startWeek}\u2013${g.endWeek}`;
        const dotColor = g.severity === 'amber-light' ? 'amber' : g.severity;
        const lineColor = i < groups.length - 1 ? (groups[i + 1].severity === 'amber-light' ? 'amber' : groups[i + 1].severity) : dotColor;
        const description = eventDescriptions[g.severity] || '';
        return `
            <div class="risk-tl-week" title="${weekRange}: ${g.label} — ${description}">
                <div class="risk-tl-dot ${dotColor}"></div>
                ${i < groups.length - 1 ? `<div class="risk-tl-line ${lineColor}"></div>` : ''}
                <div class="risk-tl-label">${weekRange}</div>
                <div class="risk-tl-phase-label">${g.label}</div>
            </div>
        `;
    }).join('');
}


// ══════════════════════════════════════
//  FEATURE: PER-SME PDF REPORT DROPDOWN
// ══════════════════════════════════════

function setupReportButton() {
    const triggerBtn = document.getElementById('report-trigger-btn');
    const wrap = document.getElementById('report-dropdown-wrap');
    const dropdown = document.getElementById('report-dropdown');
    const allBtn = document.getElementById('report-all-btn');
    if (!triggerBtn || !wrap) return;

    // Toggle dropdown
    triggerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = wrap.classList.contains('open');
        if (!isOpen) {
            populateReportDropdown();
        }
        wrap.classList.toggle('open');
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (!wrap.contains(e.target)) {
            wrap.classList.remove('open');
        }
    });

    // "All SMEs" button
    if (allBtn) {
        allBtn.addEventListener('click', () => {
            wrap.classList.remove('open');
            generateAllSMEReports();
        });
    }
}

function populateReportDropdown() {
    const list = document.getElementById('report-dropdown-list');
    if (!list) return;

    list.innerHTML = '';

    Object.entries(SME_DATA).forEach(([id, sme]) => {
        const suppliers = (sme.suppliers && sme.suppliers.suppliers) || [];
        const delays = suppliers.map(s => s.current_delay);
        const risk = AnalysisEngine.calculateRisk(delays);
        const supplierCount = suppliers.length;
        const riskColor = risk === 'RED' ? 'red' : risk === 'AMBER' ? 'amber' : 'green';

        const btn = document.createElement('button');
        btn.className = 'report-dropdown-item';
        btn.dataset.smeId = id;
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <div class="report-item-info">
                <span class="report-item-name">${sme.name}</span>
                <span class="report-item-meta">${supplierCount} supplier${supplierCount !== 1 ? 's' : ''} · Risk: ${risk}</span>
            </div>
            <span class="report-item-risk ${riskColor}"></span>
        `;

        btn.addEventListener('click', () => {
            const wrap = document.getElementById('report-dropdown-wrap');
            wrap.classList.remove('open');
            generateSingleSMEReport(id);
        });

        list.appendChild(btn);
    });
}

function generateSingleSMEReport(smeId) {
    const sme = SME_DATA[smeId];
    if (!sme) return;

    // Compute data for this specific SME
    const smeCompanyData = AnalysisEngine.buildCompanyData(sme);
    const smeTriageData = AnalysisEngine.buildTriageData(sme);
    const smeSuppliers = sme.suppliers;
    const smeTriageScore = computeTriageScoreForSME(smeSuppliers, smeTriageData);
    const smeTimelinePhases = buildRiskTimelineDataForSME(smeSuppliers);

    buildAndDownloadPDFForSME(smeCompanyData, smeSuppliers, smeTriageData, smeTriageScore, smeTimelinePhases);
}

function generateAllSMEReports() {
    buildAndDownloadPortfolioPDF();
}

/**
 * Compute triage score for a specific SME (standalone, doesn't touch globals).
 */
function computeTriageScoreForSME(suppliersObj, triageObj) {
    if (!triageObj || !suppliersObj) return null;

    const suppliers = suppliersObj.suppliers || [];
    if (suppliers.length === 0) return null;

    const delays = suppliers.map(s => s.current_delay);
    const meanDelay = delays.reduce((a, b) => a + b, 0) / delays.length;
    const variance = delays.reduce((acc, d) => acc + Math.pow(d - meanDelay, 2), 0) / delays.length;
    const stdDev = Math.sqrt(variance);
    const varianceScore = Math.min(40, (stdDev / Math.max(meanDelay, 1)) * 60);

    const spreadIncrease = triageObj.spread_increase_pct || 0;
    const spreadScore = Math.min(35, (spreadIncrease / 800) * 35);

    const stretched = (triageObj.stretched_suppliers || []).length;
    const favored = (triageObj.favored_suppliers || []).length;
    const total = suppliers.length;
    const ratioScore = total > 0 ? Math.min(25, (stretched / total) * 40) : 0;

    const bankBonus = (triageObj.triage_detected && favored > 0 && stretched > 0) ? 5 : 0;

    const rawScore = varianceScore + spreadScore + ratioScore + bankBonus;
    const score = Math.min(100, Math.max(0, Math.round(rawScore)));

    let category, explanation;
    if (score >= 70) {
        category = 'HIGH';
        explanation = 'Business is prioritizing bank payments over suppliers — early distress signal detected.';
    } else if (score >= 30) {
        category = 'MEDIUM';
        explanation = 'Some selective payment behavior detected — monitor supplier payment patterns closely.';
    } else {
        category = 'LOW';
        explanation = 'Payment behavior appears consistent across suppliers — no significant triage signal.';
    }

    return { score, category, explanation };
}

/**
 * Build risk timeline data for a specific SME's suppliers (standalone).
 */
function buildRiskTimelineDataForSME(suppliersObj) {
    const suppliers = (suppliersObj && suppliersObj.suppliers) || [];
    if (suppliers.length === 0) return [];

    const maxLen = Math.max(...suppliers.map(s => (s.sparkline || []).length));
    if (maxLen === 0) return [];

    const phases = [];
    for (let i = 0; i < maxLen; i++) {
        const weekNum = 52 - maxLen + 1 + i;
        const delays = suppliers.map(s => {
            const sp = s.sparkline || [];
            return sp[i] !== undefined ? sp[i] : s.current_delay;
        });
        const terms = suppliers.map(s => s.contractual_terms || 21);

        const maxDelay = Math.max(...delays);
        const minDelay = Math.min(...delays);
        const spread = maxDelay - minDelay;

        const overTerms = delays.filter((d, idx) => d > terms[idx] + 5).length;
        const criticalCount = delays.filter((d, idx) => d > terms[idx] * 1.5).length;

        let severity, label;
        if (criticalCount >= 2 || spread > 35) {
            severity = 'red'; label = 'Critical';
        } else if (overTerms >= 2 || spread > 20) {
            severity = 'amber'; label = 'Triage';
        } else if (overTerms >= 1 || spread > 10) {
            severity = 'amber-light'; label = 'Watch';
        } else {
            severity = 'green'; label = 'Normal';
        }

        phases.push({ week: weekNum, severity, label, spread: Math.round(spread) });
    }

    return phases;
}

function buildAndDownloadPDFForSME(compData, suppData, triData, triScore, timelinePhases) {
    const profile = (compData && compData.profile) || {};
    const riskLevel = (compData && compData.risk_level) || 'AMBER';
    const suppliers = (suppData && suppData.suppliers) || [];
    const stretched = (triData && triData.stretched_suppliers) || [];
    const favored = (triData && triData.favored_suppliers) || [];
    const triageScore = triScore;

    // Build timeline groups
    const groups = [];
    if (timelinePhases.length > 0) {
        let cur = { severity: timelinePhases[0].label, startWeek: timelinePhases[0].week, endWeek: timelinePhases[0].week };
        for (let i = 1; i < timelinePhases.length; i++) {
            if (timelinePhases[i].label === cur.severity) {
                cur.endWeek = timelinePhases[i].week;
            } else {
                groups.push({ ...cur });
                cur = { severity: timelinePhases[i].label, startWeek: timelinePhases[i].week, endWeek: timelinePhases[i].week };
            }
        }
        groups.push({ ...cur });
    }

    const reportDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const companyName = profile.company_name || 'Unknown SME';

    // Build supplier rows
    const supplierRows = suppliers.map(s => {
        const delay = Math.round(s.current_delay);
        const terms = s.contractual_terms || 21;
        const excess = delay - terms;
        const status = s.severity === 'critical' ? 'CRITICAL' : s.severity === 'warning' ? 'WARNING' : 'NORMAL';
        const trend = s.trend === 'accelerating' ? 'Accelerating' : s.trend === 'drifting' ? 'Drifting' : 'Stable';
        return `<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${s.supplier_name}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${delay}d</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${terms}d</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;color:${excess > 15 ? '#dc2626' : excess > 0 ? '#d97706' : '#16a34a'}">${excess > 0 ? '+' + excess + 'd' : 'On time'}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;"><span style="padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:${status === 'CRITICAL' ? '#fef2f2' : status === 'WARNING' ? '#fffbeb' : '#f0fdf4'};color:${status === 'CRITICAL' ? '#dc2626' : status === 'WARNING' ? '#d97706' : '#16a34a'}">${status}</span></td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${trend}</td>
        </tr>`;
    }).join('');

    // Build timeline text
    const timelineText = groups.length > 0
        ? groups.map(g => {
            const range = g.startWeek === g.endWeek ? `Week ${g.startWeek}` : `Weeks ${g.startWeek}–${g.endWeek}`;
            return `<div style="display:flex;align-items:center;gap:10px;margin:4px 0;">
                <span style="width:10px;height:10px;border-radius:50%;display:inline-block;background:${g.severity === 'Critical' ? '#dc2626' : g.severity === 'Triage' ? '#d97706' : g.severity === 'Watch' ? '#f59e0b' : '#16a34a'}"></span>
                <strong>${range}:</strong> ${g.severity}
            </div>`;
        }).join('')
        : '<p>No timeline data available.</p>';

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>PayPulse Risk Report — ${companyName}</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1f2937; line-height: 1.6; }
            @page { size: A4; margin: 0; }
            .page { padding: 40px; max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #4f46e5; padding-bottom: 16px; margin-bottom: 24px; }
            .logo-area { display: flex; align-items: center; gap: 12px; }
            .logo-box { width: 40px; height: 40px; background: #4f46e5; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 18px; }
            .logo-text { font-size: 22px; font-weight: 700; color: #4f46e5; }
            .report-meta { text-align: right; font-size: 12px; color: #6b7280; }
            .risk-banner { padding: 16px 20px; border-radius: 8px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; }
            .risk-banner.red { background: #fef2f2; border: 1px solid #fecaca; }
            .risk-banner.amber { background: #fffbeb; border: 1px solid #fde68a; }
            .risk-banner.green { background: #f0fdf4; border: 1px solid #bbf7d0; }
            .risk-level { font-size: 28px; font-weight: 800; }
            .risk-level.red { color: #dc2626; }
            .risk-level.amber { color: #d97706; }
            .risk-level.green { color: #16a34a; }
            .section { margin-bottom: 24px; }
            .section-title { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #4f46e5; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th { padding: 10px 12px; background: #f9fafb; border-bottom: 2px solid #e5e7eb; text-align: left; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px; color: #6b7280; }
            .summary-text { font-size: 13px; color: #374151; line-height: 1.7; }
            .kpi-row { display: flex; gap: 16px; margin-bottom: 20px; }
            .kpi { flex: 1; padding: 14px; border-radius: 8px; background: #f9fafb; border: 1px solid #e5e7eb; text-align: center; }
            .kpi-value { font-size: 24px; font-weight: 800; }
            .kpi-label { font-size: 11px; color: #6b7280; text-transform: uppercase; margin-top: 2px; }
            .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
            .confidential { color: #dc2626; font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
            @media print { .page { padding: 30px; } }
        </style>
    </head>
    <body>
        <div class="page">
            <div class="header">
                <div class="logo-area">
                    <div class="logo-box">P</div>
                    <div>
                        <div class="logo-text">PayPulse</div>
                        <div style="font-size:11px;color:#6b7280;">NatWest SME Risk Intelligence</div>
                    </div>
                </div>
                <div class="report-meta">
                    <div><strong>SME Risk Report</strong></div>
                    <div>${reportDate}</div>
                    <div class="confidential">Confidential</div>
                </div>
            </div>

            <div class="risk-banner ${riskLevel.toLowerCase()}">
                <div>
                    <div style="font-size:12px;color:#6b7280;font-weight:600;">OVERALL RISK ASSESSMENT</div>
                    <div style="font-size:15px;font-weight:600;margin-top:4px;">${companyName}</div>
                </div>
                <div class="risk-level ${riskLevel.toLowerCase()}">${riskLevel}</div>
            </div>

            <div class="kpi-row">
                <div class="kpi">
                    <div class="kpi-value" style="color:${(triageScore && triageScore.score >= 70) ? '#dc2626' : (triageScore && triageScore.score >= 30) ? '#d97706' : '#16a34a'}">${triageScore ? triageScore.score : '—'}</div>
                    <div class="kpi-label">Triage Score</div>
                </div>
                <div class="kpi">
                    <div class="kpi-value" style="color:#dc2626">${stretched.length}</div>
                    <div class="kpi-label">Stretched Suppliers</div>
                </div>
                <div class="kpi">
                    <div class="kpi-value" style="color:#16a34a">${favored.length}</div>
                    <div class="kpi-label">Favored Suppliers</div>
                </div>
                <div class="kpi">
                    <div class="kpi-value">${triData && triData.spread_increase_pct ? triData.spread_increase_pct + '%' : '—'}</div>
                    <div class="kpi-label">Spread Increase</div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">Executive Summary</div>
                <p class="summary-text">${compData && compData.executive_summary ? compData.executive_summary : 'PayPulse has detected early signs of financial stress through supplier payment pattern analysis.'}</p>
            </div>

            <div class="section">
                <div class="section-title">Risk Evolution Timeline</div>
                ${timelineText}
            </div>

            <div class="section">
                <div class="section-title">Supplier Payment Analysis</div>
                <table>
                    <thead>
                        <tr>
                            <th>Supplier</th>
                            <th style="text-align:center;">Delay</th>
                            <th style="text-align:center;">Terms</th>
                            <th style="text-align:center;">Excess</th>
                            <th style="text-align:center;">Status</th>
                            <th style="text-align:center;">Trend</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${supplierRows}
                    </tbody>
                </table>
            </div>

            <div class="section">
                <div class="section-title">Triage Detection</div>
                <p class="summary-text">${triData && triData.explanation ? triData.explanation : (triageScore ? triageScore.explanation : 'No triage signal detected.')}</p>
            </div>

            <div class="section">
                <div class="section-title">Recommended Actions</div>
                <ul style="font-size:13px;color:#374151;padding-left:20px;">
                    ${riskLevel === 'RED' ? '<li>Escalate to Credit Committee immediately</li><li>Schedule urgent RM outreach within 24 hours</li><li>Review credit line and overdraft utilisation</li><li>Consider restructuring payment terms</li>' : riskLevel === 'AMBER' ? '<li>Schedule RM outreach within 48 hours</li><li>Monitor supplier payment patterns weekly</li><li>Offer NatWest cash flow advisory services</li><li>Review working capital facilities</li>' : '<li>Continue standard monitoring</li><li>No immediate action required</li>'}
                </ul>
            </div>

            <div class="footer">
                <p>Generated by PayPulse — NatWest AI Early Warning System &nbsp;|&nbsp; ${reportDate}</p>
                <p style="margin-top:4px;">This report is generated from real-time supplier payment analysis and is intended for internal bank use only.</p>
            </div>
        </div>
    </body>
    </html>`;

    // Open in a new window for print-to-PDF
    const printWindow = window.open('', '_blank', 'width=800,height=1100');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = function() {
        printWindow.print();
    };
}

/**
 * Generate a portfolio overview PDF covering all SMEs.
 */
function buildAndDownloadPortfolioPDF() {
    const reportDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    // Build rows for each SME
    const smeRows = Object.entries(SME_DATA).map(([id, sme]) => {
        const suppliers = (sme.suppliers && sme.suppliers.suppliers) || [];
        const delays = suppliers.map(s => s.current_delay);
        const risk = AnalysisEngine.calculateRisk(delays);
        const triageData = AnalysisEngine.buildTriageData(sme);
        const triageScore = computeTriageScoreForSME(sme.suppliers, triageData);
        const trend = AnalysisEngine.deriveTrend(suppliers);
        const avgDelay = delays.length > 0 ? Math.round(delays.reduce((a, b) => a + b, 0) / delays.length) : 0;
        const stretched = (triageData.stretched_suppliers || []).length;
        const total = suppliers.length;

        const trendLabel = trend === 'increasing' ? '↑ Worsening' : trend === 'decreasing' ? '↓ Improving' : '→ Stable';
        const trendColor = trend === 'increasing' ? '#dc2626' : trend === 'decreasing' ? '#16a34a' : '#6b7280';

        return `<tr>
            <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;">${sme.name}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">
                <span style="padding:3px 10px;border-radius:4px;font-size:11px;font-weight:700;background:${risk === 'RED' ? '#fef2f2' : risk === 'AMBER' ? '#fffbeb' : '#f0fdf4'};color:${risk === 'RED' ? '#dc2626' : risk === 'AMBER' ? '#d97706' : '#16a34a'}">${risk}</span>
            </td>
            <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${triageScore ? triageScore.score : '—'}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${avgDelay}d</td>
            <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${stretched}/${total}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;color:${trendColor};font-weight:600;font-size:12px;">${trendLabel}</td>
        </tr>`;
    }).join('');

    // Count portfolio-level metrics
    const allSMEs = Object.entries(SME_DATA);
    const totalSMEs = allSMEs.length;
    const redCount = allSMEs.filter(([, sme]) => {
        const d = (sme.suppliers && sme.suppliers.suppliers || []).map(s => s.current_delay);
        return AnalysisEngine.calculateRisk(d) === 'RED';
    }).length;
    const amberCount = allSMEs.filter(([, sme]) => {
        const d = (sme.suppliers && sme.suppliers.suppliers || []).map(s => s.current_delay);
        return AnalysisEngine.calculateRisk(d) === 'AMBER';
    }).length;
    const greenCount = totalSMEs - redCount - amberCount;

    // Build individual SME detail sections
    const smeDetailSections = Object.entries(SME_DATA).map(([id, sme]) => {
        const suppliers = (sme.suppliers && sme.suppliers.suppliers) || [];
        const delays = suppliers.map(s => s.current_delay);
        const risk = AnalysisEngine.calculateRisk(delays);
        const compData = AnalysisEngine.buildCompanyData(sme);
        const triData = AnalysisEngine.buildTriageData(sme);
        const avgDelay = delays.length > 0 ? Math.round(delays.reduce((a, b) => a + b, 0) / delays.length) : 0;

        const supplierList = suppliers.map(s => {
            const delay = Math.round(s.current_delay);
            const terms = s.contractual_terms || 21;
            const excess = delay - terms;
            const status = s.severity === 'critical' ? 'CRITICAL' : s.severity === 'warning' ? 'WARNING' : 'NORMAL';
            return `<tr>
                <td style="padding:6px 10px;border-bottom:1px solid #f3f4f6;font-size:12px;">${s.supplier_name}</td>
                <td style="padding:6px 10px;border-bottom:1px solid #f3f4f6;text-align:center;font-size:12px;">${delay}d / ${terms}d</td>
                <td style="padding:6px 10px;border-bottom:1px solid #f3f4f6;text-align:center;font-size:12px;color:${excess > 15 ? '#dc2626' : excess > 0 ? '#d97706' : '#16a34a'}">${excess > 0 ? '+' + excess + 'd' : 'On time'}</td>
                <td style="padding:6px 10px;border-bottom:1px solid #f3f4f6;text-align:center;font-size:11px;">
                    <span style="padding:2px 6px;border-radius:3px;font-weight:600;background:${status === 'CRITICAL' ? '#fef2f2' : status === 'WARNING' ? '#fffbeb' : '#f0fdf4'};color:${status === 'CRITICAL' ? '#dc2626' : status === 'WARNING' ? '#d97706' : '#16a34a'}">${status}</span>
                </td>
            </tr>`;
        }).join('');

        return `
        <div style="margin-bottom:28px;page-break-inside:avoid;">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:${risk === 'RED' ? '#fef2f2' : risk === 'AMBER' ? '#fffbeb' : '#f0fdf4'};border:1px solid ${risk === 'RED' ? '#fecaca' : risk === 'AMBER' ? '#fde68a' : '#bbf7d0'};border-radius:8px;margin-bottom:12px;">
                <div>
                    <div style="font-size:15px;font-weight:700;">${sme.name}</div>
                    <div style="font-size:11px;color:#6b7280;margin-top:2px;">Avg delay: ${avgDelay}d · ${suppliers.length} suppliers</div>
                </div>
                <span style="font-size:20px;font-weight:800;color:${risk === 'RED' ? '#dc2626' : risk === 'AMBER' ? '#d97706' : '#16a34a'}">${risk}</span>
            </div>
            <p style="font-size:12px;color:#374151;line-height:1.6;margin-bottom:10px;">${compData.executive_summary}</p>
            <table style="width:100%;border-collapse:collapse;">
                <thead>
                    <tr>
                        <th style="padding:6px 10px;background:#f9fafb;border-bottom:1px solid #e5e7eb;text-align:left;font-size:10px;text-transform:uppercase;color:#6b7280;">Supplier</th>
                        <th style="padding:6px 10px;background:#f9fafb;border-bottom:1px solid #e5e7eb;text-align:center;font-size:10px;text-transform:uppercase;color:#6b7280;">Delay / Terms</th>
                        <th style="padding:6px 10px;background:#f9fafb;border-bottom:1px solid #e5e7eb;text-align:center;font-size:10px;text-transform:uppercase;color:#6b7280;">Excess</th>
                        <th style="padding:6px 10px;background:#f9fafb;border-bottom:1px solid #e5e7eb;text-align:center;font-size:10px;text-transform:uppercase;color:#6b7280;">Status</th>
                    </tr>
                </thead>
                <tbody>${supplierList}</tbody>
            </table>
        </div>`;
    }).join('');

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>PayPulse Portfolio Report — All SMEs</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1f2937; line-height: 1.6; }
            @page { size: A4; margin: 0; }
            .page { padding: 40px; max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #4f46e5; padding-bottom: 16px; margin-bottom: 24px; }
            .logo-area { display: flex; align-items: center; gap: 12px; }
            .logo-box { width: 40px; height: 40px; background: #4f46e5; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 18px; }
            .logo-text { font-size: 22px; font-weight: 700; color: #4f46e5; }
            .report-meta { text-align: right; font-size: 12px; color: #6b7280; }
            .section { margin-bottom: 24px; }
            .section-title { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #4f46e5; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th { padding: 10px 12px; background: #f9fafb; border-bottom: 2px solid #e5e7eb; text-align: left; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px; color: #6b7280; }
            .kpi-row { display: flex; gap: 16px; margin-bottom: 24px; }
            .kpi { flex: 1; padding: 14px; border-radius: 8px; background: #f9fafb; border: 1px solid #e5e7eb; text-align: center; }
            .kpi-value { font-size: 28px; font-weight: 800; }
            .kpi-label { font-size: 11px; color: #6b7280; text-transform: uppercase; margin-top: 2px; }
            .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
            .confidential { color: #dc2626; font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
            @media print { .page { padding: 30px; } }
        </style>
    </head>
    <body>
        <div class="page">
            <div class="header">
                <div class="logo-area">
                    <div class="logo-box">P</div>
                    <div>
                        <div class="logo-text">PayPulse</div>
                        <div style="font-size:11px;color:#6b7280;">NatWest SME Risk Intelligence</div>
                    </div>
                </div>
                <div class="report-meta">
                    <div><strong>Portfolio Risk Report</strong></div>
                    <div>${reportDate}</div>
                    <div class="confidential">Confidential</div>
                </div>
            </div>

            <div style="padding:16px 20px;border-radius:8px;margin-bottom:24px;background:linear-gradient(135deg, #eff6ff, #f0fdf4);border:1px solid #bfdbfe;">
                <div style="font-size:12px;color:#6b7280;font-weight:600;">PORTFOLIO OVERVIEW</div>
                <div style="font-size:18px;font-weight:700;margin-top:4px;">NatWest SME Lending Portfolio</div>
                <div style="font-size:12px;color:#6b7280;margin-top:2px;">${totalSMEs} businesses monitored by PayPulse AI</div>
            </div>

            <div class="kpi-row">
                <div class="kpi">
                    <div class="kpi-value">${totalSMEs}</div>
                    <div class="kpi-label">Total SMEs</div>
                </div>
                <div class="kpi">
                    <div class="kpi-value" style="color:#dc2626">${redCount}</div>
                    <div class="kpi-label">High Risk</div>
                </div>
                <div class="kpi">
                    <div class="kpi-value" style="color:#d97706">${amberCount}</div>
                    <div class="kpi-label">Medium Risk</div>
                </div>
                <div class="kpi">
                    <div class="kpi-value" style="color:#16a34a">${greenCount}</div>
                    <div class="kpi-label">Low Risk</div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">Risk Distribution</div>
                <table>
                    <thead>
                        <tr>
                            <th>Business</th>
                            <th style="text-align:center;">Risk</th>
                            <th style="text-align:center;">Triage Score</th>
                            <th style="text-align:center;">Avg Delay</th>
                            <th style="text-align:center;">Stretched</th>
                            <th style="text-align:center;">Trend</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${smeRows}
                    </tbody>
                </table>
            </div>

            <div class="section" style="page-break-before:always;">
                <div class="section-title">Individual SME Assessments</div>
                ${smeDetailSections}
            </div>

            <div class="section">
                <div class="section-title">Portfolio Recommendations</div>
                <ul style="font-size:13px;color:#374151;padding-left:20px;">
                    ${redCount > 0 ? '<li><strong>Immediate:</strong> Escalate ' + redCount + ' high-risk SME' + (redCount > 1 ? 's' : '') + ' to Credit Committee for review</li>' : ''}
                    ${amberCount > 0 ? '<li><strong>This Week:</strong> Schedule RM outreach for ' + amberCount + ' medium-risk SME' + (amberCount > 1 ? 's' : '') + '</li>' : ''}
                    <li><strong>Ongoing:</strong> Continue PayPulse monitoring across all ${totalSMEs} accounts</li>
                    <li><strong>Consumer Duty:</strong> Initiate proactive support outreach for businesses showing payment triage patterns</li>
                    ${redCount === 0 && amberCount === 0 ? '<li><strong>Status:</strong> All SMEs within normal parameters — no immediate action required</li>' : ''}
                </ul>
            </div>

            <div class="footer">
                <p>Generated by PayPulse — NatWest AI Early Warning System &nbsp;|&nbsp; ${reportDate}</p>
                <p style="margin-top:4px;">This portfolio report covers ${totalSMEs} SME lending relationships and is intended for internal bank use only.</p>
            </div>
        </div>
    </body>
    </html>`;

    const printWindow = window.open('', '_blank', 'width=800,height=1100');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = function() {
        printWindow.print();
    };
}


// ══════════════════════════════════════
//  FEATURE: LIVE ALERT SIMULATION
// ══════════════════════════════════════

let alertSimulationTimer = null;

function scheduleLiveAlerts() {
    // Disabled — notifications were too frequent
    return;

    // Clear any existing timer
    if (alertSimulationTimer) clearTimeout(alertSimulationTimer);

    const suppliers = (suppliersData && suppliersData.suppliers) || [];
    const alerts = buildLiveAlerts(suppliers);
    if (alerts.length === 0) return;

    // Show first alert after 3 seconds, then cycle every 20 seconds
    let alertIndex = 0;
    alertSimulationTimer = setTimeout(function showNextAlert() {
        if (alertIndex < alerts.length) {
            showLiveAlert(alerts[alertIndex]);
            alertIndex++;
            alertSimulationTimer = setTimeout(showNextAlert, 20000);
        }
    }, 3000);
}

function buildLiveAlerts(suppliers) {
    const alerts = [];

    // Find suppliers with accelerating or drifting trends
    const accelerating = suppliers.filter(s => s.trend === 'accelerating');
    const drifting = suppliers.filter(s => s.trend === 'drifting');
    const critical = suppliers.filter(s => s.severity === 'critical');

    // Alert 1: Accelerating payment delay
    if (accelerating.length > 0) {
        const s = accelerating[0];
        const slope = s.trend_slope ? `+${s.trend_slope}` : '+2.8';
        alerts.push({
            title: 'Payment Delay Accelerating',
            message: `${s.supplier_name} payment delay accelerating ${slope} days/week. Current: ${Math.round(s.current_delay)}d vs ${s.contractual_terms}d terms.`,
            severity: 'critical',
        });
    }

    // Alert 2: Triage pattern detected
    if (triageData && triageData.triage_detected) {
        const spreadPct = triageData.spread_increase_pct || 0;
        alerts.push({
            title: 'Triage Pattern Intensifying',
            message: `Payment spread now ${spreadPct}% above baseline. ${(triageData.stretched_suppliers || []).length} suppliers deprioritised vs ${(triageData.favored_suppliers || []).length} favored.`,
            severity: 'warning',
        });
    }

    // Alert 3: New critical threshold breach
    if (critical.length > 0) {
        const newest = critical[critical.length - 1];
        const excess = Math.round(newest.current_delay - newest.contractual_terms);
        alerts.push({
            title: 'Critical Threshold Breach',
            message: `${newest.supplier_name} now ${excess} days beyond contractual terms. Immediate review recommended.`,
            severity: 'critical',
        });
    }

    // Alert 4: Drifting supplier warning
    if (drifting.length > 0 && alerts.length < 3) {
        const s = drifting[0];
        alerts.push({
            title: 'Upward Drift Detected',
            message: `${s.supplier_name} showing steady upward drift in payment delays. Projected to breach critical threshold in 4–6 weeks.`,
            severity: 'warning',
        });
    }

    return alerts;
}

function showLiveAlert(alert) {
    const toast = document.getElementById('alert-toast');
    const titleEl = document.getElementById('alert-toast-title');
    const msgEl = document.getElementById('alert-toast-msg');
    const iconEl = toast.querySelector('.alert-toast-icon');
    if (!toast || !titleEl || !msgEl) return;

    // Update content
    titleEl.textContent = alert.title;
    msgEl.textContent = alert.message;

    // Update severity styling
    const isCritical = alert.severity === 'critical';
    toast.style.borderColor = isCritical ? 'rgba(255, 23, 68, 0.3)' : 'rgba(255, 171, 0, 0.25)';
    toast.style.background = isCritical
        ? 'linear-gradient(135deg, rgba(255, 23, 68, 0.12), rgba(15, 20, 40, 0.95))'
        : 'linear-gradient(135deg, rgba(255, 171, 0, 0.12), rgba(15, 20, 40, 0.95))';
    titleEl.style.color = isCritical ? '#ff1744' : '';
    if (iconEl) {
        iconEl.style.background = isCritical ? 'rgba(255, 23, 68, 0.15)' : '';
        const svg = iconEl.querySelector('svg');
        if (svg) svg.style.color = isCritical ? '#ff1744' : '';
    }

    // Show with animation
    toast.classList.remove('dismissing');
    toast.style.display = 'flex';
    toast.style.animation = 'none';
    // Force reflow to restart animation
    void toast.offsetWidth;
    toast.style.animation = 'slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1)';

    // Auto-dismiss after 8 seconds
    setTimeout(() => {
        if (toast.style.display !== 'none') {
            toast.classList.add('dismissing');
            setTimeout(() => {
                toast.style.display = 'none';
                toast.classList.remove('dismissing');
            }, 300);
        }
    }, 8000);
}
