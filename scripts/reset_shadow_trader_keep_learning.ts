
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

async function resetShadowTrader() {
    console.log('Starting Shadow Trader Factory Reset (Correcting All Tables)...');

    // 1. DELETE Internal Logs (ai_trader_logs)
    const { error: logDeleteError } = await supabase
        .from('ai_trader_logs')
        .delete()
        .neq('id', 0); // Hack to delete all

    if (logDeleteError) {
        // Fallback by market
        await supabase.from('ai_trader_logs').delete().eq('market', 'KR');
        await supabase.from('ai_trader_logs').delete().eq('market', 'US');
    }
    console.log('Cleared AI Trader Logs (ai_trader_logs).');

    // 2. DELETE Performance Record (shadow_trader_trades) - [FIX] Missed this before
    const { error: tradeRecordDeleteError } = await supabase
        .from('shadow_trader_trades')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

    if (tradeRecordDeleteError) {
        console.error('Error deleting shadow_trader_trades:', tradeRecordDeleteError);
    } else {
        console.log('Cleared History Records (shadow_trader_trades).');
    }


    // 3. DELETE Portfolios (Clean Cash & Holdings)
    const { error: portfolioDeleteError } = await supabase
        .from('ai_trader_portfolios')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

    if (portfolioDeleteError) {
        await supabase.from('ai_trader_portfolios').delete().eq('market', 'KR');
        await supabase.from('ai_trader_portfolios').delete().eq('market', 'US');
    }
    console.log('Cleared all Portfolios (ai_trader_portfolios).');

    // 4. Inject FRESH Unified Portfolios
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
        console.error('Error re-inserting unified portfolios:', insertError);
    } else {
        console.log('✅ Portfolios Reset to Default (KR: 50,000,000 KRW, US: $30,000).');
    }

    console.log('✅ AI Learning Data (ai_trade_journals) has been PRESERVED.');
    console.log('Factory Reset Complete.');
}

resetShadowTrader();
