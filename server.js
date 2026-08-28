const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

/* ============================================================
   FX RAJ 2026 — DYNAMIC WINGO PREDICTION ENGINE
   REAL HISTORY + BIG/SMALL + NUMBER + BET/SKIP
   ============================================================ */

const HISTORY_URL =
    'https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json';

const BET_THRESHOLD = 75;


/* ============================================================
   GET REAL WINGO HISTORY
   ============================================================ */

async function getHistory() {

    const controller = new AbortController();

    const timeout = setTimeout(() => {
        controller.abort();
    }, 10000);

    try {

        const response = await fetch(HISTORY_URL, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0'
            },
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(
                `WinGo history HTTP ${response.status}`
            );
        }

        const json = await response.json();

        if (
            !json ||
            !json.data ||
            !Array.isArray(json.data.list)
        ) {
            throw new Error(
                'Invalid WinGo history format'
            );
        }

        return json.data.list;

    } finally {
        clearTimeout(timeout);
    }
}


/* ============================================================
   NORMALIZE HISTORY
   ============================================================ */

function normalizeHistory(list) {

    return list
        .map(item => {

            const number = Number(item.number);

            if (
                !Number.isInteger(number) ||
                number < 0 ||
                number > 9
            ) {
                return null;
            }

            return {
                issueNumber: String(
                    item.issueNumber || ''
                ),

                number: number,

                size:
                    number >= 5
                        ? 'BIG'
                        : 'SMALL'
            };
        })
        .filter(Boolean);
}


/* ============================================================
   1. MARKOV
   ============================================================ */

function markov(history) {

    let BB = 0;
    let BS = 0;
    let SB = 0;
    let SS = 0;

    for (let i = 1; i < history.length; i++) {

        const previous = history[i - 1].size;
        const current = history[i].size;

        if (previous === 'BIG' && current === 'BIG') BB++;
        if (previous === 'BIG' && current === 'SMALL') BS++;
        if (previous === 'SMALL' && current === 'BIG') SB++;
        if (previous === 'SMALL' && current === 'SMALL') SS++;
    }

    const last =
        history[history.length - 1].size;

    let bigProbability = 50;

    if (last === 'BIG') {

        const total = BB + BS;

        if (total > 0) {
            bigProbability =
                (BB / total) * 100;
        }

    } else {

        const total = SB + SS;

        if (total > 0) {
            bigProbability =
                (SB / total) * 100;
        }
    }

    return {
        method: 'Markov',
        probability: bigProbability,
        weight: 15
    };
}


/* ============================================================
   2. STREAK
   ============================================================ */

function streak(history) {

    const last =
        history[history.length - 1].size;

    let count = 1;

    for (
        let i = history.length - 2;
        i >= 0;
        i--
    ) {

        if (history[i].size === last) {
            count++;
        } else {
            break;
        }
    }

    let probability = 50;

    if (count >= 3) {

        const strength =
            Math.min(
                0.75,
                0.15 + (count - 3) * 0.10
            );

        probability =
            last === 'BIG'
                ? 50 - strength * 50
                : 50 + strength * 50;
    }

    return {
        method: 'Streak',
        probability,
        weight: 8,
        details: `${last} x${count}`
    };
}


/* ============================================================
   3. RECENT RATIO
   ============================================================ */

function recentRatio(history) {

    const recent =
        history.slice(-20);

    const big =
        recent.filter(
            x => x.size === 'BIG'
        ).length;

    return {
        method: 'Recent Ratio',
        probability:
            (big / recent.length) * 100,
        weight: 12,
        details:
            `${big} BIG / ${recent.length - big} SMALL`
    };
}


/* ============================================================
   4. WEIGHTED RECENT
   ============================================================ */

function weightedRecent(history) {

    const recent =
        history.slice(-20);

    let bigScore = 0;
    let totalWeight = 0;

    recent.forEach((item, index) => {

        const weight = index + 1;

        totalWeight += weight;

        if (item.size === 'BIG') {
            bigScore += weight;
        }
    });

    return {
        method: 'Weighted Recent',
        probability:
            (bigScore / totalWeight) * 100,
        weight: 14
    };
}


/* ============================================================
   5. FREQUENCY
   ============================================================ */

function frequency(history) {

    const big =
        history.filter(
            x => x.size === 'BIG'
        ).length;

    return {
        method: 'Frequency',
        probability:
            (big / history.length) * 100,
        weight: 8
    };
}


/* ============================================================
   6. MULTI WINDOW
   ============================================================ */

function multiWindow(history) {

    const windows = [5, 10, 20, 50];

    let total = 0;
    let count = 0;

    const details = [];

    for (const size of windows) {

        if (history.length < size) {
            continue;
        }

        const part =
            history.slice(-size);

        const big =
            part.filter(
                x => x.size === 'BIG'
            ).length;

        const probability =
            (big / size) * 100;

        total += probability;
        count++;

        details.push(
            `${size}:${Math.round(probability)}%`
        );
    }

    if (!count) {
        return {
            method: 'Multi Window',
            probability: 50,
            weight: 8
        };
    }

    return {
        method: 'Multi Window',
        probability: total / count,
        weight: 10,
        details: details.join(' | ')
    };
}


/* ============================================================
   7. NUMBER DISTRIBUTION
   ============================================================ */

function numberDistribution(history) {

    const recent =
        history.slice(-50);

    const big =
        recent.filter(
            x => x.number >= 5
        ).length;

    return {
        method: 'Number Distribution',
        probability:
            (big / recent.length) * 100,
        weight: 8
    };
}


/* ============================================================
   8. ALTERNATION
   ============================================================ */

function alternation(history) {

    const recent =
        history.slice(-20);

    let changes = 0;

    for (
        let i = 1;
        i < recent.length;
        i++
    ) {

        if (
            recent[i].size !==
            recent[i - 1].size
        ) {
            changes++;
        }
    }

    const ratio =
        changes / (recent.length - 1);

    const last =
        recent[recent.length - 1].size;

    let probability = 50;

    if (ratio > 0.65) {

        probability =
            last === 'BIG'
                ? 42
                : 58;

    } else if (ratio < 0.35) {

        probability =
            last === 'BIG'
                ? 56
                : 44;
    }

    return {
        method: 'Alternation',
        probability,
        weight: 7,
        details:
            `Change ${Math.round(ratio * 100)}%`
    };
}


/* ============================================================
   9. BAYESIAN
   ============================================================ */

function bayesian(history) {

    const recent =
        history.slice(-30);

    const big =
        recent.filter(
            x => x.size === 'BIG'
        ).length;

    const probability =
        ((big + 1) /
        (recent.length + 2)) * 100;

    return {
        method: 'Bayesian',
        probability,
        weight: 10
    };
}


/* ============================================================
   10. 3-GRAM
   ============================================================ */

function threeGram(history) {

    const patterns = {};

    for (
        let i = 0;
        i < history.length - 3;
        i++
    ) {

        const pattern =
            history
                .slice(i, i + 3)
                .map(x =>
                    x.size === 'BIG'
                        ? 'B'
                        : 'S'
                )
                .join('');

        const next =
            history[i + 3].size;

        if (!patterns[pattern]) {
            patterns[pattern] = {
                big: 0,
                small: 0
            };
        }

        if (next === 'BIG') {
            patterns[pattern].big++;
        } else {
            patterns[pattern].small++;
        }
    }

    const lastPattern =
        history
            .slice(-3)
            .map(x =>
                x.size === 'BIG'
                    ? 'B'
                    : 'S'
            )
            .join('');

    const p =
        patterns[lastPattern];

    if (!p) {

        return {
            method: '3-Gram',
            probability: 50,
            weight: 10,
            details:
                `${lastPattern}: no match`
        };
    }

    const total =
        p.big + p.small;

    return {
        method: '3-Gram',
        probability:
            (p.big / total) * 100,
        weight: 12,
        details:
            `${lastPattern} => ${p.big}B/${p.small}S`
    };
}


/* ============================================================
   11. 4-GRAM
   ============================================================ */

function fourGram(history) {

    const patterns = {};

    for (
        let i = 0;
        i < history.length - 4;
        i++
    ) {

        const pattern =
            history
                .slice(i, i + 4)
                .map(x =>
                    x.size === 'BIG'
                        ? 'B'
                        : 'S'
                )
                .join('');

        const next =
            history[i + 4].size;

        if (!patterns[pattern]) {
            patterns[pattern] = {
                big: 0,
                small: 0
            };
        }

        if (next === 'BIG') {
            patterns[pattern].big++;
        } else {
            patterns[pattern].small++;
        }
    }

    const lastPattern =
        history
            .slice(-4)
            .map(x =>
                x.size === 'BIG'
                    ? 'B'
                    : 'S'
            )
            .join('');

    const p =
        patterns[lastPattern];

    if (!p) {

        return {
            method: '4-Gram',
            probability: 50,
            weight: 8,
            details:
                `${lastPattern}: no match`
        };
    }

    const total =
        p.big + p.small;

    return {
        method: '4-Gram',
        probability:
            (p.big / total) * 100,
        weight: 10,
        details:
            `${lastPattern} => ${p.big}B/${p.small}S`
    };
}


/* ============================================================
   12. LAST DIGIT PATTERN
   ============================================================ */

function lastDigit(history) {

    const recent =
        history.slice(-10);

    let big = 0;

    for (const item of recent) {

        if (item.number >= 5) {
            big++;
        }
    }

    return {
        method: 'Last Digit',
        probability:
            (big / recent.length) * 100,
        weight: 6
    };
}


/* ============================================================
   MAIN CALCULATION
   ============================================================ */

function calculatePrediction(history) {

    const signals = [

        markov(history),

        streak(history),

        recentRatio(history),

        weightedRecent(history),

        frequency(history),

        multiWindow(history),

        numberDistribution(history),

        alternation(history),

        bayesian(history),

        threeGram(history),

        fourGram(history),

        lastDigit(history)
    ];


    let bigScore = 0;
    let smallScore = 0;


    for (const signal of signals) {

        const probability =
            Math.max(
                0,
                Math.min(
                    100,
                    signal.probability
                )
            );

        const weight =
            signal.weight || 1;

        const strength =
            Math.abs(
                probability - 50
            ) / 50;

        const score =
            strength * weight;


        if (probability > 50) {

            bigScore += score;

        } else if (probability < 50) {

            smallScore += score;
        }
    }


    // ----------------------------------------------------------
    // IMPORTANT:
    // Agar signals completely neutral hain,
    // prediction ko force nahi karna.
    // ----------------------------------------------------------

    if (
        bigScore === 0 &&
        smallScore === 0
    ) {

        return {
            error:
                'Calculation is neutral. SKIP recommended.'
        };
    }


    const total =
        bigScore + smallScore;


    const bigProbability =
        (bigScore / total) * 100;

    const smallProbability =
        (smallScore / total) * 100;


    const prediction =
        bigProbability >= smallProbability
            ? 'BIG'
            : 'SMALL';


    // ----------------------------------------------------------
    // CONFIDENCE
    // ----------------------------------------------------------

    const margin =
        Math.abs(
            bigProbability -
            smallProbability
        );


    const confidence =
        Math.round(
            50 + margin / 2
        );


    const finalConfidence =
        Math.min(
            98,
            Math.max(
                50,
                confidence
            )
        );


    // ----------------------------------------------------------
    // BET / SKIP
    // ----------------------------------------------------------

    const shouldBet =
        finalConfidence >= BET_THRESHOLD;


    const action =
        shouldBet
            ? 'BET'
            : 'SKIP';


    const level =
        finalConfidence >= 90
            ? 'VERY_HIGH'
            : finalConfidence >= 75
                ? 'HIGH'
                : finalConfidence >= 65
                    ? 'MODERATE'
                    : 'LOW';


    // ----------------------------------------------------------
    // DETERMINISTIC NUMBER
    //
    // Random nahi hai.
    // Same calculation => same number.
    // ----------------------------------------------------------

    const numberPool =
        prediction === 'BIG'
            ? [5, 6, 7, 8, 9]
            : [0, 1, 2, 3, 4];


    const lastNumbers =
        history
            .slice(-10)
            .map(x => x.number);


    const numberSum =
        lastNumbers.reduce(
            (sum, n) => sum + n,
            0
        );


    const index =
        (
            numberSum +
            Math.round(bigScore * 100) +
            Math.round(smallScore * 100)
        ) % 5;


    const predictedNumber =
        numberPool[index];


    return {

        prediction,

        confidence:
            finalConfidence,

        level,

        action,

        shouldBet,

        predictedNumber,

        probability: {

            BIG:
                Number(
                    bigProbability.toFixed(2)
                ),

            SMALL:
                Number(
                    smallProbability.toFixed(2)
                )
        },

        calculation: {

            bigScore:
                Number(
                    bigScore.toFixed(3)
                ),

            smallScore:
                Number(
                    smallScore.toFixed(3)
                ),

            margin:
                Number(
                    margin.toFixed(2)
                )
        },

        signals:
            signals.map(s => ({

                method:
                    s.method,

                probability:
                    Number(
                        s.probability.toFixed(2)
                    ),

                weight:
                    s.weight,

                details:
                    s.details || ''
            })),

        streak:
            getStreak(history),

        distribution:
            getDistribution(history)
    };
}


/* ============================================================
   STREAK
   ============================================================ */

function getStreak(history) {

    if (!history.length) {
        return {
            type: null,
            count: 0
        };
    }

    const last =
        history[history.length - 1].size;

    let count = 1;

    for (
        let i = history.length - 2;
        i >= 0;
        i--
    ) {

        if (history[i].size === last) {
            count++;
        } else {
            break;
        }
    }

    return {
        type: last,
        count
    };
}


/* ============================================================
   DISTRIBUTION
   ============================================================ */

function getDistribution(history) {

    const big =
        history.filter(
            x => x.size === 'BIG'
        ).length;

    const small =
        history.length - big;

    return {

        total:
            history.length,

        big,

        small,

        bigPercent:
            Number(
                (
                    big /
                    history.length *
                    100
                ).toFixed(2)
            ),

        smallPercent:
            Number(
                (
                    small /
                    history.length *
                    100
                ).toFixed(2)
            )
    };
}


/* ============================================================
   POST /predict
   ============================================================ */

app.post('/predict', async (req, res) => {

    try {

        const {
            period
        } = req.body;


        if (
            period === undefined ||
            period === null ||
            String(period).trim() === ''
        ) {

            return res.status(400).json({

                status: 'error',

                error:
                    'Period number is required',

                action:
                    'SKIP',

                shouldBet:
                    false
            });
        }


        const targetPeriod =
            String(period).trim();


        // ------------------------------------------------------
        // REAL HISTORY
        // ------------------------------------------------------

        const rawHistory =
            await getHistory();


        // ------------------------------------------------------
        // NORMALIZE
        // ------------------------------------------------------

        let history =
            normalizeHistory(
                rawHistory
            );


        // ------------------------------------------------------
        // DO NOT USE TARGET RESULT
        // ------------------------------------------------------

        history =
            history.filter(
                item =>
                    item.issueNumber !==
                    targetPeriod
            );


        // API gives newest -> oldest.
        // Calculation uses oldest -> newest.

        history.reverse();


        // Last 100 results only

        history =
            history.slice(-100);


        if (history.length < 20) {

            return res.status(503).json({

                status: 'error',

                error:
                    'Not enough real WinGo history',

                historyCount:
                    history.length,

                action:
                    'SKIP',

                shouldBet:
                    false
            });
        }


        // ------------------------------------------------------
        // CALCULATE
        // ------------------------------------------------------

        const result =
            calculatePrediction(
                history
            );


        if (result.error) {

            return res.status(200).json({

                status: 'success',

                engine:
                    'FX RAJ 2026',

                period:
                    targetPeriod,

                prediction:
                    null,

                confidence:
                    0,

                level:
                    'LOW',

                action:
                    'SKIP',

                shouldBet:
                    false,

                message:
                    result.error,

                historyCount:
                    history.length
            });
        }


        // ------------------------------------------------------
        // RESPONSE
        // ------------------------------------------------------

        return res.status(200).json({

            status:
                'success',

            engine:
                'FX RAJ 2026',

            author:
                'MADE BY FX RAJ',

            period:
                targetPeriod,

            prediction:
                result.prediction,

            predictedNumber:
                result.predictedNumber,

            confidence:
                result.confidence,

            level:
                result.level,

            action:
                result.action,

            shouldBet:
                result.shouldBet,

            message:
                result.shouldBet
                    ? `✅ BET: ${result.prediction} — ${result.confidence}%`
                    : `⏸ SKIP: ${result.prediction} — ${result.confidence}%`,

            probability:
                result.probability,

            calculation:
                result.calculation,

            historyCount:
                history.length,

            streak:
                result.streak,

            distribution:
                result.distribution,

            signals:
                result.signals,

            source:
                'REAL WINGO HISTORY',

            note:
                'Algorithmic calculation only. WinGo outcomes are not guaranteed.'
        });

    } catch (err) {

        console.error(
            'Prediction Error:',
            err
        );

        return res.status(500).json({

            status:
                'error',

            error:
                err.message,

            action:
                'SKIP',

            shouldBet:
                false
        });
    }
});


/* ============================================================
   GET /
   ============================================================ */

app.get('/', (req, res) => {

    res.json({

        status:
            'online',

        engine:
            'FX RAJ 2026',

        message:
            'Real WinGo Prediction API Online',

        endpoint:
            'POST /predict',

        required:
            {
                period:
                    'WinGo period number'
            }
    });
});


/* ============================================================
   SERVER
   ============================================================ */

const PORT =
    process.env.PORT || 3000;


if (require.main === module) {

    app.listen(
        PORT,
        () => {

            console.log(
                `🚀 FX RAJ 2026 API running on port ${PORT}`
            );

        }
    );
}


module.exports = app;
