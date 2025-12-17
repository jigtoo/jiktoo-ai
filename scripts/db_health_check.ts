
import { supabase } from '../services/supabaseClient';

async function checkSupabaseHealth() {
    console.log('🏥 [Supabase Health Check] Starting diagnosis...');

    if (!supabase) {
        console.error('❌ Supabase client is not initialized. Check .env variables.');
        return;
    }

    const tablesToCheck = [
        'ai_thought_logs',
        'ai_trade_journals',
        'alpha_engine_playbooks',
        'user_watchlists' // inferred from rpc usage
    ];

    const rpcsToCheck = [
        'rpc_get_user_watchlist',
        'rpc_upsert_user_watchlist'
    ];

    console.log('\n--- 1. Checking Tables (Existence & RLS) ---');
    for (const table of tablesToCheck) {
        // Try a simple select limit 1
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.error(`❌ Table '${table}': ERROR - ${error.message} (${error.code})`);
            console.error(`   -> This is likely causing the alerts.`);
        } else {
            console.log(`✅ Table '${table}': OK`);
        }
    }

    console.log('\n--- 2. Checking RPC Functions ---');
    for (const rpc of rpcsToCheck) {
        // RPCs need arguments usually, but we can try with dummy args or check if it throws "function not found"
        // We generally can't just 'check' existence easily without calling.
        // We'll try calling with null/empty args and see if the error is "function not found" vs "invalid args".
        const { error } = await supabase.rpc(rpc, { p_market: 'KR', p_items: [] });

        if (error) {
            if (error.code === '42883') { // undefined_function
                console.error(`❌ RPC '${rpc}': MISSING (Error 42883)`);
            } else {
                console.log(`⚠️ RPC '${rpc}': Found but errored (likely logic/args): ${error.message}`);
            }
        } else {
            console.log(`✅ RPC '${rpc}': OK ( Callable )`);
        }
    }

    console.log('\nDiagnosis Complete.');
}

checkSupabaseHealth().catch(console.error);
