
import { virtualTradingService } from '../services/VirtualTradingService';
import { longTermPortfolioService } from '../services/LongTermPortfolioService';
import { marketRegimeService } from '../services/MarketRegimeService';
import { supabase } from '../services/supabaseClient';

/**
 * [Project Awakening] KPI Command Center
 * Monitors the "Darwinian Evolution" success metrics.
 * 
 * Target KPIs:
 * 1. Small-Cap Ratio: > 40% of Satellite Portfolio (Aggressive exploration)
 * 2. Scenario Diversity: At least 3 distinct strategies active (Evidence of evolution)
 * 3. Core-Satellite Balance: 70:30 (Wealth preservation)
 */
async function monitorKPI() {
    console.clear();
    console.log('========================================================');
    console.log('🦅 PROJECT AWS: COMMAND CENTER (KPI MONITOR)');
    console.log('========================================================');
    console.log(`[Time] ${new Date().toLocaleString()}`);

    // 1. Fetch Portfolio Data
    const account = virtualTradingService.getAccount();
    const totalEquity = account.totalAsset;
    const cash = account.cash;
    const investedAmount = totalEquity - cash;

    const satelliteBudget = longTermPortfolioService.getSatelliteBudget(totalEquity, investedAmount);
    // Assuming all current virtual positions are "Satellite" (AutoPilot managed)
    const satelliteExposure = investedAmount;

    // 2. Classify Positions (Small Cap vs Large Cap)
    // Mocking Market Cap data since we don't have a live DB for all tickers here yet.
    // Logic: If ticker is NOT a known Large Cap ETF/Stock, assume Small/Mid.
    const largeCapTickers = ['005930', '000660', '005380', '122630', '252670', 'TQQQ', 'SOXL']; // Samsung, SK Hynix, Hyundai, KODEX Leverage, Inverse, etc.

    let smallCapValue = 0;
    const strategyCounts: Record<string, number> = {};

    account.positions.forEach(p => {
        // Strategy Count
        const strat = p.strategy || 'UNKNOWN';
        strategyCounts[strat] = (strategyCounts[strat] || 0) + 1;

        // Small Cap Check
        const isLarge = largeCapTickers.includes(p.ticker) || p.stockName.includes('KODEX') || p.stockName.includes('TIGER');
        if (!isLarge) {
            smallCapValue += (p.currentPrice * p.quantity);
        }
    });

    const isInvested = satelliteExposure > 0;
    const smallCapRatio = isInvested ? (smallCapValue / satelliteExposure) * 100 : 0;

    // 3. Display Dashboard
    console.log('\n--- 📊 ASSET ALLOCATION (Core vs Satellite) ---');
    console.log(`Total Equity  : ${totalEquity.toLocaleString()} KRW`);
    console.log(`Cash Position : ${cash.toLocaleString()} KRW (${((cash / totalEquity) * 100).toFixed(1)}%)`);
    console.log(`Satellite Exp : ${satelliteExposure.toLocaleString()} KRW (${((satelliteExposure / totalEquity) * 100).toFixed(1)}%)`);
    console.log(`  -> Budget Remaining: ${satelliteBudget.toLocaleString()} KRW`);

    console.log('\n--- 🎯 KPI 1: PREDATORY INSTINCT (Small-Cap Ratio) ---');
    console.log(`Small-Cap Exp : ${smallCapValue.toLocaleString()} KRW`);
    console.log(`Current Ratio : ${smallCapRatio.toFixed(2)}%`);

    if (smallCapRatio >= 40.0) {
        console.log(`✅ STATUS: PASSED (Target > 40%) - "Hunting in the wild."`);
    } else if (investedAmount === 0) {
        console.log(`⚠️ STATUS: WAITING (No Positions)`);
    } else {
        console.log(`❌ STATUS: FAILED (Target > 40%) - "Too conservative. Eat more junk."`);
    }

    console.log('\n--- 🧬 KPI 2: EVOLUTIONARY DIVERSITY (Active Strategies) ---');
    const diverseCount = Object.keys(strategyCounts).length;
    Object.entries(strategyCounts).forEach(([strat, count]) => {
        console.log(`- ${strat}: ${count} positions`);
    });

    if (diverseCount >= 3) {
        console.log(`✅ STATUS: HEALTHY (Diversity Score: ${diverseCount})`);
    } else {
        console.log(`⚠️ STATUS: LOW DIVERSITY (Score: ${diverseCount}) - Needs more mutation.`);
    }

    console.log('\n--- 📡 MARKET SENSOR ---');
    const regime = await marketRegimeService.analyzeCurrentRegime('KR');
    console.log(`Current Regime: [ ${regime.regime} ] (Score: ${regime.score})`);
    console.log('========================================================');
}

// Run immediately
monitorKPI().catch(console.error);
