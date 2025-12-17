
import { telegramIntelligenceService } from './services/TelegramIntelligenceService';
import { autoPilotService } from './services/AutoPilotService';

// Mock Data: A Real high-impact news event simulation
const MOCK_NEWS = {
    id: 99999,
    channel: 'Tier1_Disclosure_Bot',
    message: '[Breaking] Samsung Electronics (005930) announces surprise 10 Trillion KRW Share Buyback Program. "Strong commitment to shareholder value".'
};

async function proofOfIntelligence() {
    console.log("🕵️ [Proof of Concept] Initiating Intelligence Analysis Demonstration...");
    console.log("----------------------------------------------------------------");
    console.log(`📨 Incoming Mock Message: "${MOCK_NEWS.message}"`);
    console.log("----------------------------------------------------------------");

    // 1. Attach a Spy Handler to capture the AI's thought process
    telegramIntelligenceService.setSignalHandler(async (insight, source) => {
        console.log("\n✅ AI ANALYSIS COMPLETE. Proof of Intelligence Captured:");
        console.log("----------------------------------------------------------------");
        console.log(JSON.stringify(insight, null, 2));
        console.log("----------------------------------------------------------------");

        if (insight.sentiment === 'BULLISH' && insight.urgency === 'HIGH') {
            console.log("🎯 CONCLUSION: System correctly identified High-Urgency Bullish News.");
        } else {
            console.log("⚠️ CONCLUSION: System analysis differed from expectation.");
        }
    });

    // 2. Force-feed the message into the private handler (Simulating Realtime Event)
    // accessing private method via casting to any
    try {
        await (telegramIntelligenceService as any).handleNewMessage(MOCK_NEWS);
    } catch (error) {
        console.error("Test failed:", error);
    }
}

proofOfIntelligence();
