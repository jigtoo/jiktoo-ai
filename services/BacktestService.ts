import { fetchDailyCandles } from './dataService';
import { calculateATR, checkSEPA } from './utils/technicalIndicators';

interface BacktestResult {
    ticker: string;
    totalTrades: number;
    wins: number;
    losses: number;
    winRate: number;
    totalReturn: number;
    maxDrawdown: number;
    profitFactor: number;
    history: any[];
}

export class BacktestService {

    /**
     * Run backtest for a specific stock over a given period.
     * @param ticker Stock ticker
     * @param market 'KR' or 'US'
     * @param days Number of days to backtest (e.g., 365)
     */
    public async runBacktest(ticker: string, market: 'KR' | 'US', days: number = 365): Promise<BacktestResult> {
        console.log(`[Backtest] Starting simulation for ${ticker} (${days} days)...`);

        // 1. Fetch Historical Data (Need extra buffer for MA calculation)
        // We need at least 200 days PRIOR to the start of backtest for SEPA 200MA.
        // So total fetch = days + 200.
        const requiredHistory = days + 200;
        let candles: any[] = [];

        try {
            candles = await fetchDailyCandles(ticker, market, requiredHistory);
        } catch (error) {
            console.error(`[Backtest] Failed to fetch data for ${ticker}`, error);
            return this.getEmptyResult(ticker);
        }

        if (candles.length < 200) {
            console.warn(`[Backtest] Insufficient data for ${ticker}. Need 200+, got ${candles.length}`);
            return this.getEmptyResult(ticker);
        }

        // 2. Simulation State
        let cash = 100000000; // Start with 100M KRW
        const initialCapital = cash;
        let position: { quantity: number; avgPrice: number; stopLoss: number; entryDate: string } | null = null;
        let peakCapital = initialCapital;
        let maxDrawdown = 0;

        const tradeHistory: any[] = [];
        let wins = 0;
        let losses = 0;
        let totalProfit = 0;
        let totalLoss = 0;

        // 3. Daily Loop
        // Start from index 200 (to have enough history for SEPA)
        for (let i = 200; i < candles.length; i++) {
            const today = candles[i];
            const yesterday = candles[i - 1];
            const currentPrice = today.close;
            const date = today.date;

            // Update Portfolio Value
            const currentEquity = cash + (position ? position.quantity * currentPrice : 0);

            // Track MDD
            if (currentEquity > peakCapital) peakCapital = currentEquity;
            const drawdown = (peakCapital - currentEquity) / peakCapital * 100;
            if (drawdown > maxDrawdown) maxDrawdown = drawdown;

            // Historical slice for indicators
            // We pass data up to 'yesterday' to simulate decision making before market open or at close
            const historySlice = candles.slice(0, i + 1);

            // --- Strategy Logic ---

            // A. Exit Logic (Trailing Stop)
            if (position) {
                // Check if Stop Loss Hit (Low of the day hit the stop?)
                // Assuming we exit at Stop Price if Low <= Stop
                if (today.low <= position.stopLoss) {
                    const exitPrice = Math.min(today.open, position.stopLoss); // Realistic exit
                    const amount = exitPrice * position.quantity;
                    const pnl = amount - (position.avgPrice * position.quantity);
                    const pnlRate = (pnl / (position.avgPrice * position.quantity)) * 100;

                    cash += amount;

                    if (pnl > 0) {
                        wins++;
                        totalProfit += pnl;
                    } else {
                        losses++;
                        totalLoss += Math.abs(pnl);
                    }

                    tradeHistory.push({
                        type: 'SELL',
                        date,
                        price: exitPrice,
                        pnl,
                        pnlRate,
                        reason: 'Trailing Stop'
                    });

                    position = null;
                    continue; // Trade closed, wait for next signal
                }

                // Update Trailing Stop (Raise only)
                // Calculate ATR
                const highs = historySlice.map(c => c.high);
                const lows = historySlice.map(c => c.low);
                const closes = historySlice.map(c => c.close);
                const atrs = calculateATR(highs, lows, closes, 14);
                const currentATR = atrs[atrs.length - 1];

                const newStop = currentPrice - (2 * currentATR); // 2 ATR Trailing
                if (newStop > position.stopLoss) {
                    position.stopLoss = newStop;
                }
            }

            // B. Entry Logic (SEPA)
            if (!position) {
                const sepaResult = checkSEPA(currentPrice, historySlice);

                if (sepaResult.pass) {
                    // Calculate ATR for Sizing
                    const highs = historySlice.map(c => c.high);
                    const lows = historySlice.map(c => c.low);
                    const closes = historySlice.map(c => c.close);
                    const atrs = calculateATR(highs, lows, closes, 14);
                    const currentATR = atrs[atrs.length - 1];

                    // Position Sizing (1% Risk Rule for Backtest simplicity)
                    // Kelly is hard to simulate without accumulated stats, so we stick to Risk Rule
                    const riskPerTrade = currentEquity * 0.01;
                    const stopLossDist = currentATR * 2;
                    const quantity = Math.floor(riskPerTrade / stopLossDist);
                    const cost = quantity * currentPrice;

                    if (cash >= cost && quantity > 0) {
                        cash -= cost;
                        position = {
                            quantity,
                            avgPrice: currentPrice,
                            stopLoss: currentPrice - stopLossDist,
                            entryDate: date
                        };

                        tradeHistory.push({
                            type: 'BUY',
                            date,
                            price: currentPrice,
                            quantity,
                            reason: 'SEPA Entry'
                        });
                    }
                }
            }
        }

        // Final Calculation
        const finalEquity = cash + (position ? position.quantity * candles[candles.length - 1].close : 0);
        const totalReturn = ((finalEquity - initialCapital) / initialCapital) * 100;
        const totalTrades = wins + losses;
        const winRate = totalTrades > 0 ? wins / totalTrades : 0;
        const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? 999 : 0;

        console.log(`[Backtest] Completed for ${ticker}`);
        console.log(`   - Return: ${totalReturn.toFixed(2)}%`);
        console.log(`   - Win Rate: ${(winRate * 100).toFixed(1)}% (${wins}W ${losses}L)`);
        console.log(`   - Profit Factor: ${profitFactor.toFixed(2)}`);
        console.log(`   - MDD: ${maxDrawdown.toFixed(2)}%`);

        return {
            ticker,
            totalTrades,
            wins,
            losses,
            winRate,
            totalReturn,
            maxDrawdown,
            profitFactor,
            history: tradeHistory
        };
    }

    private getEmptyResult(ticker: string): BacktestResult {
        return {
            ticker,
            totalTrades: 0,
            wins: 0,
            losses: 0,
            winRate: 0,
            totalReturn: 0,
            maxDrawdown: 0,
            profitFactor: 0,
            history: []
        };
    }
}

export const backtestService = new BacktestService();
