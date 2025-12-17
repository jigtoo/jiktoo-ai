
// Mocking dependencies to run standalone
const mockFetchDailyCandles = async (ticker: string, market: string, days: number) => {
    // Generate realistic mock data for Samsung Electronics (uptrend then chop)
    const data = [];
    let price = 70000;
    const now = new Date();
    for (let i = days; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);

        // Random walk with slight upward drift
        const change = (Math.random() - 0.48) * 0.02;
        price = price * (1 + change);

        data.push({
            date: date.toISOString().split('T')[0],
            open: price,
            high: price * 1.02,
            low: price * 0.98,
            close: price,
            volume: 1000000
        });
    }
    return data;
};

const calculateATR = (highs: number[], lows: number[], closes: number[], period: number) => {
    const atrs = [];
    // Simple mock ATR
    for (let i = 0; i < closes.length; i++) atrs.push(closes[i] * 0.02);
    return atrs;
};

const checkSEPA = (currentPrice: number, history: any[]) => {
    // Mock SEPA: Pass if price is above 50-day MA
    if (history.length < 50) return { pass: false, reason: 'No Data' };
    const ma50 = history.slice(-50).reduce((sum, h) => sum + h.close, 0) / 50;
    return { pass: currentPrice > ma50, reason: '' };
};

// --- Backtest Logic (Simplified from BacktestService) ---
async function run() {
    console.log('Running Backtest for Samsung Electronics (005930)...');

    const candles = await mockFetchDailyCandles('005930', 'KR', 365 + 200);
    let cash = 100000000;
    let position = null;
    let wins = 0, losses = 0;

    for (let i = 200; i < candles.length; i++) {
        const today = candles[i];
        const currentPrice = today.close;

        if (position) {
            // Exit Logic (Trailing Stop)
            if (today.low <= position.stopLoss) {
                const exitPrice = position.stopLoss;
                const pnl = (exitPrice - position.avgPrice) * position.quantity;
                cash += (exitPrice * position.quantity);
                if (pnl > 0) wins++; else losses++;
                position = null;
            } else {
                // Update Stop
                position.stopLoss = Math.max(position.stopLoss, currentPrice * 0.96); // 2 ATR approx
            }
        } else {
            // Entry Logic
            const sepa = checkSEPA(currentPrice, candles.slice(0, i + 1));
            if (sepa.pass) {
                const quantity = Math.floor((cash * 0.2) / currentPrice); // Bet 20%
                if (quantity > 0) {
                    cash -= (quantity * currentPrice);
                    position = { quantity, avgPrice: currentPrice, stopLoss: currentPrice * 0.96 };
                }
            }
        }
    }

    const finalValue = cash + (position ? position.quantity * candles[candles.length - 1].close : 0);
    const returnRate = ((finalValue - 100000000) / 100000000) * 100;

    console.log(`[Result]`);
    console.log(`- Initial Capital: 100,000,000 KRW`);
    console.log(`- Final Capital:   ${Math.floor(finalValue).toLocaleString()} KRW`);
    console.log(`- Total Return:    ${returnRate.toFixed(2)}%`);
    console.log(`- Win Rate:        ${(wins / (wins + losses) * 100).toFixed(1)}% (${wins}W ${losses}L)`);
}

run();
