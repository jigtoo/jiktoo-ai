
import fetch from 'node-fetch';

async function testProxy() {
    console.log('🔍 Starting Exhaustive Probe...');

    // 1. Test KIS Proxy for NYSE vs NASDAQ
    const tests = [
        { ticker: 'AAPL', market: 'US', msg: 'NASDAQ Default' },
        { ticker: 'NYCB', market: 'US', msg: 'NYSE Default (Failing?)' },
        { ticker: 'NYCB', market: 'NYS', msg: 'NYSE Explicit Market' }, // Try market=NYS
        { ticker: 'NYCB', market: 'US&excd=NYS', msg: 'US + excd param' }, // Try injection
        { ticker: 'FLG', market: 'US', msg: 'FLG (New Ticker?)' }
    ];

    console.log('\n--- KIS Proxy Tests ---');
    for (const t of tests) {
        const url = `http://127.0.0.1:8080/rt-snapshot?ticker=${t.ticker}&market=${t.market}&fields=quote`;
        try {
            const res = await fetch(url);
            const text = await res.text();
            console.log(`[${t.msg}] ${url} -> ${res.status}`);
            if (res.status !== 200) console.log(`   Error Body: ${text.substring(0, 100)}`);
            else console.log(`   Success: ${text.substring(0, 60)}...`);
        } catch (e) {
            console.log(`[${t.msg}] Failed: ${e.message}`);
        }
    }

    // 2. Test API Gateway for SMCI (500 Error)
    console.log('\n--- API Gateway Tests ---');
    // Using the URL from the user log
    const gatewayUrl = "https://hfvxhehemmekcbqpafvy.supabase.co/functions/v1/api-gateway?service=polygon&endpoint=%2Fv2%2Faggs%2Fticker%2FSMCI%2Frange%2F1%2Fday%2F2025-11-19%2F2025-12-19%3Fadjusted%3Dtrue%26sort%3Ddesc%26limit%3D20";

    // Check if we need a key? usually gateway handles it. 
    // The previous log showed 500, so it reached the server.
    try {
        const res = await fetch(gatewayUrl);
        const text = await res.text();
        console.log(`[SMCI Gateway] Status: ${res.status}`);
        console.log(`[SMCI Gateway] Body: ${text.substring(0, 300)}`);
    } catch (e) {
        console.log(`[SMCI Gateway] Fetch Error: ${e.message}`);
    }
}

testProxy();
