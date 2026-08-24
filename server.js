const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// ==========================================
// ADVANCED HYBRID ENGINE V2
// ==========================================

class DataQualityManager {
  normalize(input) {
    if (!Array.isArray(input)) return [];
    return input
      .map((item) => {
        const raw = typeof item === 'object' && item !== null ? (item.number ?? item.result) : item;
        const text = String(raw).trim().toLowerCase();
        if (['big', 'b', '1'].includes(text)) return 1;
        if (['small', 's', '0'].includes(text)) return 0;
        const numeric = Number(raw);
        if (Number.isFinite(numeric)) return numeric >= 5 ? 1 : 0;
        return null;
      })
      .filter((v) => v !== null);
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

class PatternPerformanceStore {
  constructor() { this.stats = {}; }
  
  get(name) { return this.stats[name] ?? { wins: 0, total: 0 }; }

  // Call this when actual outcome is known to enable active learning
  recordOutcome(name, wasCorrect) {
    const stat = this.get(name);
    this.stats[name] = {
      wins: stat.wins + (wasCorrect ? 1 : 0),
      total: stat.total + 1
    };
  }

  weight(signal) {
    const stat = this.get(signal.name);
    const accuracy = (stat.wins + 5) / (stat.total + 10);
    const learned = 0.75 + (accuracy - 0.5) * Math.min(1, stat.total / 40);
    const support = Math.min(1, signal.support / 10);
    return signal.baseWeight * (0.35 + 0.65 * support) * learned;
  }
}

class AdvancedHybridEngineV2 {
  constructor() {
    this.quality = new DataQualityManager();
    this.regimes = new RegimeDetector();
    this.performance = new PatternPerformanceStore();
    this.maxHistory = 2000;
  }

  clamp(p) { return Math.max(0.001, Math.min(0.999, p)); }
  logit(p) { const q = this.clamp(p); return Math.log(q / (1 - q)); }
  sigmoid(x) { const v = Math.max(-30, Math.min(30, x)); return 1 / (1 + Math.exp(-v)); }
  rate(x, prior = 0.5, strength = 8) { return x.length ? (x.reduce((a, b) => a + b, 0) + prior * strength) / (x.length + strength) : prior; }
  ewma(x, alpha = 0.18) { let p = 0.5; for (const v of x) p = alpha * v + (1 - alpha) * p; return p; }

  transition(x, order, prior) {
    if (x.length <= order) return { probabilityBig: prior, support: 0 };
    const context = x.slice(-order).join('');
    let big = 0, support = 0;
    for (let i = order; i < x.length; i++) {
      if (x.slice(i - order, i).join('') === context) { big += x[i]; support++; }
    }
    return { probabilityBig: (big + prior * 2) / (support + 2), support };
  }

  signal(name, p, baseWeight, support) { return { name, probabilityBig: p, baseWeight, support }; }

  detect4x4(x) {
    if (x.length < 8) return null;
    const a = x.slice(-8, -4), b = x.slice(-4);
    if (!a.every(v => v === a[0]) || !b.every(v => v === b[0])) return null;
    const p = a[0] !== b[0] ? b[0] : (1 - b[0]);
    return this.signal(a[0] !== b[0] ? 'block4x4_continue' : 'block4x4_reverse', p, 0.75, 8);
  }

  detect2x2(x) {
    if (x.length < 6) return null;
    const p = x.slice(-6);
    if (p[0] === p[1] && p[2] === p[3] && p[4] === p[5] && p[0] !== p[2] && p[2] !== p[4]) {
      return this.signal('block2x2_cycle', 1 - p[4], 0.70, 6);
    }
    if (p[0] === p[1] && p[0] !== p[2]) return this.signal('block2x2_reverse', 1 - p[1], 0.55, 3);
    return null;
  }

  detect3x3(x) {
    if (x.length < 6) return null;
    const a = x.slice(-6, -3), b = x.slice(-3);
    return a.every(v => v === a[0]) && b.every(v => v === b[0]) && a[0] !== b[0] 
      ? this.signal('block3x3_continue', b[0], 0.68, 6) 
      : null;
  }

  detectZigzag(x) {
    if (x.length < 6) return null;
    const z = x.slice(-6);
    if (z.some((v, i) => i > 0 && v === z[i - 1])) return null;
    return this.signal('zigzag', 1 - z[z.length - 1], 0.72, 6);
  }

  customSignals(x) {
    const found = [];
    for (const s of [this.detect4x4(x), this.detect2x2(x), this.detect3x3(x), this.detectZigzag(x)]) if (s) found.push(s);
    const last = x[x.length - 1];
    let run = 1;
    for (let i = x.length - 2; i >= 0 && x[i] === last; i--) run++;
    if (run >= 3 && run < 8) found.push(this.signal('streak_continue', last, 0.55, run));
    return found;
  }

  statisticalSignals(x) {
    const prior = this.rate(x), t1 = this.transition(x, 1, prior), t2 = this.transition(x, 2, prior), t3 = this.transition(x, 3, prior);
    return [
      this.signal('base_rate', prior, 0.55, x.length),
      this.signal('recent5', this.rate(x.slice(-5), prior, 4), 0.40, 5),
      this.signal('recent12', this.rate(x.slice(-12), prior, 6), 0.65, 12),
      this.signal('recent30', this.rate(x.slice(-30), prior, 10), 0.60, 30),
      this.signal('ewma', this.ewma(x), 0.55, x.length),
      this.signal('transition1', t1.probabilityBig, 0.80, t1.support),
      this.signal('transition2', t2.probabilityBig, 0.90, t2.support),
      this.signal('transition3', t3.probabilityBig, 0.75, t3.support)
    ];
  }

  predict(inputRaw, isNewestFirst = true) {
    // Standardize order: index 0 = oldest, index n-1 = newest
    const rawCopy = [...inputRaw];
    const ordered = isNewestFirst ? rawCopy.reverse() : rawCopy;
    const values = this.quality.normalize(ordered).slice(-this.maxHistory);

    if (values.length === 0) {
      return { prediction: 'BIG', decision: 'B', confidence: 50, probBig: 50, probSmall: 50, regime: 'BALANCED' };
    }

    const regime = this.regimes.detect(values);
    const signals = [...this.statisticalSignals(values), ...this.customSignals(values)];
    
    let score = 0, total = 0, big = 0, small = 0;
    for (const s of signals) {
      const w = this.performance.weight(s) * (0.25 + Math.abs(s.probabilityBig - 0.5) * 2);
      score += w * this.logit(s.probabilityBig);
      total += w;
      if (s.probabilityBig >= 0.5) big++; else small++;
    }

    const probabilityBig = this.sigmoid(score / Math.max(total, 1e-9));
    const edge = Math.abs(probabilityBig - 0.5);

    const prediction = probabilityBig >= 0.5 ? 'BIG' : 'SMALL';
    const probBig = Math.round(probabilityBig * 100);
    const probSmall = 100 - probBig;

    return {
      prediction,
      decision: prediction === 'BIG' ? 'B' : 'S',
      confidence: Math.round(50 + edge * 100),
      probBig,
      probSmall,
      regime
    };
  }
}

const globalEngine = new AdvancedHybridEngineV2();

// ==========================================
// API ROUTES
// ==========================================

app.post('/predict', (req, res) => {
  try {
    const { history, newestFirst = true } = req.body;
    if (!history || !Array.isArray(history)) {
      return res.status(400).json({ error: "Invalid history array" });
    }

    const result = globalEngine.predict(history, newestFirst);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => res.send("Engine Online!"));

module.exports = app;
