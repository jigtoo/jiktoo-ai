import { supabase } from './supabaseClient';

// Pricing Rates (per 1M tokens)
const RATES = {
    'gemini-1.5-flash': { input: 0.075, output: 0.30 },
    'gemini-1.5-pro': { input: 3.50, output: 10.50 },
    'gemini-2.0-flash-001': { input: 0.00, output: 0.00 } // Free during preview
};

export interface MonthlyUsageStats {
    totalInput: number;
    totalOutput: number;
    totalCost: number;
    requestCount: number;
}

class TokenUsageService {
    /**
     * Log token usage to Supabase
     */
    public async logUsage(model: string, inputTokens: number, outputTokens: number) {
        if (!supabase) {
            console.warn('[TokenUsage] Supabase not available, skipping log');
            return;
        }

        try {
            const rate = RATES[model as keyof typeof RATES] || RATES['gemini-1.5-flash'];
            const cost = (inputTokens / 1_000_000 * rate.input) + (outputTokens / 1_000_000 * rate.output);

            await supabase.from('ai_token_usage').insert({
                model,
                input_tokens: inputTokens,
                output_tokens: outputTokens,
                cost_usd: cost
            } as any);

            // console.log(`[TokenUsage] Logged: ${inputTokens}/${outputTokens} tokens ($${cost.toFixed(6)})`);

        } catch (error) {
            console.error('[TokenUsage] Failed to log usage:', error);
        }
    }

    /**
     * Get usage stats for the current month
     */
    public async getMonthlyUsage(): Promise<MonthlyUsageStats> {
        if (!supabase) {
            return { totalInput: 0, totalOutput: 0, totalCost: 0, requestCount: 0 };
        }

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

        const { data, error } = await supabase
            .from('ai_token_usage')
            .select('input_tokens, output_tokens, cost_usd')
            .gte('created_at', startOfMonth)
            .lte('created_at', endOfMonth);

        if (error || !data) {
            return { totalInput: 0, totalOutput: 0, totalCost: 0, requestCount: 0 };
        }

        const stats = data.reduce((acc, curr: any) => ({
            totalInput: acc.totalInput + curr.input_tokens,
            totalOutput: acc.totalOutput + curr.output_tokens,
            totalCost: acc.totalCost + curr.cost_usd,
            requestCount: acc.requestCount + 1
        }), { totalInput: 0, totalOutput: 0, totalCost: 0, requestCount: 0 });

        return stats;
    }
}

export const tokenUsageService = new TokenUsageService();
