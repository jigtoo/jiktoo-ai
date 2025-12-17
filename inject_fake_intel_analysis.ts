
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase URL or Key in .env');
    process.exit(1);
}

const sb = createClient(supabaseUrl, supabaseKey);

async function inject() {
    console.log('💉 Injecting fake AI Intelligence Analysis log...');

    // 1. Log "Analyzing..."
    const { error: err1 } = await sb.from('ai_thought_logs').insert({
        action: 'ANALYSIS',
        strategy: 'CONTENT_ANALYSIS',
        ticker: 'INFO',
        message: '[Intel] Analyzing: [Breaking] Tesla Record Delivery Numbers...',
        confidence: 50,
        marketing_target: 'US', // Intentional typo or ignore if column missing
        created_at: new Date().toISOString()
    } as any); // Cast to any to avoid column strictness issues if schema mismatch

    if (err1) console.error('Error inserting log 1:', err1);
    else console.log('✅ Inserted "Analyzing..." log');

    await new Promise(r => setTimeout(r, 1000));

    // 2. Log "Result"
    const { error: err2 } = await sb.from('ai_thought_logs').insert({
        action: 'ANALYSIS',
        strategy: 'CONTENT_ANALYSIS',
        ticker: 'TSLA',
        message: '[Intel] 분석 완료: Tesla Record Delivery Numbers -> BULLISH (Strong demand confirmed)',
        confidence: 92,
        details: {
            source_title: '[Breaking] Tesla Record Delivery Numbers',
            analysis_result: {
                sentiment: 'BULLISH',
                urgency: 'HIGH',
                confidenceScore: 92
            }
        },
        created_at: new Date().toISOString()
    } as any);

    if (err2) console.error('Error inserting log 2:', err2);
    else console.log('✅ Inserted "Analysis Result" log');

    console.log('🎉 Done. Check the dashboard!');
}

inject();
