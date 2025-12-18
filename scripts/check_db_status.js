
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) process.exit(1);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkData() {
    console.log('🔍 Checking Database Status...');

    const { count: portfolioCount, error: pError } = await supabase
        .from('ai_trader_portfolios')
        .select('*', { count: 'exact', head: true });

    const { count: journalCount, error: jError } = await supabase
        .from('ai_trade_journals')
        .select('*', { count: 'exact', head: true });

    const { count: signalCount, error: sError } = await supabase
        .from('realtime_signals')
        .select('*', { count: 'exact', head: true });

    console.log(`Portfolios: ${portfolioCount} (Error: ${pError?.message})`);
    console.log(`Trade Journals: ${journalCount} (Error: ${jError?.message})`);
    console.log(`Realtime Signals: ${signalCount} (Error: ${sError?.message})`);
}

checkData();
