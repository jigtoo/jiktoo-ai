
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

// Replicate config.ts logic roughly or just use direct values if known
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hfvxhehemmekcbqpafvy.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmdnhozQnGo18Eh725BE8pp6mOTrbyvpfEMxOaIPhWgb24iLCJpYXQiOjE3NTkzMTQzNTUsImV4cCI6MjA3NDg5MDM1NX0.T6c1nfz";

if (!SUPABASE_ANON_KEY.includes('eyJ')) {
    console.error("Invalid key provided in script placeholder?");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function debugQueries() {
    console.log("--- Debugging Frontend Queries ---");
    console.log(`URL: ${SUPABASE_URL}`);

    // 1. Telegram Messages
    console.log("\n1. Fetching telegram_messages...");
    try {
        const { data, error } = await supabase
            .from('telegram_messages')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) {
            console.error("❌ Error fetching telegram_messages:", error);
        } else {
            console.log(`✅ Success! Got ${data.length} messages.`);
            if (data.length > 0) console.log("Sample:", data[0]);
        }
    } catch (e) {
        console.error("❌ Exception:", e);
    }

    // 2. User Briefings
    console.log("\n2. Fetching user_intelligence_briefings...");
    try {
        const { data, error } = await supabase
            .from('user_intelligence_briefings')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) {
            console.error("❌ Error fetching user_intelligence_briefings:", error);
        } else {
            console.log(`✅ Success! Got ${data.length} briefings.`);
        }
    } catch (e) {
        console.error("❌ Exception:", e);
    }

    // 3. AI Thoughts
    console.log("\n3. Fetching ai_thought_logs...");
    try {
        const { data, error } = await supabase
            .from('ai_thought_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) {
            console.error("❌ Error fetching ai_thought_logs:", error);
        } else {
            console.log(`✅ Success! Got ${data.length} thoughts.`);
        }
    } catch (e) {
        console.error("❌ Exception:", e);
    }
}

debugQueries();
