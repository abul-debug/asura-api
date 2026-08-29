const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ==========================================
// PREDICTION LOGICS (SERVER 1, 2, 3)
// ==========================================

// Server 1: Hybrid Voting System
function getServer1Prediction(allHistory = []) {
    if (!allHistory || allHistory.length === 0) {
        return { prediction: 'BIG', confidence: 65, server: 'Server 1' };
    }

    let market = 'NEUTRAL';
    if (allHistory.length >= 30) {
        let last30 = allHistory.slice(-30);
        let streaks = [], changes = 0, current = 1;
        let bigCount = 0, smallCount = 0;
        
        for (let i = 1; i < 30; i++) {
            if (last30[i] === last30[i - 1]) current++;
            else { streaks.push(current); current = 1; changes++; }
            if (last30[i] === 'BIG') bigCount++; else smallCount++;
        }
        streaks.push(current);
        
        let maxStreak = Math.max(...streaks);
        let changeRate = changes / 30;
        let balance = Math.abs(bigCount - smallCount);

        if (maxStreak >= 6) market = 'MEGA_STREAK';
        else if (maxStreak >= 4) market = 'LONG_STREAK';
        else if (maxStreak >= 3 && changeRate < 0.3) market = 'STRONG_STREAK';
        else if (changeRate > 0.8) market = 'ULTRA_ZIGZAG';
        else if (changeRate > 0.65) market = 'FULL_ZIGZAG';
        else if (changeRate > 0.5) market = 'ZIGZAG';
        else if (maxStreak === 2 && changeRate > 0.45) market = 'PAIR_MARKET';
        else if (balance >= 10) market = 'IMBALANCED';
        else if (balance <= 3 && changeRate > 0.4) market = 'BALANCED';
    }

    let last = allHistory[allHistory.length - 1];
    let streakCount = 1;
    for (let i = allHistory.length - 2; i >= 0; i--) {
        if (allHistory[i] === last) streakCount++;
        else break;
    }

    let finalPrediction = last === 'BIG' ? 'SMALL' : 'BIG';
    let confidence = Math.min(98, Math.max(70, 75 + (streakCount * 3)));

    return {
        prediction: finalPrediction,
        confidence: confidence,
        marketState: market,
        server: 'Server 1'
    };
}

// Server 2: Priority Sequence System
function getServer2Prediction(s2History = [], s2NumberHistory = [], s2WinLossHistory = []) {
    let lastResult = s2History.length > 0 ? s2History[0] : 'BIG';
    let lastNumber = s2NumberHistory.length > 0 ? s2NumberHistory[0] : null;

    if (lastNumber !== null) {
        if ([0, 11, 22, 33, 44].includes(lastNumber)) {
            return { prediction: 'SMALL', confidence: 96, source: 'DOUBLE_NUMBER_SMALL', server: 'Server 2' };
        }
        if ([55, 66, 77, 88, 99].includes(lastNumber)) {
            return { prediction: 'BIG', confidence: 96, source: 'DOUBLE_NUMBER_BIG', server: 'Server 2' };
        }
    }

    let streak = 0;
    if (s2History.length > 0) {
        streak = 1;
        for (let i = 1; i < s2History.length; i++) {
            if (s2History[i] === s2History[0]) streak++;
            else break;
        }
    }

    if (streak >= 5) {
        return { 
            prediction: s2History[0] === 'BIG' ? 'SMALL' : 'BIG', 
            confidence: 94, 
            source: 'SUPER_STREAK_BREAK',
            server: 'Server 2'
        };
    }

    if (s2WinLossHistory.length >= 2 && s2WinLossHistory[0] === 'LOSS' && s2WinLossHistory[1] === 'LOSS') {
        return {
            prediction: lastResult === 'BIG' ? 'SMALL' : 'BIG',
            confidence: 85,
            source: 'LOSS_RECOVERY_FLIP',
            server: 'Server 2'
        };
    }

    if (s2History.length >= 4) {
        let [a, b, c, d] = s2History.slice(0, 4);
        if (a === c && b === d && a !== b) {
            return { prediction: a === 'BIG' ? 'SMALL' : 'BIG', confidence: 88, source: 'PATTERN_ABAB', server: 'Server 2' };
        }
        if (a === b && c === d && a !== c) {
            return { prediction: c, confidence: 86, source: 'PATTERN_AABB', server: 'Server 2' };
        }
    }

    return {
        prediction: lastResult === 'BIG' ? 'SMALL' : 'BIG',
        confidence: 68,
        source: 'DEFAULT_FLIP',
        server: 'Server 2'
    };
}

// Server 3: Fallback Logic
function getServer3Prediction(allHistory = []) {
    if (!allHistory || allHistory.length === 0) {
        return { prediction: 'BIG', confidence: 70, server: 'Server 3' };
    }
    let last = allHistory[allHistory.length - 1];
    return { 
        prediction: last === 'BIG' ? 'SMALL' : 'BIG', 
        confidence: 65,
        server: 'Server 3'
    };
}

// ==========================================
// API ENDPOINTS
// ==========================================

app.get('/', (req, res) => {
    res.json({ status: "API is active and running!" });
});

app.post('/api/predict', (req, res) => {
    const { serverId = 1, history = [], numberHistory = [], winLossHistory = [] } = req.body;

    let result;
    if (serverId === 1) {
        result = getServer1Prediction(history);
    } else if (serverId === 2) {
        result = getServer2Prediction(history, numberHistory, winLossHistory);
    } else {
        result = getServer3Prediction(history);
    }

    res.json({ success: true, data: result });
});

// Vercel Serverless Deployment Support
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
