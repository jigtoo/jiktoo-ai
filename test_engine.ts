
// test_engine.ts
import { runBacktest } from './services/strategy/BacktestEngine';
import { MarketTarget, UserStrategy, LogicGroup } from './types';

// Mock Logic: SMA 5 Cross Up SMA 20
const mockLogic: LogicGroup = {
    id: 'root',
    type: 'GROUP',
    operator: 'AND',
    children: [
        {
            id: 'cond1',
            type: 'INDICATOR',
            indicator: 'SMA',
            params: [{ name: 'period', value: 5 }],
            operator: 'CROSS_UP',
            comparisonType: 'INDICATOR',
            comparisonValue: 'SMA(20)'
        }
    ]
};

// Mock Strategy
const mockStrategy: UserStrategy = {
    id: 'test',
    owner: 'test',
    created_at: '',
    name: 'Test Cross',
    description: 'Test',
    rules: { entryConditions: [], exitConditions: [], stopLoss: null, takeProfit: null },
    backtest_result: {} as any,
    is_active: false,
    market: 'US',
    logic_v2: mockLogic
};

// Mock Data (Sine waves to force cross)
const mockData = [];
for (let i = 0; i < 500; i++) {
    // SMA 5 (Fast) and SMA 20 (Slow)
    // We create a wave where price crosses up and down
    const price = 100 + Math.sin(i * 0.1) * 10;
    mockData.push({
        t: new Date('2024-01-01').getTime() + (i * 86400000),
        o: price,
        h: price + 1,
        l: price - 1,
        c: price,
        v: 1000
    });
}

async function run() {
    console.log("Starting Backtest Test...");
    try {
        const result = await runBacktest(mockStrategy, 'US', mockData);
        console.log("Result:", JSON.stringify(result, null, 2));
    } catch (e) {
        console.error("Error:", e);
    }
}

run();
