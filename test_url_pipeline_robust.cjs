
const fs = require('fs');
const path = require('path');

// 1. Load .env manually
const envPath = path.resolve(__dirname, '.env');
let env = {};
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim().replace(/"/g, '').replace(/'/g, '');
            env[key] = value;
        }
    });
}

const SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
const TARGET_URL = "http://spot.rassiro.com/rd/20251211/1000323";
const ORIGINAL_MSG = "[rassiro_channel] [리포트 브리핑]에스엠씨지, '유리용기는 시간을 들여야...' Not Rated - 키움증권";

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ Missing Supabase Config in .env");
    process.exit(1);
}

// Helper: Fetch URL content
async function fetchUrl(url) {
    try {
        console.log(`🌍 Fetching ${url}...`);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const text = await response.text();
        return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 1000);
    } catch (e) {
        console.warn("⚠️ Fetch Warning:", e.message);
        return "에스엠씨지(SMCG)에 대해 키움증권은 유리용기 산업의 특성상 시간을 들여야 가치가 드러난다고 평가했다...";
    }
}

// Helper: Post to Supabase REST
async function insertToSupabase(table, data) {
    try {
        const url = `${SUPABASE_URL}/rest/v1/${table}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(err);
        }
        console.log(`✅ Inserted into '${table}' successfully.`);
    } catch (e) {
        console.error(`❌ Insert Error (${table}):`, e.message);
    }
}

async function run() {
    console.log("🚀 Starting URL Test Pipeline...");

    // 1. Crawl
    const content = await fetchUrl(TARGET_URL);
    console.log(`📝 Crawled Content: ${content.substring(0, 50)}...`);

    const fullMessage = `${ORIGINAL_MSG}\n\n[Auto-Crawled Source]:\n${content}\n\nLink: ${TARGET_URL}`;

    // 2. Insert Message
    await insertToSupabase('telegram_messages', {
        channel: 'rassiro_channel',
        message: fullMessage,
        created_at: new Date().toISOString()
    });

    // 3. Insert Analysis (Simulating AI processing)
    console.log("🧠 Simulating AI Analysis...");
    const analysisDetails = {
        source_title: "[리포트] 에스엠씨지 (키움증권)",
        analysis_result: {
            sentiment: "NEUTRAL",
            urgency: "MEDIUM",
            confidenceScore: 85
        }
    };

    await insertToSupabase('ai_thought_logs', {
        action: 'ANALYSIS',
        strategy: 'CONTENT_ANALYSIS',
        ticker: 'SMCG',
        message: `[Intel] URL Analysis: 에스엠씨지(SMCG) Report -> NEUTRAL (Wait for valuation)`,
        confidence: 85,
        details: analysisDetails,
        created_at: new Date().toISOString()
    });

    console.log("🎉 Pipeline Simulation Complete. Check Dashboard!");
}

run();
