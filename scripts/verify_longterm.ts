
import { longTermPortfolioService } from '../services/LongTermPortfolioService';

async function verifyLongTermModule() {
    console.log('🏛️ [Verification] Long-Term Porfolio Module (Core-Satellite)');

    // 1. Test Budget Calculation
    console.log('\n--- Test 1: Satellite Budget Calculation ---');

    // Case A: Room available
    const equityA = 100_000_000;
    const exposureA = 10_000_000; // 10%
    const budgetA = longTermPortfolioService.getSatelliteBudget(equityA, exposureA);
    const expectedA = 20_000_000; // Target 30% = 30M. Remaining = 20M.

    console.log(`Case A (Equity: 100M, Sat: 10M): Budget = ${budgetA / 1000000}M (Expected: 20M)`);
    if (budgetA === expectedA) console.log('✅ Passed');
    else console.error(`❌ Failed: Expected ${expectedA}, Got ${budgetA}`);

    // Case B: Overkill
    const exposureB = 35_000_000; // 35%
    const budgetB = longTermPortfolioService.getSatelliteBudget(equityA, exposureB);
    console.log(`Case B (Equity: 100M, Sat: 35M): Budget = ${budgetB} (Expected: 0)`);
    if (budgetB === 0) console.log('✅ Passed');
    else console.error(`❌ Failed: Expected 0, Got ${budgetB}`);

    // 2. Test Business Quality Filter
    console.log('\n--- Test 2: Business Quality Filter ---');
    const goodStock = { name: 'Samsung Electronics', roe: 15.0, debtRatio: 30.0 };
    const trashStock = { name: 'Penny Corp', roe: -5.0, debtRatio: 200.0 };

    const isGood = longTermPortfolioService.checkBusinessQuality(goodStock);
    const isTrash = longTermPortfolioService.checkBusinessQuality(trashStock);

    if (isGood && !isTrash) console.log('✅ Quality Filter Works');
    else console.error('❌ Quality Filter Logic Flawed');

    // 3. Test Rebalance Logic (Async)
    console.log('\n--- Test 3: Core Rebalancing ---');
    const advice = await longTermPortfolioService.rebalanceCorePortfolio(equityA);
    console.log('Advice:', advice);
    if (advice.action === 'REBALANCE' && advice.focus.length > 0) console.log('✅ Rebalance Logic Active');
    else console.error('❌ Rebalance Logic Failed');

}

verifyLongTermModule().catch(console.error);
