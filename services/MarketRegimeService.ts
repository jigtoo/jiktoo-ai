import { fetchMarketIndex } from './dataService';
import { telegramService } from './telegramService';
import { analyzeMarketHealth } from './gemini/marketService';
import { ecosService, MacroIndicators } from './EcosService';
import { MarketTarget } from '../types';
import { supabase } from './supabaseClient';

export type MarketRegimeType = 'PANIC' | 'BEAR' | 'WEAK_BEAR' | 'SIDEWAYS' | 'WEAK_BULL' | 'BULL' | 'SUPER_BULL';

export interface MarketRegimeStatus {
    regime: MarketRegimeType;
    score: number; // 0 ~ 100 (higher = more Bullish, <10 = Panic)
    confidence: number; // 0 ~ 100
    factors: {
        macro: string;
        sentiment: number;
        technical: string;
    };
    detailedFactors: {
        positive: string[];
        negative: string[];
        neutral: string[];
    };
    dataQuality: 'excellent' | 'good' | 'low';
    recommendedExposure: number; // 0 ~ 1.0 (Panic can be 0 or specialized deep value)
    timestamp: number;
    lastUpdated: string;
}

class MarketRegimeService {
    private lastStatus: Record<MarketTarget, MarketRegimeStatus | null> = { KR: null, US: null };
    private lastUpdate: Record<MarketTarget, number> = { KR: 0, US: 0 };
    private UPDATE_INTERVAL = 1000 * 60 * 30; // 30 minutes
    private STORAGE_KEY_PREFIX = 'jiktoo_market_regime_';

    constructor() {
        this.loadFromStorage();
    }

    private loadFromStorage() {
        try {
            const kr = localStorage.getItem(this.STORAGE_KEY_PREFIX + 'KR');
            const us = localStorage.getItem(this.STORAGE_KEY_PREFIX + 'US');
            if (kr) {
                this.lastStatus.KR = JSON.parse(kr);
                this.lastUpdate.KR = this.lastStatus.KR?.timestamp || 0;
            }
            if (us) {
                this.lastStatus.US = JSON.parse(us);
                this.lastUpdate.US = this.lastStatus.US?.timestamp || 0;
            }
        } catch (e) {
            console.error('[MarketRegimeService] Failed to load from storage:', e);
        }
    }

    private saveToStorage(target: MarketTarget) {
        try {
            if (this.lastStatus[target]) {
                localStorage.setItem(this.STORAGE_KEY_PREFIX + target, JSON.stringify(this.lastStatus[target]));
            }
        } catch (e) {
            console.error('[MarketRegimeService] Failed to save to storage:', e);
        }
    }

    /**
     * Analyze current market regime
     */
    public async analyzeCurrentRegime(marketTarget: MarketTarget): Promise<MarketRegimeStatus> {
        const now = new Date();
        const marketTime = new Date(now.toLocaleString("en-US", { timeZone: marketTarget === 'KR' ? "Asia/Seoul" : "America/New_York" }));
        const h = marketTime.getHours();
        const m = marketTime.getMinutes();

        // Critical Time: Closing Bell (KR: 15:20~, US: 15:50~)
        let isClosingBell = false;
        if (marketTarget === 'KR') isClosingBell = (h === 15 && m >= 20 && m <= 50);
        else isClosingBell = (h === 15 && m >= 50);

        // Return cached status if valid AND not in critical closing bell time
        if (!isClosingBell && this.lastStatus[marketTarget] && (Date.now() - this.lastUpdate[marketTarget] < this.UPDATE_INTERVAL)) {
            return this.lastStatus[marketTarget]!;
        }

        console.log(`[Market Regime] Analyzing market conditions for ${marketTarget}...`);

        try {
            // 1. AI Deep Analysis (Gemini)
            const deepHealth = await analyzeMarketHealth(marketTarget);
            console.log(`[Market Regime] AI Deep Data (${marketTarget}): ${deepHealth.status} | ${deepHealth.summary}`);

            // 2. Macroeconomic Data (ECOS - KR only, via kis-proxy)
            let macroIndicators: MacroIndicators | null = null;
            if (marketTarget === 'KR') {
                try {
                    macroIndicators = await ecosService.getAllIndicators();
                    console.log('[Market Regime] 🏦 ECOS 거시경제 지표:', macroIndicators);
                } catch (error) {
                    console.warn('[Market Regime] ECOS 데이터 조회 실패 (계속 진행):', error);
                }
            }

            // 3. Technical analysis (Index data)
            const marketIndex = await fetchMarketIndex(marketTarget);

            // 4. Calculate Regime (with ECOS data)
            const status = this.calculateRegime(marketTarget, deepHealth, marketIndex, macroIndicators, this.lastStatus[marketTarget]);

            // Alert on change
            if (this.lastStatus[marketTarget] && this.lastStatus[marketTarget]!.regime !== status.regime) {
                telegramService.sendMarketRegimeChange({
                    previousRegime: this.lastStatus[marketTarget]!.regime,
                    newRegime: status.regime,
                    reason: `AI Analysis: ${deepHealth.summary} (Score: ${this.lastStatus[marketTarget]!.score} -> ${status.score})`,
                    recommendation: `Recommended exposure ${status.recommendedExposure * 100}%`
                }).catch(err => console.error('[MarketRegimeService] Telegram alert failed:', err));
            }

            // Save to Supabase for Dashboard visibility
            try {
                const { error } = await supabase.from('market_regime_logs').insert({
                    market: marketTarget,
                    regime: status.regime,
                    score: status.score,
                    confidence: status.confidence,
                    factors: status.factors,
                    detailed_factors: status.detailedFactors,
                    recommended_exposure: status.recommendedExposure,
                    created_at: new Date().toISOString()
                });

                if (error) console.error('[Market Regime] DB Save Failed:', error);
                else console.log(`[Market Regime] Dashboard updated for ${marketTarget}.`);

            } catch (dbError) {
                console.error('[Market Regime] DB Connection Error:', dbError);
            }

            this.lastStatus[marketTarget] = status;
            this.lastUpdate[marketTarget] = Date.now();
            this.saveToStorage(marketTarget);

            console.log(`[Market Regime] Analysis Complete (${marketTarget}): ${status.regime} (Score: ${status.score})`);
            return status;

        } catch (error) {
            console.error('[Market Regime] Analysis Failed:', error);
            // Default Fallback
            return {
                regime: 'SIDEWAYS',
                score: 50,
                confidence: 0,
                factors: { macro: 'Error', sentiment: 0, technical: 'Error' },
                detailedFactors: { positive: [], negative: ['Analysis Failed'], neutral: [] },
                dataQuality: 'low',
                recommendedExposure: 0.3,
                timestamp: Date.now(),
                lastUpdated: new Date().toLocaleString('ko-KR')
            };
        }
    }

    /**
     * Pure calculation logic for Market Regime (7-Step Expansion)
     */
    public calculateRegime(
        marketTarget: MarketTarget,
        deepHealth: any,
        marketIndex: any,
        macroIndicators: MacroIndicators | null,
        prevStatus: MarketRegimeStatus | null
    ): MarketRegimeStatus {
        const changeRate = marketIndex.changeRate;

        // 1. AI Score Mapping (More Granular)
        let aiScore = 50;
        const s = deepHealth.status.toLowerCase();
        const summary = deepHealth.summary?.toLowerCase() || '';

        // Enhanced panic detection
        if (s.includes('crash') || s.includes('panic') || s.includes('collapse') ||
            summary.includes('패닉') || summary.includes('붕괴')) aiScore = 5;
        // Strong bear signals
        else if (s.includes('bear') || s.includes('severe downtrend') || s.includes('distribution') ||
            summary.includes('하락') || summary.includes('약세')) aiScore = 25;
        // Weak bear / correction
        else if (s.includes('correction') || s.includes('weak downtrend') ||
            summary.includes('조정')) aiScore = 40;
        // True neutral (sideways)
        else if (s.includes('neutral') || s.includes('sideways') || s.includes('consolidation') ||
            summary.includes('횡보') || summary.includes('관망')) aiScore = 50;
        // Weak bull / accumulation  
        else if (s.includes('accumulation') || s.includes('recovery') ||
            summary.includes('매집') || summary.includes('회복')) aiScore = 60;
        // Bull trend
        else if (s.includes('uptrend') || s.includes('bullish') ||
            summary.includes('상승') || summary.includes('강세')) aiScore = 75;
        // Strong bull / rally
        else if (s.includes('strong bull') || s.includes('mark up') || s.includes('rally') ||
            summary.includes('랠리') || summary.includes('급등')) aiScore = 90;

        // 2. Technical Score Mapping (Index Change)
        let technicalScore = 50;
        if (changeRate < -3.0) technicalScore = 0;        // Panic
        else if (changeRate < -1.5) technicalScore = 20;  // Bear
        else if (changeRate < -0.5) technicalScore = 35;  // Weak Bear
        else if (changeRate <= 0.5) technicalScore = 50;  // Sideways
        else if (changeRate <= 1.2) technicalScore = 65;  // Weak Bull (0.6 ~ 1.2%)
        else if (changeRate <= 2.5) technicalScore = 80;  // Bull (1.3 ~ 2.5%)
        else technicalScore = 100;                        // Super Bull (> 2.5%)

        // 🆕 3. ECOS Macroeconomic Score (KR only)
        let macroScore = 50; // Default neutral
        const macroFactors: string[] = [];

        if (macroIndicators && marketTarget === 'KR') {
            const macroSentiment = ecosService.interpretMarketSentiment(macroIndicators);
            macroScore = macroSentiment.score;
            macroFactors.push(...macroSentiment.reasons);
            console.log(`[Market Regime] 📊 ECOS Score: ${macroScore} (${macroSentiment.sentiment})`);
        }

        // 4. Confidence Calculation
        let confidence = 100;
        // Penalize divergence
        if (Math.abs(aiScore - technicalScore) > 40) confidence -= 40;
        if (Math.abs(aiScore - 50) < 10) confidence -= 20; // AI Uncertain
        const hasFactors = deepHealth.positiveFactors.length > 0 || deepHealth.negativeFactors.length > 0;
        if (!hasFactors) confidence -= 30;

        // 5. Total Score Calculation
        // CRITICAL FIX: Increased Technical weight to prioritize real price action over AI interpretation
        // KR with ECOS: 30% AI + 50% Technical + 20% Macro (AI reduced, Tech increased)
        // US or no ECOS: 30% AI + 70% Technical (Tech-driven for faster reaction)
        let totalScore: number;
        if (macroIndicators && marketTarget === 'KR') {
            totalScore = (aiScore * 0.3) + (technicalScore * 0.5) + (macroScore * 0.2);
            console.log(`[Market Regime] Score Breakdown: AI=${aiScore} (30%), Tech=${technicalScore} (50%), Macro=${macroScore} (20%)`);
        } else {
            // Give strong preference to actual price action
            totalScore = (aiScore * 0.3) + (technicalScore * 0.7);
            console.log(`[Market Regime] Score Breakdown: AI=${aiScore} (30%), Tech=${technicalScore} (70%) -> Price Action Priority`);
        }

        // 5.1 Divergence Penalty (Constitution Fail-Safe)
        // If AI is Bullish (>70) but Technical is Bearish (<50), we penalize.
        // [Adjust] If Technical is showing strong rebound (>40, i.e. not crash), allow AI to lead slightly.
        if (aiScore > 70 && technicalScore < 40) {
            console.log(`[Market Regime] Divergence Penalty Applied (-20). AI: ${aiScore} (Bull), Tech: ${technicalScore} (Bear/Crash)`);
            totalScore -= 20;
        }

        // Prohibit Super Bull only if strictly Bearish Trend
        if (technicalScore <= 40 && totalScore >= 80) totalScore = 75;

        // [Boost] V-Shape Rebound Bonus
        // If Technical is > 65 (Weak Bull) AND AI is > 80 (Bull), boost confidence.
        if (technicalScore >= 65 && aiScore >= 80) {
            totalScore += 5;
        }

        totalScore = Math.max(0, Math.min(100, Math.round(totalScore)));

        // 6. Determine Regime (IMPROVED: Narrowed SIDEWAYS range)
        let regime: MarketRegimeType = 'SIDEWAYS';
        let exposure = 0.4;

        if (totalScore < 15) regime = 'PANIC';           // Score 0-14
        else if (totalScore < 30) regime = 'BEAR';       // Score 15-29
        else if (totalScore < 43) regime = 'WEAK_BEAR'; // Score 30-42 (narrowed)
        else if (totalScore < 57) regime = 'SIDEWAYS';   // Score 43-56 (narrowed range)
        else if (totalScore < 72) regime = 'WEAK_BULL';  // Score 57-71 (expanded)
        else if (totalScore < 85) regime = 'BULL';       // Score 72-84 (expanded)
        else regime = 'SUPER_BULL';                      // Score 85-100

        // Hysteresis (Buffer) - Prevent flickering (REDUCED for faster response)
        if (prevStatus) {
            const diff = Math.abs(totalScore - prevStatus.score);
            // Only keep previous regime if change is very small (<3 points)
            // This allows regime to update faster when market truly changes
            if (diff < 3 && Math.abs(changeRate) < 1.0) {
                // Additional check: only apply hysteresis if index change is also small
                regime = prevStatus.regime;
                console.log(`[Market Regime] Hysteresis applied: keeping ${prevStatus.regime} (score diff: ${diff})`);
            }
        }

        // Map Exposure
        // Map Exposure
        // [User Request: Bottom-Up / Scanner Driven Mode]
        // Force Aggressive Setup regardless of Index condition
        // However, we still calculate the Regime for informational purposes.
        switch (regime) {
            case 'PANIC': exposure = 0.0; break;      // Panic: Cash is King (Inverse will act separately)
            case 'BEAR': exposure = 0.1; break;
            default: exposure = 1.0; break;           // Force 100% for Sideways/Bull (Let Scanners decide)
        }

        // Data Quality Check
        let dataQuality: 'excellent' | 'good' | 'low' = 'good';
        if (hasFactors && deepHealth.positiveFactors.length >= 3) dataQuality = 'excellent';
        else if (!hasFactors) dataQuality = 'low';

        // [Scanner Driven Override Visual]
        const neutralFactors = [`Total Score: ${totalScore}, Technical: ${technicalScore}, AI: ${aiScore}${macroScore !== 50 ? `, Macro: ${macroScore}` : ''}`];
        if (regime !== 'PANIC' && regime !== 'BEAR') {
            neutralFactors.push('🚀 [Scanner Override] Exposure Maxed (User Request)');
        }

        return {
            regime,
            score: totalScore,
            confidence: Math.max(0, Math.min(100, confidence)),
            factors: {
                macro: deepHealth.positiveFactors.join(', '),
                sentiment: 0,
                technical: deepHealth.status
            },
            detailedFactors: {
                positive: [...(deepHealth.positiveFactors || []), ...macroFactors.filter(f => !f.includes('감소') && !f.includes('인상') && !f.includes('둔화') && !f.includes('인플레이션'))],
                negative: [...(deepHealth.negativeFactors || []), ...macroFactors.filter(f => f.includes('감소') || f.includes('인상') || f.includes('둔화') || f.includes('인플레이션'))],
                neutral: neutralFactors
            },
            dataQuality,
            recommendedExposure: exposure,
            timestamp: Date.now(),
            lastUpdated: new Date().toLocaleString('ko-KR', {
                timeZone: marketTarget === 'KR' ? 'Asia/Seoul' : 'America/New_York',
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            })
        };
    }

    public getLastStatus(target: MarketTarget): MarketRegimeStatus | null {
        return this.lastStatus[target];
    }
}

export const marketRegimeService = new MarketRegimeService();
