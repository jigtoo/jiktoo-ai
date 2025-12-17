
import { autoPilotService } from '../services/AutoPilotService';
import { marketRegimeService } from '../services/MarketRegimeService';
import { virtualTradingService } from '../services/VirtualTradingService';

// Mock dependencies (if needed, or we rely on 'mock' data injection into services)

async function runScenarioA() {
    console.log('🔥🔥 [Hell Week] Scenario A: Signal Conflict (Bear Regime vs Bull Signal) 🔥🔥');

    console.log('[Step 1] Forcing BEAR Regime...');
    // We can't easily force private state, but we can mock the analyzer response if we could.
    // Instead, let's look at how AutoPilotService determines regime.
    // It calls 'marketRegimeService.analyzeCurrentRegime'.
    // We can monkey-patch this method for the simulation.

    const originalAnalyze = marketRegimeService.analyzeCurrentRegime;
    marketRegimeService.analyzeCurrentRegime = async (target) => {
        return {
            regime: 'BEAR',
            score: 20,
            confidence: 80,
            factors: { macro: 'Recession', sentiment: 0, technical: 'Downtrend' },
            detailedFactors: { positive: [], negative: ['Bad Macro'], neutral: [] },
            dataQuality: 'good',
            recommendedExposure: 0.1,
            timestamp: Date.now(),
            lastUpdated: new Date().toISOString()
        };
    };

    console.log('[Step 2] Sending Strong BULL Signal (Non-Hedge)...');
    // Samsung Electronics (005930), Score 85 (Very High)
    const bullTrigger = {
        ticker: '005930',
        stockName: '삼성전자',
        type: 'VOLUME_SPIKE',
        score: 85,
        currentPrice: 70000,
        changeRate: 3.5,
        volume: 10000000,
        rvol: 2.5,
        volatility: 1.5,
        details: 'Strong Institutional Buying detected'
    };

    // Initialize AutoPilot (starts cycle but we will call executeSignal directly for precision)
    // autoPilotService.start(); // We don't want the loop, just the context.

    // Manually trigger the cycle's "Gather Context" step logic to set the regime in AutoPilot
    await (autoPilotService as any).runCycle();
    // Wait for async logs
    await new Promise(r => setTimeout(r, 1000));

    console.log('[Step 3] Executing Signal...');
    await autoPilotService.executeSignal(bullTrigger);

    // Verify Result
    const account = virtualTradingService.getAccount();
    const position = account.positions.find(p => p.ticker === '005930');

    if (!position) {
        console.log('✅ Scenario Result: Signal REJECTED or Not Executed (Correct for Bear Market).');
    } else {
        console.log(`⚠️ Scenario Result: Signal EXECUTED. Quantity: ${position.quantity}`);
        // Check rationale for penalty
        console.log('   Rationale:', position.rationale);

        // If executed, did it apply penalty? 
        // Original 85 - 20 (Winter) = 65. 
        // 65 > 60 (Required). So it MIGHT execute but with small size?
        // But Regime is BEAR. Strategy might be DAY.
    }

    // Restore
    marketRegimeService.analyzeCurrentRegime = originalAnalyze;
}

runScenarioA().catch(console.error);
