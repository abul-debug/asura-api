const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

function calculateAsuraV8(history) {
  if (!history || !Array.isArray(history) || history.length < 30) {
    return { decision: "S", confidence: 0 };
  }

  const rawTypes = history
    .map(h => {
      const num = parseInt(typeof h === 'object' ? h.number : h);
      if (isNaN(num)) return null;
      return num >= 5 ? "BIG" : "SMALL";
    })
    .filter(Boolean)
    .reverse();

  const data = rawTypes.slice(-60);
  if (data.length < 20) return { decision: "S", confidence: 0 };

  let score = 0;

  // 1. Markov Chain
  let markovScore = 0;
  for (let order = 1; order <= 3; order++) {
    if (data.length <= order) continue;
    let counts = {};
    for (let i = order; i < data.length - 1; i++) {
      let state = data.slice(i - order, i).join("");
      if (!counts[state]) counts[state] = { BIG: 0, SMALL: 0 };
      counts[state][data[i]]++;
    }
    let currentState = data.slice(data.length - order).join("");
    if (counts[currentState]) {
      let b = counts[currentState].BIG;
      let s = counts[currentState].SMALL;
      let probS = (s + 1) / (b + s + 2);
      let probB = (b + 1) / (b + s + 2);
      let diff = probS - probB;
      let sampleWeight = Math.min(1.0, (b + s) / 5);
      let orderWeight = order === 3 ? 2.5 : (order === 2 ? 1.8 : 1.0);
      markovScore += diff * orderWeight * sampleWeight;
    }
  }
  score += markovScore;

  // 2. EMA Momentum
  let alpha = 0.15;
  let ema = 0;
  for (let i = 0; i < data.length; i++) {
    let val = data[i] === "SMALL" ? 1 : -1;
    ema = (i === 0) ? val : (alpha * val + (1 - alpha) * ema);
  }
  score += ema * 2.8;

  // 3. Pattern Detector
  let last20 = data.slice(-20);
  let switches = 0;
  for (let i = 1; i < last20.length; i++) {
    if (last20[i] !== last20[i - 1]) switches++;
  }
  let switchRatio = switches / (last20.length - 1);
  const lastResult = data[data.length - 1];

  if (switchRatio >= 0.70) score += (lastResult === "BIG") ? 2.2 : -2.2;
  else if (switchRatio <= 0.30) score += (lastResult === "SMALL") ? 2.0 : -2.0;

  // 4. Dynamic Streak
  let streak = 1;
  for (let i = data.length - 1; i > 0; i--) {
    if (data[i] === data[i - 1]) streak++;
    else break;
  }
  if (streak >= 6) score += (lastResult === "BIG") ? 3.5 : -3.5;
  else if (streak >= 4) score += (lastResult === "BIG") ? 1.8 : -1.8;
  else if (streak === 2 || streak === 3) score += (lastResult === "SMALL") ? 1.2 : -1.2;

  // 5. Global Balance
  let totalS = data.filter(x => x === "SMALL").length;
  let totalB = data.length - totalS;
  score += ((totalS - totalB) / data.length) * 1.2;

  // 6. Final Calculation
  score = Math.max(-10, Math.min(10, score));
  let probSMALL = 1 / (1 + Math.exp(-score));
  let decision = probSMALL >= 0.5 ? "S" : "B";
  let confidence = Math.min(98.5, Math.max(15, Math.abs(probSMALL - 0.5) * 200));

  return {
    decision,
    confidence: parseFloat(confidence.toFixed(2)),
    probSmall: parseFloat((probSMALL * 100).toFixed(2)),
    probBig: parseFloat(((1 - probSMALL) * 100).toFixed(2))
  };
}

app.get('/', (req, res) => res.send("Asura API Live!"));

app.post('/predict', (req, res) => {
  const { history } = req.body;
  if (!history || !Array.isArray(history)) {
    return res.status(400).json({ error: "history array required" });
  }
  const result = calculateAsuraV8(history);
  res.json(result);
});

app.listen(3000, () => console.log("Server Live: http://localhost:3000"));