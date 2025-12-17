// verify_db_permissions.ts
// Test if we can ACTUALLY write and read from the telegram_messages table
// This verifies if RLS (Row Level Security) is blocking the Collector

import { supabase } from './services/supabaseClient';

async function verifyPermissions() {
    console.log('🔒 Verifying Database Permissions (RLS)...\n');

    if (!supabase) {
        console.error('❌ Supabase not available');
        return;
    }

    const testId = `test_${Date.now()}`;

    // 1. Try to INSERT
    console.log('1️⃣  Attempting INSERT...');
    try {
        const { data, error } = await supabase
            .from('telegram_messages')
            .insert({
                channel: 'DEBUG_TEST',
                channel_id: 'debug',
                message_id: 12345,
                text: 'RLS Permission Check',
                date: new Date().toISOString()
            })
            .select();

        if (error) {
            console.error('   ❌ INSERT Failed:', error.message);
            console.error('      (This is why the Collector cannot save messages!)');
        } else {
            console.log('   ✅ INSERT Success');
        }
    } catch (e) {
        console.error('   ❌ INSERT Error:', e);
    }

    // 2. Try to SELECT (Read)
    console.log('\n2️⃣  Attempting SELECT (Read)...');
    try {
        const { data, error, count } = await supabase
            .from('telegram_messages')
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.error('   ❌ SELECT Failed:', error.message);
        } else {
            console.log(`   ✅ SELECT Success. Total Rows Visible: ${count}`);
        }
    } catch (e) {
        console.error('   ❌ SELECT Error:', e);
    }

    // 3. Check Policies
    console.log('\n🔍 Diagnosis:');
    console.log('   If INSERT failed → Collector cannot save data.');
    console.log('   If SELECT count is 0 but INSERT worked → RLS is hiding data.');

    process.exit(0);
}

verifyPermissions();
