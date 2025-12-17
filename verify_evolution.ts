
import { evolutionService } from './services/EvolutionService';

async function verifyEvolution() {
    console.log('--- Starting Verification: Evolutionary Sniper Logic ---');

    // 1. Check Initial State
    const initialConfig = evolutionService.getSniperConfig();
    console.log(`1. Initial Bypass Threshold: ${initialConfig.bypassThreshold}`);

    if (initialConfig.bypassThreshold !== 95) {
        console.error('❌ Initial threshold is not 95 (Default).');
        return;
    }

    // 2. Simulate Bad Trades (Hasty decisions led to losses)
    // We create mock journals where 'INTEL_BYPASS' strategy lost money.
    const mockJournals = [
        { strategy_used: 'INTEL_BYPASS', pnl_percent: -5.0, ticker: 'TEST1' },
        { strategy_used: 'INTEL_BYPASS', pnl_percent: -12.0, ticker: 'TEST2' }, // Deep loss
        { strategy_used: 'INTEL_BYPASS', pnl_percent: -3.0, ticker: 'TEST3' },
        { strategy_used: 'EAGLE_EYE', pnl_percent: 10.0, ticker: 'GOOD1' } // Control group
    ];

    console.log('2. Injecting Mock Data: 3 Losses on INTEL_BYPASS trades (Avg Return < 0)');

    // 3. Evolve
    await evolutionService.evolve(mockJournals);

    // 4. Check Result
    const newConfig = evolutionService.getSniperConfig();
    console.log(`3. Post-Evolution Bypass Threshold: ${newConfig.bypassThreshold}`);

    if (newConfig.bypassThreshold > 95) {
        console.log('✅ PASS: Threshold increased to punish hasty losses.');
        console.log(`   (95 -> ${newConfig.bypassThreshold})`);
    } else {
        console.error('❌ FAIL: Threshold did not increase despite losses.');
    }
}

verifyEvolution();
