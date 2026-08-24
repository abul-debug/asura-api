const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
// Payload size limit to prevent Denial of Service (DoS) attacks
app.use(express.json({ limit: '1mb' }));

// ==========================================================
// CALCULATOR 1: ASURA V8 LOGIC
// ==========================================================
function calculateAsuraV8(history) {
    if (!Array.isArray(history) || history.length < 10) {
        return {
            decision: "S",
            confidence: 0,
            reason: "INSUFFICIENT_DATA"
        };
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
        return {
            decision: "S",
            confidence: 0,
            reason: "INVALID_DATA"
        };
    }

    const N = data.length;
    const last = data[N - 1];

    // 1. BASIC BALANCE
    let big = 0;
    let small = 0;

    for (const x of data) {
        x === "BIG" ? big++ : small++;
    }

    const bigRate = big / N;
    const smallRate = small / N;

    // 2. RECENCY WEIGHT
    let weightedBig = 0;
    let weightedSmall = 0;
    let totalWeight = 0;

    for (let i = 0; i < N; i++) {
        const weight = i + 1;
        totalWeight += weight;

        if (data[i] === "BIG") {
            weightedBig += weight;
        } else {
            weightedSmall += weight;
        }
    }

    const recentBigRate = weightedBig / totalWeight;
    const recentSmallRate = weightedSmall / totalWeight;

    // 3. ORDER-1 TRANSITION ANALYSIS
    const transition = {
        BIG: { BIG: 0, SMALL: 0 },
        SMALL: { BIG: 0, SMALL: 0 }
    };

    for (let i = 1; i < N; i++) {
        transition[data[i - 1]][data[i]]++;
    }

    function smooth(a, b) {
        return (a + 1) / (a + b + 2);
    }

    const transitionProb = {
        BIG: {
            BIG: smooth(transition.BIG.BIG, transition.BIG.SMALL),
            SMALL: smooth(transition.BIG.SMALL, transition.BIG.BIG)
        },
        SMALL: {
            BIG: smooth(transition.SMALL.BIG, transition.SMALL.SMALL),
            SMALL: smooth(transition.SMALL.SMALL, transition.SMALL.BIG)
        }
    };

    // 4. ORDER-2 / ORDER-3 PATTERN OBSERVATION
    function patternStats(order) {
        const state = data.slice(-order).join("_");

        let bigAfter = 0;
        let smallAfter = 0;

        for (let i = order; i < N; i++) {
            const previous = data.slice(i - order, i).join("_");

            if (previous === state) {
                if (data[i] === "BIG") {
                    bigAfter++;
                } else {
                    smallAfter++;
                }
            }
        }

        const total = bigAfter + smallAfter;

        return {
            state,
            samples: total,
            bigAfter,
            smallAfter,
            bigRate: total ? (bigAfter + 1) / (total + 2) : 0.5,
            smallRate: total ? (smallAfter + 1) / (total + 2) : 0.5
        };
    }

    const order2 = patternStats(2);
    const order3 = patternStats(3);

    // 5. STREAK ANALYSIS
    let streak = 1;

    for (let i = N - 1; i > 0; i--) {
        if (data[i] === data[i - 1]) {
            streak++;
        } else {
            break;
        }
    }

    // 6. SWITCH / ALTERNATION
    let switches = 0;

    for (let i = 1; i < N; i++) {
        if (data[i] !== data[i - 1]) {
            switches++;
        }
    }

    const switchRate = switches / (N - 1);

    // 7. ENTROPY
    function entropy(p) {
        if (p <= 0 || p >= 1) return 0;

        return -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p));
    }

    const entropyValue = entropy(bigRate);

    // 8. EMA MOMENTUM
    let ema = 0;
    const alpha = 0.25;

    for (let i = 0; i < N; i++) {
        const value = data[i] === "BIG" ? 1 : -1;
        ema = i === 0 ? value : alpha * value + (1 - alpha) * ema;
    }

    // 9. RECENT HALF VS PREVIOUS HALF
    const firstHalf = data.slice(0, 5);
    const secondHalf = data.slice(5);

    const firstBig = firstHalf.filter(x => x === "BIG").length / 5;
    const secondBig = secondHalf.filter(x => x === "BIG").length / 5;

    const shift = secondBig - firstBig;

    // 10. ANALYSIS SUMMARY
    let observations = [];

    if (recentBigRate > 0.60) observations.push("RECENT_BIG_BIAS");
    if (recentSmallRate > 0.60) observations.push("RECENT_SMALL_BIAS");

    if (switchRate >= 0.70) {
        observations.push("HIGH_ALTERNATION");
    } else if (switchRate <= 0.30) {
        observations.push("LOW_ALTERNATION");
    }

    if (streak >= 4) observations.push("LONG_STREAK");
    if (Math.abs(shift) >= 0.40) observations.push("RECENT_SHIFT");
    if (entropyValue >= 0.90) observations.push("HIGH_ENTROPY");

    // 11. RESEARCH SIGNAL
    const evidence = (
        Math.abs(recentBigRate - 0.5) * 0.35 +
        Math.abs(ema) / 1.0 * 0.25 +
        Math.abs(shift) * 0.20 +
        Math.abs(switchRate - 0.5) * 0.20
    );

    const confidence = Math.min(100, Math.max(0, evidence * 100));

    const analysisDirection = recentBigRate >= 0.5 ? "BIG" : "SMALL";
    const probBig = Math.round(recentBigRate * 100);

    return {
        prediction: analysisDirection,
        decision: analysisDirection === "BIG" ? "B" : "S",
        confidence: Number(confidence.toFixed(2)),
        probBig: probBig,
        probSmall: 100 - probBig,
        analysis: {
            last10: data,
            count: { BIG: big, SMALL: small },
            rate: {
                BIG: Number((bigRate * 100).toFixed(2)),
                SMALL: Number((smallRate * 100).toFixed(2))
            },
            recency: {
                BIG: Number((recentBigRate * 100).toFixed(2)),
                SMALL: Number((recentSmallRate * 100).toFixed(2))
            },
            transition: transitionProb,
            patterns: { order2, order3 },
            streak,
            switchRate: Number((switchRate * 100).toFixed(2)),
            entropy: Number(entropyValue.toFixed(4)),
            ema: Number(ema.toFixed(4)),
            halfShift: Number((shift * 100).toFixed(2)),
            observations
        },
        status: "ASURA_V8_ANALYSIS"
    };
}

// ==========================================================
// CALCULATOR 2: ASURA V9 LOGIC
// ==========================================================
function calculateAsuraV9(history) {
    if (!Array.isArray(history) || history.length < 10) {
        return {
            decision: "S",
            confidence: 0,
            status: "INSUFFICIENT_DATA"
        };
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
        return {
            decision: "S",
            confidence: 0,
            status: "INVALID_DATA"
        };
    }

    const N = 10;
    const last = data[N - 1];

    const toNum = x => x === "BIG" ? 1 : -1;
    const clamp = (x, min, max) => Math.max(min, Math.min(max, x));
    const sigmoid = x => 1 / (1 + Math.exp(-x));
    const laplace = (a, b) => (a + 1) / (a + b + 2);

    // 1. BASIC DISTRIBUTION
    const big = data.filter(x => x === "BIG").length;
    const small = N - big;
    const bigRate = big / N;
    const smallRate = small / N;

    // 2. RECENCY WEIGHTED BALANCE
    let weightedScore = 0;
    let totalWeight = 0;

    for (let i = 0; i < N; i++) {
        const weight = Math.pow(1.35, i);
        weightedScore += toNum(data[i]) * weight;
        totalWeight += weight;
    }

    const recencyScore = weightedScore / totalWeight;

    // 3. EMA — MULTIPLE SPEEDS
    function EMA(alpha) {
        let value = toNum(data[0]);
        for (let i = 1; i < N; i++) {
            value = alpha * toNum(data[i]) + (1 - alpha) * value;
        }
        return value;
    }

    const emaFast = EMA(0.45);
    const emaMedium = EMA(0.25);
    const emaSlow = EMA(0.12);

    const momentumScore = emaFast * 0.50 + emaMedium * 0.30 + emaSlow * 0.20;

    // 4. ORDER 1–4 PATTERN ANALYSIS
    function analyzeOrder(order) {
        const current = data.slice(-order).join("");
        let B = 0;
        let S = 0;

        for (let i = order; i < N; i++) {
            const pattern = data.slice(i - order, i).join("");
            if (pattern === current) {
                if (data[i] === "BIG") B++;
                else S++;
            }
        }

        const total = B + S;

        return {
            order,
            pattern: current,
            samples: total,
            big: B,
            small: S,
            bigProb: laplace(B, S),
            smallProb: laplace(S, B),
            reliability: Math.min(1, total / 3)
        };
    }

    const patterns = [
        analyzeOrder(1),
        analyzeOrder(2),
        analyzeOrder(3),
        analyzeOrder(4)
    ];

    // 5. MULTI-ORDER CONSENSUS
    let patternScore = 0;
    let patternWeight = 0;

    for (const p of patterns) {
        const direction = p.bigProb - p.smallProb;
        const weight = (p.order * 0.5) * p.reliability;

        patternScore += direction * weight;
        patternWeight += weight;
    }

    patternScore = patternWeight > 0 ? patternScore / patternWeight : 0;

    // 6. TRANSITION MATRIX
    const T = {
        BIG: { BIG: 0, SMALL: 0 },
        SMALL: { BIG: 0, SMALL: 0 }
    };

    for (let i = 1; i < N; i++) {
        T[data[i - 1]][data[i]]++;
    }

    const transition = {
        BIG: {
            BIG: laplace(T.BIG.BIG, T.BIG.SMALL),
            SMALL: laplace(T.BIG.SMALL, T.BIG.BIG)
        },
        SMALL: {
            BIG: laplace(T.SMALL.BIG, T.SMALL.SMALL),
            SMALL: laplace(T.SMALL.SMALL, T.SMALL.BIG)
        }
    };

    const transitionScore =
        last === "BIG"
            ? transition.BIG.BIG - transition.BIG.SMALL
            : transition.SMALL.BIG - transition.SMALL.SMALL;

    // 7. STREAK ANALYSIS
    let streak = 1;
    for (let i = N - 1; i > 0; i--) {
        if (data[i] === data[i - 1]) streak++;
        else break;
    }

    let maxStreak = 1;
    let run = 1;
    for (let i = 1; i < N; i++) {
        if (data[i] === data[i - 1]) run++;
        else run = 1;

        maxStreak = Math.max(maxStreak, run);
    }

    // 8. SWITCH / ALTERNATION
    let switches = 0;
    for (let i = 1; i < N; i++) {
        if (data[i] !== data[i - 1]) switches++;
    }

    const switchRate = switches / (N - 1);
    const alternationScore = clamp((switchRate - 0.5) * 2, -1, 1);

    // 9. ENTROPY
    function entropy(p) {
        if (p <= 0 || p >= 1) return 0;
        return -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p));
    }

    const sequenceEntropy = entropy(bigRate);

    // 10. AUTOCORRELATION
    function autocorrelation(lag) {
        if (N <= lag) return 0;

        const values = data.map(toNum);
        const mean = values.reduce((a, b) => a + b, 0) / N;

        let numerator = 0;
        let denominator = 0;

        for (let i = 0; i < N; i++) {
            const d = values[i] - mean;
            denominator += d * d;

            if (i >= lag) {
                numerator += (values[i] - mean) * (values[i - lag] - mean);
            }
        }

        return denominator === 0 ? 0 : numerator / denominator;
    }

    const ac = {
        lag1: autocorrelation(1),
        lag2: autocorrelation(2),
        lag3: autocorrelation(3)
    };

    const autocorrelationScore = ac.lag1 * 0.50 + ac.lag2 * 0.30 + ac.lag3 * 0.20;

    // 11. HALF-WINDOW REGIME SHIFT
    const firstHalf = data.slice(0, 5);
    const secondHalf = data.slice(5);

    const firstRate = firstHalf.filter(x => x === "BIG").length / 5;
    const secondRate = secondHalf.filter(x => x === "BIG").length / 5;
    const regimeShift = secondRate - firstRate;

    // 12. LOCAL PATTERN CONSISTENCY
    let agreement = 0;
    let evidenceCount = 0;

    const signalValues = [
        recencyScore,
        momentumScore,
        patternScore,
        transitionScore,
        autocorrelationScore,
        regimeShift
    ];

    for (const s of signalValues) {
        if (Math.abs(s) < 0.08) continue;
        agreement += Math.sign(s);
        evidenceCount++;
    }

    const consensus = evidenceCount ? agreement / evidenceCount : 0;

    // 13. FINAL RESEARCH SCORE
    let score =
        recencyScore * 0.25 +
        momentumScore * 0.20 +
        patternScore * 0.20 +
        transitionScore * 0.15 +
        autocorrelationScore * 0.10 +
        regimeShift * 0.10;

    const noisePenalty = sequenceEntropy > 0.95 ? 0.70 : 1;
    score *= noisePenalty;
    score = clamp(score, -1, 1);

    // 14. ANALYSIS DIRECTION
    const decision = score >= 0 ? "B" : "S";
    const confidence = Math.abs(score) * Math.abs(consensus || 0.5) * 100;
    const probBig = Math.round(((score + 1) / 2) * 100);

    // 15. SIGNAL FLAGS
    const signals = [];
    if (recencyScore > 0.20) signals.push("RECENT_BIG_PRESSURE");
    if (recencyScore < -0.20) signals.push("RECENT_SMALL_PRESSURE");
    if (momentumScore > 0.20) signals.push("POSITIVE_MOMENTUM");
    if (momentumScore < -0.20) signals.push("NEGATIVE_MOMENTUM");
    if (switchRate >= 0.70) signals.push("HIGH_ALTERNATION");
    if (switchRate <= 0.30) signals.push("LOW_ALTERNATION");
    if (streak >= 3) signals.push("ACTIVE_STREAK");
    if (Math.abs(regimeShift) >= 0.40) signals.push("REGIME_SHIFT");
    if (sequenceEntropy >= 0.90) signals.push("HIGH_NOISE");

    // 16. FINAL OUTPUT
    return {
        prediction: decision === "B" ? "BIG" : "SMALL",
        decision,
        confidence: Number(clamp(confidence, 0, 100).toFixed(2)),
        probBig: probBig,
        probSmall: 100 - probBig,
        score: Number(score.toFixed(4)),
        analysis: {
            last10: data,
            distribution: {
                BIG: big,
                SMALL: small,
                bigRate: Number((bigRate * 100).toFixed(2)),
                smallRate: Number((smallRate * 100).toFixed(2))
            },
            recencyScore: Number(recencyScore.toFixed(4)),
            momentum: {
                fast: Number(emaFast.toFixed(4)),
                medium: Number(emaMedium.toFixed(4)),
                slow: Number(emaSlow.toFixed(4))
            },
            patterns,
            transition,
            streak: { current: streak, maximum: maxStreak },
            switching: {
                rate: Number((switchRate * 100).toFixed(2)),
                alternation: Number(alternationScore.toFixed(4))
            },
            entropy: Number(sequenceEntropy.toFixed(4)),
            autocorrelation: {
                lag1: Number(ac.lag1.toFixed(4)),
                lag2: Number(ac.lag2.toFixed(4)),
                lag3: Number(ac.lag3.toFixed(4))
            },
            regimeShift: Number(regimeShift.toFixed(4)),
            consensus: Number(consensus.toFixed(4)),
            signals
        },
        status: "ASURA_V9_RESEARCH_ANALYSIS"
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

        let result;
        if (version.toLowerCase() === "v8") {
            result = calculateAsuraV8(history);
        } else {
            result = calculateAsuraV9(history); // Default to V9
        }

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/', (req, res) => res.send("Engine Online with Asura V8 & V9!"));

const PORT = process.env.PORT || 3000;
if (require.main === module) {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
