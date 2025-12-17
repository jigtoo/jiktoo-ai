// check_collector_data.ts
// Direct Supabase query to check if telegram collector is working

import { supabase } from './services/supabaseClient';

async function checkCollectorData() {
    console.log('🔍 Checking JIKTOO Collector Data...\n');

    if (!supabase) {
        console.error('❌ Supabase not available');
        return;
    }

    // Check telegram_messages
    console.log('📱 [1] Telegram Messages:');
    try {
        const { data: allMessages, error: allError } = await supabase
            .from('telegram_messages')
            .select('*', { count: 'exact', head: true });

        const { data: todayMessages, error: todayError } = await supabase
            .from('telegram_messages')
            .select('*')
            .gte('date', new Date().toISOString().split('T')[0])
            .order('created_at', { ascending: false })
            .limit(5);

        if (allError) {
            console.log(`   ⚠️  Error: ${allError.message}`);
        } else {
            console.log(`   Total messages in DB: ${allMessages?.length || 0}`);
            console.log(`   Today's messages: ${todayMessages?.length || 0}`);

            if (todayMessages && todayMessages.length > 0) {
                console.log('\n   Latest messages:');
                todayMessages.forEach((msg: any, idx) => {
                    const preview = msg.text?.substring(0, 60) || '';
                    console.log(`   ${idx + 1}. [${msg.channel}] ${preview}...`);
                });
            }
        }
    } catch (e: any) {
        console.log(`   ❌ ${e.message}`);
    }

    // Check telegram_urls
    console.log('\n🔗 [2] Telegram URLs:');
    try {
        const { data: allUrls, error: allError } = await supabase
            .from('telegram_urls')
            .select('*', { count: 'exact', head: true });

        const { data: todayUrls, error: todayError } = await supabase
            .from('telegram_urls')
            .select('*')
            .gte('first_seen_at', new Date().toISOString().split('T')[0])
            .order('first_seen_at', { ascending: false })
            .limit(5);

        if (allError) {
            console.log(`   ⚠️  Error: ${allError.message}`);
        } else {
            console.log(`   Total URLs in DB: ${allUrls?.length || 0}`);
            console.log(`   Today's URLs: ${todayUrls?.length || 0}`);

            if (todayUrls && todayUrls.length > 0) {
                console.log('\n   Latest URLs:');
                todayUrls.forEach((url: any, idx) => {
                    console.log(`   ${idx + 1}. ${url.url}`);
                });
            }
        }
    } catch (e: any) {
        console.log(`   ❌ ${e.message}`);
    }

    // Check telegram_state (collector status)
    console.log('\n⚙️  [3] Collector State:');
    try {
        const { data: state, error } = await supabase
            .from('telegram_state')
            .select('*');

        if (error) {
            console.log(`   ⚠️  Error: ${error.message}`);
        } else if (!state || state.length === 0) {
            console.log('   ❌ No state records found - collector may not have run yet');
        } else {
            console.log(`   ✅ Tracking ${state.length} channels:`);
            state.forEach((s: any) => {
                console.log(`      - ${s.channel}: last_message_id = ${s.last_message_id}`);
            });
        }
    } catch (e: any) {
        console.log(`   ❌ ${e.message}`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💡 Diagnosis:');
    console.log('   If all counts are 0, the collector needs to be started.');
    console.log('   Run: cd JIKTOO-collector && run_collector.bat');

    process.exit(0);
}

checkCollectorData();
