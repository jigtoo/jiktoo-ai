
import { runBacktest, Bar } from './BacktestEngine'; // Relative import
import { UserStrategy, MarketTarget, LogicGroup } from '../../types';

// 1. Generate Mock Data (Sine wave + Trend to simulate cycles)
function generateMockData(count: number): Bar[] {
    const data: Bar[] = [];
    let priceBase = 10000;
    const now = new Date();

    // Create a scenario: Downtrend -> Turnaround -> Uptrend
    // 0-200: Downtrend
    // 200-300: Base/Turn
    // 300-500: Uptrend

    for (let i = 0; i < count; i++) {
        let price = priceBase;
        if (i < 200) {
            price = 10000 - i * 10; // Drop to 8000
        } else if (i < 300) {
            price = 8000 + (Math.sin(i) * 100); // Sideways
        } else {
            price = 8000 + (i - 300) * 20; // Rise to 12000
        }

        // Add noise
        price += (Math.random() - 0.5) * 50;

        const t = now.getTime() - ((count - i) * 86400000);
        data.push({
            t,
            o: price,
            h: price * 1.02,
            l: price * 0.98,
            c: price,
            v: 1000000 + Math.random() * 500000
        });
    }
    return data;
}

// 2. Define User Logic
const logic_v2: LogicGroup = {
    id: 'root',
    type: 'GROUP',
    operator: 'AND',
    children: [
        // A. Current Bull Setup (5 > 20 > 50 > 120)
        {
            id: 'A',
            type: 'INDICATOR',
            indicator: 'SMA',
            params: [{ name: 'period', value: 5 }],
            operator: '>',
            comparisonValue: 'SMA20',
            comparisonType: 'INDICATOR'
        },
        {
            id: 'A2',
            type: 'INDICATOR',
            indicator: 'SMA',
            params: [{ name: 'period', value: 20 }],
            operator: '>',
            comparisonValue: 'SMA50',
            comparisonType: 'INDICATOR'
        },
        {
            id: 'A3',
            type: 'INDICATOR',
            indicator: 'SMA',
            params: [{ name: 'period', value: 50 }],
            operator: '>',
            comparisonValue: 'SMA120',
            comparisonType: 'INDICATOR'
        },

        // B. Historical Bear (120 > 50 > 20 > 5) at least once in last 120 days
        {
            id: 'B',
            type: 'PATTERN',
            indicator: 'HISTORICAL_PATTERN',
            params: [
                { name: 'window', value: 120 },
                { name: 'condition', value: 'SMA120 > SMA50 > SMA20 > SMA5' },
                { name: 'minCount', value: 1 }
            ],
            operator: '>=',
            comparisonValue: 1,
            comparisonType: 'NUMBER'
        },

        // C. Duration: SMA5 Cross Up SMA20 happened >= 10 bars ago
        // And we assume current is aligned (checked by A)
        {
            id: 'C',
            type: 'PATTERN',
            indicator: 'PATTERN_DURATION',
            params: [
                { name: 'start', value: 'SMA5_CROSS_UP_SMA20' }
            ],
            operator: '>=',
            comparisonValue: 10,
            comparisonType: 'NUMBER'
        },

        // D. SMA120 >= SMA120[20] (Long term trend rising)
        {
            id: 'D',
            type: 'INDICATOR',
            indicator: 'SMA',
            params: [{ name: 'period', value: 120 }],
            operator: '>=',
            comparisonValue: 'SMA120_20',
            comparisonType: 'INDICATOR'
        }
    ]
};

const mockStrategy: UserStrategy = {
    id: 'test',
    owner: 'me',
    created_at: '',
    name: 'Turnaround Strategy',
    description: 'Test',
    rules: {} as any,
    backtest_result: {} as any,
    is_active: false,
    market: 'KR',
    logic_v2: logic_v2
};

async function runTest() {
    console.log("Generating Data...");
    const data = generateMockData(500);

    console.log("Running Backtest...");
    try {
        const result = await runBacktest(mockStrategy, 'KR', data);
        console.log("--- RESULT ---");
        console.log("Trades:", result.totalTrades);
        console.log("Win Rate:", result.winRate);
        console.log("Return:", result.avgProfit); // avgReturn actually
        console.log("Analysis:", result.aiAnalysis);

        if (result.totalTrades === 0) {
            console.log("⚠️ Still 0 Trades. Check logic or data.");
        } else {
            console.log("✅ Success! Trades executed.");
        }

    } catch (e) {
        console.error("Error:", e);
    }
}

runTest();
