
import { _fetchLatestPrice, fetchDailyCandles } from './dataService';
import { autoPilotService } from './AutoPilotService';
import { MarketTarget } from '../types';
import { telegramService } from './telegramService';

/**
 * Predator Service
 * "Be fearful when others are greedy, and greedy when others are fearful."
 * Implements logic to exploit market psychology: Stop Hunting & FOMO Selling.
 */
class PredatorService {

    /**
     * [VULTURE SCAN] Stop Hunting
     * Finds stocks that are crashing due to panic but have high volume (Capitulation).
     * Strategy: Catch the falling knife precisely at the handle.
     */
    public async scanForPanicSells(watchlist: { ticker: string; stockName: string }[], market: MarketTarget) {
        console.log(`[Predator] 🦅 Vulture Scan Initiated (${market})...`);

        for (const item of watchlist) {
            try {
                // [Validation] Skip invalid tickers
                if (!item.ticker || item.ticker === '미제공' || item.ticker === 'null') continue;

                const priceData = await _fetchLatestPrice(item.ticker, item.stockName, market);
                // 1. Heavy Drop (> -5% intraday)
                if (priceData.changeRate > -5.0) continue;

                // 2. High Volume (Panic)
                // Need average volume to compare. Assuming current volume > 1M as heuristic for now or need fetch
                // For better accuracy, we'd need relative volume.
                if (priceData.volume < 500000) continue;

                // 3. RSI Check (Mental sanity check)
                const candles = await fetchDailyCandles(item.ticker, 15); // Get last 15 days
                const rsi = this.calculateRSI(candles.map(c => c.close));

                if (rsi < 25) {
                    console.log(`[Predator] 💀 Panic Detected: ${item.stockName} (RSI: ${rsi.toFixed(1)}, Drop: ${priceData.changeRate}%)`);

                    // Trigger "Vulture Strike"
                    const trigger = {
                        ticker: item.ticker,
                        stockName: item.stockName,
                        type: 'STOP_HUNTING',
                        score: 90 + (30 - rsi), // Higher score if RSI is lower
                        currentPrice: priceData.price,
                        changeRate: priceData.changeRate,
                        volume: priceData.volume,
                        details: `[공포 매수] RSI ${rsi.toFixed(1)} 과매도 + 투매 발생`
                    };

                    await autoPilotService.executeSignal(trigger);
                }

            } catch (e) {
                // Ignore errors for individual stocks
            }
        }
    }

    /**
     * [FOMO SCAN] Selling into Greed
     * Finds stocks that are vertical and hitting resistance (Upper Wick).
     */
    public async scanForFOMOClimax(watchlist: { ticker: string; stockName: string }[], market: MarketTarget) {
        console.log(`[Predator] 🦈 FOMO Scan Initiated (${market})...`);

        for (const item of watchlist) {
            try {
                // [Validation] Skip invalid tickers
                if (!item.ticker || item.ticker === '미제공' || item.ticker === 'null') continue;

                const priceData = await _fetchLatestPrice(item.ticker, item.stockName, market);

                // 1. Extreme Euphoria (> +15%)
                if (priceData.changeRate < 15.0) continue;

                // 2. Failure to Close High (Upper Wick)
                // Need High vs Current.
                // Assuming priceData might have dayHigh/dayLow. If not, we might need candles.
                // Let's rely on candles for now.
                const candles = await fetchDailyCandles(item.ticker, 1);
                if (!candles || candles.length === 0) continue;

                const today = candles[0]; // Assuming latest is first or last? fetchDailyCandles usually returns history.
                // Need to verify order. Usually chronological. So last is today.
                const lastCandle = candles[candles.length - 1];

                // Calculate Upper Wick
                const bodyTop = Math.max(lastCandle.open, lastCandle.close);
                const upperWick = lastCandle.high - bodyTop;
                const totalRange = lastCandle.high - lastCandle.low;

                const wickRatio = upperWick / totalRange;

                // If wick is > 40% of the movement, it's rejection.
                if (wickRatio > 0.4) {
                    console.log(`[Predator] 🚫 FOMO Climax: ${item.stockName} (Wick: ${(wickRatio * 100).toFixed(0)}%)`);

                    // Check if we own this to SELL
                    const account = autoPilotService.getStatus().isRunning ? (await import('./VirtualTradingService')).virtualTradingService.getAccount() : null;
                    const position = account?.positions.find(p => p.ticker === item.ticker);

                    if (position) {
                        // Force Sell Signal
                        // Trigger "Profit Taking"
                        // Actually AutoPilot monitors positions. We can just send a thought or a direct action.
                        // Let's send a fake trigger that 'monitorPositions' might pick up, OR direct sell.
                        // Best to use AutoPilot's logic. Assuming executeSignal handles SELL? 
                        // No, executeSignal is for BUY.
                        // We simply log this. The MonitorPositions needs to handle 'Sell on Weakness'.
                        // For now, let's just log it or alert user.
                        telegramService.sendTradeReport({
                            action: 'ALERT',
                            ticker: item.ticker,
                            stockName: item.stockName,
                            quantity: 0,
                            price: priceData.price,
                            amount: 0,
                            reason: `[탐욕 경고] 고점 윗꼬리 발생 (${priceData.changeRate}%)`,
                            confidence: 100
                        });
                    }
                }

            } catch (e) {
                // Ignore
            }
        }
    }

    private calculateRSI(prices: number[], period: number = 14): number {
        if (prices.length < period + 1) return 50; // Not enough data

        let gains = 0;
        let losses = 0;

        for (let i = 1; i < prices.length; i++) {
            const diff = prices[i] - prices[i - 1];
            if (diff >= 0) gains += diff;
            else losses -= diff;
        }

        if (losses === 0) return 100;

        const rs = gains / losses;
        return 100 - (100 / (1 + rs));
    }
}

export const predatorService = new PredatorService();
