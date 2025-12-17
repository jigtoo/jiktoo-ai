
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hfvxhehemmekcbqpafvy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmdnhoZWhlbW1la2NicXBhZnZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMTQzNTUsImV4cCI6MjA3NDg5MDM1NX0.T6c1nfzQnGo18Eh725BE8pp6mOTrbyvpfEMxOaIPhWg';

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function resetSystem() {
    console.log('🔄 Starting System Data Reset...');

    try {
        // 1. Clear Shadow Trader Trades (Dashboard Stats)
        console.log('🗑️ Clearing shadow_trader_trades...');

        let deletedTradesCount = 0;
        while (true) {
            const { data: rows, error: fetchErr } = await supabase
                .from('shadow_trader_trades')
                .select('id')
                .limit(100);

            if (fetchErr) {
                console.error('Fetch error:', fetchErr.message);
                break;
            }
            if (!rows || rows.length === 0) break;

            const ids = rows.map(r => r.id);
            const { error: delErr } = await supabase.from('shadow_trader_trades').delete().in('id', ids);

            if (delErr) {
                console.error('Delete error:', delErr.message);
                break;
            }
            deletedTradesCount += ids.length;
            console.log(`Deleted ${ids.length} trades...`);
        }
        console.log(`✅ Total Trades Deleted: ${deletedTradesCount}`);


        // 2. Clear AI Trade Journals (Old English Logs)
        console.log('🗑️ Clearing ai_trade_journals...');

        let deletedJournalsCount = 0;
        while (true) {
            const { data: rows, error: fetchErr } = await supabase
                .from('ai_trade_journals')
                .select('id')
                .limit(100);

            if (fetchErr) {
                console.error('Fetch error:', fetchErr.message);
                break;
            }
            if (!rows || rows.length === 0) break;

            const ids = rows.map(r => r.id);
            const { error: delErr } = await supabase.from('ai_trade_journals').delete().in('id', ids);

            if (delErr) {
                console.error('Delete error:', delErr.message);
                break;
            }
            deletedJournalsCount += ids.length;
            console.log(`Deleted ${ids.length} journals...`);
        }
        console.log(`✅ Total Journals Deleted: ${deletedJournalsCount}`);


        // 3. Reset Portfolio Capital
        console.log('💰 Updating Portfolio Capital...');
        const { error: e3 } = await supabase.from('portfolios').delete().eq('owner', 'me');
        if (e3) {
            // If RLS prevents delete, try to just let it be, or assume it's already empty if no 'me' row
            console.error('Error clearing portfolio (might be permission):', e3.message);
        }
        else console.log('✅ Portfolio cleared.');

    } catch (err) {
        console.error('Unexpected error:', err);
    }

    console.log('🎉 Reset Complete. Please restart the application.');
}

resetSystem();
