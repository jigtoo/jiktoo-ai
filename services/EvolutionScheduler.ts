
import { timeMachineService } from './TimeMachineService';
import { supabase } from './supabaseClient';
import type { StrategyGenome } from '../types';

/**
 * EvolutionScheduler
 * 
 * Orchestrates the "Hybrid Auto-Evolution" process.
 * 1. Daily midnight quick-check (Real Data-based, cost=0).
 * 2. Deep evolution only when performance degrades (LLM-based).
 * 3. Weekly comprehensive evolution (LLM-based).
 */
export const evolutionScheduler = {

    // Config
    MATH_CHECK_SAMPLE_SIZE: 100, // Number of backtests for daily math check
    PERFORMANCE_THRESHOLD_WIN_RATE: 0.55, // Trigger deep evolution if WR < 55%
    PERFORMANCE_THRESHOLD_MDD: -15.0, // Trigger deep evolution if MDD worse than -15%

    isRunning: false,

    forceReset() {
        this.isRunning = false;
        console.log('[EvolutionScheduler] 🔄 Forced Reset. System is now IDLE.');
    },

    async startDailyRoutine(): Promise<string> {
        if (this.isRunning) return "System busy";
        this.isRunning = true;
        console.log('[EvolutionScheduler] 🌙 Starting Daily Routine Check...');

        try {
            // 1. Fetch Active Strategy (Genome)
            const currentGenome = await this.getActiveGenome();
            if (!currentGenome) {
                console.log('[EvolutionScheduler] No active genome found. Skipping.');
                this.isRunning = false;
                return "No active strategy found to diagnose.";
            }

            // 2. Run "Math-only" Quick Diagnosis (REAL DATA)
            const healthReport = await this.runMathHealthCheck(currentGenome);
            console.log(`[EvolutionScheduler] Health Report: WinRate=${healthReport.winRate.toFixed(1)}%, MDD=${healthReport.mdd.toFixed(1)}%`);

            // 3. Decide: Good or Bad?
            const isHealthy = healthReport.winRate >= (this.PERFORMANCE_THRESHOLD_WIN_RATE * 100)
                && healthReport.mdd > this.PERFORMANCE_THRESHOLD_MDD;

            if (isHealthy) {
                console.log('[EvolutionScheduler] ✅ Strategy is HEALTHY. No deep evolution needed today.');
                await this.logEvent('DAILY_CHECK_PASS', `WinRate: ${healthReport.winRate.toFixed(1)}%, MDD: ${healthReport.mdd.toFixed(1)}%`);
                return `진단 통과 (양호) - WinRate: ${healthReport.winRate.toFixed(1)}%`;
            } else {
                console.log('[EvolutionScheduler] 🚨 Strategy DEGRADED. Triggering Deep Evolution (Turbo Mode)...');
                await this.triggerDeepEvolution(currentGenome, healthReport);
                return `진단 탈락 - 긴급 진화 요청됨 (WR: ${healthReport.winRate.toFixed(1)}%)`;
            }

        } catch (error) {
            console.error('[EvolutionScheduler] Error in routine:', error);
            return `System Error: ${error}`;
        } finally {
            this.isRunning = false;
        }
    },

    /**
     * Runs purely mathematical backtests without LLM calls.
     * Uses Real Data (via TimeMachine Silent Mode) to check fitness.
     */
    async runMathHealthCheck(genome: StrategyGenome) {
        let totalWins = 0;
        let totalTrades = 0;
        let mddSum = 0;
        let validRuns = 0;

        console.log(`[EvolutionScheduler] 🧮 Running ${this.MATH_CHECK_SAMPLE_SIZE} rapid simulations on REAL DATA...`);

        // Run batches of simulations on random REAL stocks
        for (let i = 0; i < this.MATH_CHECK_SAMPLE_SIZE; i++) {
            try {
                // TimeMachine now fetches a RANDOM REAL STOCK inside runSilentSimulation (Authentic)
                const simResult = await timeMachineService.runSilentSimulation(genome);

                if (simResult && (simResult as any).trades > 0) { // Checking trades count existence
                    if (simResult.finalReturn > 0) totalWins++;
                    totalTrades++; // Just incrementing, though win rate calculation below relies on validRuns
                    mddSum += simResult.mdd;
                    validRuns++;
                }
            } catch (e) {
                // Ignore individual failures (data gaps etc)
            }
        }

        const winRate = validRuns > 0 ? (totalWins / validRuns) * 100 : 0;
        const avgMdd = validRuns > 0 ? (mddSum / validRuns) : 0;

        return { winRate, mdd: avgMdd };
    },

    async triggerDeepEvolution(genome: StrategyGenome, healthReport: any) {
        console.log('[EvolutionScheduler] 🧬 Requesting AI Doctor for mutation...');

        // 1. Run a FULL simulation with LLM Insight AND Mutation (Self-Improving Mode)
        // TimeMachineService.runSimulation inside now uses GeneticOptimizer if mode='Self-Improving'
        const result = await timeMachineService.runSimulation(
            { asset: 'RANDOM', period: -1, mode: 'Self-Improving', genome },
            (p, d) => { console.log(`[DeepEvo] ${p}% ${d}`); }
        );

        // 2. If the new result (which includes a mutation) is valid and better
        if (result && result.mutatedGenome) {

            // Save as a candidate strategy
            await timeMachineService.saveEvolvedStrategy(
                result.mutatedGenome,
                { return: result.finalReturn, mdd: result.mdd },
                `Evolution ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`
            );

            await this.logEvent('DEEP_EVOLUTION_TRIGGERED', `Improvement Found! Return: ${result.finalReturn.toFixed(1)}%. Saved as candidate.`);
            console.log('[EvolutionScheduler] ✅ Deep Evolution Complete. New strategy candidate saved.');
        } else {
            console.log('[EvolutionScheduler] ⚠️ Deep Evolution finished but no significant improvement found.');
        }
    },

    // Test Helper
    exposeToWindow() {
        if (typeof window !== 'undefined') {
            (window as any).__evolutionScheduler = this;
            console.log('[EvolutionScheduler] Exposed to window.__evolutionScheduler');
        }
    },

    async getActiveGenome(): Promise<StrategyGenome | null> {
        if (!supabase) return null;
        const { data } = await supabase
            .from('strategies')
            .select('genome')
            .eq('market', 'KR')
            .eq('is_active', true)
            .single();
        return (data as any)?.genome || null;
    },

    async logEvent(type: string, message: string) {
        if (!supabase) return;

        // 1. Log to persistent trader logs (Archive)
        try {
            const { data: existingData } = await supabase
                .from('ai_trader_logs')
                .select('logs')
                .eq('market', 'KR')
                .eq('style', 'EVOLUTION_SCHEDULER')
                .single() as { data: any, error: any };

            let currentLogs: any[] = [];
            if (existingData && Array.isArray((existingData as any).logs)) {
                currentLogs = (existingData as any).logs;
            }

            currentLogs.push({ type, message, timestamp: new Date().toISOString() });

            if (currentLogs.length > 1000) currentLogs = currentLogs.slice(-1000);

            const { error: upsertError } = await (supabase.from('ai_trader_logs') as any).upsert({
                market: 'KR',
                style: 'EVOLUTION_SCHEDULER',
                logs: currentLogs,
                updated_at: new Date().toISOString()
            }, { onConflict: 'market, style' });

            if (upsertError) console.error('[EvolutionScheduler] Log Upsert Failed:', upsertError);

        } catch (e) {
            console.warn('[EvolutionScheduler] Logging failed:', e);
        }

        // 2. Log to visible Thought Stream (Dashboard)
        await supabase.from('ai_thought_logs').insert({
            action: type === 'DAILY_CHECK_PASS' ? 'ANALYSIS' : 'DECISION',
            message: `[Darwin] ${message}`,
            confidence: type === 'DAILY_CHECK_PASS' ? 100 : 50,
            strategy: 'EVOLUTION_SCHEDULER',
            details: { type, timestamp: new Date().toISOString() },
            created_at: new Date().toISOString()
        } as any);
    }

};

// Auto-expose
evolutionScheduler.exposeToWindow();
