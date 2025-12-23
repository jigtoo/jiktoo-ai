
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

// Mocking the Supabase client used in the service by setting global or hacking the import?
// Actually, since we are running this script in Node, we need to ensure the service uses THIS supabase instance 
// or one created with the same credentials.
// The service imports 'supabaseClient.ts'. If that file uses process.env.VITE_..., it should work if we load dotenv.

console.log('--- Triggering Briefing Process ---');

async function run() {
    try {
        // Dynamic import to ensure env vars are loaded first
        const { intelligenceBriefingProcessor } = await import('../services/IntelligenceBriefingProcessorV2');

        console.log('Processor imported. Calling processAllPending()...');
        await intelligenceBriefingProcessor.processAllPending();
        console.log('--- Process Complete ---');
    } catch (error) {
        console.error('Execution Failed:', error);
    }
}

run();
