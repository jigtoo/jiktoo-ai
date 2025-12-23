
import fs from 'fs';
import path from 'path';

// 1. Load .env manually FIRST
try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf-8');
        envConfig.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                const trimmedKey = key.trim();
                const trimmedValue = value.trim();
                process.env[trimmedKey] = trimmedValue;

                // Polyfill for VITE_ prefix issue in config.ts
                if (trimmedKey.startsWith('VITE_')) {
                    const noPrefix = trimmedKey.replace('VITE_', '');
                    process.env[noPrefix] = trimmedValue;
                }
            }
        });
        console.log("Loaded .env file");
    }
} catch (e) {
    console.warn("Could not load .env file", e);
}

// 2. Dynamic Import AFTER Env is loaded
async function test() {
    console.log("Importing services...");
    // Use dynamic imports to ensure env is ready before modules load
    const screenerService = await import('./services/gemini/screenerService');
    const { runChartPatternScreener, runStructuralGrowthScan } = screenerService;

    console.log("Starting Screener Test...");
    try {
        console.log("1. Testing Chart Pattern Screener (KR)...");
        const chartResults = await runChartPatternScreener('KR', 'Daily');
        console.log("Chart Results Count:", chartResults.length);
        if (chartResults.length > 0) {
            console.log("Sample Result:", JSON.stringify(chartResults[0], null, 2));
            if (!chartResults[0].stockName || chartResults[0].stockName === "Unknown") {
                console.error("FAILURE: stockName is missing or Unknown!");
            } else {
                console.log("SUCCESS: stockName found:", chartResults[0].stockName);
            }
        } else {
            console.warn("No results returned for Chart Pattern.");
        }

        console.log("\n2. Testing Value Pivot Screener (KR)...");
        const valueResults = await runStructuralGrowthScan('KR');
        console.log("Value Results Count:", valueResults.length);
        if (valueResults.length > 0) {
            console.log("Sample Result:", JSON.stringify(valueResults[0], null, 2));
            if (!valueResults[0].stockName || valueResults[0].stockName === "Unknown") {
                console.error("FAILURE: stockName is missing or Unknown!");
            } else {
                console.log("SUCCESS: stockName found:", valueResults[0].stockName);
            }
        } else {
            console.warn("No results returned for Value Pivot.");
        }

    } catch (e) {
        console.error("Test Failed:", e);
        if (e instanceof Error) {
            console.error("Stack:", e.stack);
        }
    }
}

test();
