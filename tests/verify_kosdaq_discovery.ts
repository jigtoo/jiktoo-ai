import * as dotenv from 'dotenv';
dotenv.config();

import { runChartPatternScreener, scanForSupplyEagle } from '../services/gemini/screenerService';
import { MarketTarget } from '../types';

async function verify() {
    console.log("=== KOSDAQ Discovery Verification ===");
    const market: MarketTarget = 'KR';

    try {
        console.log("\n1. Testing Chart Pattern Screener (Discovery phase)...");
        const chartPatterns = await runChartPatternScreener(market, 'Daily');
        const chartTickers = chartPatterns.map(p => p.symbol);
        console.log("Discovered Tickers:", chartTickers);

        const kosdaqInChart = chartTickers.filter(t => !t.startsWith('0') && !t.startsWith('1') && !t.startsWith('2')); // Simple check, or better:
        // KOSDAQ tickers are usually 6 digits just like KOSPI, but let's check if we can identify them.
        // Actually, without a full DB, we just look at the names/tickers.
        console.log(`Found ${chartTickers.length} stocks.`);

        console.log("\n2. Testing Supply Eagle Scan...");
        const supplyEagles = await scanForSupplyEagle(market);
        console.log("Supply Eagles:", supplyEagles.map(s => `${s.stockName} (${s.ticker})`));

        console.log("\nVerification Complete.");
    } catch (e) {
        console.error("Verification failed:", e);
    }
}

verify();
