
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env from root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
    console.log('Starting Migration to Unified Account Model...');

    // 1. Delete all existing portfolios to clear bad state
    const { error: deleteError } = await supabase
        .from('ai_trader_portfolios')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (using neq id 0 as a hack to delete all if no where clause allowed, or just use empty filter)

    // Supabase delete requires a filter usually. 
    // Let's delete where market is in KR/US to be safe.
    const { error: deleteErrorKR } = await supabase.from('ai_trader_portfolios').delete().eq('market', 'KR');
    const { error: deleteErrorUS } = await supabase.from('ai_trader_portfolios').delete().eq('market', 'US');

    if (deleteErrorKR) console.error('Error deleting KR:', deleteErrorKR);
    if (deleteErrorUS) console.error('Error deleting US:', deleteErrorUS);

    console.log('Cleared existing portfolios.');

    // 2. Insert UNIFIED portfolios
    const initialCaptialKR = 50000000;
    const initialCaptialUS = 30000;

    const unifiedKR = {
        market: 'KR',
        style: 'unified',
        data: {
            cash: initialCaptialKR,
            totalAsset: initialCaptialKR,
            positions: [],
            tradeLogs: [],
            initialCapital: initialCaptialKR
        },
        updated_at: new Date().toISOString()
    };

    const unifiedUS = {
        market: 'US',
        style: 'unified',
        data: {
            cash: initialCaptialUS,
            totalAsset: initialCaptialUS,
            positions: [],
            tradeLogs: [],
            initialCapital: initialCaptialUS
        },
        updated_at: new Date().toISOString()
    };

    const { error: insertError } = await supabase
        .from('ai_trader_portfolios')
        .insert([unifiedKR, unifiedUS]);

    if (insertError) {
        console.error('Error inserting unified portfolios:', insertError);
    } else {
        console.log('Successfully injected Unified Portfolios for KR and US.');
    }

    console.log('Migration Complete.');
}

migrate();
