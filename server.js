const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// ==========================================
// ADVANCED HYBRID ENGINE V2 (FIXED ENGINE)
// ==========================================

class DataQualityManager {
  normalize(input) {
    if (!Array.isArray(input)) return [];
    return input.map(item => {
      const raw = typeof item === 'object' && item !== null ? (item.number ?? item.result) : item;
      const numeric = Number(raw);
      if (Number.isFinite(numeric)) return numeric >= 5 ? 1 : 0;
      const text = String(raw).trim().toLowerCase();
      if (['big', 'b', '1'].includes(text)) return 1;
      if (['small', 's', '0'].includes(text)) return 0;
      return null;
    }).filter(v => v !== null);
  }
}

class RegimeDetector {
  rate(x) { return x.length ? x.reduce((a, b) => a + b, 0) / x.length : 0.5; }
  alternation(x, n = 16) {
    const a = x.slice(-n);
    if (a.length < 2) return 0;
    let changes = 0;
    for (let i = 1; i < a.length; i++) if (a[i] !== a[i - 1]) changes++;
    return changes / (a.length - 1);
  }
  run(x) {
    if (!x.length) return 0;
    const last = x[x.length - 1];
    let n = 1;
    for (let i = x.length - 2; i >= 0 && x[i] === last; i--) n++;
    return n;
  }
  detect(x) {
    const all = this.rate(x), recent = this.rate(x.slice(-12));
    const alt = this.alternation(x), run = this.run(x);
    if (Math.abs(recent - all) >= 0.22) return 'SHIFTING';
    if (alt >= 0.75) return 'HIGH_ALTERNATION';
    if (run >= 4) return 'PERSISTENT_RUNS';
    if (all >= 0.62) return 'BIG_DOMINANT';
    if (all <= 0.38) return 'SMALL_DOMINANT';
    return 'BALANCED';
  }
}

class AdvancedHybridEngineV2 {
  constructor() {
    this.quality = new DataQualityManager();
    this.regimes = new RegimeDetector();
  }

  sigmoid(x) { return 1 / (1 + Math.exp(-x)); }

  predict(rawHistory) {
    // 1. Array Copy aur Reverse (Oldest to Newest chronology)
    let historyCopy = [...rawHistory].reverse();
    let values = this.quality.normalize(historyCopy);

    if (values.length < 5) {
      return { prediction: 'BIG', decision: 'B', confidence: 60, probBig: 60, probSmall: 40, regime: 'BALANCED' };
    }

    const regime = this.regimes.detect(values);
    
    // 2. Multi-Pattern Signals Calculation
    const total = values.length;
    const last = values[values.length - 1];
    const recent5 = values.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const recent10 = values.slice(-10).reduce((a, b) => a + b, 0) / 10;
    
    // Streak Run Detection
    let run = 1;
    for (let i = values.length - 2; i >= 0 && values[i] === last; i--) run++;

    // Alternation Check
    let altChanges = 0;
    const altSlice = values.slice(-8);
    for (let i = 1; i < altSlice.length; i++) if (altSlice[i] !== altSlice[i - 1]) altChanges++;
    const isAlternating = (altChanges / Math.max(1, altSlice.length - 1)) > 0.7;

    // Weight Calculation Score
    let score = 0;
    
    // Signal 1: Trend Reversion / Streak Continuation
    if (run >= 3) {
      score += (run >= 5) ? (last === 1 ? -1.2 : 1.2) : (last === 1 ? 0.8 : -0.8);
    }
    
    // Signal 2: Alternation Pattern (ZigZag)
    if (isAlternating) {
      score += (last === 1) ? -1.5 : 1.5;
    }

    // Signal 3: Recent Density Weight
    score += (recent5 - 0.5) * 2.0;
    score += (recent10 - 0.5) * 1.5;

    // Final Probability Calculation
    const probVal = this.sigmoid(score);
    const probBig = Math.round(probVal * 100);
    const probSmall = 100 - probBig;

    const prediction = probBig >= 50 ? 'BIG' : 'SMALL';
    const confidence = Math.max(probBig, probSmall);

    return {
      prediction,
      decision: prediction === 'BIG' ? 'B' : 'S',
      confidence: Math.min(Math.max(confidence, 55), 92),
      probBig,
      probSmall,
      regime
    };
  }
}

const engine = new AdvancedHybridEngineV2();

// ==========================================
// API ROUTE
// ==========================================

app.post('/predict', (req, res) => {
  try {
    const { history } = req.body;
    if (!history || !Array.isArray(history)) {
      return res.status(400).json({ error: "Invalid history array" });
    }

    const result = engine.predict(history);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => res.send("Asura V8 Advanced Hybrid Engine (Fixed Sequence) Live!"));

module.exports = app;
