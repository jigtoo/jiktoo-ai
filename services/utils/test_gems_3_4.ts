
import 'dotenv/config';
process.env.GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

// import { gem3_RedTeam } from '../gems/Gem3_RedTeam';
// import { gem4_TradeSetup } from '../gems/Gem4_TradeSetup';

async function main() {
    console.log("🚀 Testing Gem 3 & 4...");
    const { gem3_RedTeam } = await import('../gems/Gem3_RedTeam');
    const { gem4_TradeSetup } = await import('../gems/Gem4_TradeSetup');

    const mockNews = "삼성전자, HBM3E 12단 최초 양산 시작. 엔비디아 공급 유력.";
    const mockValueChain = `{"sector":"Semiconductor","sentiment":"POSITIVE","description":"Direct benefit for Samsung Electronics supply chain."}`;

    // Test Gem 3
    console.log("\n[Gem 3] Testing Red Team Critique...");
    const redTeamResult = await gem3_RedTeam.critique(mockNews, mockValueChain);

    console.log("Verdict:", redTeamResult.finalVerdict);
    console.log("Risk Score:", redTeamResult.riskScore);
    console.log("Kill Factors:", redTeamResult.killFactors);

    if (redTeamResult.finalVerdict === 'ABORT' && redTeamResult.riskScore < 80) {
        console.warn("⚠️ Suspicious verdict/score mismatch");
    }

    // Test Gem 4
    console.log("\n[Gem 4] Testing Trade Setup...");
    const tradeResult = await gem4_TradeSetup.generateSetup(
        "005930",
        "삼성전자",
        75000,
        "[Gem 3 Passed] High impact news confirmed.",
        redTeamResult.killFactors
    );

    console.log("Strategy:", tradeResult.strategy);
    console.log("Entry:", tradeResult.entryZone);
    console.log("Target:", tradeResult.targetPrice);
    console.log("StopLoss:", tradeResult.stopLoss);

    if (tradeResult.entryZone.logic.includes('Fallback')) {
        console.error("❌ Gem 4 used Fallback logic! Test Failed.");
        process.exit(1);
    }

    if (tradeResult.strategy) {
        console.log("\n✅ Gems 3 & 4 Tests PASSED");
    } else {
        console.error("\n❌ Gem 4 Failed to produce strategy");
        process.exit(1);
    }
}

main().catch(err => {
    console.error("UNKNOWN ERROR:", err);
    process.exit(1);
});
