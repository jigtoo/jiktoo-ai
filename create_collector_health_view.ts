// create_collector_health_view.ts
// Execute SQL to create the collector_health view that the app needs

import { supabase } from './services/supabaseClient';
import * as fs from 'fs';
import * as path from 'path';

async function createView() {
    console.log('🔧 Creating collector_health view...\n');

    if (!supabase) {
        console.error('❌ Supabase not available');
        return;
    }

    const sql = `
CREATE OR REPLACE VIEW collector_health AS
SELECT 
    MAX(date) as last_ingested_at,
    EXTRACT(EPOCH FROM (NOW() - MAX(date)))/60 as minutes_since_last,
    COUNT(*) as total_messages
FROM telegram_messages;
    `.trim();

    try {
        // Execute the SQL directly
        const { data, error } = await (supabase as any).rpc('exec_sql', { sql_string: sql });

        if (error) {
            console.error('❌ Failed to create view:', error.message);
            console.log('\n💡 You need to run this SQL manually in Supabase SQL Editor:');
            console.log('━'.repeat(60));
            console.log(sql);
            console.log('━'.repeat(60));
        } else {
            console.log('✅ View created successfully!');
        }

        // Test the view
        console.log('\n🧪 Testing view...');
        const { data: viewData, error: viewError } = await supabase
            .from('collector_health')
            .select('*')
            .single();

        if (viewError) {
            console.error('❌ View test failed:', viewError.message);
        } else {
            console.log('✅ View works!');
            console.log('   Data:', viewData);
        }

    } catch (error) {
        console.error('Error:', error);
    }

    process.exit(0);
}

createView();
