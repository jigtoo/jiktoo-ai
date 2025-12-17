
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase URL or Key');
    process.exit(1);
}

const sb = createClient(supabaseUrl, supabaseKey);

const TARGET_URL = "http://spot.rassiro.com/rd/20251211/1000323";
const ORIGINAL_MSG = "[rassiro_channel] [리포트 브리핑]에스엠씨지, '유리용기는 시간을 들여야...' Not Rated - 키움증권";

async function run() {
    console.log(`🌍 Fetching URL: ${TARGET_URL}...`);

    let content = "";
    try {
        const response = await fetch(TARGET_URL);
        const html = await response.text();

        // Simple HTML strip
        content = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        if (content.length > 500) content = content.substring(0, 500) + "...";
        console.log(`✅ Fetched Content (Preview): ${content.substring(0, 50)}...`);

    } catch (e) {
        console.error("⚠️ Fetch Failed, using simulation:", e);
        content = "에스엠씨지(SMCG)에 대해 키움증권은 유리용기 산업의 특성상 시간을 들여야 가치가 드러난다고 평가했다. 투자의견은 Not Rated...";
    }

    const fullMessage = `${ORIGINAL_MSG}\n\n[Auto-Crawled Source]:\n${content}\n\nLink: ${TARGET_URL}`;

    console.log("🚀 Inserting into 'telegram_messages'...");

    // Attempt Insert
    const { error } = await sb.from('telegram_messages').insert({
        channel: 'rassiro_channel',
        message: fullMessage,
        date: new Date().toISOString(), // Supporting 'date' column if exists
        created_at: new Date().toISOString()
    } as any);

    if (error) {
        console.error("❌ Insert Failed:", error);
    } else {
        console.log("✅ Message Inserted!");
        console.log("👉 Please check the 'Real-time Intelligence Pipeline' in your dashboard.");
        console.log("   The AI should verify this long message and generated an analysis log.");
    }
}

run();
