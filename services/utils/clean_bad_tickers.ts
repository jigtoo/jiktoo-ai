
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const validTickerRegex = /^[A-Z0-9]{2,6}$/;
const invalidTickers = ['ABC', 'XYZ', 'TEST', 'SAMPLE', 'F', 'LMN', 'LITH', 'undefined', 'null'];

async function cleanBadTickers() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing Supabase credentials');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🧹 Starting cleanup of garbage tickers...');

    // 1. Clean alpha_engine_playbooks
    console.log('--- Cleaning alpha_engine_playbooks ---');
    const { data: playbooks, error: pbError } = await supabase
        .from('alpha_engine_playbooks')
        .select('id, ticker');

    if (pbError) {
        console.error('Error fetching playbooks:', pbError);
    } else if (playbooks) {
        const idsToDelete: string[] = [];
        for (const item of playbooks) {
            const ticker = item.ticker?.toUpperCase().trim();
            if (!ticker ||
                invalidTickers.includes(ticker) ||
                ticker.length < 2 ||
                !validTickerRegex.test(ticker)) {
                console.log(`❌ Identifying garbage: ${item.ticker} (ID: ${item.id})`);
                idsToDelete.push(item.id);
            }
        }

        if (idsToDelete.length > 0) {
            const { error: delError } = await supabase
                .from('alpha_engine_playbooks')
                .delete()
                .in('id', idsToDelete);

            if (delError) console.error('Error deleting playbooks:', delError);
            else console.log(`✅ Deleted ${idsToDelete.length} garbage records from playbooks.`);
        } else {
            console.log('✨ No garbage found in playbooks.');
        }
    }

    // 2. Clean strategies (optional, if exists)
    console.log('--- Cleaning strategies ---');
    const { data: strategies, error: stError } = await supabase
        .from('strategies') // Check if this table exists or use 'active_strategies'
        .select('id, ticker');

    if (stError) {
        console.warn('Could not fetch strategies (table might not exist or diff name):', stError.message);
    } else if (strategies) {
        const idsToDelete: string[] = [];
        for (const item of strategies) {
            const ticker = item.ticker?.toUpperCase().trim();
            if (!ticker ||
                invalidTickers.includes(ticker) ||
                ticker.length < 2 ||
                !validTickerRegex.test(ticker)) {
                console.log(`❌ Identifying garbage strategy: ${item.ticker} (ID: ${item.id})`);
                idsToDelete.push(item.id);
            }
        }

        if (idsToDelete.length > 0) {
            const { error: delError } = await supabase
                .from('strategies')
                .delete()
                .in('id', idsToDelete);

            if (delError) console.error('Error deleting strategies:', delError);
            else console.log(`✅ Deleted ${idsToDelete.length} garbage records from strategies.`);
        } else {
            console.log('✨ No garbage found in strategies.');
        }
    }
}

cleanBadTickers();
