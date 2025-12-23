
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchLatestBriefing() {
    console.log('Fetching latest briefing...');

    const { data, error } = await supabase
        .from('user_intelligence_briefings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        console.error('Error fetching briefing:', error);
        return;
    }

    if (!data) {
        console.log('No briefings found.');
        return;
    }

    console.log('--- LATEST BRIEFING ---');
    console.log(`Title: ${data.title}`);
    console.log(`Content: ${data.content}`);
    console.log(`Related: ${data.related_tickers}`);
    console.log('-----------------------');
}

fetchLatestBriefing();
