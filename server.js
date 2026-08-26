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
    // String conversion ensures BigInt safety for large period numbers
    const periodStr = String(period).trim();
    const periodNum = BigInt(periodStr);
    
    // Improved hashing math to give natural Big/Small variations
    const step1 = (periodNum * 23n + 17n) ** 2n;
    const value = Number(step1 % 10n); // Last single digit (0-9)

    return {
        decision: value >= 5 ? "BIG" : "SMALL",
        value: value
    };
}

// 2. Number Calculation (Based on BIG / SMALL)
function calcNumber(prediction) {
    // Standard game single integer numbers for predictions
    const bigNumbers = [5, 6, 7, 8, 9];
    const smallNumbers = [0, 1, 2, 3, 4];

    const randomIndex = Math.floor(Math.random() * 5);

    if (prediction === "BIG") {
        return bigNumbers[randomIndex];
    } else {
        return smallNumbers[randomIndex];
    }
}

// Main Wrapper Function
function calculateFXRaj2026(period) {
    if (period === undefined || period === null || period === '' || isNaN(period)) {
        return {
            error: "Invalid or missing period number"
        };
    }

    const outcome = calcBigSmall(period);
    const predictedNumber = calcNumber(outcome.decision);

    return {
        engine: "FX RAJ 2026",
        author: "MADE BY FX RAJ",
        period: String(period),
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

// Predict Route: Expects { "period": 1001 } or { "period": "20260421001" }
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
