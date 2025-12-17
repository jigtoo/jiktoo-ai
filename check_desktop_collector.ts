// check_desktop_collector.ts
// Check if the ORIGINAL Desktop collector has any data

import { supabase } from './services/supabaseClient';

async function checkDesktopCollector() {
    console.log('🔍 Checking if ORIGINAL Desktop Collector collected any data...\n');

    if (!supabase) {
        console.error('❌ Supabase not available');
        return;
    }

    // The Desktop collector should have been writing to the SAME database
    // So let's check if there's ANY data at all

    const { count, error } = await supabase
        .from('telegram_messages')
        .select('*', { count: 'exact', head: true });

    console.log(`📊 Total messages in database: ${count || 0}`);

    if (count && count > 0) {
        console.log('\n✅ DATA EXISTS! The original collector DID work!');

        const { data: latest } = await supabase
            .from('telegram_messages')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

        console.log('\n📱 Latest 5 messages:');
        (latest || []).forEach((msg: any, idx) => {
            const date = new Date(msg.date);
            const hoursAgo = Math.floor((Date.now() - date.getTime()) / 3600000);
            console.log(`\n${idx + 1}. [${msg.channel}]`);
            console.log(`   Time: ${date.toLocaleString('ko-KR')} (${hoursAgo}시간 전)`);
            console.log(`   Text: ${(msg.text || msg.message || '').substring(0, 100)}...`);
        });

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('💡 SOLUTION:');
        console.log('   The Desktop collector WAS working before.');
        console.log('   We need to restart it or check why it stopped.');
        console.log('\n   Try running:');
        console.log('   cd C:\\Users\\USER\\Desktop\\JIKTOO-collector');
        console.log('   run_collector.bat');

    } else {
        console.log('\n❌ NO DATA FOUND');
        console.log('   Either:');
        console.log('   1. The Desktop collector never ran successfully');
        console.log('   2. The database was cleared');
        console.log('   3. It\'s writing to a different database');
    }

    process.exit(0);
}

checkDesktopCollector();
