const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
// Security: Limit payload size to protect against DoS attacks
app.use(express.json({ limit: '1mb' }));

/* ============================================================
   FX RAJ 2026 — PERIOD & NUMBER PREDICTION ENGINE
   MADE BY FX RAJ
   ============================================================ */

// 1. BIG / SMALL Calculation Formula (Based on Period Number)
function calcBigSmall(period) {
    const periodNum = BigInt(period);
    const step1 = periodNum * 23n + 17n;
    const step2 = step1 * step1; // Squared
    const value = Number((step2 % 100n) % 10n);

    return {
        decision: value >= 5 ? "BIG" : "SMALL",
        value: value
    };
}

// 2. Number Calculation (Based on BIG / SMALL)
function calcNumber(prediction) {
    const bigNumbers = [8.6, 9.5, 7.8, 6.5, 5.7];
    const smallNumbers = [1.3, 2.4, 3.4, 4.1, 0.2];

    const randomIndex = Math.floor(Math.random() * 5);

    if (prediction === "BIG") {
        return bigNumbers[randomIndex];
    } else {
        return smallNumbers[randomIndex];
    }
}

// Main Wrapper Function
function calculateFXRaj2026(period) {
    if (period === undefined || period === null || isNaN(period)) {
        return {
            error: "Invalid or missing period number"
        };
    }

    const outcome = calcBigSmall(period);
    const predictedNumber = calcNumber(outcome.decision);

    return {
        engine: "FX RAJ 2026",
        author: "MADE BY FX RAJ",
        period: Number(period),
        decision: outcome.decision,
        predictedNumber: predictedNumber,
        calculatedDigit: outcome.value,
        probability: {
            BIG: outcome.decision === "BIG" ? 100 : 0,
            SMALL: outcome.decision === "SMALL" ? 100 : 0
        }
    };
}

// ==========================================
// API ROUTES
// ==========================================

// Predict Route: Expects { "period": 1001 } in request body
app.post('/predict', (req, res) => {
    try {
        const { period } = req.body;

        if (period === undefined || period === null) {
            return res.status(400).json({ error: "Period number is required" });
        }

        const result = calculateFXRaj2026(period);
        
        if (result.error) {
            return res.status(400).json(result);
        }

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
