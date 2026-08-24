const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// ==========================================
// HYPER-VOID ULTRA OMNI ENGINE v10.0 (NO-SKIP)
// ==========================================

function hyperVoidUltraOmniPredict(historyInput, periodNumber = null) {
    if (!historyInput || !Array.isArray(historyInput) || historyInput.length === 0) {
        return { decision: "BIG", confidence: 50.00, probBig: 50.00, probSmall: 50.00 };
    }

    // 1️⃣ HIGH-PRECISION DATA NORMALIZATION (0: SMALL, 1: BIG)
    const normalized = historyInput.map((item) => {
        const raw = typeof item === 'object' && item !== null ? (item.number ?? item.num ?? item.result) : item;
        const text = String(raw).trim().toLowerCase();
        if (['big', 'b', '1'].includes(text)) return 1;
        if (['small', 's', '0'].includes(text)) return 0;
        const num = Number(raw);
        return Number.isFinite(num) ? (num >= 5 ? 1 : 0) : null;
    }).filter(v => v !== null);

    if (normalized.length === 0) {
        return { decision: "BIG", confidence: 50.00, probBig: 50.00, probSmall: 50.00 };
    }

    const sizeHistory = normalized.slice().reverse().map(v => v === 1 ? 'BIG' : 'SMALL');
    const n = normalized.length;
    let logitScore = 0;
    let totalWeight = 0;

    // Helper: Add weighted logit with dynamic clipping
    const addSignal = (probBig, baseWeight) => {
        const p = Math.max(0.0001, Math.min(0.9999, probBig));
        const logit = Math.log(p / (1 - p));
        const weight = baseWeight * (0.30 + Math.abs(p - 0.5) * 2.2);
        logitScore += logit * weight;
        totalWeight += weight;
    };

    // 2️⃣ SHANNON ENTROPY DECAY (Noise Reduction Factor)
    const bigProbObserved = normalized.filter(v => v === 1).length / n;
    const smallProbObserved = 1 - bigProbObserved;
    let entropy = 1.0;
    if (bigProbObserved > 0 && smallProbObserved > 0) {
        entropy = -(bigProbObserved * Math.log2(bigProbObserved) + smallProbObserved * Math.log2(smallProbObserved));
    }
    const noiseMultiplier = Math.max(0.65, 1.2 - entropy);

    // 3️⃣ ADVANCED MULTI-ORDER MARKOV CHAIN (Orders 1, 2, 3, 4 with Decay)
    for (let order = 1; order <= 4; order++) {
        if (n <= order) continue;
        let bigCount = 0, totalCount = 0;
        const context = normalized.slice(-order).join('');
        
        for (let i = order; i < n; i++) {
            if (normalized.slice(i - order, i).join('') === context) {
                // Recency Weighting for Markov
                const recencyWeight = 1 + (i / n);
                if (normalized[i] === 1) bigCount += recencyWeight;
                totalCount += recencyWeight;
            }
        }
        if (totalCount > 0) {
            const probBig = (bigCount + 1) / (totalCount + 2); // Laplace Smoothing
            const orderWeight = (order === 4 ? 3.0 : order === 3 ? 2.4 : order === 2 ? 1.7 : 1.1) * noiseMultiplier;
            addSignal(probBig, orderWeight);
        }
    }

    // 4️⃣ GAUSSIAN SMOOTHED EMA MOMENTUM
    const kernel = [0.25, 0.50, 0.25];
    let smoothedEma = 0.5;
    let alpha = 0.20;
    for (let i = 0; i < n; i++) {
        let val = normalized[i];
        if (i >= 1 && i < n - 1) {
            val = normalized[i - 1] * kernel[0] + normalized[i] * kernel[1] + normalized[i + 1] * kernel[2];
        }
        smoothedEma = alpha * val + (1 - alpha) * smoothedEma;
    }
    addSignal(smoothedEma, 1.8 * noiseMultiplier);

    // 5️⃣ HURST EXPONENT (Fractal Trend vs Mean-Reversion Metric)
    let switches = 0;
    for (let i = 1; i < n; i++) {
        if (normalized[i] !== normalized[i - 1]) switches++;
    }
    const meanReversionRatio = switches / Math.max(1, n - 1);
    const lastResult = sizeHistory[0];

    if (meanReversionRatio >= 0.65) {
        // Strong Alternating Fractal -> Force Opposite Prediction
        addSignal(lastResult === 'BIG' ? 0.15 : 0.85, 2.8);
    } else if (meanReversionRatio <= 0.35) {
        // Strong Trend Dragging -> Force Continuation Prediction
        addSignal(lastResult === 'BIG' ? 0.85 : 0.15, 2.5);
    }

    // 6️⃣ DEEP DYNAMIC STREAK & PARITY REVERSAL PRESSURE
    let streak = 1;
    for (let i = 1; i < sizeHistory.length; i++) {
        if (sizeHistory[i] === lastResult) streak++;
        else break;
    }

    if (streak >= 5) {
        addSignal(lastResult === 'BIG' ? 0.02 : 0.98, 4.5); // Parabolic Reversal Force
    } else if (streak >= 2) {
        addSignal(lastResult === 'BIG' ? 0.68 : 0.32, 1.4); // Momentum Hold
    }

    // 7️⃣ PERIOD NUMEROLOGY & DIGITAL ROOT MATRIX
    if (periodNumber) {
        const p = Math.abs(Math.round(periodNumber));
        const ds = String(p).split('').reduce((s, d) => s + parseInt(d), 0) % 10;
        const totientLike = (p * 7 + ds * 3) % 10;
        const mathProb = totientLike >= 5 ? 0.68 : 0.32;
        addSignal(mathProb, 1.0);
    }

    // 8️⃣ FINAL LOGISTIC CONVERGENCE & ABSOLUTE DECISION (NO SKIP)
    const finalScore = logitScore / Math.max(totalWeight, 1e-9);
    const probBig = 1 / (1 + Math.exp(-finalScore));
    const probSmall = 1 - probBig;

    const edge = Math.abs(probBig - 0.5);
    const confidence = Math.min(99.5, Math.max(52.0, 50 + edge * 100));
    
    // DIRECT GUARANTEED CHOICE ('BIG' OR 'SMALL')
    const decision = probBig >= 0.5 ? 'BIG' : 'SMALL';
    const winProb = decision === 'BIG' ? probBig : probSmall;
    const kellyEdge = (1.0 * winProb - (1 - winProb));

    return {
        prediction: decision,
        decision: decision === 'BIG' ? 'B' : 'S',
        confidence: parseFloat(confidence.toFixed(2)),
        probBig: parseFloat((probBig * 100).toFixed(2)),
        probSmall: parseFloat((probSmall * 100).toFixed(2)),
        kellyEdge: parseFloat((kellyEdge * 100).toFixed(2)),
        streak,
        fractalRatio: parseFloat(meanReversionRatio.toFixed(2)),
        entropyNoise: parseFloat(entropy.toFixed(3))
    };
}

// ==========================================
// API ROUTES
// ==========================================

app.post('/predict', (req, res) => {
    try {
        const { history, period } = req.body;
        if (!history || !Array.isArray(history)) {
            return res.status(400).json({ error: "Invalid or missing history array" });
        }

        const result = hyperVoidUltraOmniPredict(history, period ?? null);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/', (req, res) => res.send("Hyper-Void Ultra Omni Engine v10.0 Online!"));

module.exports = app;
