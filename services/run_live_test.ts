import * as dotenv from 'dotenv';
dotenv.config();
console.log("DEBUG: API_KEY =", process.env.API_KEY ? "EXISTS" : "MISSING");
console.log("DEBUG: VITE_GEMINI_API_KEY =", process.env.VITE_GEMINI_API_KEY ? "EXISTS" : "MISSING");
import { autoPilotService } from './AutoPilotService';

async function runLiveTest() {
    console.log("KRW Starting Live Analysis Test (Shadow Trader V2.0)...");
    console.log("-----------------------------------------------------");

    // Start the service (triggers runCycle immediately)
    // This will:
    // 1. Check Market Time
    // 2. Analyze Market Regime
    // 3. Ask Strategy Commander
    // 4. Run Scanners (if needed)
    // 5. Monitor Positions
    await autoPilotService.start();

    console.log("-----------------------------------------------------");
    console.log("KRWWaiting for AI analysis to complete (15s)...");

    // Wait for 15 seconds to allow async operations to complete
    await new Promise(resolve => setTimeout(resolve, 15000));

    autoPilotService.stop();
    console.log("-----------------------------------------------------");
    console.log("KRWLive Analysis Complete. Check the logs above for AI decisions.");
}

runLiveTest();
