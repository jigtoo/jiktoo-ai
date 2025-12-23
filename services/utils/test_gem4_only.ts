
import 'dotenv/config';
process.env.GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

// import { gem4_TradeSetup } from '../gems/Gem4_TradeSetup';

async function main() {
    console.log("🚀 Testing Gem 4 Only...");
    const { gem4_TradeSetup } = await import('../gems/Gem4_TradeSetup');

    const tradeResult = await gem4_TradeSetup.generateSetup(
        "005930",
        "삼성전자",
        75000,
        "[Gem 3 Passed] High impact news confirmed.",
        ["Foreigner selling"]
    );

    console.log("Strategy:", tradeResult.strategy);
    console.log("Entry:", tradeResult.entryZone);

    if (tradeResult.entryZone.logic.includes('Fallback')) {
        console.error("❌ Gem 4 used Fallback logic! Test Failed.");
        process.exit(1);
    } else {
        console.log("✅ Gem 4 Passed");
    }
}

main().catch(err => {
    console.error("UNKNOWN ERROR:", err);
    process.exit(1);
});
