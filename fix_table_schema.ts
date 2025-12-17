// fix_table_schema.ts
import { supabase } from './services/supabaseClient';

async function fixSchema() {
    console.log('🔧 Fixing table schema to match Collector...\n');

    if (!supabase) {
        console.error('❌ Supabase not available');
        return;
    }

    const sql = `
ALTER TABLE telegram_messages ADD COLUMN IF NOT EXISTS channel_id text;
ALTER TABLE telegram_messages ADD COLUMN IF NOT EXISTS message_id bigint;
ALTER TABLE telegram_messages ADD COLUMN IF NOT EXISTS sender_id bigint;
    `.trim();

    try {
        const { error } = await (supabase as any).rpc('exec_sql', { sql_string: sql });

        if (error) {
            console.error('❌ Failed:', error.message);
            console.log('💡 Please run the SQL manually in Supabase Dashboard');
        } else {
            console.log('✅ Schema updated! The Collector should now be able to save messages.');
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

fixSchema();
