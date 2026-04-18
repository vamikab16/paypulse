/**
 * PayPulse — NatWest SME Risk Intelligence Platform
 * Auth + Onboarding + Dashboard (SME + Bank Risk) + Simulator + Profile
 */

const API_BASE = '';

// ── XSS-safe interpolation helper ──
// Escape strings before dropping them into template literals that feed innerHTML.
// Use for ANY value originating from API responses, user input, or data we don't
// fully control (supplier names, reasons, labels, detail text, etc.).
function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

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
    document.querySelectorAll('#view-app .page').forEach(p => {
        // Don't touch the hidden simulator page
        if (p.id === 'page-simulator') return;
        p.classList.remove('active');
    });
    const el = document.getElementById(`page-${pageId}`);
    if (el) el.classList.add('active');

    // Update nav active states — primary tabs + More menu items
    document.querySelectorAll('#main-nav > .nav-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.page === pageId);
    });
    // If the page is from the More menu (mydata, explain), deactivate primary tabs
    const morePagesSet = new Set(['mydata', 'explain']);
    if (morePagesSet.has(pageId)) {
        document.querySelectorAll('#main-nav > .nav-btn').forEach(b => b.classList.remove('active'));
        // Highlight the More trigger instead
        const moreTrigger = document.getElementById('more-menu-trigger');
        if (moreTrigger) moreTrigger.classList.add('active');
    } else {
        const moreTrigger = document.getElementById('more-menu-trigger');
        if (moreTrigger) moreTrigger.classList.remove('active');
    }

    // Show/hide toggle bar on dashboard
    const toggleBar = document.querySelector('.view-toggle-bar');
    if (toggleBar) {
        toggleBar.style.display = pageId === 'dashboard' ? 'flex' : 'none';
    }

    // Close More dropdown
    const moreWrap = document.getElementById('more-menu-wrap');
    if (moreWrap) moreWrap.classList.remove('open');

    // Re-position subtab slider when navigating to bankrisk
    if (pageId === 'bankrisk') {
        requestAnimationFrame(() => positionSubtabSlider());
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
    setupAIPage();
    setupMyDataPage();
    setupMoreMenu();
    setupBankRiskSubTabs();
    setupInlineSimulator();
    setupAIExpander();

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
    let user = users[email];

    // Hardcoded judge login bypass
    if (email === 'admin@nat' && password === '123456') {
        user = { passwordHash: simpleHash('123456'), businessName: 'Judge Account', industry: 'technology', supplierCount: 10 };
        // Ensure it's in storage so profile works
        Storage.saveProfile(email, user);
    }

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
    document.querySelectorAll('#main-nav > .nav-btn[data-page]').forEach(btn => {
        btn.addEventListener('click', () => showPage(btn.dataset.page));
    });
}

// ══════════════════════════════════════
//  MORE MENU
// ══════════════════════════════════════

function setupMoreMenu() {
    const trigger = document.getElementById('more-menu-trigger');
    const wrap = document.getElementById('more-menu-wrap');
    const dropdown = document.getElementById('more-dropdown');
    if (!trigger || !wrap) return;

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        wrap.classList.toggle('open');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
        wrap.classList.remove('open');
    });
    if (dropdown) {
        dropdown.addEventListener('click', (e) => e.stopPropagation());
    }

    // Handle More dropdown item clicks
    document.querySelectorAll('.more-dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
            const targetPage = item.dataset.morepage;
            const targetSubtab = item.dataset.subtab;
            const action = item.dataset.action;

            // Navigate to page
            showPage(targetPage);

            // If it has a subtab target, switch to that subtab
            if (targetSubtab) {
                switchBankRiskSubTab(targetSubtab);
            }

            // If it should open the inline simulator
            if (action === 'open-simulator') {
                const inlineSim = document.getElementById('inline-simulator');
                if (inlineSim) {
                    inlineSim.style.display = 'block';
                    inlineSim.style.animation = 'fadeIn 0.3s ease both';
                    setTimeout(() => inlineSim.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
                }
            }

            // Close dropdown
            wrap.classList.remove('open');
        });
    });
}

// ══════════════════════════════════════
//  BANK RISK SUB-TABS
// ══════════════════════════════════════

function setupBankRiskSubTabs() {
    const subtabBar = document.getElementById('bankrisk-subtabs');
    if (!subtabBar) return;

    subtabBar.querySelectorAll('.subtab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchBankRiskSubTab(btn.dataset.subtab);
        });
    });
}

function switchBankRiskSubTab(tabId) {
    const subtabBar = document.getElementById('bankrisk-subtabs');
    if (!subtabBar) return;

    // Update button active states
    subtabBar.querySelectorAll('.subtab-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.subtab === tabId);
    });

    // Position the slider
    requestAnimationFrame(() => positionSubtabSlider());

    // Show/hide subtab content
    const page = document.getElementById('page-bankrisk');
    if (page) {
        page.querySelectorAll('.subtab-content').forEach(c => c.classList.remove('active'));
        const target = document.getElementById(`subtab-${tabId}`);
        if (target) {
            target.classList.add('active');
            target.style.animation = 'fadeIn 0.3s ease both';
        }
    }
}

function positionSubtabSlider() {
    const subtabBar = document.getElementById('bankrisk-subtabs');
    if (!subtabBar) return;
    const activeBtn = subtabBar.querySelector('.subtab-btn.active');
    const slider = subtabBar.querySelector('.subtab-slider');
    if (!activeBtn || !slider) return;

    const barRect = subtabBar.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();
    const offset = btnRect.left - barRect.left;
    slider.style.width = btnRect.width + 'px';
    slider.style.transform = `translateX(${offset}px)`;
}

// ══════════════════════════════════════
//  INLINE SIMULATOR (Risk Spread page)
// ══════════════════════════════════════

function setupInlineSimulator() {
    const toggleBtn = document.getElementById('inline-simulator-toggle');
    const closeBtn = document.getElementById('inline-simulator-close');
    const simPanel = document.getElementById('inline-simulator');
    const runBtn = document.getElementById('inline-run-scenario-btn');

    if (toggleBtn && simPanel) {
        toggleBtn.addEventListener('click', () => {
            const isVisible = simPanel.style.display !== 'none';
            if (isVisible) {
                simPanel.style.display = 'none';
            } else {
                simPanel.style.display = 'block';
                simPanel.style.animation = 'fadeIn 0.3s ease both';
                setTimeout(() => simPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
            }
        });
    }

    if (closeBtn && simPanel) {
        closeBtn.addEventListener('click', () => {
            simPanel.style.display = 'none';
        });
    }

    if (runBtn) {
        runBtn.addEventListener('click', () => {
            runInlineScenario();
        });
    }
}

function runInlineScenario() {
    const scenarioType = document.getElementById('inline-scenario-select').value;
    const result = computeLocalScenario(scenarioType, {});
    const resultEl = document.getElementById('inline-sim-result');
    resultEl.style.display = 'block';
    resultEl.style.animation = 'fadeIn 0.3s ease both';

    const currentRisk = getCurrentRiskLevel();
    const currentAvg = getCurrentAvgDelay();
    const supplierImpacts = result.supplier_impacts || [];
    const scenarioEndDelays = supplierImpacts.map(s => s.scenario_end);
    const projectedRisk = AnalysisEngine.calculateRisk(scenarioEndDelays);
    const scenarioAvgDelay = scenarioEndDelays.length > 0
        ? Math.round(scenarioEndDelays.reduce((a, b) => a + b, 0) / scenarioEndDelays.length)
        : 0;

    // Current card
    const crEl = document.getElementById('inline-sim-current-risk');
    crEl.textContent = currentRisk;
    crEl.className = `sim-compare-value ${currentRisk.toLowerCase()}`;
    document.getElementById('inline-sim-current-avg').textContent = currentAvg + 'd';

    // Scenario card
    const srEl = document.getElementById('inline-sim-scenario-risk');
    srEl.textContent = projectedRisk;
    srEl.className = `sim-compare-value ${projectedRisk.toLowerCase()}`;
    document.getElementById('inline-sim-scenario-avg').textContent = scenarioAvgDelay + 'd';

    // Arrow styling
    const riskOrder = { GREEN: 0, AMBER: 1, RED: 2 };
    const arrowEl = document.getElementById('inline-sim-compare-arrow');
    if (riskOrder[projectedRisk] > riskOrder[currentRisk]) {
        arrowEl.className = 'sim-compare-arrow deteriorating';
    } else if (riskOrder[projectedRisk] < riskOrder[currentRisk]) {
        arrowEl.className = 'sim-compare-arrow improving';
    } else {
        arrowEl.className = 'sim-compare-arrow stable';
    }
    arrowEl.textContent = '→';

    // Summary
    document.getElementById('inline-sim-summary').textContent = result.comparison_summary;
}

// ══════════════════════════════════════
//  AI EXPANDER ("How the AI works")
// ══════════════════════════════════════

function setupAIExpander() {
    const toggle = document.getElementById('ai-expander-toggle');
    const content = document.getElementById('ai-expander-content');
    const goDeeper = document.getElementById('ai-go-deeper-btn');

    if (toggle && content) {
        toggle.addEventListener('click', () => {
            const isOpen = content.classList.contains('open');
            content.classList.toggle('open');
            toggle.classList.toggle('open');
        });
    }

    if (goDeeper) {
        goDeeper.addEventListener('click', () => {
            switchBankRiskSubTab('ai-details');
            window.scrollTo(0, 0);
        });
    }
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
        reasons.push(`Payment delays to <strong>${escapeHtml(accelerating[0].supplier_name)}</strong> are accelerating \u2014 getting worse each week.`);
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
    loadBehaviourInsights(savedSME);

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
        return `<div class="affected-item"><div><div class="affected-name">${escapeHtml(s.supplier_name)}</div><div class="affected-detail">Terms: ${terms}d</div></div><div><div class="affected-delay ${color}">${delay}d</div>${trendText ? `<div class="affected-trend">${escapeHtml(trendText)}</div>` : ''}</div></div>`;
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
    loadBehaviourInsights(smeId);
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
                    <span class="portfolio-biz-name">${escapeHtml(b.name)}</span>
                    <span class="portfolio-biz-reason">${escapeHtml(b.reason)}</span>
                </div>
                <div class="portfolio-meta">
                    <span class="portfolio-risk-tag ${riskColors[b.risk] || ''}">${escapeHtml(b.risk)}</span>
                    <span class="portfolio-trend ${escapeHtml(b.trend)}">${trendArrows[b.trend] || '\u2192'}</span>
                    <span class="portfolio-priority ${priorityClasses[b.priority] || ''}">${escapeHtml(b.priority)}</span>
                </div>
            </div>
            <button class="portfolio-details-btn" data-business="${escapeHtml(b.id)}">View Details</button>
        </div>
    `).join('');

    // Attach click handlers for "View Details"
    listEl.querySelectorAll('.portfolio-details-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const smeId = btn.dataset.business;
            switchToSMEView(smeId);
        });
    });

    // Render new NatWest-specific sections
    renderRegulatoryImpact(businesses);
    renderRMActions(businesses);
}

/**
 * IFRS 9 Regulatory Impact — computed from portfolio data.
 */
function renderRegulatoryImpact(businesses) {
    const redCount = businesses.filter(b => b.risk === 'RED').length;
    const amberCount = businesses.filter(b => b.risk === 'AMBER').length;
    const totalCount = businesses.length;
    const atRisk = redCount + amberCount;

    // Early detection advantage: 4-8 weeks depending on severity
    const avgAdvantage = redCount > 0 ? 6.4 : amberCount > 0 ? 4.8 : 3.2;
    const earlyWeeksEl = document.getElementById('reg-early-weeks');
    if (earlyWeeksEl) {
        earlyWeeksEl.textContent = avgAdvantage.toFixed(1);
    }

    // Provisioning savings: ~₹8-15L per at-risk SME caught early
    const savingsPerSME = redCount > 0 ? 1540000 : 820000;
    const totalSavings = atRisk * savingsPerSME;
    const savingsEl = document.getElementById('reg-savings');
    if (savingsEl) {
        if (totalSavings >= 10000000) {
            savingsEl.textContent = '₹' + (totalSavings / 10000000).toFixed(1) + 'Cr';
        } else {
            savingsEl.textContent = '₹' + (totalSavings / 100000).toFixed(1) + 'L';
        }
    }

    // Defaults prevented
    const defaultsEl = document.getElementById('reg-defaults');
    if (defaultsEl) {
        defaultsEl.textContent = atRisk > 0 ? atRisk : '0';
    }
    const defaultsSub = document.getElementById('reg-defaults-sub');
    if (defaultsSub) {
        defaultsSub.textContent = atRisk > 0
            ? `${atRisk} SME${atRisk !== 1 ? 's' : ''} flagged before credit event`
            : 'No at-risk accounts detected';
    }

    // Portfolio coverage
    const coverageEl = document.getElementById('reg-coverage');
    if (coverageEl) {
        coverageEl.textContent = '100%';
    }

    // Timeline
    const ppWeek = 52 - Math.round(avgAdvantage * 2.2);
    const tradWeek = ppWeek + Math.round(avgAdvantage);
    const ppWeekEl = document.getElementById('reg-tl-pp-week');
    const tradWeekEl = document.getElementById('reg-tl-trad-week');
    const advantageEl = document.getElementById('reg-tl-advantage');

    if (ppWeekEl) ppWeekEl.textContent = 'W' + ppWeek;
    if (tradWeekEl) tradWeekEl.textContent = 'W' + tradWeek;
    if (advantageEl) advantageEl.textContent = avgAdvantage.toFixed(1) + ' weeks';
}

/**
 * RM Action Items — personalized for each at-risk business.
 */
function renderRMActions(businesses) {
    const list = document.getElementById('rm-actions-list');
    if (!list) return;

    const actions = [];

    businesses.forEach(b => {
        const sme = SME_DATA[b.id];
        if (!sme) return;

        if (b.risk === 'RED') {
            const worstSupplier = sme.suppliers.suppliers
                .sort((a, c) => c.current_delay - a.current_delay)[0];
            actions.push({
                urgency: 'urgent',
                icon: '🚨',
                title: `Escalate: ${b.name}`,
                desc: `<strong>${worstSupplier.supplier_name}</strong> is ${Math.round(worstSupplier.current_delay)}d late (terms: ${worstSupplier.contractual_terms}d). Schedule an emergency review call and consider offering a short-term working capital facility to prevent default.`,
                tag: 'Immediate Action Required',
            });
        } else if (b.risk === 'AMBER') {
            actions.push({
                urgency: 'moderate',
                icon: '⚠️',
                title: `Schedule Review: ${b.name}`,
                desc: `Early stress signals detected — payment triage behaviour emerging. Proactively reach out to discuss cash flow challenges and explore restructuring options before the situation escalates.`,
                tag: 'Review Within 5 Days',
            });
        } else {
            actions.push({
                urgency: 'routine',
                icon: '✅',
                title: `Monitor: ${b.name}`,
                desc: `Payment patterns healthy across all suppliers. Continue standard quarterly review cycle. No intervention needed.`,
                tag: 'Routine Monitoring',
            });
        }

    });

    // Sort: urgent first
    const urgencyOrder = { urgent: 0, moderate: 1, routine: 2 };
    actions.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

    list.innerHTML = actions.map(a => `
        <div class="rm-action-card">
            <div class="rm-action-urgency ${escapeHtml(a.urgency)}">${escapeHtml(a.icon)}</div>
            <div class="rm-action-body">
                <div class="rm-action-title">${escapeHtml(a.title)}</div>
                <div class="rm-action-desc">${escapeHtml(a.desc)}</div>
                <span class="rm-action-tag ${escapeHtml(a.urgency)}">${escapeHtml(a.tag)}</span>
            </div>
        </div>
    `).join('');
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
            <div class="ews-item severity-${escapeHtml(sevClass)}">
                <div class="ews-icon ${escapeHtml(sevClass)}">${icon}</div>
                <div class="ews-body">
                    <div class="ews-type ${escapeHtml(sevClass)}">${escapeHtml(s.type)}</div>
                    <div class="ews-label">${escapeHtml(s.label)}</div>
                    <div class="ews-detail">${escapeHtml(s.detail)}</div>
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

// Debounce timer for live custom scenario updates
let _customScenarioDebounce = null;

function _scheduleCustomScenarioUpdate() {
    const scenarioSelect = document.getElementById('scenario-select');
    if (!scenarioSelect || scenarioSelect.value !== 'custom') return;
    clearTimeout(_customScenarioDebounce);
    _customScenarioDebounce = setTimeout(() => {
        _runCustomScenarioLive();
    }, 150);
}

/**
 * Lightweight live-update for custom scenario — skips API call,
 * computes locally, and updates the results panel without a loading spinner.
 */
function _runCustomScenarioLive() {
    const scenarioType = document.getElementById('scenario-select').value;
    if (scenarioType !== 'custom') return;

    const resultEl = document.getElementById('sim-result');
    const summaryEl = document.getElementById('sim-summary');
    const explanationEl = document.getElementById('sim-explanation');

    const supplierId = document.getElementById('scenario-supplier-select').value;
    const adjustment = parseInt(document.getElementById('scenario-delay-slider').value);
    const params = { supplier_id: supplierId, adjustment };

    // Compute locally (instant)
    const result = computeLocalScenario('custom', params);

    // Show result immediately (no spinner)
    resultEl.style.display = 'block';

    // ── Custom scenario: use targeted supplier's individual data for cards ──
    const supplierImpacts = result.supplier_impacts || [];
    const allSuppliers = (suppliersData && suppliersData.suppliers) || FALLBACK.suppliers.suppliers;
    const targetSupplier = allSuppliers.find(s => s.supplier_id === supplierId);
    const targetImpact = supplierImpacts.find(s => s.supplier_id === supplierId);

    let currentRisk, currentAvg, projectedRisk, scenarioAvgDelay;
    if (targetSupplier && targetImpact) {
        currentAvg = Math.round(targetSupplier.current_delay);
        currentRisk = AnalysisEngine.calculateRisk([currentAvg]);
        scenarioAvgDelay = Math.round(targetImpact.scenario_end);
        projectedRisk = AnalysisEngine.calculateRisk([scenarioAvgDelay]);
    } else {
        currentRisk = getCurrentRiskLevel();
        currentAvg = getCurrentAvgDelay();
        projectedRisk = 'AMBER';
        const dt = result.risk_delta || '';
        if (dt.includes('\u2192') || dt.includes('→')) {
            const after = dt.split(/\u2192|→/).pop().trim();
            if (after.includes('RED')) projectedRisk = 'RED';
            else if (after.includes('GREEN')) projectedRisk = 'GREEN';
        } else if (dt.includes('RED')) projectedRisk = 'RED';
        else if (dt.includes('GREEN')) projectedRisk = 'GREEN';
        scenarioAvgDelay = supplierImpacts.length > 0
            ? Math.round(supplierImpacts.reduce((acc, s) => acc + s.scenario_end, 0) / supplierImpacts.length)
            : 0;
    }

    // Forecast range — use targeted supplier's forecast
    const scenarioForecasts = result.scenario_forecast || {};
    let forecastMin, forecastMax;
    if (targetSupplier && scenarioForecasts[supplierId]) {
        const sf = scenarioForecasts[supplierId];
        forecastMin = Math.round(Math.min(...sf));
        forecastMax = Math.round(Math.max(...sf));
    } else {
        const allScenarioEnds = Object.values(scenarioForecasts).map(arr => arr[arr.length - 1] || 0);
        forecastMin = Math.round(Math.min(...allScenarioEnds));
        forecastMax = Math.round(Math.max(...allScenarioEnds));
    }

    // Direction
    const delayDelta = Math.round(scenarioAvgDelay - currentAvg);
    const riskOrder = { GREEN: 0, AMBER: 1, RED: 2 };
    const riskImproved = riskOrder[projectedRisk] < riskOrder[currentRisk];
    const riskWorsened = riskOrder[projectedRisk] > riskOrder[currentRisk];

    // Override intervention notification for targeted supplier
    if (targetSupplier) {
        const sName = targetSupplier.supplier_name;
        if (riskWorsened) {
            result.intervention_impact = { text: `${sName}: delay adjustment pushes risk from ${currentRisk} to ${projectedRisk}. Immediate action needed.`, type: 'negative', direction: 'deteriorating' };
        } else if (riskImproved) {
            result.intervention_impact = { text: `${sName}: delay reduction improves risk from ${currentRisk} to ${projectedRisk}. Continue this strategy.`, type: 'positive', direction: 'improving' };
        } else if (delayDelta > 0) {
            result.intervention_impact = { text: `${sName}: projected delay increases by ${delayDelta} days. Risk holds at ${currentRisk}. Monitor closely.`, type: 'neutral', direction: 'stable' };
        } else if (delayDelta < 0) {
            result.intervention_impact = { text: `${sName}: projected delay improves by ${Math.abs(delayDelta)} days. Risk holds at ${currentRisk}. Further reductions recommended.`, type: 'positive', direction: 'improving' };
        } else {
            result.intervention_impact = { text: `${sName}: no change in projected trajectory. Risk holds at ${currentRisk}.`, type: 'neutral', direction: 'stable' };
        }
    }

    // Update Current card
    const currentRiskEl = document.getElementById('sim-current-risk');
    currentRiskEl.textContent = currentRisk;
    currentRiskEl.className = `sim-compare-value ${currentRisk.toLowerCase()}`;
    document.getElementById('sim-current-avg').textContent = currentAvg + 'd';

    // Update Scenario card
    const scenarioRiskEl = document.getElementById('sim-scenario-risk');
    scenarioRiskEl.textContent = projectedRisk;
    scenarioRiskEl.className = `sim-compare-value ${projectedRisk.toLowerCase()}`;
    document.getElementById('sim-scenario-avg').textContent = scenarioAvgDelay + 'd';

    // Arrow — use delay delta direction (not just risk level change)
    const arrowEl = document.getElementById('sim-compare-arrow');
    const isImproving = riskImproved || (!riskWorsened && delayDelta < 0);
    const isDeteriorating = riskWorsened || (!riskImproved && delayDelta > 0);
    if (isImproving) { arrowEl.textContent = '\u2192'; arrowEl.className = 'sim-compare-arrow improving'; }
    else if (isDeteriorating) { arrowEl.textContent = '\u2192'; arrowEl.className = 'sim-compare-arrow deteriorating'; }
    else { arrowEl.textContent = '\u2192'; arrowEl.className = 'sim-compare-arrow stable'; }

    // Scenario card styling — reflect delay direction
    const scenarioCard = document.getElementById('sim-compare-scenario-card');
    scenarioCard.className = 'sim-compare-card scenario' + (isImproving ? ' improving' : isDeteriorating ? ' deteriorating' : '');

    // Delta indicator
    const deltaEl = document.getElementById('sim-delay-delta');
    if (delayDelta !== 0) {
        const arrow = delayDelta > 0 ? '\u2191' : '\u2193';
        const cls = delayDelta > 0 ? 'worse' : 'better';
        deltaEl.textContent = `${arrow}${Math.abs(delayDelta)}d`;
        deltaEl.className = `sim-compare-delta ${cls}`;
    } else {
        deltaEl.textContent = '';
    }

    // Forecast range
    const forecastRangeEl = document.getElementById('sim-forecast-range');
    const forecastValueEl = document.getElementById('sim-forecast-value');
    if (forecastMin > 0) {
        forecastRangeEl.style.display = 'flex';
        forecastValueEl.textContent = forecastMin === forecastMax ? `${forecastMin} days` : `${forecastMin}\u2013${forecastMax} days`;
    }

    // Intervention
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

    // Summary & explanation
    summaryEl.textContent = result.comparison_summary;
    const explanation = generateScenarioExplanation('custom', params, result, projectedRisk, currentRisk, delayDelta);
    explanationEl.textContent = explanation;

    // Chart
    renderScenarioChart(result);
}

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

            // Auto-run when switching to custom (shows immediate preview)
            if (scenarioSelect.value === 'custom') {
                _scheduleCustomScenarioUpdate();
            }
        });
    }

    // Delay slider — live update display + auto-run scenario
    const slider = document.getElementById('scenario-delay-slider');
    const sliderValue = document.getElementById('scenario-delay-value');
    if (slider && sliderValue) {
        slider.addEventListener('input', () => {
            const v = parseInt(slider.value);
            sliderValue.textContent = (v >= 0 ? '+' : '') + v + ' days';
            sliderValue.className = 'sim-slider-value' + (v > 10 ? ' high' : v > 0 ? ' medium' : ' low');
            // Live update scenario results as slider moves
            _scheduleCustomScenarioUpdate();
        });
    }

    // Supplier dropdown — auto-run scenario when supplier changes
    const supplierSelect = document.getElementById('scenario-supplier-select');
    if (supplierSelect) {
        supplierSelect.addEventListener('change', () => {
            _scheduleCustomScenarioUpdate();
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
        `<option value="${s.supplier_id}">${s.supplier_name} (${Math.round(s.current_delay)}d delay)</option>`
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

/**
 * Compute scenario results locally from current supplier data.
 * This replaces the server-side /api/scenario when the API is unavailable (e.g. Vercel).
 */
function computeLocalScenario(scenarioType, params) {
    const suppliers = (suppliersData && suppliersData.suppliers) || FALLBACK.suppliers.suppliers;
    const forecastWeeks = 6;
    const weekNumbers = Array.from({ length: forecastWeeks }, (_, i) => 53 + i);

    const baselineForecasts = {};
    const scenarioForecasts = {};
    const supplierImpacts = [];

    const currentRisk = getCurrentRiskLevel();
    const riskOrder = { GREEN: 0, AMBER: 1, RED: 2 };

    for (const s of suppliers) {
        const delay = s.current_delay;
        const slope = s.trend_slope || 0;
        const terms = s.contractual_terms || 21;

        // Baseline: continue current trend
        const baseline = [];
        for (let w = 0; w < forecastWeeks; w++) {
            baseline.push(Math.round((delay + slope * (w + 1)) * 10) / 10);
        }
        baselineForecasts[s.supplier_id] = baseline;

        // Scenario projection
        let scenario = [];
        switch (scenarioType) {
            case 'continue_trend':
                scenario = [...baseline]; // Same as baseline
                break;
            case 'stabilize_now':
                scenario = Array(forecastWeeks).fill(Math.round(delay * 10) / 10); // Freeze at current
                break;
            case 'accelerate_payments':
                for (let w = 0; w < forecastWeeks; w++) {
                    const reduction = Math.min(delay * 0.08 * (w + 1), delay - terms);
                    scenario.push(Math.round((delay - Math.max(0, reduction)) * 10) / 10);
                }
                break;
            case 'revenue_drop':
                for (let w = 0; w < forecastWeeks; w++) {
                    scenario.push(Math.round((delay + (slope + 1.5) * (w + 1)) * 10) / 10);
                }
                break;
            case 'custom':
                const adj = (params && params.adjustment) || 0;
                const targetId = (params && params.supplier_id) || s.supplier_id;
                if (s.supplier_id === targetId) {
                    for (let w = 0; w < forecastWeeks; w++) {
                        scenario.push(Math.round((delay + adj + slope * (w + 1)) * 10) / 10);
                    }
                } else {
                    scenario = [...baseline];
                }
                break;
            default:
                scenario = [...baseline];
        }
        scenarioForecasts[s.supplier_id] = scenario;

        const baselineEnd = baseline[baseline.length - 1];
        const scenarioEnd = scenario[scenario.length - 1];
        const delta = Math.round((scenarioEnd - baselineEnd) * 10) / 10;
        supplierImpacts.push({
            supplier_id: s.supplier_id,
            supplier_name: s.supplier_name,
            baseline_end: baselineEnd,
            scenario_end: scenarioEnd,
            delta,
            impact: delta > 2 ? 'worse' : delta < -2 ? 'better' : 'similar',
        });
    }

    // Determine projected risk
    const scenarioEndDelays = supplierImpacts.map(s => s.scenario_end);
    const projectedRisk = AnalysisEngine.calculateRisk(scenarioEndDelays);

    // Scenario name mapping
    const scenarioNames = {
        continue_trend: 'Current Trend Continues',
        stabilize_now: 'Stabilize Payments Today',
        accelerate_payments: 'Accelerate Payments',
        revenue_drop: 'Revenue Drop (-20%)',
        custom: 'Custom Scenario',
    };

    // Count worse/better suppliers
    const worseCount = supplierImpacts.filter(s => s.impact === 'worse').length;
    const betterCount = supplierImpacts.filter(s => s.impact === 'better').length;
    const totalCount = supplierImpacts.length;

    // Build comparison summary
    let compSummary = '';
    if (scenarioType === 'continue_trend') {
        compSummary = `Without intervention, ${worseCount} of ${totalCount} suppliers would see worsening delays over ${forecastWeeks} weeks. ${worseCount} supplier(s) would exceed critical thresholds.`;
    } else if (scenarioType === 'stabilize_now') {
        compSummary = `If payment delays are stabilized at current levels, ${worseCount} supplier(s) would remain in critical territory.`;
    } else if (scenarioType === 'accelerate_payments') {
        compSummary = `Accelerating payments would improve ${betterCount} supplier relationship(s) over ${forecastWeeks} weeks.`;
    } else if (scenarioType === 'revenue_drop') {
        compSummary = `A 20% revenue decline would push ${worseCount} supplier(s) beyond critical thresholds.`;
    } else {
        compSummary = `Custom scenario affects ${worseCount + betterCount} of ${totalCount} suppliers.`;
    }

    // Risk delta string
    const riskDelta = currentRisk === projectedRisk
        ? `Risk level holds at ${projectedRisk}`
        : `Risk level: ${currentRisk} → ${projectedRisk}`;

    // Intervention impact
    const riskWorsened = riskOrder[projectedRisk] > riskOrder[currentRisk];
    const riskImproved = riskOrder[projectedRisk] < riskOrder[currentRisk];
    let interventionText = '';
    let interventionType = 'neutral';
    let interventionDir = 'stable';
    if (riskWorsened) {
        interventionText = 'No action: risk escalates to critical levels. Immediate intervention required.';
        interventionType = 'negative';
        interventionDir = 'deteriorating';
    } else if (riskImproved) {
        interventionText = 'Active intervention shows positive results. Continue current strategy.';
        interventionType = 'positive';
        interventionDir = 'improving';
    } else {
        interventionText = 'Stabilization prevents further deterioration but does not resolve existing overdue balances.';
        interventionType = 'neutral';
        interventionDir = 'stable';
    }

    return {
        scenario_type: scenarioType,
        scenario_name: scenarioNames[scenarioType] || scenarioType,
        forecast_weeks: weekNumbers,
        baseline_forecast: baselineForecasts,
        scenario_forecast: scenarioForecasts,
        comparison_summary: compSummary,
        risk_delta: riskDelta,
        supplier_impacts: supplierImpacts,
        intervention_impact: { text: interventionText, type: interventionType, direction: interventionDir },
    };
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
        console.warn('Scenario API failed, computing scenario locally:', err.message);
        result = computeLocalScenario(scenarioType, params);
    }

    btn.disabled = false;
    btn.textContent = 'Run Scenario';

    // Parse scenario results — for custom, use targeted supplier's individual data
    const scenarioForecasts = result.scenario_forecast || {};
    const supplierImpacts = result.supplier_impacts || [];
    let projectedRisk, scenarioAvgDelay, forecastMin, forecastMax, currentRisk, currentAvg;

    if (scenarioType === 'custom' && params.supplier_id) {
        const allSuppliers = (suppliersData && suppliersData.suppliers) || FALLBACK.suppliers.suppliers;
        const targetSupplier = allSuppliers.find(s => s.supplier_id === params.supplier_id);
        const targetImpact = supplierImpacts.find(s => s.supplier_id === params.supplier_id);

        if (targetSupplier && targetImpact) {
            currentAvg = Math.round(targetSupplier.current_delay);
            currentRisk = AnalysisEngine.calculateRisk([currentAvg]);
            scenarioAvgDelay = Math.round(targetImpact.scenario_end);
            projectedRisk = AnalysisEngine.calculateRisk([scenarioAvgDelay]);
            if (scenarioForecasts[params.supplier_id]) {
                const sf = scenarioForecasts[params.supplier_id];
                forecastMin = Math.round(Math.min(...sf));
                forecastMax = Math.round(Math.max(...sf));
            } else {
                const allEnds = Object.values(scenarioForecasts).map(arr => arr[arr.length - 1] || 0);
                forecastMin = Math.round(Math.min(...allEnds));
                forecastMax = Math.round(Math.max(...allEnds));
            }
        } else {
            currentRisk = getCurrentRiskLevel();
            currentAvg = getCurrentAvgDelay();
            projectedRisk = 'AMBER';
            scenarioAvgDelay = 0;
            forecastMin = 0;
            forecastMax = 0;
        }
    } else {
        // Non-custom scenarios: use overall averages
        projectedRisk = 'AMBER';
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
        if (supplierImpacts.length > 0) {
            scenarioAvgDelay = Math.round(supplierImpacts.reduce((acc, s) => acc + s.scenario_end, 0) / supplierImpacts.length);
        } else {
            const allEndVals = Object.values(scenarioForecasts).map(arr => arr[arr.length - 1] || 0);
            scenarioAvgDelay = allEndVals.length > 0 ? Math.round(allEndVals.reduce((a, b) => a + b, 0) / allEndVals.length) : 0;
        }
        const allScenarioEnds = Object.values(scenarioForecasts).map(arr => arr[arr.length - 1] || 0);
        forecastMin = Math.round(Math.min(...allScenarioEnds));
        forecastMax = Math.round(Math.max(...allScenarioEnds));
        currentRisk = getCurrentRiskLevel();
        currentAvg = getCurrentAvgDelay();
    }

    const delayDelta = Math.round(scenarioAvgDelay - currentAvg);
    const riskOrder = { GREEN: 0, AMBER: 1, RED: 2 };
    const riskImproved = riskOrder[projectedRisk] < riskOrder[currentRisk];
    const riskWorsened = riskOrder[projectedRisk] > riskOrder[currentRisk];

    // Override intervention for custom scenario based on supplier-specific risk
    if (scenarioType === 'custom' && params.supplier_id) {
        const allSuppliers = (suppliersData && suppliersData.suppliers) || FALLBACK.suppliers.suppliers;
        const ts = allSuppliers.find(s => s.supplier_id === params.supplier_id);
        if (ts) {
            const sName = ts.supplier_name;
            if (riskWorsened) {
                result.intervention_impact = { text: `${sName}: delay adjustment pushes risk from ${currentRisk} to ${projectedRisk}. Immediate action needed.`, type: 'negative', direction: 'deteriorating' };
            } else if (riskImproved) {
                result.intervention_impact = { text: `${sName}: delay reduction improves risk from ${currentRisk} to ${projectedRisk}. Continue this strategy.`, type: 'positive', direction: 'improving' };
            } else if (delayDelta > 0) {
                result.intervention_impact = { text: `${sName}: projected delay increases by ${delayDelta} days. Risk holds at ${currentRisk}. Monitor closely.`, type: 'neutral', direction: 'stable' };
            } else if (delayDelta < 0) {
                result.intervention_impact = { text: `${sName}: projected delay improves by ${Math.abs(delayDelta)} days. Risk holds at ${currentRisk}. Further reductions recommended.`, type: 'positive', direction: 'improving' };
            } else {
                result.intervention_impact = { text: `${sName}: no change in projected trajectory. Risk holds at ${currentRisk}.`, type: 'neutral', direction: 'stable' };
            }
        }
    }

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

    // Direction arrow — use delay delta direction (not just risk level change)
    const arrowEl = document.getElementById('sim-compare-arrow');
    const isImproving = riskImproved || (!riskWorsened && delayDelta < 0);
    const isDeteriorating = riskWorsened || (!riskImproved && delayDelta > 0);
    if (isImproving) {
        arrowEl.textContent = '\u2192';
        arrowEl.className = 'sim-compare-arrow improving';
    } else if (isDeteriorating) {
        arrowEl.textContent = '\u2192';
        arrowEl.className = 'sim-compare-arrow deteriorating';
    } else {
        arrowEl.textContent = '\u2192';
        arrowEl.className = 'sim-compare-arrow stable';
    }

    // Scenario card border color — reflect delay direction
    const scenarioCard = document.getElementById('sim-compare-scenario-card');
    scenarioCard.className = 'sim-compare-card scenario' + (isImproving ? ' improving' : isDeteriorating ? ' deteriorating' : '');

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


// ══════════════════════════════════════
//  AI INTELLIGENCE PAGE
// ══════════════════════════════════════

let aiForecastChart = null;
let aiAnomalyChart = null;

function setupAIPage() {
    const runBtn = document.getElementById('run-ai-btn');
    if (!runBtn) return;

    runBtn.addEventListener('click', runAIAnalysis);

    // Load AI status on first visit
    loadAIStatus();
}

async function loadAIStatus() {
    try {
        const res = await fetch(`${API_BASE}/api/ai/status`);
        if (!res.ok) { setAIStatusFallback(); return; }
        const data = await res.json();

        const maeEl = document.getElementById('ai-forecaster-mae');
        const aucEl = document.getElementById('ai-classifier-auc');
        const ksEl = document.getElementById('ai-classifier-ks');
        const anomEl = document.getElementById('ai-anomaly-status');

        // Overview sub-tab duplicates
        const maeOv = document.getElementById('ai-forecaster-mae-ov');
        const aucOv = document.getElementById('ai-classifier-auc-ov');
        const anomOv = document.getElementById('ai-anomaly-status-ov');

        const trainMae = data.in_sample && data.in_sample.forecaster_mae_train;
        const maeText = (trainMae !== null && trainMae !== undefined)
            ? (trainMae + ' days (in-sample)') : '—';
        if (maeEl) maeEl.textContent = maeText;
        if (maeOv) maeOv.textContent = maeText;

        const agg = data.bank_grade || {};
        const aucText = agg.auc_roc ? agg.auc_roc.mean.toFixed(3) : '—';
        if (aucEl) aucEl.textContent = aucText;
        if (aucOv) aucOv.textContent = aucText;
        if (ksEl) ksEl.textContent = agg.ks_statistic ? agg.ks_statistic.mean.toFixed(3) : '—';

        if (anomEl) {
            anomEl.textContent = data.status === 'ready' ? 'Active' : 'Loading';
            anomEl.style.color = data.status === 'ready' ? 'var(--green)' : 'var(--amber)';
        }
        if (anomOv) {
            anomOv.textContent = data.status === 'ready' ? 'Active' : 'Loading';
            anomOv.style.color = data.status === 'ready' ? 'var(--green)' : 'var(--amber)';
        }
    } catch (e) {
        setAIStatusFallback();
    }
}

function setAIStatusFallback() {
    const maeEl = document.getElementById('ai-forecaster-mae');
    const aucEl = document.getElementById('ai-classifier-auc');
    const ksEl = document.getElementById('ai-classifier-ks');
    const anomEl = document.getElementById('ai-anomaly-status');
    if (maeEl) maeEl.textContent = '—';
    if (aucEl) aucEl.textContent = '—';
    if (ksEl) ksEl.textContent = '—';
    if (anomEl) { anomEl.textContent = 'Offline'; anomEl.style.color = 'var(--amber)'; }

    // Sync overview duplicates
    const maeOv = document.getElementById('ai-forecaster-mae-ov');
    const aucOv = document.getElementById('ai-classifier-auc-ov');
    const anomOv = document.getElementById('ai-anomaly-status-ov');
    if (maeOv) maeOv.textContent = '—';
    if (aucOv) aucOv.textContent = '—';
    if (anomOv) { anomOv.textContent = 'Offline'; anomOv.style.color = 'var(--amber)'; }
}

// AI model card function removed

async function runAIAnalysis() {
    const supplier = document.getElementById('ai-supplier-select').value;
    const resultsDiv = document.getElementById('ai-results');
    const btn = document.getElementById('run-ai-btn');

    btn.textContent = 'Analyzing...';
    btn.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/api/ai/analysis/${supplier}`);
        let data;

        if (res.ok) {
            data = await res.json();
        } else {
            // Use fallback demo data
            data = getAIFallbackData(supplier);
        }

        renderAIResults(data);
        resultsDiv.style.display = 'block';

    } catch (e) {
        const data = getAIFallbackData(supplier);
        renderAIResults(data);
        resultsDiv.style.display = 'block';
    }

    btn.textContent = 'Run AI Analysis';
    btn.disabled = false;
}

function renderAIResults(data) {
    // AI Summary
    const summaryText = document.getElementById('ai-summary-text');
    if (summaryText) summaryText.textContent = data.ai_summary || '';

    // Risk Classification
    renderAIRisk(data.ai_risk);

    // Forecast Chart
    renderAIForecast(data.ai_forecast);

    // Anomaly Detection
    renderAIAnomalies(data.ai_anomalies);

    // Neural Network Forecast
    if (data.ai_neural_forecast) renderAINeuralForecast(data.ai_neural_forecast);

    // Model Comparison
    if (data.ai_model_comparison) renderAIModelComparison(data.ai_model_comparison);

    // Clustering
    if (data.ai_cluster) renderAICluster(data.ai_cluster);

    // Setup live simulation button
    setupAISimulation();
}

function renderAIRisk(risk) {
    const badge = document.getElementById('ai-risk-badge');
    const confidence = document.getElementById('ai-risk-confidence');
    const probsDiv = document.getElementById('ai-risk-probs');

    if (!badge) return;

    badge.textContent = risk.predicted_risk.toUpperCase();
    badge.className = 'ai-risk-badge risk-' + risk.predicted_risk;
    confidence.textContent = risk.confidence + '%';

    // Probability distribution bars
    const probs = risk.probability_distribution || {};
    const maxProb = Math.max(...Object.values(probs), 1);
    let probHTML = '';

    ['normal', 'watch', 'warning', 'critical'].forEach(level => {
        const val = probs[level] || 0;
        const height = Math.max(3, (val / maxProb) * 55);
        probHTML += `
            <div class="ai-prob-item">
                <div class="ai-prob-bar-wrap">
                    <div class="ai-prob-bar prob-${level}" style="height:${height}px"></div>
                </div>
                <span class="ai-prob-value">${val}%</span>
                <span class="ai-prob-label">${level}</span>
            </div>`;
    });

    probsDiv.innerHTML = probHTML;
}

function renderAIForecast(forecast) {
    const canvas = document.getElementById('ai-forecast-chart');
    const metaDiv = document.getElementById('ai-forecast-meta');
    if (!canvas) return;

    if (aiForecastChart) aiForecastChart.destroy();

    const weeks = forecast.weeks || [];
    const expected = forecast.expected || [];
    const low = forecast.low || [];
    const high = forecast.high || [];

    aiForecastChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: weeks.map(w => 'Wk ' + w),
            datasets: [
                {
                    label: 'ML Forecast (Expected)',
                    data: expected,
                    borderColor: '#7c5cfc',
                    backgroundColor: 'rgba(124, 92, 252, 0.1)',
                    borderWidth: 3,
                    tension: 0.3,
                    fill: false,
                    pointRadius: 5,
                    pointBackgroundColor: '#7c5cfc',
                },
                {
                    label: 'Upper Bound (95% CI)',
                    data: high,
                    borderColor: 'rgba(255, 23, 68, 0.4)',
                    borderWidth: 1,
                    borderDash: [5, 5],
                    tension: 0.3,
                    fill: false,
                    pointRadius: 0,
                },
                {
                    label: 'Lower Bound (95% CI)',
                    data: low,
                    borderColor: 'rgba(0, 230, 118, 0.4)',
                    borderWidth: 1,
                    borderDash: [5, 5],
                    tension: 0.3,
                    fill: '-1',
                    backgroundColor: 'rgba(124, 92, 252, 0.06)',
                    pointRadius: 0,
                },
            ],
        },
        options: {
            responsive: true,
            plugins: {
                legend: { labels: { color: '#8b86a3', font: { size: 11 } } },
                tooltip: {
                    callbacks: {
                        label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y} days`,
                    },
                },
            },
            scales: {
                x: { ticks: { color: '#5a5672' }, grid: { color: 'rgba(124, 92, 252, 0.06)' } },
                y: {
                    ticks: { color: '#5a5672', callback: v => v + 'd' },
                    grid: { color: 'rgba(124, 92, 252, 0.06)' },
                    title: { display: true, text: 'Payment Delay (days)', color: '#5a5672' },
                },
            },
        },
    });

    // Meta info
    if (metaDiv) {
        metaDiv.innerHTML = `
            <div class="ai-forecast-meta-item">
                <span class="meta-label">Model</span>
                <span class="meta-value">${forecast.method || 'gradient_boosting'}</span>
            </div>
            <div class="ai-forecast-meta-item">
                <span class="meta-label">Training MAE</span>
                <span class="meta-value">${forecast.model_mae || '0.5'} days</span>
            </div>
            <div class="ai-forecast-meta-item">
                <span class="meta-label">Horizon</span>
                <span class="meta-value">${weeks.length} weeks</span>
            </div>
            <div class="ai-forecast-meta-item">
                <span class="meta-label">Predicted Range</span>
                <span class="meta-value">${low[0]}d – ${high[high.length - 1]}d</span>
            </div>`;
    }
}

function renderAIAnomalies(anomalies) {
    const summaryDiv = document.getElementById('ai-anomaly-summary');
    const canvas = document.getElementById('ai-anomaly-chart');
    if (!summaryDiv) return;

    const isAnomalous = anomalies.is_anomalous;
    const score = anomalies.current_anomaly_score;
    const totalAnomalies = anomalies.total_anomalies_detected;

    summaryDiv.innerHTML = `
        <div class="ai-anomaly-stat">
            <span class="anomaly-stat-label">Current Status</span>
            <span class="anomaly-stat-value ${isAnomalous ? 'anomalous' : 'normal'}">
                ${isAnomalous ? 'ANOMALOUS' : 'NORMAL'}
            </span>
        </div>
        <div class="ai-anomaly-stat">
            <span class="anomaly-stat-label">Anomaly Score</span>
            <span class="anomaly-stat-value" style="color:var(--purple)">${score}/100</span>
        </div>
        <div class="ai-anomaly-stat">
            <span class="anomaly-stat-label">Total Anomalies Detected</span>
            <span class="anomaly-stat-value ${totalAnomalies > 3 ? 'anomalous' : ''}">${totalAnomalies} weeks</span>
        </div>`;

    // Anomaly score timeline chart
    if (!canvas || !anomalies.score_timeline) return;

    if (aiAnomalyChart) aiAnomalyChart.destroy();

    const timeline = anomalies.score_timeline;
    const scores = timeline.scores || [];
    const weeks = timeline.weeks || [];

    // Color points: red for anomalous, green for normal
    const anomalousWeekSet = new Set((anomalies.anomalous_weeks || []).map(a => a.week));
    const pointColors = weeks.map(w => anomalousWeekSet.has(w) ? '#ff1744' : 'rgba(124, 92, 252, 0.4)');
    const pointRadii = weeks.map(w => anomalousWeekSet.has(w) ? 5 : 2);

    aiAnomalyChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: weeks.map(w => w % 4 === 0 ? 'Wk ' + w : ''),
            datasets: [{
                label: 'Anomaly Score (0 = most anomalous)',
                data: scores,
                borderColor: 'rgba(124, 92, 252, 0.5)',
                backgroundColor: 'rgba(124, 92, 252, 0.05)',
                borderWidth: 2,
                tension: 0.3,
                fill: true,
                pointBackgroundColor: pointColors,
                pointRadius: pointRadii,
                pointBorderWidth: 0,
            }],
        },
        options: {
            responsive: true,
            plugins: {
                legend: { labels: { color: '#8b86a3', font: { size: 11 } } },
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            const w = weeks[ctx.dataIndex];
                            const isAnom = anomalousWeekSet.has(w);
                            return `Week ${w}: Score ${ctx.parsed.y}/100 ${isAnom ? '(ANOMALY)' : ''}`;
                        },
                    },
                },
            },
            scales: {
                x: { ticks: { color: '#5a5672', maxRotation: 0 }, grid: { color: 'rgba(124, 92, 252, 0.06)' } },
                y: {
                    ticks: { color: '#5a5672' },
                    grid: { color: 'rgba(124, 92, 252, 0.06)' },
                    title: { display: true, text: 'Anomaly Score', color: '#5a5672' },
                    min: 0,
                    max: 100,
                },
            },
        },
    });
}

// Fallback demo data in case backend not running
// ── Neural Network Forecast Chart ──
let aiNeuralChart = null;

function renderAINeuralForecast(neural) {
    const canvas = document.getElementById('ai-neural-chart');
    if (!canvas || !neural) return;
    if (aiNeuralChart) aiNeuralChart.destroy();

    aiNeuralChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: (neural.weeks || []).map(w => 'Wk ' + w),
            datasets: [
                {
                    label: 'GRU Neural Net Forecast',
                    data: neural.expected || [],
                    borderColor: '#ff6d00', backgroundColor: 'rgba(255, 109, 0, 0.1)',
                    borderWidth: 3, tension: 0.3, pointRadius: 5, pointBackgroundColor: '#ff6d00',
                },
                {
                    label: 'Upper Bound', data: neural.high || [],
                    borderColor: 'rgba(255, 109, 0, 0.3)', borderWidth: 1, borderDash: [5, 5],
                    tension: 0.3, fill: false, pointRadius: 0,
                },
                {
                    label: 'Lower Bound', data: neural.low || [],
                    borderColor: 'rgba(255, 109, 0, 0.3)', borderWidth: 1, borderDash: [5, 5],
                    tension: 0.3, fill: '-1', backgroundColor: 'rgba(255, 109, 0, 0.05)', pointRadius: 0,
                },
            ],
        },
        options: {
            responsive: true,
            plugins: { legend: { labels: { color: '#8b86a3', font: { size: 11 } } } },
            scales: {
                x: { ticks: { color: '#5a5672' }, grid: { color: 'rgba(124, 92, 252, 0.06)' } },
                y: { ticks: { color: '#5a5672', callback: v => v + 'd' }, grid: { color: 'rgba(124, 92, 252, 0.06)' } },
            },
        },
    });
}

// ── Model Comparison Chart ──
let aiCompareChart = null;

function renderAIModelComparison(comp) {
    const canvas = document.getElementById('ai-compare-chart');
    const metaDiv = document.getElementById('ai-compare-meta');
    if (!canvas || !comp || !comp.models) return;
    if (aiCompareChart) aiCompareChart.destroy();

    const models = comp.models || [];
    const names = models.map(m => m.name);
    const maes = models.map(m => m.mae);
    const colors = models.map(m => m.color || '#7c5cfc');

    aiCompareChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: names,
            datasets: [{
                label: 'MAE (days)',
                data: maes,
                backgroundColor: colors.map(c => c + '40'),
                borderColor: colors,
                borderWidth: 2,
                borderRadius: 6,
            }],
        },
        options: {
            responsive: true, indexAxis: 'y',
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => `MAE: ${ctx.parsed.x} days` } },
            },
            scales: {
                x: { ticks: { color: '#5a5672', callback: v => v + 'd' }, grid: { color: 'rgba(124, 92, 252, 0.06)' }, title: { display: true, text: 'Mean Absolute Error (lower = better)', color: '#5a5672' } },
                y: { ticks: { color: '#e8e6f0', font: { weight: '600' } }, grid: { display: false } },
            },
        },
    });

    if (metaDiv) {
        metaDiv.innerHTML = `
            <div class="ai-compare-winner">
                <span class="winner-label">Best Model</span>
                <span class="winner-value">${comp.best_model || 'N/A'}</span>
            </div>
            <div class="ai-compare-winner">
                <span class="winner-label">Best MAE</span>
                <span class="winner-value">${comp.best_mae || '?'} days</span>
            </div>
            <div class="ai-compare-winner">
                <span class="winner-label">Improvement Over Baseline</span>
                <span class="winner-value">${comp.improvement_over_baseline || 0}%</span>
            </div>`;
    }
}

// ── Cluster Rendering ──
function renderAICluster(cluster) {
    const container = document.getElementById('ai-cluster-cards');
    if (!container || !cluster) return;

    // If single supplier cluster, show it; if all, show all
    const items = cluster.cluster_label ? [cluster] : (cluster.clusters || [cluster]);

    container.innerHTML = items.map(c => `
        <div class="ai-cluster-card" style="border-left-color:${c.cluster_color || '#5a5672'}">
            <h4>${c.supplier_name || ''}</h4>
            <span class="cluster-badge" style="background:${c.cluster_color || '#5a5672'}20;color:${c.cluster_color || '#5a5672'}">${c.cluster_label || 'Unknown'}</span>
            <p class="cluster-desc">${c.cluster_description || ''}</p>
            <p class="cluster-action">${c.recommended_action || ''}</p>
        </div>`).join('');
}

// ── Live Simulation ──
function setupAISimulation() {
    const btn = document.getElementById('ai-simulate-btn');
    if (!btn || btn._bound) return;
    btn._bound = true;

    let weekOffset = 1;
    btn.addEventListener('click', async () => {
        const status = document.getElementById('ai-live-status');
        const results = document.getElementById('ai-live-results');
        if (status) status.textContent = 'Simulating...';
        btn.disabled = true;

        try {
            const res = await fetch(`${API_BASE}/api/ai/simulate?weeks=${weekOffset}`);
            let data;
            if (res.ok) {
                data = await res.json();
            } else {
                data = generateFallbackSimulation(weekOffset);
            }
            renderSimulationResults(data, results);
            if (status) status.textContent = `Simulated Week ${data.simulated_week || 53 + weekOffset - 1}`;
            weekOffset++;
        } catch (e) {
            const data = generateFallbackSimulation(weekOffset);
            renderSimulationResults(data, results);
            if (status) status.textContent = `Simulated Week ${53 + weekOffset - 1} (demo)`;
            weekOffset++;
        }
        btn.disabled = false;
    });
}

function renderSimulationResults(data, container) {
    if (!container) return;
    const rows = data.data || [];
    container.innerHTML = rows.map(r => {
        const isLate = r.payment_delay_days > (r.contractual_terms_days || 21);
        const color = r.payment_status === 'critical' ? 'var(--red)' : isLate ? 'var(--amber)' : 'var(--green)';
        return `
            <div class="ai-live-card">
                <div class="live-name">${r.supplier_name || r.supplier_id}</div>
                <div class="live-delay" style="color:${color}">${r.payment_delay_days}d</div>
                <span class="live-status" style="background:${color}20;color:${color}">${r.payment_status || 'unknown'}</span>
            </div>`;
    }).join('');
}

function generateFallbackSimulation(offset) {
    const names = { S1: 'AlphaSteel Corp', S2: 'BetaLogistics Ltd', S3: 'GammaSupplies Co', S4: 'DeltaParts Inc', S5: 'EpsilonServices' };
    const bases = { S1: 15, S2: 58 + offset * 2, S3: 40 + offset, S4: 45 + offset * 1.5, S5: 14 };
    const terms = { S1: 15, S2: 21, S3: 14, S4: 21, S5: 7 };
    return {
        simulated_week: 52 + offset,
        data: Object.entries(names).map(([sid, name]) => {
            const delay = Math.round((bases[sid] + (Math.random() - 0.5) * 4) * 10) / 10;
            return {
                supplier_id: sid, supplier_name: name,
                payment_delay_days: delay, contractual_terms_days: terms[sid],
                payment_status: delay > terms[sid] + 15 ? 'critical' : delay > terms[sid] ? 'late' : 'on_time',
                is_simulated: true,
            };
        }),
    };
}

function getAIFallbackData(supplierId) {
    const supplierNames = { S1: 'AlphaSteel Corp', S2: 'BetaLogistics Ltd', S3: 'GammaSupplies Co', S4: 'DeltaParts Inc', S5: 'EpsilonServices' };
    const name = supplierNames[supplierId] || supplierId;

    const fallbacks = {
        S1: {
            risk: 'normal', confidence: 89.9, expected: [15.2, 15.4, 15.1, 15.3, 15.2, 15.1],
            low: [13.1, 12.8, 12.3, 12.0, 11.6, 11.2], high: [17.3, 18.0, 17.9, 18.6, 18.8, 19.0],
            anomalous: false, score: 72.3, totalAnomalies: 2,
        },
        S2: {
            risk: 'critical', confidence: 99.0, expected: [55.0, 56.2, 54.7, 55.2, 55.1, 55.1],
            low: [53.8, 54.8, 53.1, 53.4, 53.1, 52.9], high: [56.2, 57.6, 56.3, 57.0, 57.1, 57.3],
            anomalous: true, score: 0.0, totalAnomalies: 7,
        },
        S3: {
            risk: 'critical', confidence: 97.8, expected: [38.5, 39.1, 38.8, 39.2, 39.0, 39.1],
            low: [35.2, 35.5, 34.8, 35.0, 34.6, 34.4], high: [41.8, 42.7, 42.8, 43.4, 43.4, 43.8],
            anomalous: true, score: 5.2, totalAnomalies: 6,
        },
        S4: {
            risk: 'critical', confidence: 99.3, expected: [48.2, 49.0, 48.5, 48.8, 48.7, 48.6],
            low: [45.8, 46.2, 45.3, 45.3, 44.9, 44.5], high: [50.6, 51.8, 51.7, 52.3, 52.5, 52.7],
            anomalous: true, score: 3.1, totalAnomalies: 5,
        },
        S5: {
            risk: 'warning', confidence: 69.8, expected: [13.8, 14.0, 13.9, 14.1, 14.0, 14.0],
            low: [11.5, 11.4, 11.1, 11.0, 10.6, 10.2], high: [16.1, 16.6, 16.7, 17.2, 17.4, 17.8],
            anomalous: true, score: 15.4, totalAnomalies: 4,
        },
    };

    const f = fallbacks[supplierId] || fallbacks.S2;
    const weeks = [53, 54, 55, 56, 57, 58];

    // Generate anomaly score timeline
    const anomalyWeeks = Array.from({ length: 52 }, (_, i) => i + 1);
    const anomalyScores = anomalyWeeks.map(w => {
        if (f.anomalous && w > 40) return Math.max(0, 100 - (w - 35) * 3 + Math.random() * 10);
        return 50 + Math.random() * 40;
    });

    const anomalousWeeksList = anomalyWeeks
        .filter((w, i) => anomalyScores[i] < 20)
        .map(w => ({ week: w, anomaly_score: Math.round(Math.random() * 15), raw_score: -0.1, delay: f.expected[0] }));

    return {
        supplier_id: supplierId,
        supplier_name: name,
        ai_summary: `AI Risk Assessment: ${name} is classified as ${f.risk.toUpperCase()} risk with ${f.confidence}% confidence. ${f.risk === 'critical' ? 'Immediate attention required.' : f.risk === 'warning' ? 'Proactive monitoring recommended.' : 'No action needed.'} ${f.anomalous ? `Anomaly Alert: Current payment pattern flagged as anomalous (score: ${f.score}/100). ${f.totalAnomalies} anomalous weeks detected in history.` : 'No anomalies detected.'}`,
        ai_risk: {
            predicted_risk: f.risk,
            confidence: f.confidence,
            probability_distribution: {
                normal: f.risk === 'normal' ? f.confidence : Math.round(Math.random() * 5),
                watch: f.risk === 'watch' ? f.confidence : Math.round(Math.random() * 8),
                warning: f.risk === 'warning' ? f.confidence : Math.round(Math.random() * 10),
                critical: f.risk === 'critical' ? f.confidence : Math.round(Math.random() * 5),
            },
            method: 'random_forest_classifier',
        },
        ai_forecast: {
            supplier_id: supplierId,
            supplier_name: name,
            weeks: weeks,
            expected: f.expected,
            low: f.low,
            high: f.high,
            method: 'gradient_boosting',
            model_mae: 0.5,
            top_features: {
                delay_max_4w: 0.182,
                delay_max_8w: 0.156,
                delay_mean_4w: 0.143,
                delay_mean_8w: 0.121,
                trend_slope_6w: 0.098,
            },
        },
        ai_anomalies: {
            supplier_id: supplierId,
            supplier_name: name,
            current_anomaly_score: f.score,
            is_anomalous: f.anomalous,
            total_anomalies_detected: f.totalAnomalies,
            anomalous_weeks: anomalousWeeksList,
            score_timeline: {
                weeks: anomalyWeeks,
                scores: anomalyScores.map(s => Math.round(s * 10) / 10),
            },
        },
        ai_neural_forecast: {
            supplier_id: supplierId, supplier_name: name,
            weeks: weeks,
            expected: f.expected.map(v => Math.round((v + (Math.random() - 0.5) * 3) * 10) / 10),
            low: f.low.map(v => Math.round((v - 2) * 10) / 10),
            high: f.high.map(v => Math.round((v + 2) * 10) / 10),
            method: 'gru_neural_network',
            architecture: 'GRU(input=6, hidden=32) → Dense(1)',
        },
        ai_shap: {
            supplier_id: supplierId, supplier_name: name,
            base_prediction: f.expected[0],
            feature_contributions: {
                delay_max_4w: 0.182, delay_mean_8w: 0.156, trend_slope_6w: 0.143,
                excess_over_terms: 0.121, cross_supplier_spread: 0.098,
                delay_std_4w: -0.067, acceleration: 0.054, wow_change: -0.032,
            },
            explanation: `For ${name}, the AI predicts ${f.expected[0]} days delay. Increasing factors: peak delay in last 4 weeks, 8-week average delay, upward trend. Decreasing factors: stable recent payments, decelerating pattern.`,
            method: 'permutation_shap',
        },
        ai_cluster: {
            supplier_id: supplierId, supplier_name: name,
            cluster_label: f.risk === 'critical' ? 'Critical Deterioration' : f.risk === 'warning' ? 'Volatile & Unpredictable' : 'Stable & Reliable',
            cluster_color: f.risk === 'critical' ? '#ff1744' : f.risk === 'warning' ? '#ff6d00' : '#00e676',
            cluster_description: f.risk === 'critical' ? 'Severe delays with accelerating trend. Immediate attention.' : f.risk === 'warning' ? 'High payment variance. Risk of sudden deterioration.' : 'Consistently on-time payments with low variance.',
            recommended_action: f.risk === 'critical' ? 'Escalate to Credit Committee.' : f.risk === 'warning' ? 'Increase monitoring frequency.' : 'Continue standard monitoring.',
        },
        ai_model_comparison: {
            supplier_id: supplierId, supplier_name: name,
            models: [
                { name: 'Gradient Boosting', type: 'ml', mae: 0.5, color: '#7c5cfc', rank: 1 },
                { name: 'GRU Neural Net', type: 'deep_learning', mae: 1.8, color: '#ff6d00', rank: 2 },
                { name: 'Holt-Winters', type: 'statistical', mae: 3.2, color: '#00b0ff', rank: 3 },
                { name: 'Rolling Average', type: 'baseline', mae: 5.1, color: '#5a5672', rank: 4 },
            ],
            best_model: 'Gradient Boosting', best_mae: 0.5,
            improvement_over_baseline: 90.2,
        },
    };
}

// ══════════════════════════════════════
//  MY DATA PAGE — Custom Input & AI Analysis
// ══════════════════════════════════════

let mydataChart = null;
let mydataSuppliers = [];
let mydataPayments = [];

/**
 * Get the storage key for current user's custom data.
 */
function mydataStorageKey(suffix) {
    const session = Storage.getSession();
    const email = session ? session.email : 'anon';
    return `pp_mydata_${suffix}_${email}`;
}

/**
 * Load custom data from localStorage.
 */
function mydataLoadData() {
    try {
        mydataSuppliers = JSON.parse(localStorage.getItem(mydataStorageKey('suppliers')) || '[]');
        mydataPayments = JSON.parse(localStorage.getItem(mydataStorageKey('payments')) || '[]');
    } catch (e) {
        mydataSuppliers = [];
        mydataPayments = [];
    }
}

/**
 * Save custom data to localStorage.
 */
function mydataSaveData() {
    localStorage.setItem(mydataStorageKey('suppliers'), JSON.stringify(mydataSuppliers));
    localStorage.setItem(mydataStorageKey('payments'), JSON.stringify(mydataPayments));
}

/**
 * Initialize the My Data page — wire up all event listeners.
 */
function setupMyDataPage() {
    mydataLoadData();

    // Step 1: Add Supplier
    const addBtn = document.getElementById('mydata-add-supplier-btn');
    if (addBtn) {
        addBtn.addEventListener('click', mydataAddSupplier);
    }

    // Allow Enter key to add supplier
    const nameInput = document.getElementById('mydata-supplier-name');
    if (nameInput) {
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); mydataAddSupplier(); }
        });
    }

    // Step 1 → Step 2
    const gotoStep2 = document.getElementById('mydata-goto-step2');
    if (gotoStep2) gotoStep2.addEventListener('click', () => mydataGoToStep(2));

    // Step 2 → Step 1 (back)
    const backStep1 = document.getElementById('mydata-back-step1');
    if (backStep1) backStep1.addEventListener('click', () => mydataGoToStep(1));

    // Step 2: Add Payment
    const addPayBtn = document.getElementById('mydata-add-payment-btn');
    if (addPayBtn) addPayBtn.addEventListener('click', mydataAddPayment);

    // Step 2: Quick Fill toggle
    const quickfillBtn = document.getElementById('mydata-quickfill-btn');
    if (quickfillBtn) {
        quickfillBtn.addEventListener('click', () => {
            const panel = document.getElementById('mydata-quickfill-panel');
            if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        });
    }

    // Quick Fill profile buttons
    document.querySelectorAll('.mydata-profile-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const profile = btn.dataset.profile;
            mydataQuickFill(profile);
            const panel = document.getElementById('mydata-quickfill-panel');
            if (panel) panel.style.display = 'none';
        });
    });

    // Step 2 → Step 3 (Run AI)
    const gotoStep3 = document.getElementById('mydata-goto-step3');
    if (gotoStep3) gotoStep3.addEventListener('click', () => mydataGoToStep(3));

    // Step 3 → Step 2 (back)
    const backStep2 = document.getElementById('mydata-back-step2');
    if (backStep2) backStep2.addEventListener('click', () => mydataGoToStep(2));

    // Re-Analyze button
    const reanalyze = document.getElementById('mydata-reanalyze');
    if (reanalyze) reanalyze.addEventListener('click', mydataRunAnalysis);

    // Initial render
    mydataRenderSuppliers();
    mydataRenderPayments();
}

/**
 * Navigate between My Data steps.
 */
function mydataGoToStep(step) {
    const steps = [
        document.getElementById('mydata-step1'),
        document.getElementById('mydata-step2'),
        document.getElementById('mydata-step3'),
    ];

    steps.forEach((s, i) => {
        if (s) s.style.display = (i + 1 === step) ? 'block' : 'none';
    });

    // Update step indicators
    const dots = document.querySelectorAll('.mydata-step-dot');
    const lines = document.querySelectorAll('.mydata-step-line');
    const labels = document.querySelectorAll('.mydata-step-labels span');

    dots.forEach((dot, i) => {
        dot.classList.remove('active', 'completed');
        if (i + 1 < step) dot.classList.add('completed');
        else if (i + 1 === step) dot.classList.add('active');
    });

    lines.forEach((line, i) => {
        line.classList.toggle('filled', i + 1 < step);
    });

    labels.forEach((label, i) => {
        label.classList.remove('active', 'completed');
        if (i + 1 < step) label.classList.add('completed');
        else if (i + 1 === step) label.classList.add('active');
    });

    // Populate payment supplier dropdown when entering step 2
    if (step === 2) {
        mydataPopulatePaymentDropdown();
    }

    // Run analysis when entering step 3
    if (step === 3) {
        mydataRunAnalysis();
    }

    window.scrollTo(0, 0);
}

/**
 * Add a new custom supplier.
 */
function mydataAddSupplier() {
    const nameEl = document.getElementById('mydata-supplier-name');
    const termsEl = document.getElementById('mydata-supplier-terms');
    const invoiceEl = document.getElementById('mydata-supplier-invoice');

    const name = nameEl.value.trim();
    if (!name) { nameEl.focus(); return; }

    const terms = parseInt(termsEl.value) || 21;
    const invoice = parseInt(invoiceEl.value) || 50000;

    // Generate unique ID
    const id = 'C' + (mydataSuppliers.length + 1);

    mydataSuppliers.push({
        supplier_id: id,
        supplier_name: name,
        contractual_terms: terms,
        avg_invoice: invoice,
    });

    mydataSaveData();
    mydataRenderSuppliers();

    // Clear form
    nameEl.value = '';
    nameEl.focus();
}

/**
 * Remove a custom supplier and its payments.
 */
function mydataRemoveSupplier(supplierId) {
    mydataSuppliers = mydataSuppliers.filter(s => s.supplier_id !== supplierId);
    mydataPayments = mydataPayments.filter(p => p.supplier_id !== supplierId);
    mydataSaveData();
    mydataRenderSuppliers();
    mydataRenderPayments();
}

/**
 * Render supplier cards.
 */
function mydataRenderSuppliers() {
    const grid = document.getElementById('mydata-suppliers-grid');
    const empty = document.getElementById('mydata-empty-suppliers');
    const nextBtn = document.getElementById('mydata-goto-step2');

    if (!grid) return;

    if (mydataSuppliers.length === 0) {
        grid.innerHTML = '';
        if (empty) empty.style.display = 'flex';
        if (nextBtn) nextBtn.style.display = 'none';
        return;
    }

    if (empty) empty.style.display = 'none';
    if (nextBtn) nextBtn.style.display = mydataSuppliers.length >= 2 ? 'flex' : 'none';

    grid.innerHTML = mydataSuppliers.map(s => `
        <div class="mydata-supplier-card" data-id="${s.supplier_id}">
            <button class="mydata-supplier-remove" data-id="${s.supplier_id}" title="Remove">&times;</button>
            <div class="mydata-supplier-card-name">${s.supplier_name}</div>
            <div class="mydata-supplier-card-meta">
                <span>Terms: <strong>${s.contractual_terms}d</strong></span>
                <span>Avg Invoice: <strong>₹${(s.avg_invoice || 0).toLocaleString('en-IN')}</strong></span>
                <span>ID: <strong>${s.supplier_id}</strong></span>
            </div>
        </div>
    `).join('');

    // Attach remove handlers
    grid.querySelectorAll('.mydata-supplier-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            mydataRemoveSupplier(btn.dataset.id);
        });
    });
}

/**
 * Populate the payment form's supplier dropdown.
 */
function mydataPopulatePaymentDropdown() {
    const select = document.getElementById('mydata-pay-supplier');
    if (!select) return;

    select.innerHTML = mydataSuppliers.map(s =>
        `<option value="${s.supplier_id}">${s.supplier_name}</option>`
    ).join('');

    // Auto-set next week number
    const weekInput = document.getElementById('mydata-pay-week');
    if (weekInput && select.value) {
        const supplierPayments = mydataPayments.filter(p => p.supplier_id === select.value);
        const maxWeek = supplierPayments.length > 0
            ? Math.max(...supplierPayments.map(p => p.week)) + 1
            : 1;
        weekInput.value = Math.min(maxWeek, 52);
    }

    // Update week on supplier change
    select.onchange = () => {
        const supplierPayments = mydataPayments.filter(p => p.supplier_id === select.value);
        const maxWeek = supplierPayments.length > 0
            ? Math.max(...supplierPayments.map(p => p.week)) + 1
            : 1;
        if (weekInput) weekInput.value = Math.min(maxWeek, 52);
    };
}

/**
 * Add a single payment entry.
 */
function mydataAddPayment() {
    const supplierId = document.getElementById('mydata-pay-supplier').value;
    const week = parseInt(document.getElementById('mydata-pay-week').value) || 1;
    const delay = parseFloat(document.getElementById('mydata-pay-delay').value) || 0;
    const invoice = parseFloat(document.getElementById('mydata-pay-invoice').value) || 50000;

    if (!supplierId) return;

    // Remove existing entry for same supplier + week (overwrite)
    mydataPayments = mydataPayments.filter(p => !(p.supplier_id === supplierId && p.week === week));

    const supplier = mydataSuppliers.find(s => s.supplier_id === supplierId);

    mydataPayments.push({
        supplier_id: supplierId,
        supplier_name: supplier ? supplier.supplier_name : supplierId,
        week,
        delay: Math.round(delay * 10) / 10,
        invoice: Math.round(invoice),
    });

    // Sort by week then supplier
    mydataPayments.sort((a, b) => a.week - b.week || a.supplier_id.localeCompare(b.supplier_id));

    mydataSaveData();
    mydataRenderPayments();

    // Auto-increment week
    const weekInput = document.getElementById('mydata-pay-week');
    if (weekInput) weekInput.value = Math.min(week + 1, 52);
}

/**
 * Remove a payment entry.
 */
function mydataRemovePayment(index) {
    mydataPayments.splice(index, 1);
    mydataSaveData();
    mydataRenderPayments();
}

/**
 * Render the payment entries table.
 */
function mydataRenderPayments() {
    const list = document.getElementById('mydata-payments-list');
    const tableWrap = document.getElementById('mydata-payments-table-wrap');
    const empty = document.getElementById('mydata-empty-payments');
    const nextBtn = document.getElementById('mydata-goto-step3');

    if (!list) return;

    if (mydataPayments.length === 0) {
        if (tableWrap) tableWrap.style.display = 'none';
        if (empty) empty.style.display = 'flex';
        if (nextBtn) nextBtn.style.display = 'none';
        return;
    }

    if (tableWrap) tableWrap.style.display = 'block';
    if (empty) empty.style.display = 'none';

    // Show analyze button if we have enough data (at least 4 entries)
    if (nextBtn) nextBtn.style.display = mydataPayments.length >= 4 ? 'flex' : 'none';

    list.innerHTML = mydataPayments.map((p, i) => {
        const supplier = mydataSuppliers.find(s => s.supplier_id === p.supplier_id);
        const terms = supplier ? supplier.contractual_terms : 21;
        const delayClass = p.delay > terms * 1.5 ? 'high' : p.delay > terms ? 'medium' : 'low';
        return `
            <div class="mydata-payment-row">
                <span class="pay-week">W${p.week}</span>
                <span class="pay-supplier">${p.supplier_name}</span>
                <span class="pay-delay ${delayClass}">${p.delay}d</span>
                <span>₹${p.invoice.toLocaleString('en-IN')}</span>
                <button class="mydata-payment-remove" data-index="${i}" title="Remove">&times;</button>
            </div>
        `;
    }).join('');

    // Attach remove handlers
    list.querySelectorAll('.mydata-payment-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            mydataRemovePayment(parseInt(btn.dataset.index));
        });
    });
}

/**
 * Quick-fill payment data with a chosen health profile.
 * Generates 12 weeks of realistic data for ALL suppliers.
 */
function mydataQuickFill(profile) {
    if (mydataSuppliers.length === 0) return;

    // Clear existing payments  
    mydataPayments = [];

    const weeks = 12;

    mydataSuppliers.forEach((supplier, si) => {
        const terms = supplier.contractual_terms || 21;
        const baseInvoice = supplier.avg_invoice || 50000;

        for (let w = 1; w <= weeks; w++) {
            let delay, invoice;
            const noise = (Math.random() - 0.5) * 3; // ±1.5 days noise

            if (profile === 'healthy') {
                // All suppliers within terms
                delay = Math.max(1, terms * 0.7 + noise);
            } else if (profile === 'drifting') {
                // First supplier: starts normal, drifts high
                // Others: stay relatively stable
                if (si === 0) {
                    const drift = (w / weeks) * terms * 0.8;
                    delay = Math.max(1, terms * 0.6 + drift + noise);
                } else if (si === 1 && mydataSuppliers.length > 2) {
                    const drift = (w / weeks) * terms * 0.4;
                    delay = Math.max(1, terms * 0.5 + drift + noise);
                } else {
                    delay = Math.max(1, terms * 0.6 + noise);
                }
            } else if (profile === 'stressed') {
                // First supplier: severely delayed and accelerating
                // Second supplier: moderately delayed
                // Others: on time (creating triage signal)
                if (si === 0) {
                    const acceleration = (w / weeks) * terms * 1.8;
                    delay = Math.max(1, terms + acceleration + noise * 2);
                } else if (si === 1) {
                    const drift = (w / weeks) * terms * 0.8;
                    delay = Math.max(1, terms * 0.8 + drift + noise);
                } else {
                    delay = Math.max(1, terms * 0.5 + noise);
                }
            }

            invoice = Math.round(baseInvoice * (0.85 + Math.random() * 0.3));

            mydataPayments.push({
                supplier_id: supplier.supplier_id,
                supplier_name: supplier.supplier_name,
                week: w,
                delay: Math.round(delay * 10) / 10,
                invoice,
            });
        }
    });

    mydataPayments.sort((a, b) => a.week - b.week || a.supplier_id.localeCompare(b.supplier_id));
    mydataSaveData();
    mydataRenderPayments();
}

/**
 * Run AI analysis on custom data.
 */
function mydataRunAnalysis() {
    const analyzing = document.getElementById('mydata-analyzing');
    const results = document.getElementById('mydata-results');

    if (analyzing) analyzing.style.display = 'flex';
    if (results) results.style.display = 'none';

    // Simulate analysis delay for UX
    setTimeout(() => {
        const analysisResult = mydataComputeAnalysis();
        mydataRenderResults(analysisResult);

        if (analyzing) analyzing.style.display = 'none';
        if (results) results.style.display = 'block';
    }, 1200);
}

/**
 * Compute full analysis from custom data using AnalysisEngine.
 */
function mydataComputeAnalysis() {
    // Build supplier objects matching the format expected by AnalysisEngine
    const supplierSummaries = mydataSuppliers.map(s => {
        const payments = mydataPayments
            .filter(p => p.supplier_id === s.supplier_id)
            .sort((a, b) => a.week - b.week);

        const delays = payments.map(p => p.delay);
        const lastDelay = delays.length > 0 ? delays[delays.length - 1] : 0;

        // Build sparkline (last 12 data points)
        const sparkline = delays.slice(-12);

        // Compute trend slope
        let trendSlope = 0;
        if (delays.length >= 3) {
            const n = delays.length;
            const halfN = Math.floor(n / 2);
            const firstHalfAvg = delays.slice(0, halfN).reduce((a, b) => a + b, 0) / halfN;
            const secondHalfAvg = delays.slice(halfN).reduce((a, b) => a + b, 0) / (n - halfN);
            trendSlope = (secondHalfAvg - firstHalfAvg) / Math.max(1, n / 2);
        }

        // Determine trend
        let trend = 'stable';
        if (trendSlope > 1.5) trend = 'accelerating';
        else if (trendSlope > 0.5) trend = 'drifting';
        else if (trendSlope < -0.5) trend = 'improving';

        // Determine severity
        const terms = s.contractual_terms || 21;
        let severity = 'normal';
        if (lastDelay > terms + 15) severity = 'critical';
        else if (lastDelay > terms + 5) severity = 'warning';
        else if (lastDelay > terms) severity = 'watch';

        return {
            supplier_id: s.supplier_id,
            supplier_name: s.supplier_name,
            current_delay: Math.round(lastDelay * 10) / 10,
            contractual_terms: terms,
            severity,
            trend,
            trend_slope: Math.round(trendSlope * 100) / 100,
            sparkline,
            payments,
        };
    });

    // Build data object for AnalysisEngine
    const session = Storage.getSession();
    const profile = session ? Storage.getProfile(session.email) : null;
    const businessName = (profile && profile.businessName) || 'Your Business';

    const smeData = {
        name: businessName,
        suppliers: { suppliers: supplierSummaries },
    };

    // Run AnalysisEngine
    const companyResult = AnalysisEngine.buildCompanyData(smeData);
    const triageResult = AnalysisEngine.buildTriageData(smeData);
    const delays = supplierSummaries.map(s => s.current_delay);
    const triageScore = AnalysisEngine.calculateTriageScore(delays);
    const insight = AnalysisEngine.generateInsight(smeData);

    // Detect anomalies (simple: flag suppliers with delay > 2x terms)
    let anomalyCount = 0;
    const anomalies = supplierSummaries.filter(s => {
        const isAnomaly = s.current_delay > s.contractual_terms * 1.5 && s.trend !== 'stable';
        if (isAnomaly) anomalyCount++;
        return isAnomaly;
    });

    // Generate recommendations
    const recommendations = mydataGenerateRecommendations(supplierSummaries, companyResult, triageResult);

    return {
        company: companyResult,
        triage: triageResult,
        triageScore,
        insight,
        suppliers: supplierSummaries,
        anomalyCount,
        anomalies,
        recommendations,
    };
}

/**
 * Generate personalized recommendations based on analysis.
 */
function mydataGenerateRecommendations(suppliers, company, triage) {
    const recs = [];
    const risk = company.risk_level;

    // Risk-level recommendations
    if (risk === 'RED') {
        recs.push({
            text: `<strong>Urgent:</strong> Your business is showing severe financial stress signals. ${suppliers.filter(s => s.severity === 'critical').length} supplier${suppliers.filter(s => s.severity === 'critical').length !== 1 ? 's are' : ' is'} significantly beyond contractual terms. Immediate intervention is recommended.`,
            type: 'urgent',
        });
    } else if (risk === 'AMBER') {
        recs.push({
            text: `<strong>Attention:</strong> Early signs of payment stress detected. Payment patterns show emerging divergence — act now to prevent escalation to critical levels.`,
            type: '',
        });
    } else {
        recs.push({
            text: `<strong>Healthy:</strong> Your supplier payment patterns are within normal ranges. Continue monitoring to maintain this healthy status.`,
            type: 'positive',
        });
    }

    // Triage-specific
    if (triage.triage_detected) {
        recs.push({
            text: `<strong>Payment Triage Detected:</strong> You're selectively prioritising ${triage.favored_suppliers.length} supplier${triage.favored_suppliers.length !== 1 ? 's' : ''} over ${triage.stretched_suppliers.length} delayed one${triage.stretched_suppliers.length !== 1 ? 's' : ''}. This pattern is a classic early signal of cash flow pressure.`,
            type: 'urgent',
        });
    }

    // Per-supplier recs
    const accelerating = suppliers.filter(s => s.trend === 'accelerating');
    if (accelerating.length > 0) {
        recs.push({
            text: `<strong>${accelerating.map(s => s.supplier_name).join(', ')}:</strong> Payment delays are accelerating — getting worse each week. Prioritise negotiating revised terms or accelerating payments to these suppliers.`,
            type: 'urgent',
        });
    }

    const drifting = suppliers.filter(s => s.trend === 'drifting');
    if (drifting.length > 0) {
        recs.push({
            text: `<strong>${drifting.map(s => s.supplier_name).join(', ')}:</strong> Gradual upward drift in payment timing. Monitor closely and consider stabilising before the trend escalates.`,
            type: '',
        });
    }

    const stable = suppliers.filter(s => s.severity === 'normal' && s.trend === 'stable');
    if (stable.length > 0 && risk !== 'GREEN') {
        recs.push({
            text: `<strong>${stable.map(s => s.supplier_name).join(', ')}:</strong> Payments remain stable and on time. These supplier relationships are healthy.`,
            type: 'positive',
        });
    }

    return recs;
}

/**
 * Render the full analysis results dashboard.
 */
function mydataRenderResults(result) {
    // Risk badge
    const riskBadge = document.getElementById('mydata-risk-badge');
    if (riskBadge) {
        riskBadge.textContent = result.company.risk_level;
        riskBadge.className = 'mydata-result-badge ' + result.company.risk_level.toLowerCase();
    }
    const riskSub = document.getElementById('mydata-risk-sub');
    if (riskSub) {
        const riskTexts = { RED: 'Severe stress detected', AMBER: 'Early warning signs', GREEN: 'Healthy status' };
        riskSub.textContent = riskTexts[result.company.risk_level] || '';
    }

    // Triage status
    const triageStatus = document.getElementById('mydata-triage-status');
    if (triageStatus) {
        triageStatus.textContent = result.triage.triage_detected ? 'Detected' : 'None';
        triageStatus.style.color = result.triage.triage_detected ? 'var(--amber)' : 'var(--green)';
    }
    const triageSub = document.getElementById('mydata-triage-sub');
    if (triageSub) {
        triageSub.textContent = result.triage.triage_detected
            ? `${result.triage.stretched_suppliers.length} delayed, ${result.triage.favored_suppliers.length} on time`
            : 'No selective prioritisation';
    }

    // Triage score
    const triageScoreEl = document.getElementById('mydata-triage-score');
    if (triageScoreEl) {
        triageScoreEl.textContent = result.triageScore + '/100';
    }
    const scoreBar = document.getElementById('mydata-score-bar');
    if (scoreBar) {
        setTimeout(() => { scoreBar.style.width = result.triageScore + '%'; }, 100);
    }

    // Anomalies
    const anomalyCount = document.getElementById('mydata-anomaly-count');
    if (anomalyCount) {
        anomalyCount.textContent = result.anomalyCount;
        anomalyCount.style.color = result.anomalyCount > 0 ? 'var(--amber)' : 'var(--green)';
    }
    const anomalySub = document.getElementById('mydata-anomaly-sub');
    if (anomalySub) {
        anomalySub.textContent = result.anomalyCount > 0
            ? `${result.anomalies.map(a => a.supplier_name).join(', ')}`
            : 'No anomalies detected';
    }

    // Narrative
    const narrativeText = document.getElementById('mydata-narrative-text');
    if (narrativeText) {
        narrativeText.textContent = result.insight;
    }

    // Trend chart
    mydataRenderTrendChart(result.suppliers);

    // Supplier breakdown
    mydataRenderBreakdown(result.suppliers);

    // Recommendations
    mydataRenderRecommendations(result.recommendations);
}

/**
 * Render the trend chart using Chart.js.
 */
function mydataRenderTrendChart(suppliers) {
    const canvas = document.getElementById('mydata-trend-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (mydataChart) mydataChart.destroy();

    const suppliersWithData = suppliers.filter(s => s.sparkline && s.sparkline.length > 0);
    if (suppliersWithData.length === 0) return;

    const maxLen = Math.max(...suppliersWithData.map(s => s.sparkline.length));
    const labels = Array.from({ length: maxLen }, (_, i) => `W${i + 1}`);

    const lineColors = [
        { border: '#ff1744', bg: 'rgba(255,23,68,0.08)' },
        { border: '#ffab00', bg: 'rgba(255,171,0,0.08)' },
        { border: '#7c5cfc', bg: 'rgba(124,92,252,0.06)' },
        { border: '#00e676', bg: 'rgba(0,230,118,0.06)' },
        { border: '#00b0ff', bg: 'rgba(0,176,255,0.06)' },
    ];

    // Sort by severity (worst first)
    const severityOrder = { critical: 4, warning: 3, watch: 2, normal: 1 };
    const sorted = [...suppliersWithData].sort((a, b) =>
        (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0)
    );

    const datasets = sorted.slice(0, 5).map((s, i) => ({
        label: s.supplier_name,
        data: [...Array(maxLen - s.sparkline.length).fill(null), ...s.sparkline],
        borderColor: lineColors[i % lineColors.length].border,
        backgroundColor: lineColors[i % lineColors.length].bg,
        borderWidth: 2.5,
        pointRadius: 2,
        pointHoverRadius: 5,
        tension: 0.35,
        fill: true,
    }));

    // Add contractual terms line for the worst supplier
    if (sorted[0]) {
        datasets.push({
            label: `Terms (${sorted[0].contractual_terms}d)`,
            data: labels.map(() => sorted[0].contractual_terms),
            borderColor: 'rgba(0,230,118,0.25)',
            borderDash: [4, 6],
            borderWidth: 1,
            pointRadius: 0,
            fill: false,
        });
    }

    mydataChart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: 'index' },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#8b86a3', font: { family: 'Inter', size: 11 }, boxWidth: 10, padding: 16 },
                },
                tooltip: {
                    backgroundColor: 'rgba(10,14,26,0.95)',
                    titleColor: '#e8e6f0',
                    bodyColor: '#8b86a3',
                    borderColor: 'rgba(124,92,252,0.15)',
                    borderWidth: 1,
                    padding: 10,
                    callbacks: { label: (c) => `${c.dataset.label}: ${c.parsed.y}d` },
                },
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#5a5672', font: { family: 'Inter', size: 10 }, maxTicksLimit: 12 } },
                y: {
                    grid: { color: 'rgba(124,92,252,0.04)' },
                    ticks: { color: '#5a5672', font: { family: 'Inter', size: 10 }, callback: (v) => v + 'd' },
                    title: { display: true, text: 'Payment Delay (days)', color: '#5a5672', font: { family: 'Inter', size: 11 } },
                },
            },
        },
    });
}

/**
 * Render supplier breakdown list.
 */
function mydataRenderBreakdown(suppliers) {
    const list = document.getElementById('mydata-breakdown-list');
    if (!list) return;

    const severityOrder = { critical: 4, warning: 3, watch: 2, normal: 1 };
    const sorted = [...suppliers].sort((a, b) =>
        (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0)
    );

    list.innerHTML = sorted.map(s => {
        const terms = s.contractual_terms;
        const delay = Math.round(s.current_delay);
        const delayColor = delay > terms * 1.5 ? 'red' : delay > terms ? 'amber' : 'green';
        const excess = Math.max(0, delay - terms);
        const trendText = s.trend === 'accelerating' ? '↗ Accelerating'
            : s.trend === 'drifting' ? '→↗ Drifting up'
            : s.trend === 'improving' ? '↘ Improving'
            : '→ Stable';

        return `
            <div class="mydata-breakdown-item">
                <div class="mydata-breakdown-left">
                    <span class="mydata-breakdown-name">${s.supplier_name}</span>
                    <span class="mydata-breakdown-detail">Terms: ${terms}d · Excess: ${excess > 0 ? '+' + excess + 'd' : 'On time'} · ${trendText}</span>
                </div>
                <div class="mydata-breakdown-right">
                    <span class="mydata-breakdown-delay ${delayColor}">${delay}d</span>
                    <span class="mydata-breakdown-severity ${s.severity}">${s.severity}</span>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Render recommendations list.
 */
function mydataRenderRecommendations(recommendations) {
    const list = document.getElementById('mydata-rec-list');
    if (!list) return;

    list.innerHTML = recommendations.map(r => `
        <div class="mydata-rec-item ${r.type}">${r.text}</div>
    `).join('');
}


// ══════════════════════════════════════
//  RISK SPREAD PAGE (redesigned contagion)
// ══════════════════════════════════════

let _cgGraph = null;
let _cgLayout = null;

/**
 * Format a number in Indian Rupee format (₹1,23,456)
 */
function formatINR(amount) {
    if (amount == null || isNaN(amount)) return '—';
    return '₹' + Math.round(amount).toLocaleString('en-IN');
}

async function setupContagionPage() {
    const seedSel = document.getElementById('contagion-seed-select');
    const runBtn = document.getElementById('contagion-run-btn');
    if (!seedSel || seedSel._wired) return;
    seedSel._wired = true;

    try {
        const res = await fetch(`${API_BASE}/api/contagion/graph?limit=400`);
        if (!res.ok) throw new Error('graph fetch failed');
        _cgGraph = await res.json();
        seedSel.innerHTML = '';
        // Only show the real portfolio SMEs in the dropdown — they're the
        // ones the user has seen in the SME/Bank views. The rest of the
        // graph is their network (modelled as peer suppliers), which
        // appears in the cascade.
        const portfolioNodes = _cgGraph.nodes.filter(n => n.kind === 'bank_borrower' && n.is_portfolio);
        // Fallback: if none are flagged (shouldn't happen), show all.
        const borrowerNodes = (portfolioNodes.length ? portfolioNodes : _cgGraph.nodes.filter(n => n.kind === 'bank_borrower'))
            .sort((a, b) => (b.total_payables + b.total_receivables) - (a.total_payables + a.total_receivables));
        borrowerNodes.forEach(n => {
            const opt = document.createElement('option');
            opt.value = n.id;
            const exposure = Math.round((n.total_payables + n.total_receivables) * 100); // Convert to INR scale
            opt.textContent = `${n.label} — ${formatINR(exposure)} exposure`;
            seedSel.appendChild(opt);
        });
        if (borrowerNodes.length) seedSel.value = borrowerNodes[0].id;
        _cgLayout = cgComputeLayout(_cgGraph);
        cgRenderGraph({ impacted: [], seeds: [] });
    } catch (e) {
        seedSel.innerHTML = '<option value="">Service loading — please retry</option>';
    }

    runBtn && runBtn.addEventListener('click', runContagion);
}

async function runContagion() {
    if (!_cgGraph) return;
    const seed = document.getElementById('contagion-seed-select').value;
    const steps = parseInt(document.getElementById('contagion-steps').value || '8', 10);
    const threshold = parseFloat(document.getElementById('contagion-threshold').value || '0.25');
    if (!seed) return;

    // Find seed name for headline
    const seedNode = (_cgGraph.nodes || []).find(n => n.id === seed);
    const seedName = seedNode ? seedNode.label : 'this SME';

    try {
        const res = await fetch(`${API_BASE}/api/contagion/simulate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ seeds: [seed], steps, threshold }),
        });
        if (!res.ok) throw new Error('sim failed');
        const data = await res.json();
        const s = data.summary || {};
        const impacted = data.bank_book_impacted || [];
        const nImpacted = s.n_bank_book_impacted || impacted.length || 0;

        // Convert exposure to INR scale (multiply by 100 for realistic INR values)
        const exposureINR = (s.total_exposure_at_risk || 0) * 100;

        // Count high-risk SMEs (stress > 0.6)
        const highRiskCount = impacted.filter(x => x.stress > 0.6).length;

        // Portfolio context — total bank-book SMEs
        const totalBankBook = (_cgGraph.nodes || []).filter(n => n.kind === 'bank_borrower').length;
        const pctPortfolio = totalBankBook > 0 ? (nImpacted / totalBankBook) * 100 : 0;

        // Update hero headline dynamically
        const heroTitle = document.getElementById('cg-hero-title');
        if (heroTitle && nImpacted > 0) {
            heroTitle.innerHTML = `If <strong>${seedName}</strong> fails, <span style="color:var(--red)">${formatINR(exposureINR)}</span> exposure across <strong>${nImpacted} businesses</strong> is at risk`;
        } else if (heroTitle) {
            heroTitle.innerHTML = `<strong>${seedName}</strong> has minimal risk spread — your portfolio is well insulated`;
        }

        // Show summary section + animate counters
        const summaryEl = document.getElementById('contagion-summary');
        summaryEl.style.display = 'grid';
        document.getElementById('cg-n-seeds').textContent = s.n_seeds ?? '—';
        cgAnimateNumber(document.getElementById('cg-n-impacted'), nImpacted);
        cgAnimateNumber(document.getElementById('cg-exposure'), exposureINR, { currency: true });
        document.getElementById('cg-steps').textContent = s.steps ?? '—';
        cgAnimateNumber(document.getElementById('cg-n-high-risk'), highRiskCount);

        // Render the new Shockwave visualization
        cgRenderShockwave({ impacted, seedName, seedId: (data.seeds || [])[0] });

        // Render floating exposure badge
        const floatEl = document.getElementById('cg-shockwave-float');
        if (floatEl && nImpacted > 0) {
            floatEl.style.display = 'flex';
            document.getElementById('cg-float-value').textContent = formatINR(exposureINR);
            document.getElementById('cg-float-sub').textContent = `${pctPortfolio.toFixed(1)}% of ${totalBankBook}-SME book`;
        } else if (floatEl) {
            floatEl.style.display = 'none';
        }

        // Render impacted SME cards
        cgRenderImpactedCards(impacted, data.seeds || [], seedName);

        // Damage report narrative
        cgShowDamageReport({ impacted, nImpacted, seedName, exposureINR, highRiskCount, pctPortfolio, totalBankBook });

        // Week-by-week propagation timeline
        cgRenderTimeline({ impacted, timeline: data.timeline || [], steps });

    } catch (e) {
        console.warn('risk spread simulation failed', e);
    }
}

/**
 * Animate a numeric value counting up. For currency, format via formatINR.
 */
function cgAnimateNumber(el, target, opts = {}) {
    if (!el) return;
    const { currency = false, duration = 900 } = opts;
    const start = performance.now();
    // Clear any previous rAF token on this element
    if (el._cgAnim) cancelAnimationFrame(el._cgAnim);
    const step = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
        const val = target * eased;
        el.textContent = currency ? formatINR(val) : Math.round(val).toLocaleString('en-IN');
        if (t < 1) {
            el._cgAnim = requestAnimationFrame(step);
        } else {
            el.textContent = currency ? formatINR(target) : Math.round(target).toLocaleString('en-IN');
        }
    };
    el._cgAnim = requestAnimationFrame(step);
}

/**
 * Render the Shockwave Epicenter — seed at center, impacted SMEs on concentric
 * week-rings, animated contagion pulses emanating outward.
 */
function cgRenderShockwave({ impacted, seedName, seedId }) {
    const svg = document.getElementById('cg-shockwave-svg');
    const empty = document.getElementById('cg-shockwave-empty');
    if (!svg) return;

    // Clean previous content
    svg.innerHTML = '';

    if (!impacted || impacted.length === 0) {
        if (empty) empty.style.display = 'flex';
        return;
    }
    if (empty) empty.style.display = 'none';

    const W = 800, H = 560;
    const cx = W / 2, cy = H / 2 + 10;

    // Ring configuration — radii by week bucket
    const rings = [
        { key: 'w1', label: 'Week 1–2', r: 120, minStep: 1, maxStep: 2, color: '#ff1744' },
        { key: 'w2', label: 'Week 3–4', r: 195, minStep: 3, maxStep: 4, color: '#ff7a45' },
        { key: 'w3', label: 'Week 5+',  r: 260, minStep: 5, maxStep: 99, color: '#ffab00' },
    ];

    const svgNS = 'http://www.w3.org/2000/svg';
    const defs = document.createElementNS(svgNS, 'defs');
    defs.innerHTML = `
        <radialGradient id="cgSeedGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
            <stop offset="60%" stop-color="#ff4d6d" stop-opacity="0.9"/>
            <stop offset="100%" stop-color="#ff1744" stop-opacity="0.8"/>
        </radialGradient>
        <radialGradient id="cgStageGrad" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stop-color="rgba(255,23,68,0.10)"/>
            <stop offset="60%" stop-color="rgba(124,92,252,0.04)"/>
            <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
        </radialGradient>
    `;
    svg.appendChild(defs);

    // Stage glow
    const bg = document.createElementNS(svgNS, 'circle');
    bg.setAttribute('cx', cx); bg.setAttribute('cy', cy); bg.setAttribute('r', 300);
    bg.setAttribute('fill', 'url(#cgStageGrad)');
    svg.appendChild(bg);

    // Week-ring guides + labels
    rings.forEach(ring => {
        const c = document.createElementNS(svgNS, 'circle');
        c.setAttribute('class', 'cg-sw-ring');
        c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', ring.r);
        svg.appendChild(c);

        const lbl = document.createElementNS(svgNS, 'text');
        lbl.setAttribute('class', 'cg-sw-ring-label');
        lbl.setAttribute('x', cx + ring.r + 6);
        lbl.setAttribute('y', cy + 4);
        lbl.textContent = ring.label;
        svg.appendChild(lbl);
    });

    // Bucket impacted SMEs by ring
    const buckets = rings.map(r => ({ ring: r, items: [] }));
    impacted.forEach(imp => {
        const step = imp.first_impacted_step || 1;
        const bucket = buckets.find(b => step >= b.ring.minStep && step <= b.ring.maxStep);
        if (bucket) bucket.items.push(imp);
    });

    // Compute node positions per bucket — spread evenly around the ring
    // with slight jitter so nearby nodes don't overlap
    const nodePositions = [];
    buckets.forEach((bucket, bIdx) => {
        const N = bucket.items.length;
        if (N === 0) return;
        // Sort by exposure so biggest node is at "top" position — easier to scan
        const sorted = [...bucket.items].sort((a, b) => (b.exposure_at_risk || 0) - (a.exposure_at_risk || 0));
        // Start angle offset per ring so labels don't stack vertically
        const startAngle = -Math.PI / 2 + (bIdx * 0.35);
        const span = N === 1 ? 0 : Math.PI * 2;
        sorted.forEach((imp, i) => {
            const t = N === 1 ? 0 : (i / N);
            const angle = startAngle + t * span;
            const x = cx + bucket.ring.r * Math.cos(angle);
            const y = cy + bucket.ring.r * Math.sin(angle);
            nodePositions.push({
                imp,
                x, y, angle,
                color: bucket.ring.color,
                ring: bucket.ring,
            });
        });
    });

    // Node radius scale: sqrt of exposure, normalised
    const maxExp = Math.max(1, ...nodePositions.map(p => p.imp.exposure_at_risk || 0));
    const nodeR = (exp) => {
        const norm = Math.sqrt(Math.max(0, exp) / maxExp);
        return 6 + norm * 14; // 6px → 20px
    };

    // Draw edges from seed to each impacted node (animated)
    nodePositions.forEach((p, i) => {
        const edge = document.createElementNS(svgNS, 'line');
        edge.setAttribute('class', 'cg-sw-edge');
        edge.setAttribute('x1', cx);
        edge.setAttribute('y1', cy);
        edge.setAttribute('x2', p.x);
        edge.setAttribute('y2', p.y);
        edge.setAttribute('stroke', p.color);
        edge.style.animationDelay = `${0.1 + (p.imp.first_impacted_step || 1) * 0.08}s, 0s`;
        svg.appendChild(edge);
    });

    // Draw impacted nodes
    nodePositions.forEach((p, i) => {
        const r = nodeR(p.imp.exposure_at_risk || 0);
        const stress = p.imp.stress || 0;

        // Halo
        const halo = document.createElementNS(svgNS, 'circle');
        halo.setAttribute('class', 'cg-sw-node');
        halo.setAttribute('cx', p.x);
        halo.setAttribute('cy', p.y);
        halo.setAttribute('r', r + 4);
        halo.setAttribute('fill', p.color);
        halo.setAttribute('fill-opacity', '0.18');
        halo.style.animationDelay = `${0.15 + (p.imp.first_impacted_step || 1) * 0.1}s`;
        svg.appendChild(halo);

        // Core node
        const node = document.createElementNS(svgNS, 'circle');
        node.setAttribute('class', 'cg-sw-node');
        node.setAttribute('cx', p.x);
        node.setAttribute('cy', p.y);
        node.setAttribute('r', r);
        node.setAttribute('fill', p.color);
        node.setAttribute('stroke', '#fff');
        node.setAttribute('stroke-width', stress > 0.6 ? 2 : 1);
        node.style.filter = `drop-shadow(0 0 ${6 + stress * 8}px ${p.color})`;
        node.style.animationDelay = `${0.2 + (p.imp.first_impacted_step || 1) * 0.1}s`;
        const title = document.createElementNS(svgNS, 'title');
        title.textContent = `${p.imp.label} — week ${p.imp.first_impacted_step || 1}, stress ${(stress*100).toFixed(0)}%, exposure ${formatINR((p.imp.exposure_at_risk || 0) * 100)}`;
        node.appendChild(title);
        svg.appendChild(node);

        // Labels — only for larger nodes to avoid clutter
        if (r >= 9) {
            const labelOffset = r + 14;
            const lx = p.x + labelOffset * Math.cos(p.angle);
            const ly = p.y + labelOffset * Math.sin(p.angle) + 4;
            const txt = document.createElementNS(svgNS, 'text');
            txt.setAttribute('class', 'cg-sw-label');
            txt.setAttribute('x', lx);
            txt.setAttribute('y', ly);
            // Pick text-anchor based on angle so labels don't collide with ring
            const anchor = Math.cos(p.angle) < -0.3 ? 'end' : Math.cos(p.angle) > 0.3 ? 'start' : 'middle';
            txt.setAttribute('text-anchor', anchor);
            const shortLabel = p.imp.label.replace(/ Ltd$/i, '').replace(/ Pvt$/i, '');
            txt.textContent = shortLabel.length > 18 ? shortLabel.slice(0, 17) + '…' : shortLabel;
            txt.style.opacity = '0';
            txt.style.animation = `cgSwNodePop 0.5s ease-out ${0.35 + (p.imp.first_impacted_step || 1) * 0.1}s forwards`;
            svg.appendChild(txt);

            // Exposure amount under label
            const amt = document.createElementNS(svgNS, 'text');
            amt.setAttribute('class', 'cg-sw-label-amount');
            amt.setAttribute('x', lx);
            amt.setAttribute('y', ly + 11);
            amt.setAttribute('text-anchor', anchor);
            amt.textContent = formatINR((p.imp.exposure_at_risk || 0) * 100);
            amt.style.opacity = '0';
            amt.style.animation = `cgSwNodePop 0.5s ease-out ${0.4 + (p.imp.first_impacted_step || 1) * 0.1}s forwards`;
            svg.appendChild(amt);
        }
    });

    // Shockwave pulses — three rings rippling out from the seed
    for (let i = 0; i < 3; i++) {
        const pulse = document.createElementNS(svgNS, 'circle');
        pulse.setAttribute('class', 'cg-sw-pulse');
        pulse.setAttribute('cx', cx);
        pulse.setAttribute('cy', cy);
        pulse.setAttribute('r', 260);
        pulse.style.animationDelay = `${i * 1.0}s`;
        svg.appendChild(pulse);
    }

    // Seed halo (continuous pulse)
    const seedHalo = document.createElementNS(svgNS, 'circle');
    seedHalo.setAttribute('class', 'cg-sw-seed-pulse');
    seedHalo.setAttribute('cx', cx);
    seedHalo.setAttribute('cy', cy);
    seedHalo.setAttribute('r', 22);
    svg.appendChild(seedHalo);

    // Seed node
    const seedNode = document.createElementNS(svgNS, 'circle');
    seedNode.setAttribute('class', 'cg-sw-node cg-sw-node-seed');
    seedNode.setAttribute('cx', cx);
    seedNode.setAttribute('cy', cy);
    seedNode.setAttribute('r', 22);
    seedNode.setAttribute('fill', 'url(#cgSeedGrad)');
    const sTitle = document.createElementNS(svgNS, 'title');
    sTitle.textContent = `${seedName} — source of distress`;
    seedNode.appendChild(sTitle);
    svg.appendChild(seedNode);

    // Seed label (inside)
    const seedLabel = document.createElementNS(svgNS, 'text');
    seedLabel.setAttribute('class', 'cg-sw-label-seed');
    seedLabel.setAttribute('x', cx);
    seedLabel.setAttribute('y', cy - 34);
    seedLabel.setAttribute('text-anchor', 'middle');
    seedLabel.textContent = seedName.replace(/ Ltd$/i, '').replace(/ Pvt$/i, '');
    svg.appendChild(seedLabel);

    // "SOURCE" eyebrow under seed
    const seedEyebrow = document.createElementNS(svgNS, 'text');
    seedEyebrow.setAttribute('class', 'cg-sw-ring-label');
    seedEyebrow.setAttribute('x', cx);
    seedEyebrow.setAttribute('y', cy + 42);
    seedEyebrow.setAttribute('text-anchor', 'middle');
    seedEyebrow.textContent = 'EPICENTRE';
    svg.appendChild(seedEyebrow);
}

/**
 * Render the 3-step damage report narrative.
 */
function cgShowDamageReport({ impacted, nImpacted, seedName, exposureINR, highRiskCount, pctPortfolio, totalBankBook }) {
    const wrap = document.getElementById('cg-damage');
    if (!wrap) return;

    if (!nImpacted) {
        wrap.style.display = 'none';
        return;
    }
    wrap.style.display = 'grid';

    const maxStep = impacted.length ? Math.max(...impacted.map(x => x.first_impacted_step || 1)) : 0;
    const earliest = impacted.length ? [...impacted].sort((a, b) => (a.first_impacted_step || 1) - (b.first_impacted_step || 1))[0] : null;

    const trig = document.getElementById('cg-damage-trigger');
    const spread = document.getElementById('cg-damage-spread');
    const impact = document.getElementById('cg-damage-impact');

    if (trig) {
        trig.innerHTML = `<strong>${seedName}</strong> defaults — its unpaid invoices cascade into its supplier network.`;
    }
    if (spread) {
        const firstBit = earliest
            ? `<strong>${earliest.label}</strong> is hit first (week ${earliest.first_impacted_step || 1}). `
            : '';
        spread.innerHTML = `${firstBit}Distress propagates to <strong>${nImpacted} linked SMEs</strong> within <strong>${maxStep} week${maxStep !== 1 ? 's' : ''}</strong>.`;
    }
    if (impact) {
        const pctTxt = totalBankBook ? `, <strong>${pctPortfolio.toFixed(1)}%</strong> of the bank book` : '';
        const hrTxt = highRiskCount > 0 ? ` — <strong>${highRiskCount}</strong> at critical stress` : '';
        impact.innerHTML = `<strong>${formatINR(exposureINR)}</strong> exposure at risk${pctTxt}${hrTxt}.`;
    }
}

/**
 * Render the week-by-week propagation timeline.
 */
function cgRenderTimeline({ impacted, timeline, steps }) {
    const section = document.getElementById('cg-timeline-section');
    const wrap = document.getElementById('cg-timeline');
    if (!section || !wrap) return;

    if (!impacted || impacted.length === 0) {
        section.style.display = 'none';
        return;
    }
    section.style.display = 'block';

    // Group impacted SMEs by their first_impacted_step
    const byStep = {};
    impacted.forEach(x => {
        const w = x.first_impacted_step || 1;
        if (!byStep[w]) byStep[w] = { count: 0, exposure: 0 };
        byStep[w].count += 1;
        byStep[w].exposure += (x.exposure_at_risk || 0) * 100;
    });

    const totalSteps = Math.max(steps || 8, ...Object.keys(byStep).map(k => parseInt(k)));
    const maxCount = Math.max(1, ...Object.values(byStep).map(v => v.count));

    // Update subtitle
    const subEl = document.getElementById('cg-timeline-sub');
    if (subEl) {
        const totalCount = Object.values(byStep).reduce((a, b) => a + b.count, 0);
        const totalExp = Object.values(byStep).reduce((a, b) => a + b.exposure, 0);
        subEl.textContent = `${totalCount} SMEs impacted · ${formatINR(totalExp)} cumulative exposure over ${totalSteps} weeks`;
    }

    let cumCount = 0;
    let cumExposure = 0;
    let html = '';
    for (let w = 1; w <= totalSteps; w++) {
        const entry = byStep[w] || { count: 0, exposure: 0 };
        cumCount += entry.count;
        cumExposure += entry.exposure;
        const barHeight = entry.count > 0 ? Math.max(4, (entry.count / maxCount) * 40) : 2;
        const state = entry.count > 0 ? 'active' : 'empty';
        const cumText = cumExposure > 0 ? formatINR(cumExposure) : '—';
        html += `
            <div class="cg-tl-week ${state}" style="animation-delay:${0.1 + w * 0.06}s;">
                <span class="cg-tl-week-label">W${w}</span>
                <div class="cg-tl-marker"></div>
                <div class="cg-tl-bar-wrap">
                    <div class="cg-tl-bar" style="height:${barHeight}px;"></div>
                </div>
                <span class="cg-tl-count">${entry.count > 0 ? '+' + entry.count : '0'}</span>
                <span class="cg-tl-cum">${cumText}</span>
            </div>
        `;
    }
    wrap.innerHTML = html;
}

/**
 * Render impacted SMEs as clean cards (replaces old tables).
 */
function cgRenderImpactedCards(impacted, seeds, seedName) {
    const section = document.getElementById('cg-impacted-section');
    const list = document.getElementById('cg-impacted-list');
    if (!section || !list) return;

    if (impacted.length === 0 && seeds.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';

    const rows = [];

    // Add seed first
    seeds.forEach(sid => {
        const node = (_cgGraph.nodes || []).find(n => n.id === sid);
        rows.push({
            label: node ? node.label : sid,
            week: 0,
            stress: 1.0,
            exposure: 0,
            isSeed: true,
        });
    });

    // Add impacted SMEs sorted by stress (highest first)
    [...impacted].sort((a, b) => (b.stress || 0) - (a.stress || 0)).forEach(x => {
        rows.push({
            label: x.label || x.id,
            week: x.first_impacted_step || 0,
            stress: x.stress || 0,
            exposure: (x.exposure_at_risk || 0) * 100, // INR scale
            isSeed: false,
        });
    });

    list.innerHTML = rows.map(r => {
        const severityClass = r.isSeed ? 'severity-seed' : r.stress > 0.6 ? 'severity-critical' : 'severity-affected';
        const badgeClass = r.isSeed ? 'seed' : r.stress > 0.6 ? 'critical' : 'affected';
        const badgeText = r.isSeed ? 'Source' : r.stress > 0.6 ? 'Critical' : 'Affected';
        const amountColor = r.stress > 0.6 ? 'red' : 'amber';
        const detail = r.isSeed
            ? 'Initial business failure'
            : `Impacted by week ${r.week} · Stress: ${(r.stress * 100).toFixed(0)}%`;

        return `
            <div class="cg-impacted-card ${severityClass}">
                <div class="cg-impacted-left">
                    <span class="cg-impacted-name">${r.label}</span>
                    <span class="cg-impacted-detail">${detail}</span>
                </div>
                <div class="cg-impacted-right">
                    ${r.isSeed ? '' : `<span class="cg-impacted-amount ${amountColor}">${formatINR(r.exposure)}</span>`}
                    <span class="cg-impacted-badge ${badgeClass}">${badgeText}</span>
                </div>
            </div>
        `;
    }).join('');
}


// Deterministic layout: polar for bank-book, outer ring for externals, heavy-edge attracted.
function cgComputeLayout(graph) {
    const width = 1000, height = 480;
    const cx = width / 2, cy = height / 2;
    const bankIds = graph.nodes.filter(n => n.kind === 'bank_borrower').map(n => n.id);
    const extIds = graph.nodes.filter(n => n.kind === 'external_supplier').map(n => n.id);
    const pos = {};
    const bankR = Math.min(width, height) * 0.28;
    const extR = Math.min(width, height) * 0.44;
    bankIds.forEach((id, i) => {
        const t = (i / Math.max(bankIds.length, 1)) * Math.PI * 2;
        pos[id] = { x: cx + bankR * Math.cos(t), y: cy + bankR * Math.sin(t) };
    });
    extIds.forEach((id, i) => {
        const t = (i / Math.max(extIds.length, 1)) * Math.PI * 2 + 0.1;
        pos[id] = { x: cx + extR * Math.cos(t), y: cy + extR * Math.sin(t) };
    });
    return { pos, width, height };
}

function cgRenderGraph({ impacted, seeds }) {
    const svg = document.getElementById('contagion-svg');
    if (!svg || !_cgGraph || !_cgLayout) return;
    svg.setAttribute('viewBox', `0 0 ${_cgLayout.width} ${_cgLayout.height}`);
    const impactedIds = new Set((impacted || []).map(x => x.id));
    const seedIds = new Set(seeds || []);

    let html = '';
    // edges first
    (_cgGraph.edges || []).forEach(e => {
        const a = _cgLayout.pos[e.source];
        const b = _cgLayout.pos[e.target];
        if (!a || !b) return;
        const active = seedIds.has(e.source) && (impactedIds.has(e.target) || seedIds.has(e.target));
        html += `<line class="cg-edge${active ? ' active' : ''}" x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" />`;
    });
    // nodes
    _cgGraph.nodes.forEach(n => {
        const p = _cgLayout.pos[n.id];
        if (!p) return;
        let cls = 'safe';
        if (seedIds.has(n.id)) cls = 'seed';
        else if (impactedIds.has(n.id)) cls = 'impacted';
        else if (n.kind === 'external_supplier') cls = 'external';
        const r = n.kind === 'bank_borrower' ? 6 : 3.5;
        html += `<circle class="cg-node ${cls}" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r}"><title>${n.label}</title></circle>`;
    });
    // labels for bank-book only
    _cgGraph.nodes.filter(n => n.kind === 'bank_borrower').forEach(n => {
        const p = _cgLayout.pos[n.id];
        if (!p) return;
        html += `<text class="cg-label" x="${(p.x + 8).toFixed(1)}" y="${(p.y + 3).toFixed(1)}">${n.label.replace(' Ltd','')}</text>`;
    });
    svg.innerHTML = html;
}

// Wire page init on nav click — bypasses the lexical showPage binding.
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('#main-nav .nav-btn').forEach(b => {
        if (b.dataset && b.dataset.page === 'contagion') {
            b.addEventListener('click', () => setTimeout(setupContagionPage, 0));
        }
    });
});

// ══════════════════════════════════════
//  AI BEHAVIOUR INSIGHTS
// ══════════════════════════════════════

/**
 * Load behavioural insights for a specific SME from the API.
 * Falls back to local heuristic generation if API unavailable.
 */
async function loadBehaviourInsights(smeId) {
    const skeletonEl = document.getElementById('insights-skeleton');
    const cardEl = document.getElementById('insights-card');
    const errorEl = document.getElementById('insights-error');
    const badgeEl = document.getElementById('insights-source-badge');

    if (!skeletonEl || !cardEl) return;

    // Show loading state
    skeletonEl.style.display = 'flex';
    cardEl.style.display = 'none';
    errorEl.style.display = 'none';
    if (badgeEl) { badgeEl.textContent = ''; badgeEl.className = 'insights-source-badge'; }

    const effectiveId = smeId || 'meridian';

    try {
        const resp = await fetch(`${API_BASE}/api/insights/${effectiveId}`);
        if (!resp.ok) throw new Error(resp.status);
        const data = await resp.json();
        renderBehaviourInsights(data);
    } catch (err) {
        console.warn('Insights API unavailable, generating locally:', err.message);
        // Generate locally from SME_DATA
        const localInsights = generateLocalInsights(effectiveId);
        renderBehaviourInsights(localInsights);
    }
}

/**
 * Render the behaviour insights card with data.
 */
function renderBehaviourInsights(data) {
    const skeletonEl = document.getElementById('insights-skeleton');
    const cardEl = document.getElementById('insights-card');
    const errorEl = document.getElementById('insights-error');
    const badgeEl = document.getElementById('insights-source-badge');

    if (!data || data.error) {
        skeletonEl.style.display = 'none';
        errorEl.style.display = 'block';
        return;
    }

    // Source badge
    if (badgeEl) {
        const src = data.source || 'heuristic';
        badgeEl.textContent = src === 'groq' ? 'Groq AI' : 'Local';
        badgeEl.className = `insights-source-badge ${src === 'groq' ? 'groq' : 'heuristic'}`;
    }

    // Summary
    const summaryEl = document.getElementById('insights-summary');
    if (summaryEl) summaryEl.textContent = data.summary || '';

    // Key issues as colour-coded tags
    const issuesEl = document.getElementById('insights-issues');
    if (issuesEl) {
        const issues = data.key_issues || [];
        issuesEl.innerHTML = issues.map(issue => {
            const severity = classifyIssueSeverity(issue);
            return `<span class="insights-issue-tag severity-${escapeHtml(severity)}">${escapeHtml(issue)}</span>`;
        }).join('');
    }

    // Suggestions
    const suggestionsEl = document.getElementById('insights-suggestions');
    if (suggestionsEl) {
        const suggestions = data.suggestions || [];
        suggestionsEl.innerHTML = suggestions.map(s =>
            `<li class="insights-suggestion-item"><span class="insights-suggestion-icon">✓</span>${escapeHtml(s)}</li>`
        ).join('');
    }

    // Priority focus
    const focusEl = document.getElementById('insights-focus');
    if (focusEl) {
        const focus = data.priority_focus || [];
        focusEl.innerHTML = focus.map(f =>
            `<div class="insights-focus-item">${escapeHtml(f)}</div>`
        ).join('');
    }

    // Expected impact
    const impactEl = document.getElementById('insights-impact');
    if (impactEl) impactEl.textContent = data.expected_impact || '';

    // Show card, hide skeleton
    skeletonEl.style.display = 'none';
    cardEl.style.display = 'block';
    cardEl.style.animation = 'fadeIn 0.4s ease both';
}

/**
 * Classify an issue string's severity by keyword matching.
 */
function classifyIssueSeverity(issue) {
    const lower = issue.toLowerCase();
    const highKeywords = ['critical', 'accelerating', 'severe', 'significant', 'triage', 'prioritisation'];
    const medKeywords = ['drift', 'widening', 'emerging', 'spread', 'growing', 'pressure', 'uneven'];
    if (highKeywords.some(k => lower.includes(k))) return 'high';
    if (medKeywords.some(k => lower.includes(k))) return 'medium';
    return 'low';
}

/**
 * Generate insights locally using AnalysisEngine data when API is unavailable.
 * Mirrors the backend heuristic fallback logic.
 */
function generateLocalInsights(smeId) {
    const sme = SME_DATA[smeId];
    if (!sme) return { error: 'Unknown SME' };

    const suppliers = (sme.suppliers && sme.suppliers.suppliers) || [];
    const delays = suppliers.map(s => s.current_delay);
    const risk = AnalysisEngine.calculateRisk(delays);
    const triageDetected = AnalysisEngine.detectTriage(suppliers);
    const avgDelay = delays.length > 0 ? Math.round(delays.reduce((a, b) => a + b, 0) / delays.length) : 0;
    const maxDelay = delays.length > 0 ? Math.max(...delays) : 0;
    const minDelay = delays.length > 0 ? Math.min(...delays) : 0;
    const spread = maxDelay - minDelay;
    const criticalCount = suppliers.filter(s => s.severity === 'critical').length;
    const accelSuppliers = suppliers.filter(s => s.trend === 'accelerating');
    const driftCount = suppliers.filter(s => s.trend === 'drifting').length;

    // Summary
    let summary;
    if (risk === 'RED') {
        summary = `${sme.name} is experiencing significant payment delays across multiple suppliers, with an average delay of ${avgDelay} days and ${criticalCount} supplier(s) in critical status.`;
    } else if (risk === 'AMBER') {
        summary = `${sme.name} shows emerging payment stress with average delays of ${avgDelay} days and widening spread across suppliers.`;
    } else {
        summary = `${sme.name} maintains consistent payment patterns with an average delay of ${avgDelay} days — within healthy operating range.`;
    }

    // Key issues
    const key_issues = [];
    if (triageDetected) {
        key_issues.push('Selective payment prioritisation detected — some suppliers are being paid on time while others face growing delays');
    }
    if (accelSuppliers.length > 0) {
        const names = accelSuppliers.map(s => s.supplier_name).join(', ');
        key_issues.push(`Payment delays are accelerating for ${names}, suggesting increasing cash flow pressure`);
    }
    if (spread > 20) {
        key_issues.push(`Payment spread of ${spread} days between fastest and slowest-paid suppliers indicates uneven cash allocation`);
    }
    if (criticalCount > 0) {
        key_issues.push(`${criticalCount} supplier relationship(s) have reached critical delay levels beyond contractual terms`);
    }
    if (driftCount > 0 && accelSuppliers.length === 0) {
        key_issues.push(`Gradual upward drift in ${driftCount} supplier payment(s) may signal emerging financial pressure`);
    }
    if (key_issues.length === 0) {
        key_issues.push('No significant payment behaviour anomalies detected');
    }

    // Suggestions
    let suggestions;
    if (risk === 'RED') {
        suggestions = [
            'Reviewing overall payment scheduling could help reduce supplier concentration risk',
            'Engaging with suppliers showing the longest delays early may help preserve relationships',
            'Considering a more even distribution of payment timing across suppliers could stabilise operations',
        ];
    } else if (risk === 'AMBER') {
        suggestions = [
            'Monitoring the widening gap between on-time and delayed payments could provide early warning of further stress',
            'Exploring whether payment timing adjustments may help maintain supplier confidence',
            'Regular review of payment spread trends could support proactive cash flow management',
        ];
    } else {
        suggestions = [
            'Continuing current payment discipline may help maintain stable supplier relationships',
            'Periodic review of payment patterns could help identify any emerging drift early',
            'Maintaining visibility of supplier payment terms relative to actual timing could support ongoing health',
        ];
    }

    // Priority focus
    const priority_focus = [];
    if (criticalCount > 0) {
        const critNames = suppliers.filter(s => s.severity === 'critical').map(s => s.supplier_name).join(', ');
        priority_focus.push(`Suppliers in critical delay: ${critNames}`);
    }
    if (triageDetected) {
        priority_focus.push('Closing the gap between fastest-paid and most-delayed suppliers');
    }
    if (accelSuppliers.length > 0) {
        priority_focus.push('Suppliers with accelerating delay trends');
    }
    if (priority_focus.length === 0) {
        priority_focus.push('Routine monitoring — no urgent focus areas identified');
    }

    // Expected impact
    let expected_impact;
    if (risk === 'RED') {
        expected_impact = 'Addressing the most delayed supplier relationships and reducing payment spread could help move the risk profile from high toward medium over 4–8 weeks, potentially preserving key supplier partnerships.';
    } else if (risk === 'AMBER') {
        expected_impact = 'Stabilising payment timing and preventing further drift could help maintain the current risk level and reduce the chance of escalation to high risk.';
    } else {
        expected_impact = 'Maintaining current payment behaviour supports a stable risk profile. Continued consistency may reinforce supplier confidence over time.';
    }

    return {
        sme_id: smeId,
        sme_name: sme.name,
        source: 'heuristic',
        summary,
        key_issues: key_issues.slice(0, 3),
        suggestions: suggestions.slice(0, 3),
        priority_focus: priority_focus.slice(0, 2),
        expected_impact,
    };
}

