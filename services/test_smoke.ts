import { autoPilotService } from './AutoPilotService';

async function smokeTest() {
    console.log("?îç Initiating Smoke Test for Shadow Trader V2.0...");

    try {
        // 1. Check Initial Status
        const initialStatus = autoPilotService.getStatus();
        console.log("KRWService Initialized. Status:", initialStatus);

        // 2. Test Market Switching Logic (Accessing private method for test)
        console.log("Testing Market Switching...");
        // Using 'any' to access private method for testing purposes
        (autoPilotService as any).checkAndSwitchMarket();
        const afterSwitchStatus = autoPilotService.getStatus();
        console.log("KRWMarket Switching Logic Executed. Current Target:", afterSwitchStatus.marketTarget);

        // 3. Test Parameter Evolution (Accessing private method)
        console.log("Testing Parameter Evolution...");
        await (autoPilotService as any).evolveParameters();
        console.log("KRWParameter Evolution Logic Executed.");

        console.log("?éâ Smoke Test Passed! The engine is ready to run.");
    } catch (error) {
        console.error("?î• Smoke Test FAILED:", error);
        console.error(error);
        process.exit(1);
    }
}

smokeTest();
