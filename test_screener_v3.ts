
import dotenv from 'dotenv';
import path from 'path';

// Load env before imports
const envPath = path.resolve(__dirname, '.env');
dotenv.config({ path: envPath });

// Fix VITE env vars for Node
Object.keys(process.env).forEach(key => {
    if (key.startsWith('VITE_')) {
        process.env[key] = process.env[key];
    }
});

// Mock Supabase Env if missing (Scan Logic Test doesn't need DB)
if (!process.env.VITE_SUPABASE_URL) {
    console.warn('⚠️ Supabase URL missing. Setting Mock ENV for testing.');
    process.env.VITE_SUPABASE_URL = 'https://mock-url.supabase.co';
    process.env.VITE_SUPABASE_ANON_KEY = 'mock-anon-key';
}

// Map VITE_ keys to Node keys for config.ts compatibility
process.env.SUPABASE_URL = process.env.VITE_SUPABASE_URL;
process.env.SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
process.env.GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY;

console.log('Environment Check:', {
    GEMINI_KEY: process.env.VITE_GEMINI_API_KEY ? 'Present' : 'Missing',
    SUPABASE_URL: process.env.VITE_SUPABASE_URL ? 'Present' : 'Missing'
});

async function testDataDrivenScanner() {
    console.log('🚀 Starting Data-Driven Scanner Test...');

    // Dynamic Import to preventing hoisting issues (Load modules AFTER env setup)
    const { scannerTools } = await import('./services/ScannerTools');
    // Type checking for candidates is handled by TS, but for runtime test we just construct objects

    // Mock Candidates (Simulating Real Data Injection)
    const mockCandidates: any[] = [
        {
            ticker: '005930',
            stockName: '삼성전자',
            currentPrice: 72000,
            recentCandles: Array(20).fill(0).map((_, i) => ({
                date: new Date(Date.now() - (20 - i) * 86400000).toISOString(),
                close: 70000 + i * 100, // Uptrend
                volume: 1000000
            }))
        },
        {
            ticker: '000660',
            stockName: 'SK하이닉스',
            currentPrice: 130000,
            recentCandles: Array(20).fill(0).map((_, i) => ({
                date: new Date(Date.now() - (20 - i) * 86400000).toISOString(),
                close: 130000 - i * 500, // Downtrend
                volume: 500000
            }))
        },
        {
            ticker: '086520',
            stockName: '에코프로',
            currentPrice: 600000,
            recentCandles: Array(20).fill(0).map((_, i) => ({
                date: new Date(Date.now() - (20 - i) * 86400000).toISOString(),
                close: 600000, // Flat
                volume: i > 15 ? 2000000 : 100000 // Volume Spike
            }))
        }
    ];

    console.log(`\n📋 Injecting ${mockCandidates.length} Candidates...`);

    try {
        console.log('\n--- Testing Power Play (Should pick Samsung/EcoPro) ---');
        const powerResults = await scannerTools.runPowerPlayScan('KR', mockCandidates);
        console.log('Result:', JSON.stringify(powerResults, null, 2));

        console.log('\n--- Testing Volume Spike (Should pick EcoPro) ---');
        const spikeResults = await scannerTools.runVolumeSpikeScanner('KR', mockCandidates);
        console.log('Result:', JSON.stringify(spikeResults, null, 2));

        console.log('\n✅ Test Complete');
    } catch (e) {
        console.error('❌ Test Failed:', e);
    }
}

testDataDrivenScanner();
