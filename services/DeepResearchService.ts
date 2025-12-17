// services/DeepResearchService.ts
import { fetchDailyCandles } from './dataService';
import { MarketTarget } from '../types';

export interface DeepAnalysisResult {
    ticker: string;
    riskScore: number; // 0-100 (100 = Extremely Risky/Priced-In)
    isPricedIn: boolean; // True if Risk > Threshold
    rationale: string;
    metrics: {
        preRunUp: number; // % change in last 3 days
        rsi: number; // Approximate RSI
        volumeProfile: 'CLIMAX' | 'NORMAL' | 'RISING';
    };
}

class DeepResearchService {

    /**
     * Analyze if the news/signal is already "Priced-In" by checking pre-event price action.
     * @param ticker Stock Symbol
     * @param marketTarget KR or US
     */
    public async analyzePricedInRisk(ticker: string, marketTarget: MarketTarget): Promise<DeepAnalysisResult> {
        console.log(`[DeepResearch] 🕵️ Forensic Analysis for ${ticker}: Checking for 'Priced-In' signals...`);

        try {
            // 1. Fetch Historical Data (Last 20 days for RSI, 5 days for Run-up)
            const candles = await fetchDailyCandles(ticker, marketTarget, 20); // Need enough for RSI-14

            if (!candles || candles.length < 5) {
                console.warn(`[DeepResearch] Insufficient data for ${ticker}. Assuming Neutral Risk.`);
                return this.createNeutralResult(ticker);
            }

            // 2. Calculate Pre-Event Run-Up (Last 3 days excluding today/current candle if live)
            // Assuming the last candle is TODAY (Live/Incomplete) or Yesterday (Closed).
            // We want to see the trend leading UP to the signal.

            const recentCandles = candles.slice(-5);
            const today = recentCandles[recentCandles.length - 1];
            const t_minus_1 = recentCandles[recentCandles.length - 2];
            const t_minus_4 = recentCandles[recentCandles.length - 5];

            // Run-up: Change from T-4 Open to T-1 Close
            const runUp = ((t_minus_1.close - t_minus_4.open) / t_minus_4.open) * 100;

            // 3. Calculate RSI (14) - Simplified
            const rsi = this.calculateRSI(candles, 14);

            // 4. Volume Analysis
            // Did volume spike yesterday?
            const vol_today = today.volume;
            const vol_yesterday = t_minus_1.volume;
            const vol_avg = candles.slice(-10, -1).reduce((sum, c) => sum + c.volume, 0) / 9;

            let volumeProfile: 'CLIMAX' | 'NORMAL' | 'RISING' = 'NORMAL';
            if (vol_yesterday > vol_avg * 2.5) volumeProfile = 'CLIMAX';
            else if (vol_yesterday > vol_avg * 1.2) volumeProfile = 'RISING';

            // 5. Risk Scoring Logic
            let riskScore = 0;
            const reasons: string[] = [];

            // A. Run-Up Risk
            if (runUp > 20) {
                riskScore += 40;
                reasons.push(`Pre-Runup (+${runUp.toFixed(1)}%) Warning`);
            } else if (runUp > 10) {
                riskScore += 20;
                reasons.push(`Pre-Runup (+${runUp.toFixed(1)}%) Caution`);
            }

            // B. RSI Risk
            if (rsi > 80) {
                riskScore += 30;
                reasons.push(`RSI Overbought (${rsi.toFixed(0)})`);
            } else if (rsi > 70) {
                riskScore += 15;
            }

            // C. Volume Climax (Buying Exhaustion?)
            if (volumeProfile === 'CLIMAX' && today.close < today.open) {
                // High volume yesterday, but red candle today?
                riskScore += 20;
                reasons.push('Volume Climax with Weakness');
            }

            // D. Gap Up Risk (Did it already gap up today?)
            const gap = ((today.open - t_minus_1.close) / t_minus_1.close) * 100;
            if (gap > 10) {
                riskScore += 20;
                reasons.push(`Huge Gap Up (+${gap.toFixed(1)}%) - Chasing Risk`);
            }

            const isPricedIn = riskScore >= 50;
            const rationale = reasons.length > 0 ? reasons.join(', ') : 'No significant pre-pricing detected.';

            console.log(`[DeepResearch] result for ${ticker}: Risk ${riskScore}/100 (${rationale})`);

            return {
                ticker,
                riskScore,
                isPricedIn,
                rationale,
                metrics: {
                    preRunUp: runUp,
                    rsi,
                    volumeProfile
                }
            };

        } catch (error) {
            console.error(`[DeepResearch] Error analyzing ${ticker}:`, error);
            return this.createNeutralResult(ticker);
        }
    }

    private calculateRSI(candles: any[], period: number): number {
        if (candles.length <= period) return 50;

        let gains = 0;
        let losses = 0;

        for (let i = 1; i <= period; i++) {
            const change = candles[candles.length - i].close - candles[candles.length - i - 1].close;
            if (change > 0) gains += change;
            else losses -= change;
        }

        if (losses === 0) return 100;

        const rs = (gains / period) / (losses / period);
        return 100 - (100 / (1 + rs));
    }

    private createNeutralResult(ticker: string): DeepAnalysisResult {
        return {
            ticker,
            riskScore: 0,
            isPricedIn: false,
            rationale: 'Insufficient data for analysis',
            metrics: { preRunUp: 0, rsi: 50, volumeProfile: 'NORMAL' }
        };
    }
    /**
     * [Whale Shadow Detection]
     * Analyze if the news is likely a "Trap" or "Shakeout" by comparing Sentiment vs. Price Action.
     * "Jiktoo stands one step behind the whales."
     */
    public async verifyNewsIntegrity(ticker: string, newsContent: string, sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL', marketTarget: MarketTarget): Promise<{
        trustScore: number; // 0-100
        isManipulation: boolean;
        manipulationType?: 'PUMP_AND_DUMP' | 'BEAR_TRAP' | 'NEWS_WASHING' | null;
        whalesAction: 'ACCUMULATION' | 'DISTRIBUTION' | 'UNKNOWN';
        insight: string;
    }> {
        console.log(`[DeepResearch] 🐋 Ghost Protocol: Verifying integrity of news for ${ticker}...`);

        // 1. Fetch Market Context (Candles)
        const candles = await fetchDailyCandles(ticker, marketTarget, 5);
        if (!candles || candles.length < 2) {
            return { trustScore: 50, isManipulation: false, whalesAction: 'UNKNOWN', insight: 'Data insufficient for whale tracking.' };
        }

        const today = candles[candles.length - 1];
        const yesterday = candles[candles.length - 2];

        // 2. Analyze Price vs. News Sentiment Divergence
        // "News says BUY, but Price says SELL" -> Distribution (Trap)
        // "News says SELL, but Price matches BUY" -> Accumulation (Shakeout/Bear Trap)

        const priceChange = ((today.close - today.open) / today.open) * 100;
        const isPriceUp = priceChange > 0;
        const isVolumeSpike = today.volume > yesterday.volume * 1.5;

        let whalesAction: 'ACCUMULATION' | 'DISTRIBUTION' | 'UNKNOWN' = 'UNKNOWN';
        let manipulationType: 'PUMP_AND_DUMP' | 'BEAR_TRAP' | 'NEWS_WASHING' | null = null;
        let trustScore = 80; // Start with high trust, deduct penalties

        // [Scenario A] Good News + Price Drop + High Volume
        // = Whales are selling into the liquidity proivded by the news NOVICE buyers.
        if (sentiment === 'BULLISH' && !isPriceUp && isVolumeSpike) {
            whalesAction = 'DISTRIBUTION';
            manipulationType = 'PUMP_AND_DUMP';
            trustScore -= 60; // Huge penalty
        }

        // [Scenario B] Bad News + Price Rise + High Volume
        // = Whales are absorbing panic selling from retail.
        else if (sentiment === 'BEARISH' && isPriceUp && isVolumeSpike) {
            whalesAction = 'ACCUMULATION';
            manipulationType = 'BEAR_TRAP';
            trustScore -= 20; // It's manipulation, but profitable to follow if recognized
        }

        // [Scenario C] News Washing (Recycled News)
        // Check keywords implying re-hash
        const recycledKeywords = ['reiterates', 'reminds', 'summary', 're-cap', 'known'];
        const isRecycled = recycledKeywords.some(w => newsContent.toLowerCase().includes(w));
        if (isRecycled) {
            manipulationType = 'NEWS_WASHING';
            trustScore -= 30;
        }

        const insight = `Whale Action: ${whalesAction}. Manipulation: ${manipulationType || 'None'}. Score: ${trustScore}. (Price: ${priceChange.toFixed(2)}%, VolSpike: ${isVolumeSpike})`;

        console.log(`[DeepResearch] 🕵️ Integrity Check: ${insight}`);

        return {
            trustScore,
            isManipulation: trustScore < 50,
            manipulationType,
            whalesAction,
            insight
        };
    }
}

export const deepResearchService = new DeepResearchService();
