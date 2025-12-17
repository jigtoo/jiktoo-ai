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

        // 1. AI Score Mapping
        let aiScore = 50;
        const s = deepHealth.status.toLowerCase();
        // Panic/Crash detection in AI text
        if (s.includes('crash') || s.includes('panic') || s.includes('collapse')) aiScore = 5;
        else if (s.includes('bear') || s.includes('downtrend') || s.includes('distribution')) aiScore = 20;
        else if (s.includes('correction') || s.includes('neutral')) aiScore = 50;
        else if (s.includes('accumulation') || s.includes('uptrend')) aiScore = 70;
        else if (s.includes('strong bull') || s.includes('mark up') || s.includes('rally')) aiScore = 90;

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
        // If ECOS data available (KR): 40% AI + 30% Technical + 30% Macro
        // Otherwise (US): 50% AI + 50% Technical
        let totalScore: number;
        if (macroIndicators && marketTarget === 'KR') {
            totalScore = (aiScore * 0.4) + (technicalScore * 0.3) + (macroScore * 0.3);
            console.log(`[Market Regime] Score Breakdown: AI=${aiScore} (40%), Tech=${technicalScore} (30%), Macro=${macroScore} (30%)`);
        } else {
            totalScore = (aiScore * 0.5) + (technicalScore * 0.5);
        }

        // 5.1 Divergence Penalty (Constitution Fail-Safe)
        // If AI is Bullish (>70) but Technical is Bearish (<50), we penalize heavily.
        // Logic: "Don't fight the tape."
        if (aiScore > 70 && technicalScore < 50) {
            console.log(`[Market Regime] Divergence Penalty Applied (-20). AI: ${aiScore} (Bull), Tech: ${technicalScore} (Bear)`);
            totalScore -= 20;
        }

        // Prohibit Super Bull in Falling Market (Safety Cap)
        if (technicalScore <= 50 && totalScore >= 80) totalScore = 75;

        totalScore = Math.max(0, Math.min(100, Math.round(totalScore)));

        // 5. Determine Regime (7-Step Logic)
        let regime: MarketRegimeType = 'SIDEWAYS';
        let exposure = 0.4;

        if (totalScore < 15) regime = 'PANIC';       // Score 0-14
        else if (totalScore < 30) regime = 'BEAR';   // Score 15-29
        else if (totalScore < 45) regime = 'WEAK_BEAR'; // Score 30-44
        else if (totalScore < 55) regime = 'SIDEWAYS'; // Score 45-54
        else if (totalScore < 70) regime = 'WEAK_BULL'; // Score 55-69
        else if (totalScore < 85) regime = 'BULL';     // Score 70-84
        else regime = 'SUPER_BULL';                    // Score 85-100

        // Hysteresis (Buffer) - Prevent flickering
        if (prevStatus) {
            const diff = Math.abs(totalScore - prevStatus.score);
            // If score change is small (<5), keep previous regime to avoid noise
            if (diff < 5) regime = prevStatus.regime;
        }

        // Map Exposure
        switch (regime) {
            case 'PANIC': exposure = 0.0; break;      // Cash 100% or Deep Value Only
            case 'BEAR': exposure = 0.1; break;       // Inverse/Short Mainly
            case 'WEAK_BEAR': exposure = 0.3; break;  // Defensive
            case 'SIDEWAYS': exposure = 0.5; break;   // Box Trading
            case 'WEAK_BULL': exposure = 0.7; break;  // Selective
            case 'BULL': exposure = 0.9; break;       // Aggressive
            case 'SUPER_BULL': exposure = 1.0; break; // Full Margin (Virtual)
        }

        // Data Quality Check
        let dataQuality: 'excellent' | 'good' | 'low' = 'good';
        if (hasFactors && deepHealth.positiveFactors.length >= 3) dataQuality = 'excellent';
        else if (!hasFactors) dataQuality = 'low';

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
                neutral: [`Total Score: ${totalScore}, Technical: ${technicalScore}, AI: ${aiScore}${macroScore !== 50 ? `, Macro: ${macroScore}` : ''}`]
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
