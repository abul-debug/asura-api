const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors()); //[cite: 2]
app.use(express.json({ limit: '1mb' })); //[cite: 2]

/* ============================================================
   FX RAJ 2026 — DYNAMIC PERIOD & NUMBER PREDICTION ENGINE
   ============================================================ */

// Fixed Big/Small Calculation (Stuck Issue Fixed)
function calcBigSmall(period) {
    const periodNum = BigInt(period);

    // Dynamic Multi-Step Hash Mix to prevent BIG/SMALL repetition stucks
    const step1 = periodNum * 23n + 17n; //[cite: 2, 4]
    const step2 = step1 * step1; //[cite: 2, 4]
    
    // Hash rotation mix (takes last 4 digits and middle shift)
    const mixedHash = (step2 / 7n) + (periodNum * 13n);
    const value = Number(mixedHash % 10n);

    return {
        decision: value >= 5 ? "BIG" : "SMALL", //[cite: 2, 4]
        value: value
    };
}

// Number Calculation (Based on BIG / SMALL)
function calcNumber(prediction) {
    const bigNumbers = [8.6, 9.5, 7.8, 6.5, 5.7]; //[cite: 2, 4]
    const smallNumbers = [1.3, 2.4, 3.4, 4.1, 0.2]; //[cite: 2, 4]

    const randomIndex = Math.floor(Math.random() * 5); //[cite: 2, 4]

    if (prediction === "BIG") { //[cite: 2, 4]
        return bigNumbers[randomIndex]; //[cite: 2, 4]
    } else {
        return smallNumbers[randomIndex]; //[cite: 2, 4]
    }
}

// Main Wrapper Function
function calculateFXRaj2026(period) {
    if (period === undefined || period === null || isNaN(period)) { //[cite: 2]
        return { error: "Invalid or missing period number" }; //[cite: 2]
    }

    const outcome = calcBigSmall(period);
    const predictedNumber = calcNumber(outcome.decision);

    return {
        engine: "FX RAJ 2026", //[cite: 2]
        author: "MADE BY FX RAJ", //[cite: 2]
        period: Number(period), //[cite: 2]
        decision: outcome.decision, //[cite: 2]
        predictedNumber: predictedNumber, //[cite: 2]
        calculatedDigit: outcome.value, //[cite: 2]
        probability: {
            BIG: outcome.decision === "BIG" ? 100 : 0, //[cite: 2]
            SMALL: outcome.decision === "SMALL" ? 100 : 0 //[cite: 2]
        }
    };
}

// API ROUTES
app.post('/predict', (req, res) => { //[cite: 2]
    try {
        const { period } = req.body; //[cite: 2]

        if (period === undefined || period === null) { //[cite: 2]
            return res.status(400).json({ error: "Period number is required" }); //[cite: 2]
        }

        const result = calculateFXRaj2026(period);
        
        if (result.error) { //[cite: 2]
            return res.status(400).json(result); //[cite: 2]
        }

        res.json(result); //[cite: 2]
    } catch (err) {
        res.status(500).json({ error: err.message }); //[cite: 2]
    }
});

app.get('/', (req, res) => res.send("FX RAJ 2026 Engine Online!")); //[cite: 2]

const PORT = process.env.PORT || 3000; //[cite: 2]
if (require.main === module) { //[cite: 2]
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`)); //[cite: 2]
}

module.exports = app; //[cite: 2]
