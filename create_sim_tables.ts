
import { supabase } from './services/supabaseClient';

async function createSimTables() {
    console.log('🔧 Creating Simulation Tables in Supabase...\n');

    if (!supabase) {
        console.error('❌ Supabase client not available');
        return;
    }

    const sql = `
    -- 시뮬레이션 결과 테이블
    CREATE TABLE IF NOT EXISTS public.sim_results (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        mode TEXT NOT NULL CHECK (mode IN ('T', 'M', 'X')),
        asset TEXT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        final_return NUMERIC,
        mdd NUMERIC,
        win_rate NUMERIC,
        config JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    -- 시뮬레이션 로그 테이블
    CREATE TABLE IF NOT EXISTS public.sim_logs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        sim_id UUID REFERENCES public.sim_results(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        action TEXT CHECK (action IN ('BUY', 'SELL', 'HOLD', 'NONE')),
        price NUMERIC,
        reason TEXT,
        profit_loss NUMERIC,
        is_win BOOLEAN,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    -- RLS policies (Ensure 'exec_sql' RPC exists or this policy part might fail if run via standard SQL editor, 
    -- but here we rely on the RPC 'exec_sql' if available, otherwise just standard query if permissions allow)
    
    -- NOTE: Typically DDL execution via client requires a specific RPC or Service Role.
    -- We will attempt to run it via the 'exec_sql' RPC which is commonly set up in Jiktoo projects.
    `;

    try {
        console.log('Sending SQL to Supabase...');

        // Try calling the 'exec_sql' RPC which is usually present for admin tasks
        const { data, error } = await (supabase as any).rpc('exec_sql', { sql_string: sql }); // sql_string matches common signature

        // Alternatively, if exec_sql expects 'query'
        // const { data, error } = await (supabase as any).rpc('exec_sql', { query: sql });

        if (error) {
            console.error('❌ RPC Failed:', error.message);
            console.error('   Hint: If proper RPC is missing, please run the SQL manually in Supabase Dashboard.');
            console.log('\nSQL:\n', sql);
        } else {
            console.log('✅ Simulation Tables Created Successfully!');
        }

    } catch (e) {
        console.error('❌ Unexpected Error:', e);
    }
}

createSimTables();
