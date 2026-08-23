const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// ==========================================
// RANDOM PREDICTION API ROUTE (FOR TESTING)
// ==========================================

app.post('/predict', (req, res) => {
  try {
    const { history } = req.body;

    if (!history || !Array.isArray(history)) {
      return res.status(400).json({ error: "Invalid history array provided" });
    }

    // Random Decision (50% BIG, 50% SMALL)
    const isBig = Math.random() < 0.5;
    const decision = isBig ? "B" : "S";
    const prediction = isBig ? "BIG" : "SMALL";

    // Random Probability & Confidence Generator
    const randomProb = Math.floor(Math.random() * 30) + 60; // 60% se 90% ke beech
    const probBig = isBig ? randomProb : 100 - randomProb;
    const probSmall = 100 - probBig;
    const confidence = randomProb;

    // Send JSON Response
    res.json({
      prediction: prediction,
      decision: decision,
      confidence: confidence,
      probBig: probBig,
      probSmall: probSmall,
      regime: "RANDOM_TESTING",
      agreement: randomProb
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => res.send("Asura V8 Random API Live!"));

module.exports = app;
