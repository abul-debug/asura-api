const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
// Security: Limit payload size to protect against DoS attacks
app.use(express.json({ limit: '1mb' }));

/* ============================================================
   FX RAJ 2026 — ADVANCED BIG / SMALL PATTERN ANALYZER
   MADE BY FX RAJ
   ============================================================ */

function calculateFXRaj2026(history) {

    // -----------------------------
    // CONFIG
    // -----------------------------
    const CONFIG = {
        minHistory: 30,

        windows: {
            micro: 5,
            short: 10,
            medium: 20,
            long: 40,
            deep: 60
        },

        weights: {
            trend: 18,
            momentum: 16,
            transition: 15,
            frequency: 12,
            streak: 10,
            similarity: 10,
            entropy: 7,
            recency: 12
        },

        confidenceThreshold: 60
    };

    // -----------------------------
    // VALIDATION
    // -----------------------------
    if (!Array.isArray(history)) {
        return {
            decision: "WAIT",
            confidence: 0,
            reason: "Invalid history"
        };
    }

    const data = history
        .map(Number)
        .filter(n => Number.isFinite(n) && n >= 0 && n <= 9);

    if (data.length < CONFIG.minHistory) {
        return {
            decision: "WAIT",
            confidence: 0,
            reason: `Need at least ${CONFIG.minHistory} valid results`,
            sampleSize: data.length
        };
    }

    // -----------------------------
    // BASIC MAPPING
    // -----------------------------
    const type = n => n >= 5 ? "BIG" : "SMALL";

    const sequence = data.map(type);

    // -----------------------------
    // HELPERS
    // -----------------------------
    function clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
    }

    function signScore(big, small) {
        const total = big + small;
        if (!total) return 0;
        return ((big - small) / total) * 100;
    }

    function getWindow(arr, size) {
        return arr.slice(Math.max(0, arr.length - size));
    }

    function countTypes(arr) {
        let big = 0;
        let small = 0;

        for (const x of arr) {
            if (x === "BIG") big++;
            else small++;
        }

        return { big, small };
    }

    // -----------------------------
    // 1. MULTI WINDOW TREND
    // -----------------------------
    function trendAnalysis() {

        const windows = [
            CONFIG.windows.micro,
            CONFIG.windows.short,
            CONFIG.windows.medium,
            CONFIG.windows.long,
            CONFIG.windows.deep
        ];

        const weights = [1.5, 1.3, 1.15, 1, 0.8];

        let score = 0;

        windows.forEach((size, i) => {
            const w = getWindow(sequence, size);
            const c = countTypes(w);
            score += signScore(c.big, c.small) * weights[i];
        });

        const maxWeight = weights.reduce((a, b) => a + b, 0);

        return clamp(score / maxWeight, -100, 100);
    }

    // -----------------------------
    // 2. MOMENTUM ANALYSIS
    // -----------------------------
    function momentumAnalysis() {

        const recent = getWindow(sequence, 12);

        if (recent.length < 4) return 0;

        let score = 0;

        for (let i = 1; i < recent.length; i++) {
            const current = recent[i];
            const previous = recent[i - 1];
            const weight = i / recent.length;

            if (current === "BIG") {
                score += previous === "BIG"
                    ? 1.2 * weight
                    : 0.4 * weight;
            } else {
                score += previous === "SMALL"
                    ? -1.2 * weight
                    : -0.4 * weight;
            }
        }

        return clamp((score / 7) * 100, -100, 100);
    }

    // -----------------------------
    // 3. STREAK ANALYSIS
    // -----------------------------
    function streakAnalysis() {

        const last = sequence[sequence.length - 1];

        let streak = 0;

        for (let i = sequence.length - 1; i >= 0; i--) {
            if (sequence[i] === last)
                streak++;
            else
                break;
        }

        if (last === "BIG") {
            if (streak >= 5) return -65;
            if (streak === 4) return -40;
            if (streak === 3) return -15;
            return 20;
        } else {
            if (streak >= 5) return 65;
            if (streak === 4) return 40;
            if (streak === 3) return 15;
            return -20;
        }
    }

    // -----------------------------
    // 4. FREQUENCY / BALANCE
    // -----------------------------
    function frequencyAnalysis() {
        const recent = getWindow(sequence, 30);
        const c = countTypes(recent);
        return clamp(signScore(c.big, c.small), -100, 100);
    }

    // -----------------------------
    // 5. TRANSITION MATRIX
    // -----------------------------
    function transitionAnalysis() {

        let BB = 0;
        let BS = 0;
        let SB = 0;
        let SS = 0;

        for (let i = 1; i < sequence.length; i++) {
            const prev = sequence[i - 1];
            const curr = sequence[i];

            if (prev === "BIG" && curr === "BIG") BB++;
            if (prev === "BIG" && curr === "SMALL") BS++;
            if (prev === "SMALL" && curr === "BIG") SB++;
            if (prev === "SMALL" && curr === "SMALL") SS++;
        }

        const last = sequence[sequence.length - 1];

        let bigProbability = 50;

        if (last === "BIG") {
            const total = BB + BS;
            if (total > 0)
                bigProbability = (BB / total) * 100;
        } else {
            const total = SB + SS;
            if (total > 0)
                bigProbability = (SB / total) * 100;
        }

        return (bigProbability - 50) * 2;
    }

    // -----------------------------
    // 6. RECENCY DECAY
    // -----------------------------
    function recencyAnalysis() {

        const recent = getWindow(sequence, 20);

        let score = 0;
        let totalWeight = 0;

        recent.forEach((v, i) => {
            const weight = Math.pow(1.08, i);
            score += v === "BIG" ? weight : -weight;
            totalWeight += weight;
        });

        return clamp((score / totalWeight) * 100, -100, 100);
    }

    // -----------------------------
    // 7. ENTROPY
    // -----------------------------
    function entropyAnalysis() {

        const recent = getWindow(sequence, 30);
        const c = countTypes(recent);

        const total = recent.length;

        if (!total) return 1;

        const pBig = c.big / total;
        const pSmall = c.small / total;

        let entropy = 0;

        if (pBig > 0)
            entropy -= pBig * Math.log2(pBig);

        if (pSmall > 0)
            entropy -= pSmall * Math.log2(pSmall);

        return entropy;
    }

    // -----------------------------
    // 8. PATTERN SIMILARITY
    // -----------------------------
    function similarityAnalysis() {

        const patternLength = 5;

        if (sequence.length < patternLength + 10)
            return 0;

        const current = sequence.slice(-patternLength);

        let bigMatches = 0;
        let smallMatches = 0;
        let total = 0;

        for (let i = 0; i <= sequence.length - patternLength - 1; i++) {
            const candidate = sequence.slice(i, i + patternLength);

            let match = true;

            for (let j = 0; j < patternLength; j++) {
                if (candidate[j] !== current[j]) {
                    match = false;
                    break;
                }
            }

            if (match) {
                const next = sequence[i + patternLength];
                if (next === "BIG")
                    bigMatches++;
                else
                    smallMatches++;
                total++;
            }
        }

        if (total === 0)
            return 0;

        return signScore(bigMatches, smallMatches);
    }

    // -----------------------------
    // 9. NUMBER MOMENTUM
    // -----------------------------
    function numericMomentum() {

        const recent = getWindow(data, 12);

        let score = 0;

        for (let i = 1; i < recent.length; i++) {
            const diff = recent[i] - recent[i - 1];
            score += diff * (i / recent.length);
        }

        return clamp(score * 5, -100, 100);
    }

    // -----------------------------
    // 10. DECISION STABILITY
    // -----------------------------
    function stabilityAnalysis() {

        const results = [];
        const windows = [5, 10, 20];

        for (const size of windows) {
            const w = getWindow(sequence, size);
            const c = countTypes(w);
            results.push(signScore(c.big, c.small));
        }

        const avg = results.reduce((a, b) => a + b, 0) / results.length;

        const variance = results.reduce((sum, x) => sum + Math.pow(x - avg, 2), 0) / results.length;

        return {
            average: avg,
            volatility: Math.sqrt(variance)
        };
    }

    // ============================================================
    // RUN ANALYSIS
    // ============================================================

    const trend = trendAnalysis();
    const momentum = momentumAnalysis();
    const streak = streakAnalysis();
    const frequency = frequencyAnalysis();
    const transition = transitionAnalysis();
    const recency = recencyAnalysis();
    const entropy = entropyAnalysis();
    const similarity = similarityAnalysis();
    const numeric = numericMomentum();
    const stability = stabilityAnalysis();

    // ============================================================
    // WEIGHTED SCORE
    // ============================================================

    let score = 0;

    score += trend * CONFIG.weights.trend / 100;
    score += momentum * CONFIG.weights.momentum / 100;
    score += transition * CONFIG.weights.transition / 100;
    score += frequency * CONFIG.weights.frequency / 100;
    score += streak * CONFIG.weights.streak / 100;
    score += similarity * CONFIG.weights.similarity / 100;
    score += recency * CONFIG.weights.recency / 100;
    score += numeric * 0.05;

    score = clamp(score, -100, 100);

    // ============================================================
    // CONSENSUS
    // ============================================================

    const signals = [trend, momentum, transition, frequency, streak, similarity, recency];

    let bigVotes = 0;
    let smallVotes = 0;

    for (const s of signals) {
        if (s > 5) bigVotes++;
        else if (s < -5) smallVotes++;
    }

    const totalVotes = bigVotes + smallVotes;

    const consensus = totalVotes > 0 ? Math.abs(bigVotes - smallVotes) / totalVotes : 0;

    // ============================================================
    // PENALTIES
    // ============================================================

    const entropyPenalty = entropy > 0.90 ? 18 : entropy > 0.80 ? 10 : entropy > 0.65 ? 5 : 0;

    const volatilityPenalty = stability.volatility > 60 ? 18 : stability.volatility > 45 ? 10 : stability.volatility > 30 ? 5 : 0;

    // ============================================================
    // CONFIDENCE & DECISION
    // ============================================================

    let confidence = Math.abs(score);

    confidence = confidence * 0.65 + consensus * 100 * 0.35;
    confidence -= entropyPenalty;
    confidence -= volatilityPenalty;

    confidence = clamp(Math.round(confidence), 0, 99);

    let decision;

    if (confidence < CONFIG.confidenceThreshold) {
        decision = "WAIT";
    } else {
        decision = score >= 0 ? "BIG" : "SMALL";
    }

    // ============================================================
    // PROBABILITY ESTIMATE
    // ============================================================

    const probabilityBig = clamp(Math.round(50 + score / 2), 1, 99);
    const probabilitySmall = 100 - probabilityBig;

    const lastType = sequence[sequence.length - 1];

    let currentStreak = 0;

    for (let i = sequence.length - 1; i >= 0; i--) {
        if (sequence[i] === lastType) currentStreak++;
        else break;
    }

    // ============================================================
    // FINAL RESULT
    // ============================================================

    return {
        engine: "FX RAJ 2026",
        author: "MADE BY FX RAJ",
        decision,
        confidence,
        probability: {
            BIG: probabilityBig,
            SMALL: probabilitySmall
        },
        score: Math.round(score * 100) / 100,
        current: {
            type: lastType,
            number: data[data.length - 1],
            streak: currentStreak
        },
        analysis: {
            trend: Math.round(trend),
            momentum: Math.round(momentum),
            transition: Math.round(transition),
            frequency: Math.round(frequency),
            streak: Math.round(streak),
            recency: Math.round(recency),
            similarity: Math.round(similarity),
            numericMomentum: Math.round(numeric),
            entropy: Math.round(entropy * 1000) / 1000,
            stability: {
                average: Math.round(stability.average),
                volatility: Math.round(stability.volatility)
            }
        },
        consensus: {
            bigVotes,
            smallVotes,
            ratio: Math.round(consensus * 100)
        },
        meta: {
            sampleSize: data.length,
            validData: data.length,
            mode: "MULTI-PATTERN ANALYSIS",
            random: false
        }
    };
}

// ==========================================
// API ROUTES
// ==========================================

// Predict Route: Only takes numbers array from request body
app.post('/predict', (req, res) => {
    try {
        const { history } = req.body;

        if (!history || !Array.isArray(history)) {
            return res.status(400).json({ error: "Invalid history array" });
        }

        const result = calculateFXRaj2026(history);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/', (req, res) => res.send("FX RAJ 2026 Engine Online!"));

const PORT = process.env.PORT || 3000;
if (require.main === module) {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
