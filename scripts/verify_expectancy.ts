
import { evolutionService } from '../services/EvolutionService';

// [Hell Week Scenario C: WinRate vs Expectancy]
// Goal: Verify AI prefers "Profitable Expectancy" over "Vanity WinRate".

async function runScenarioC() {
    console.log('🔥🔥 [Hell Week] Scenario C: WinRate vs Expectancy Check 🔥🔥');

    // Mock Trade Journals
    const mockJournals = [
        // Strategy A: SCALPER (High WinRate, Negative Expectancy)
        // 9 Wins of +1%, 1 Loss of -10%
        // E = (0.9 * 1) - (0.1 * 10) = -0.1
        ...Array(9).fill({ strategy_used: 'Eagle (Scalp)', pnl_percent: 1.0, created_at: new Date().toISOString() }),
        { strategy_used: 'Eagle (Scalp)', pnl_percent: -10.0, created_at: new Date().toISOString() },

        // Strategy B: TREND (Low WinRate, High Expectancy)
        // 4 Wins of +10%, 6 Losses of -2%
        // E = (0.4 * 10) - (0.6 * 2) = 4 - 1.2 = +2.8
        ...Array(4).fill({ strategy_used: 'Volume (Trend)', pnl_percent: 10.0, created_at: new Date().toISOString() }),
        ...Array(6).fill({ strategy_used: 'Volume (Trend)', pnl_percent: -2.0, created_at: new Date().toISOString() })
    ];

    console.log(`[Step 1] Injecting ${mockJournals.length} trades...`);
    console.log('   -> Strategy A (Eagle): 90% WinRate, but Big Loss. Expectancy = -0.1');
    console.log('   -> Strategy B (Volume): 40% WinRate, but Big Wins. Expectancy = +2.8');

    // Run Evolution with Mock Data
    await evolutionService.evolve(mockJournals);

    // Check Results
    const configA = evolutionService.getConfig('EAGLE_EYE');
    const configB = evolutionService.getConfig('VOLUME_SPIKE');

    console.log('\n[Step 2] Verifying Evolution Results...');

    // Check A (Should be Downgraded)
    // Default Allocation is 0.5. If downgraded, it should be same (min 0.5) OR minScore increased.
    // Default MinScore is 80. If downgraded, should be 85+.
    const isDowngradedA = configA.minScore > 80 || configA.allocationMultiplier < 0.5;
    if (configA.minScore > 80) {
        console.log(`✅ Strategy A (Eagle) Penalized: MinScore increased to ${configA.minScore}`);
    } else {
        console.error(`❌ Strategy A (Eagle) NOT Penalized. MinScore: ${configA.minScore}`);
    }

    // Check B (Should be Upgraded)
    // Default Allocation is 0.5. If upgraded, should be > 0.5.
    // Default MinScore is 85. If upgraded, should be < 85.
    const isUpgradedB = configB.allocationMultiplier > 0.5 || configB.minScore < 85;
    if (configB.allocationMultiplier > 0.5) {
        console.log(`✅ Strategy B (Volume) Promoted: Allocation increased to ${configB.allocationMultiplier}`);
    } else {
        console.error(`❌ Strategy B (Volume) NOT Promoted. Allocation: ${configB.allocationMultiplier}`);
    }
}

runScenarioC().catch(console.error);
