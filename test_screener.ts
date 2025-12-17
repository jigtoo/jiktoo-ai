
import { scanForGenomeMomentum } from './services/gemini/screenerService';

async function test() {
    console.log("Running Genome Screener Test...");
    try {
        const results = await scanForGenomeMomentum('KR');
        console.log("Results:", JSON.stringify(results, null, 2));
    } catch (error) {
        console.error("Test Failed:", error);
    }
}

test();
