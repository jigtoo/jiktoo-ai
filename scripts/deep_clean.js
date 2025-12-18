
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from parent/current directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://hfvxhehemmekcbqpafvy.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) {
    console.error('❌ Missing VITE_SUPABASE_ANON_KEY in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function cleanBadData() {
    console.log('🧹 Starting Deep Clean Operation...');

    const badTickers = ['없음', 'null', 'undefined', 'NaN', ''];

    // 1. Clean Playbooks
    console.log('1️⃣  Cleaning alpha_engine_playbooks...');
    const { error: err1 } = await supabase
        .from('alpha_engine_playbooks')
        .delete()
        .in('ticker', badTickers);

    if (err1) console.error('   ❌ Error:', err1.message);
    else console.log('   ✅ Cleaned.');

    // 2. Clean Watchlists (Harder, as it's JSON)
    // For now, let's just warn or delete purely bad rows if identifiers are bad.
    // Real JSON cleanup requires row-by-row processing, which is safer done in app logic or advanced SQL.

    console.log('2️⃣  Cleaning ai_trade_journals...');
    const { error: err2 } = await supabase
        .from('ai_trade_journals')
        .delete()
        .in('ticker', badTickers);

    if (err2) console.error('   ❌ Error:', err2.message);
    else console.log('   ✅ Cleaned.');

    console.log('✨ Cleanup Complete.');
}

cleanBadData();
