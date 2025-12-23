// services/StrategyOptimizationService.ts
import { supabase } from './supabaseClient';
import { ai, generateContentWithRetry } from './gemini/client';

export interface OptimizationProposal {
    id?: string;
    optimizationTarget: string;
    previousParams: Record<string, any>;
    newParams: Record<string, any>;
    reasoning: string;
    performanceImprovement: number;
    analyzedTrades: number;
    winRateBefore: number;
    winRateAfter: number;
    status: 'PROPOSED' | 'APPROVED' | 'REJECTED' | 'ACTIVE';
}

export interface TriggerPerformance {
    triggerType: string;
    totalTrades: number;
    wins: number;
    losses: number;
    winRate: number;
    avgReturn: number;
    avgHoldingDays: number;
}

export interface PerformanceStats {
    totalBuys: number;
    totalSells: number;
    wins: number;
    losses: number;
    winRate: number;
    totalProfitLoss: number;
    avgProfitLoss: number;
    avgProfitLossRate: number;
    avgHoldingDays: number;
    bestTrade: number;
    worstTrade: number;
}

class StrategyOptimizationService {

    /**
     * ?ÑÏ?��??±Í?��??µÍ?��?Ï°?�Ìö�?
     */
    async getPerformanceStats(): Promise<PerformanceStats | null> {
        if (!supabase) return null;

        try {
            const { data, error } = await supabase
                .from('shadow_trader_performance_stats')
                .select('*')
                .single();

            if (error) {
                console.error('[StrategyOptimization] Failed to fetch performance stats:', error);
                return null;
            }

            return data as PerformanceStats;
        } catch (err) {
            console.error('[StrategyOptimization] Error fetching performance stats:', err);
            return null;
        }
    }

    /**
     * Trigger ?Ä?ÖÎ?��??±Í?��?Ï°?�Ìö�?
     */
    async getTriggerPerformance(): Promise<TriggerPerformance[]> {
        try {
            const { data, error } = await supabase
                .from('trigger_type_performance')
                .select('*');

            if (error) {
                console.error('[StrategyOptimization] Failed to fetch trigger performance:', error);
                return [];
            }

            return data as TriggerPerformance[];
        } catch (err) {
            console.error('[StrategyOptimization] Error fetching trigger performance:', err);
            return [];
        }
    }

    /**
     * Í?�ºÍ±∞ Îß§Îß§ ??�Ïù¥KRWÏ°?�Ìö�?(?ÅÏÑ??Î?�ÑÏÑùKRW
     */
    async getTradeHistory(days: number = 30): Promise<any[]> {
        try {
            const { data, error } = await supabase
                .from('shadow_trader_trades')
                .select('*')
                .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[StrategyOptimization] Failed to fetch trade history:', error);
                return [];
            }

            return data || [];
        } catch (err) {
            console.error('[StrategyOptimization] Error fetching trade history:', err);
            return [];
        }
    }

    /**
     * GeminiÎ?�KRW¨Ïö©?òÏó¨ Volume Spike ?ÑÍ?�ÑÍ∞?ÏµúÏ?�ÅKRW
     */
    async optimizeVolumeSpikeThreshold(): Promise<OptimizationProposal | null> {
        try {
            console.log('[StrategyOptimization] Analyzing volume spike threshold...');

            // 1. ?±Í?��???�Ïù¥KRW?òÏßë
            const triggerPerf = await this.getTriggerPerformance();
            const volumeSpikeData = triggerPerf.find(t => t.triggerType === 'VOLUME_SPIKE');
            const trades = await this.getTradeHistory(30);

            if (!volumeSpikeData || trades.length === 0) {
                console.warn('[StrategyOptimization] Insufficient data for optimization');
                return null;
            }

            // 2. Í±?�Îû�?âÎ?��??±Í?��?Î?�ÑÏÑ�?
            const volumeSpikeTrades = trades.filter(t => t.trigger_type === 'VOLUME_SPIKE');
            const volumeAnalysis = this.analyzeVolumeThresholds(volumeSpikeTrades);

            // 3. Gemini?êÍ?��?ÏµúÏ?�ÅKRW?úÏïà ?îÏ?�≠
            const prompt = `??Ïã??Ä Ï£ºÏãù ??�Î†�?¥Îî© ?ÑÎûµ ÏµúÏ?�ÅKRWAI?ÖÎãàKRW

**?ÑÏû¨ ?ÅÌô©:**
- Trigger ?ÄKRW VOLUME_SPIKE (Í±?�ÎûòKRWKRW?��?
- Ï¥?Í±?�Îû�?KRW ${volumeSpikeData.totalTrades}
- ??Î?��? ${volumeSpikeData.winRate}%
- ?âÍ?��??òÏùµÎ?? ${volumeSpikeData.avgReturn}%
- ?âÍ?��?Î?�¥Ïú�?Í?�∞Í?��? ${volumeSpikeData.avgHoldingDays}KRW

**Í±?�ÎûòKRWÍµ¨Í?�ÑÎ≥?Î?�ÑÏÑ�?**
${volumeAnalysis}

**?ÑÏû¨ ?§Ï?��?**
- Í±?�ÎûòKRW?ÑÍ?�ÑÍ∞? 300ÎßåÏ£º (Ï?��?�†�?

**?îÏ?�≠?¨Ìï??**
1. ÏµúÏ?��?Í±?�ÎûòKRW?ÑÍ?�ÑÍ∞íÏ? ?ºÎßà??�ÍKRW
2. ?àÏÉÅ ??Î?��?Í?�úÏÑ�?Ä?
3. Í?�ºÍ±∞KRWÎ¨¥Ïóá??�ÍKRW

JSON ?ïÏãù?ºÎ°ú ?µÎ?:
{
  "recommendedThreshold": ?´Ïûê (ÎßåÏ£º ?®ÏúÑ),
  "expectedWinRate": ?´Ïûê (?ºÏÑºKRW,
  "reasoning": "?ÅÏÑ?�KRWÍ?�ºÍ±∞",
  "confidence": ?´Ïûê (0-100)
}`;

            const result = await generateContentWithRetry({
                model: 'gemini-2.0-flash-001',
                contents: prompt
            });
            const response = result.text;

            if (!response) {
                console.error('[StrategyOptimization] Empty response from Gemini');
                return null;
            }

            // JSON Ï?��?�∂ú
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                console.error('[StrategyOptimization] Failed to parse Gemini response');
                return null;
            }

            const aiSuggestion = JSON.parse(jsonMatch[0]);

            // 4. ÏµúÏ?�ÅKRW?úÏïà ?ùÏÑ±
            const proposal: OptimizationProposal = {
                optimizationTarget: 'SNIPER_TRIGGER_VOLUME',
                previousParams: {
                    volumeThreshold: 3000000, // 300ÎßåÏ£º
                },
                newParams: {
                    volumeThreshold: aiSuggestion.recommendedThreshold * 10000, // ÎßåÏ£º KRWÏ£?
                },
                reasoning: aiSuggestion.reasoning,
                performanceImprovement: aiSuggestion.expectedWinRate - volumeSpikeData.winRate,
                analyzedTrades: volumeSpikeTrades.length,
                winRateBefore: volumeSpikeData.winRate,
                winRateAfter: aiSuggestion.expectedWinRate,
                status: 'PROPOSED',
            };

            // 5. SupabaseKRW?ÄKRW
            const { data, error } = await supabase
                .from('ai_strategy_optimization_log')
                .insert(proposal)
                .select()
                .single();

            if (error) {
                console.error('[StrategyOptimization] Failed to save proposal:', error);
                return proposal;
            }

            console.log('[StrategyOptimization] Optimization proposal created:', data);
            return { ...proposal, id: data.id };

        } catch (err) {
            console.error('[StrategyOptimization] Error in optimizeVolumeSpikeThreshold:', err);
            return null;
        }
    }

    /**
     * Í±?�ÎûòKRWÍµ¨Í?�ÑÎ≥KRW±Í?��?Î?�ÑÏÑ�?
     */
    private analyzeVolumeThresholds(trades: any[]): string {
        const thresholds = [1000000, 3000000, 5000000, 7000000, 10000000]; // 100Îß? 300Îß? 500Îß? 700Îß? 1000Îß?
        const results: string[] = [];

        for (const threshold of thresholds) {
            const filtered = trades.filter(t => {
                const volume = t.context?.volume || 0;
                return volume >= threshold;
            });

            if (filtered.length === 0) continue;

            const wins = filtered.filter(t => t.outcome === 'WIN').length;
            const winRate = (wins / filtered.length) * 100;
            const avgReturn = filtered.reduce((sum, t) => sum + (t.profit_loss_rate || 0), 0) / filtered.length;

            results.push(`- ${threshold / 10000}ÎßåÏ£º ?¥ÏÉÅ: ${filtered.length}Í±? ??Î?��?${winRate.toFixed(1)}%, ?âÍ?��??òÏùµÎ??${avgReturn.toFixed(2)}%`);
        }

        return results.join('\n');
    }

    /**
     * ?ÑÏ?��??ÑÎûµ Î?�ÑÏÑ�?Î?�KRWúÏïà
     */
    async analyzeAndPropose(): Promise<OptimizationProposal[]> {
        const proposals: OptimizationProposal[] = [];

        // 1. Volume Spike ÏµúÏ?�ÅKRW
        const volumeProposal = await this.optimizeVolumeSpikeThreshold();
        if (volumeProposal) proposals.push(volumeProposal);

        // ??�Ìõ�?Ï?��?? Í?�ÄKRW
        // 2. Volatility Breakout ÏµúÏ?�ÅKRW
        // 3. Position Size ÏµúÏ?�ÅKRW
        // 4. Take Profit / Stop Loss ÏµúÏ?�ÅKRW

        return proposals;
    }

    /**
     * ?úÏïà ??Ïù??
     */
    async approveProposal(proposalId: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('ai_strategy_optimization_log')
                .update({
                    status: 'APPROVED',
                    approved_at: new Date().toISOString(),
                    approved_by: 'USER',
                })
                .eq('id', proposalId);

            if (error) {
                console.error('[StrategyOptimization] Failed to approve proposal:', error);
                return false;
            }

            console.log('[StrategyOptimization] Proposal approved:', proposalId);
            return true;
        } catch (err) {
            console.error('[StrategyOptimization] Error approving proposal:', err);
            return false;
        }
    }

    /**
     * ?úÏïà Í±?��?
     */
    async rejectProposal(proposalId: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('ai_strategy_optimization_log')
                .update({
                    status: 'REJECTED',
                })
                .eq('id', proposalId);

            if (error) {
                console.error('[StrategyOptimization] Failed to reject proposal:', error);
                return false;
            }

            console.log('[StrategyOptimization] Proposal rejected:', proposalId);
            return true;
        } catch (err) {
            console.error('[StrategyOptimization] Error rejecting proposal:', err);
            return false;
        }
    }

    /**
     * ?úÏÑ±?îÎêú ÏµúÏ?�ÅKRWÏ°?�Ìö�?
     */
    async getActiveOptimizations(): Promise<OptimizationProposal[]> {
        try {
            const { data, error } = await supabase
                .from('ai_strategy_optimization_log')
                .select('*')
                .eq('status', 'ACTIVE')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[StrategyOptimization] Failed to fetch active optimizations:', error);
                return [];
            }

            return data as OptimizationProposal[];
        } catch (err) {
            console.error('[StrategyOptimization] Error fetching active optimizations:', err);
            return [];
        }
    }

    /**
     * Î?��?�ì�??úÏïà Ï°?�Ìö�?
     */
    async getAllProposals(): Promise<OptimizationProposal[]> {
        try {
            const { data, error } = await supabase
                .from('ai_strategy_optimization_log')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) {
                console.error('[StrategyOptimization] Failed to fetch proposals:', error);
                return [];
            }

            return data as OptimizationProposal[];
        } catch (err) {
            console.error('[StrategyOptimization] Error fetching proposals:', err);
            return [];
        }
    }
}

// ?±ÍKRWKRW?�Ïä�?¥Ïä§
export const strategyOptimizationService = new StrategyOptimizationService();
