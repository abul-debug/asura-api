const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// ==========================================================
// SELF-LEARNING ENGINE (ACTIVE LEARNING STORE)
// ==========================================================
class DynamicLearningStore {
    constructor() {
        this.weights = new Map(); // Dynamic weight adjustment
    }

    getWeight(patternName, baseWeight) {
        if (!this.weights.has(patternName)) {
            return baseWeight;
        }
        const stat = this.weights.get(patternName);
        // Laplace smoothing for statistical probability
        const accuracy = (stat.wins + 5) / (stat.total + 10);
        const multiplier = 0.75 + (accuracy - 0.5) * Math.min(1, stat.total / 30);
        return baseWeight * Math.max(0.2, Math.min(2.0, multiplier));
    }

    recordOutcome(patternName, wasCorrect) {
        const current = this.weights.get(patternName) || { wins: 0, total: 0 };
        this.weights.set(patternName, {
            wins: current.wins + (wasCorrect ? 1 : 0),
            total: current.total + 1
        });
    }

    getAllStats() {
        return Object.fromEntries(this.weights);
    }
}

const learningStore = new DynamicLearningStore();

// ==========================================================
// CALCULATOR 1: ASURA V8 WITH SELF-LEARNING
// ==========================================================
function calculateAsuraV8(history) {
    if (!Array.isArray(history) || history.length < 10) {
        return { decision: "S", confidence: 0, reason: "INSUFFICIENT_DATA" };
    }

    const data = history
        .slice(-10)
        .map(h => {
            const num = parseInt(h?.number ?? h);
            if (!Number.isFinite(num)) return null;
            if (typeof getType === "function") {
                const type = getType(num);
                return type === "BIG" || type === "SMALL" ? type : null;
            }
            return num >= 5 ? "BIG" : "SMALL";
        })
        .filter(Boolean);

    if (data.length < 10) {
        return { decision: "S", confidence: 0, reason: "INVALID_DATA" };
    }

    const N = data.length;
    let big = 0, small = 0;
    for (const x of data) x === "BIG" ? big++ : small++;

    const bigRate = big / N;
    const smallRate = small / N;

    let weightedBig = 0, totalWeight = 0;
    for (let i = 0; i < N; i++) {
        const weight = i + 1;
        totalWeight += weight;
        if (data[i] === "BIG") weightedBig += weight;
    }
    const recentBigRate = weightedBig / totalWeight;

    // Self-Learning Dynamic Weight Multipliers
    const wRecency = learningStore.getWeight('v8_recency', 0.35);
    const wEma = learningStore.getWeight('v8_ema', 0.25);
    const wShift = learningStore.getWeight('v8_shift', 0.20);
    const wSwitch = learningStore.getWeight('v8_switch', 0.20);

    let switches = 0;
    for (let i = 1; i < N; i++) if (data[i] !== data[i - 1]) switches++;
    const switchRate = switches / (N - 1);

    let ema = 0;
    const alpha = 0.25;
    for (let i = 0; i < N; i++) {
        const val = data[i] === "BIG" ? 1 : -1;
        ema = i === 0 ? val : alpha * val + (1 - alpha) * ema;
    }

    const shift = (data.slice(5).filter(x => x === "BIG").length / 5) - (data.slice(0, 5).filter(x => x === "BIG").length / 5);

    const evidence = (
        Math.abs(recentBigRate - 0.5) * wRecency +
        Math.abs(ema) / 1.0 * wEma +
        Math.abs(shift) * wShift +
        Math.abs(switchRate - 0.5) * wSwitch
    );

    const confidence = Math.min(100, Math.max(0, evidence * 100));
    const analysisDirection = recentBigRate >= 0.5 ? "BIG" : "SMALL";

    return {
        prediction: analysisDirection,
        decision: analysisDirection === "BIG" ? "B" : "S",
        confidence: Number(confidence.toFixed(2)),
        probBig: Math.round(recentBigRate * 100),
        probSmall: 100 - Math.round(recentBigRate * 100),
        activeWeights: { wRecency, wEma, wShift, wSwitch },
        status: "ASURA_V8_SELF_LEARNING"
    };
}

// ==========================================================
// CALCULATOR 2: ASURA V9 WITH SELF-LEARNING
// ==========================================================
function calculateAsuraV9(history) {
    if (!Array.isArray(history) || history.length < 10) {
        return { decision: "S", confidence: 0, status: "INSUFFICIENT_DATA" };
    }

    const data = history
        .slice(-10)
        .map(h => {
            const n = Number(h?.number ?? h);
            if (!Number.isFinite(n)) return null;
            if (typeof getType === "function") {
                const t = getType(n);
                return t === "BIG" || t === "SMALL" ? t : null;
            }
            return n >= 5 ? "BIG" : "SMALL";
        })
        .filter(Boolean);

    if (data.length !== 10) {
        return { decision: "S", confidence: 0, status: "INVALID_DATA" };
    }

    const N = 10;
    const toNum = x => x === "BIG" ? 1 : -1;
    const clamp = (x, min, max) => Math.max(min, Math.min(max, x));

    // Dynamic Learning Weights for V9 Core Signals
    const wRecency = learningStore.getWeight('v9_recency', 0.25);
    const wMomentum = learningStore.getWeight('v9_momentum', 0.20);
    const wPattern = learningStore.getWeight('v9_pattern', 0.20);
    const wTransition = learningStore.getWeight('v9_transition', 0.15);
    const wAutocorr = learningStore.getWeight('v9_autocorr', 0.10);
    const wRegime = learningStore.getWeight('v9_regime', 0.10);

    const big = data.filter(x => x === "BIG").length;
    const bigRate = big / N;

    let weightedScore = 0, totalWeight = 0;
    for (let i = 0; i < N; i++) {
        const weight = Math.pow(1.35, i);
        weightedScore += toNum(data[i]) * weight;
        totalWeight += weight;
    }
    const recencyScore = weightedScore / totalWeight;

    let emaFast = toNum(data[0]), emaMedium = toNum(data[0]), emaSlow = toNum(data[0]);
    for (let i = 1; i < N; i++) {
        const val = toNum(data[i]);
        emaFast = 0.45 * val + 0.55 * emaFast;
        emaMedium = 0.25 * val + 0.75 * emaMedium;
        emaSlow = 0.12 * val + 0.88 * emaSlow;
    }
    const momentumScore = emaFast * 0.50 + emaMedium * 0.30 + emaSlow * 0.20;

    let patternScore = (recencyScore > 0 ? 0.3 : -0.3); // Pattern estimation fallback
    let transitionScore = (toNum(data[N - 1]) * 0.2);
    let autocorrelationScore = (recencyScore * momentumScore);
    const regimeShift = (data.slice(5).filter(x => x === "BIG").length / 5) - (data.slice(0, 5).filter(x => x === "BIG").length / 5);

    let score =
        recencyScore * wRecency +
        momentumScore * wMomentum +
        patternScore * wPattern +
        transitionScore * wTransition +
        autocorrelationScore * wAutocorr +
        regimeShift * wRegime;

    score = clamp(score, -1, 1);
    const decision = score >= 0 ? "B" : "S";
    const confidence = Math.abs(score) * 100;
    const probBig = Math.round(((score + 1) / 2) * 100);

    return {
        prediction: decision === "B" ? "BIG" : "SMALL",
        decision,
        confidence: Number(clamp(confidence, 0, 100).toFixed(2)),
        probBig,
        probSmall: 100 - probBig,
        score: Number(score.toFixed(4)),
        learnedWeights: { wRecency, wMomentum, wPattern, wTransition, wAutocorr, wRegime },
        status: "ASURA_V9_SELF_LEARNING"
    };
}

// ==========================================
// API ROUTES
// ==========================================

app.post('/predict', (req, res) => {
    try {
        const { history, version = "v9" } = req.body;
        if (!history || !Array.isArray(history)) {
            return res.status(400).json({ error: "Invalid history array" });
        }

        const result = version.toLowerCase() === "v8" 
            ? calculateAsuraV8(history) 
            : calculateAsuraV9(history);

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// SELF-LEARNING FEEDBACK ENDPOINT
app.post('/feedback', (req, res) => {
    try {
        const { patternName, wasCorrect } = req.body;
        if (!patternName || typeof wasCorrect !== 'boolean') {
            return res.status(400).json({ error: "patternName (string) and wasCorrect (boolean) required" });
        }

        learningStore.recordOutcome(patternName, wasCorrect);
        res.json({ success: true, stats: learningStore.getAllStats() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/learning-stats', (req, res) => {
    res.json(learningStore.getAllStats());
});

app.get('/', (req, res) => res.send("Engine Online with Self-Learning V8 & V9!"));

const PORT = process.env.PORT || 3000;
if (require.main === module) {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
