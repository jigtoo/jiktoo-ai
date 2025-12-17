
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hfvxhehemmekcbqpafvy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmdnhoZWhlbW1la2NicXBhZnZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMTQzNTUsImV4cCI6MjA3NDg5MDM1NX0.T6c1nfzQnGo18Eh725BE8pp6mOTrbyvpfEMxOaIPhWg';

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkStatus() {
    console.log('🔍 Checking shadow_trader_trades...');

    // Get count
    const { count, error } = await supabase
        .from('shadow_trader_trades')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('Error fetching count:', error);
    } else {
        console.log(`📊 Total Trades in DB: ${count}`);
    }

    // Fetch sample to see ID type
    const { data } = await supabase.from('shadow_trader_trades').select('id, ticker').limit(1);
    if (data && data.length > 0) {
        console.log('Sample Row:', data[0]);
    } else {
        console.log('No rows found (if count > 0, something is weird).');
    }
}

checkStatus();
