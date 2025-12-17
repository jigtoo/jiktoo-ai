import { supabase } from './supabaseClient';
import type { StrategyGenome, LogicGroup, UserStrategy } from '../types';
import { callGemini } from './gemini/client';
import { runBacktest, Bar, BacktestResult as EngineResult } from './strategy/BacktestEngine';
import { geneticOptimizer } from './strategy/GeneticOptimizer';
import { getMarketUniverse } from './strategy/MarketUniverse';

export interface SimResult {
    finalReturn: number;
    benchmarkReturn?: number;
    alpha?: number;
    winRate: number;
    mdd: number;
    trades: number;
    insight: string;
    logs: { date: string; action: string; price: number; reason: string; profit?: number }[];
    periodStart?: string;
    periodEnd?: string;
    assetName?: string;
    mutatedGenome?: StrategyGenome;
}

export type BacktestResult = SimResult;

export const DEFAULT_GENOME: StrategyGenome = {
    maShort: 5,
    maLong: 20,
    rsiPeriod: 14,
    rsiBuy: 30,
    rsiSell: 70,
    bbPeriod: 20,
    bbDev: 2,
    stochK: 14,
    stochD: 3,
    stopLoss: 0.95,
    takeProfit: 1.05
};

export const timeMachineService = {

    /**
     * Run a simulation (Backtest) with Evolution capabilities
     */
    async runSimulation(
        params: { asset: string; period: number; mode: string; genome: StrategyGenome },
        onProgress?: (progress: number, details: string) => void
    ): Promise<SimResult | null> {

        // 1. Fetch Real Data (Authentic Experience)
        let ticker = params.asset;
        let stockName = params.asset;

        if (params.asset === 'RANDOM' || !params.asset) {
            const universe = getMarketUniverse('KR');
            const randomPick = universe[Math.floor(Math.random() * universe.length)];
            ticker = randomPick.ticker;
            stockName = randomPick.name;
        }

        console.log('[TimeMachine] Starting simulation for ' + stockName + '(' + ticker + ')...');
        if (onProgress) onProgress(10, 'Fetching real data for ' + stockName + '...');

        // Convert 'years' to approximate days if period is small (e.g., 3 -> 750 days)
        const candleLimit = params.period > 0 ? params.period * 252 : 300;
        const candles = await this.fetchHistoricalData(ticker, candleLimit);

        if (!candles || candles.length < 50) {
            console.warn('[TimeMachine] Not enough data for simulation.');
            return {
                finalReturn: 0, winRate: 0, mdd: 0, trades: 0,
                insight: '데이터 부족(' + stockName + ')으로 분석할 수 없습니다.',
                logs: []
            };
        }

        if (onProgress) onProgress(30, "Applying logic...");

        // 2. Run Baseline Backtest
        let bestReport = await this.executeBacktest(candles, params.genome);
        let bestGenome = params.genome;

        // 3. Darwin Evolution (Self-Improving Mode)
        if (params.mode === 'Self-Improving') {
            if (onProgress) onProgress(50, "🧬 Evolving Strategy (Mutation)...");

            // Try 5 generations of mutation to beat the baseline
            for (let i = 0; i < 5; i++) {
                const mutatedGenome = geneticOptimizer.mutate(bestGenome);
                const mutationReport = await this.executeBacktest(candles, mutatedGenome);

                // Simple Fitness Function: WinRate * Return (Risk Adjusted)
                // Avoid negative returns skewing score
                const currentScore = bestReport.finalReturn;
                const newScore = mutationReport.finalReturn;

                if (newScore > currentScore && mutationReport.trades > 0) {
                    // Successful Mutation!
                    console.log('[Darwin] Mutation Success! Return ' + currentScore.toFixed(1) + '% -> ' + newScore.toFixed(1) + '%');
                    bestReport = mutationReport;
                    bestGenome = mutatedGenome;
                }
            }
        }

        if (onProgress) onProgress(80, "Generating AI Insight...");

        // 4. Generate Insight (LLM)
        const insight = await this.generateInsight(
            bestReport,
            bestGenome,
            bestReport.benchmarkReturn,
            bestReport.alpha
        );

        if (onProgress) onProgress(100, "Complete.");

        return {
            ...bestReport,
            insight,
            periodStart: candles[0].date,
            periodEnd: candles[candles.length - 1].date,
            assetName: stockName,
            mutatedGenome: bestGenome // Return the winner
        };
    },

    // --- Helpers ---

    /**
     * Run a silent simulation (No LLM, No Mutation) for Health Checks
     */
    async runSilentSimulation(genome: StrategyGenome): Promise<{ finalReturn: number, mdd: number } | null> {
        // 1. Fetch Random Real Data
        const universe = getMarketUniverse('KR');
        const randomPick = universe[Math.floor(Math.random() * universe.length)];
        const candles = await this.fetchHistoricalData(randomPick.ticker, 200); // ~1 year

        if (!candles || candles.length < 50) return null;

        // 2. Run Backtest
        const report = await this.executeBacktest(candles, genome);

        return {
            finalReturn: report.finalReturn,
            mdd: report.mdd
        };
    },

    async fetchHistoricalData(ticker: string, days: number): Promise<any[]> {
        // [FIX] Use centralized dataService which handles KIS Fallback correctly
        try {
            const { fetchCandles } = await import('./dataService');
            const data = await fetchCandles(ticker, 'day', days);

            if (!data || data.length === 0) return [];

            return data.map(d => ({
                date: d.date.split('T')[0], // Ensure YYYY-MM-DD
                open: d.open,
                high: d.high,
                low: d.low,
                close: d.close,
                volume: d.volume
            }));
        } catch (e) {
            console.error('[TimeMachine] Failed to fetch data via dataService:', e);
            return [];
        }
    },

    async executeBacktest(candles: any[], genome: StrategyGenome): Promise<SimResult> {
        // 1. Convert Data to Engine Format (Bar[])
        const bars: Bar[] = candles.map(c => ({
            t: new Date(c.date).getTime(),
            o: c.open,
            h: c.high,
            l: c.low,
            c: c.close,
            v: c.volume
        }));

        // 2. Convert Genome to Logic V2 (Dynamic Logic Generation)
        const logic: LogicGroup = {
            id: 'genome_logic',
            type: 'GROUP',
            operator: 'OR', // Hybrid Logic
            children: [
                // RSI Buy Condition
                {
                    id: 'rsi_buy',
                    type: 'INDICATOR',
                    indicator: 'RSI',
                    params: [{ name: 'period', value: genome.rsiPeriod }],
                    operator: '<',
                    comparisonType: 'NUMBER',
                    comparisonValue: genome.rsiBuy
                },
                // Trend Condition (SMA Short > SMA Long)
                {
                    id: 'sma_trend',
                    type: 'INDICATOR',
                    indicator: 'SMA',
                    params: [{ name: 'period', value: genome.maShort }],
                    operator: '>',
                    comparisonType: 'INDICATOR',
                    comparisonValue: 'SMA(' + genome.maLong + ')'
                }
            ]
        };

        const strategy: UserStrategy = {
            id: 'temp_genome',
            name: 'Evolution Genome',
            description: 'Darwin Engine Generated',
            market: 'KR',
            rules: {} as any,
            logic_v2: logic,
            is_active: false
        } as any;

        // 3. Run Engine
        const result = await runBacktest(strategy, 'KR', bars);

        // 4. Map Result
        const logs: any[] = [];
        const engineTrades = (result as any).trades || [];

        engineTrades.forEach((t: any) => {
            logs.push({
                date: t.entryDate,
                action: 'BUY',
                price: t.entryPrice,
                reason: 'Strategy Entry',
                profit: null
            });
            if (t.exitDate) {
                logs.push({
                    date: t.exitDate,
                    action: 'SELL',
                    price: t.exitPrice,
                    reason: 'Strategy Exit',
                    profit: t.profitPercent
                });
            }
        });

        logs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // 5. Benchmark Calculation
        const startPrice = bars[0]?.c || 1;
        const endPrice = bars[bars.length - 1]?.c || 1;
        const benchmarkReturn = ((endPrice - startPrice) / startPrice) * 100;

        // Use totalReturn if available, otherwise cagr (check your engine types, assuming totalReturn is safer for Alpha)
        const strategyReturn = (result as any).totalReturn ?? result.cagr;
        const alpha = strategyReturn - benchmarkReturn;

        return {
            finalReturn: strategyReturn,
            benchmarkReturn: benchmarkReturn,
            alpha: alpha,
            winRate: result.winRate,
            mdd: result.maxDrawdown,
            trades: result.totalTrades,
            logs: logs,
            insight: "" // Placeholder, filled in runSimulation
        };
    },

    async generateInsight(report: any, genome: StrategyGenome, benchmarkReturn: number = 0, alpha: number = 0): Promise<string> {
        const prompt = `
        You are a Quant Strategy Auditor. Analyze this backtest result for a trading strategy.

        [Strategy Genome]
        MA Short: ${genome.maShort}, MA Long: ${genome.maLong}
        RSI Buy: ${genome.rsiBuy}, RSI Sell: ${genome.rsiSell}

        [Performance]
        Total Return: ${report.finalReturn.toFixed(2)}%
        Benchmark (Buy & Hold) Return: ${benchmarkReturn.toFixed(2)}%
        Alpha (Excess Return): ${alpha.toFixed(2)}%
        Win Rate: ${report.winRate.toFixed(1)}%
        MDD: ${report.mdd.toFixed(1)}%
        Trades: ${report.trades}

        [Task]
        1. Assign a Tier Grade (S, A, B, C, F) based on Alpha and MDD.
           - S: Alpha > 20% && MDD < 15% (Exceptional)
           - A: Alpha > 10% (Strong)
           - B: Positive Alpha (Good)
           - C: Negative Alpha but positive return (Mediocre)
           - F: Negative Return (Failed)
        2. Explain WHY it performed this way (e.g., "High win rate but low alpha suggests missed big trends").
        3. Suggest 1 specific parameter tweak to improve Alpha.

        [Format]
        **Grade: <TIER>** (<One Word Summary>)
        **Analysis:** <Concise explanation>
        **Suggestion:** <Specific Tweak>
        `;

        try {
            return await callGemini(prompt);
        } catch (e) {
            return "AI 분석 서비스 연결 실패";
        }
    },

    async saveEvolvedStrategy(genome: StrategyGenome, performance: any, name: string) {
        if (!supabase) return;

        await supabase.from('strategies').insert({
            name: name,
            description: `Darwin Engine Evolved Strategy (Return: ${performance.return?.toFixed(1)}%)`,
            market: 'KR', // Default
            genome: genome, // Save DNA
            performance_metrics: performance,
            is_active: false // Saved as candidate
        } as any);
    }
};
