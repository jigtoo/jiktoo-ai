
import { marketRegimeService } from '../services/MarketRegimeService';
import type { MarketRegimeStatus } from '../services/MarketRegimeService';

// Mock types if needed, or rely on imports
// We will test the 'calculateRegime' method which is public.

async function verifyRegimeSystem() {
    console.log('===================================================');
    console.log('🧪 [Project Awakening] Verifying Regime Constitution');
    console.log('===================================================');

    // Test Case Definitions
    const scenarios = [
        {
            name: '[KR] IMF Crash (Panic)',
            target: 'KR',
            indexChange: -4.5,
            aiStatus: 'Market Crash / Panic Selling',
            expected: 'PANIC',
            expectedScore: [0, 14]
        },
        {
            name: '[KR] Bear Market (Downtrend)',
            target: 'KR',
            indexChange: -2.0,
            aiStatus: 'Confirmed Downtrend',
            expected: 'BEAR',
            expectedScore: [15, 29]
        },
        {
            name: '[US] Sideways (Choppy)',
            target: 'US',
            indexChange: 0.2,
            aiStatus: 'Neutral / Consolidation',
            expected: 'SIDEWAYS',
            expectedScore: [45, 54]
        },
        {
            name: '[US] Bull Market (Rally)',
            target: 'US',
            indexChange: 1.5,
            aiStatus: 'Uptrend / Accumulation',
            expected: 'BULL',
            expectedScore: [70, 84]
        },
        {
            name: '[US] Super Bull (FOMO)',
            target: 'US',
            indexChange: 3.5,
            aiStatus: 'Strong Mark Up / FOMO',
            expected: 'SUPER_BULL',
            expectedScore: [85, 100]
        },
        {
            name: '[Fail-Safe] Divergence (Tech Bear / AI Bull)',
            target: 'KR',
            indexChange: -1.0, // Tech Score ~20
            aiStatus: 'Strong Mark Up', // AI Score ~90
            expected: 'WEAK_BEAR', // Should be penalized severely
            note: 'Divergence Check'
        }
    ];

    let passed = 0;
    let failed = 0;

    for (const scenario of scenarios) {
        // Mock Inputs
        const deepHealth = {
            status: scenario.aiStatus,
            summary: 'Mock Summary',
            positiveFactors: ['Mock Factor'],
            negativeFactors: []
        };

        const marketIndex = {
            changeRate: scenario.indexChange
        };

        // Explicitly cast output to avoid TS issues if types aren't perfectly aligned in script
        const result = marketRegimeService.calculateRegime(
            scenario.target as 'KR' | 'US',
            deepHealth,
            marketIndex,
            null
        );

        // Verification
        let isPass = false;
        if (scenario.expectedScore) {
            isPass = result.regime === scenario.expected &&
                result.score >= scenario.expectedScore[0] &&
                result.score <= scenario.expectedScore[1];
        } else {
            isPass = result.regime === scenario.expected;
        }

        // Output
        if (isPass) {
            console.log(`✅ ${scenario.name}: ${result.regime} (Score: ${result.score})`);
            passed++;
        } else {
            console.error(`❌ ${scenario.name}: Expected ${scenario.expected} [${scenario.expectedScore?.join('-')}], Got ${result.regime} (Score: ${result.score})`);
            console.error(`   -> Detailed: Tech(${scenario.indexChange}%) + AI(${scenario.aiStatus})`);
            failed++;
        }
    }

    console.log('---------------------------------------------------');
    console.log(`📊 Result: ${passed} Passed, ${failed} Failed`);
    console.log('===================================================');

    if (failed > 0) process.exit(1);
}

verifyRegimeSystem().catch(err => {
    console.error('Fatal Error:', err);
    process.exit(1);
});
