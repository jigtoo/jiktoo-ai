
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hfvxhehemmekcbqpafvy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmdnhoZWhlbW1la2NicXBhZnZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMTQzNTUsImV4cCI6MjA3NDg5MDM1NX0.T6c1nfzQnGo18Eh725BE8pp6mOTrbyvpfEMxOaIPhWg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifyAndSeed() {
    console.log('Verifying "strategies" table...');
    try {
        // 1. Check if we can read
        const { data, error } = await supabase.from('strategies').select('*').limit(1);

        if (error) {
            console.error('❌ Error accessing "strategies" table:', error.message);
            console.log('HINT: The table might not exist. Please run the migration SQL.');
            return;
        }

        console.log('✅ "strategies" table exists. Count:', data.length);

        // 2. Check if we have an active strategy for KR
        const { data: activeKR, error: err2 } = await supabase
            .from('strategies')
            .select('*')
            .eq('market', 'KR')
            .eq('is_active', true);

        if (activeKR && activeKR.length > 0) {
            console.log('✅ Active KR Strategy found:', activeKR[0].name);
        } else {
            console.log('⚠️ No active KR Strategy found. Seeding default...');

            const defaultGenome = {
                maShort: 20, maLong: 60, rsiPeriod: 14, rsiBuy: 30, rsiSell: 70,
                bbPeriod: 20, bbDev: 2, stochK: 14, stochD: 3, stopLoss: 0.05, takeProfit: 0.10
            };

            const { error: seedErr } = await supabase.from('strategies').insert({
                name: 'Alpha Zero (Default)',
                market: 'KR',
                genome: defaultGenome,
                performance_metrics: { return: 0, mdd: 0 },
                is_active: true
            });

            if (seedErr) {
                console.error('❌ Failed to seed default strategy:', seedErr.message);
            } else {
                console.log('✅ Default strategy seeded successfully.');
            }
        }

    } catch (err: any) {
        console.error('Unexpected error:', err.message);
    }
}

verifyAndSeed();
