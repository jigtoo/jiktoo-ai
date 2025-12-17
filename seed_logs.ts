
// seed_logs.ts
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function seedLogs() {
    console.log("Seeding Thought Logs...");

    // Check connection
    const { data: check, error: checkError } = await supabase.from('ai_thought_logs').select('count', { count: 'exact', head: true });

    if (checkError) {
        console.error("Error accessing table:", checkError);
        console.log("Likely table missing or RLS blocking.");
    } else {
        console.log("Table accessible. Row count:", check);
    }

    const { error } = await supabase.from('ai_thought_logs').insert([
        {
            action: 'ANALYSIS',
            message: 'System connectivity check completed.',
            confidence: 100,
            strategy: 'SYSTEM',
            details: { checked_at: new Date().toISOString() },
            created_at: new Date().toISOString()
        }
    ]);

    if (error) {
        console.error("Insert failed:", error);
    } else {
        console.log("Insert successful! Check the dashboard.");
    }
}

seedLogs();
