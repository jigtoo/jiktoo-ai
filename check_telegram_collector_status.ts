// check_telegram_collector_status.ts
// Direct check of telegram collector status from Supabase

import { supabase } from './services/supabaseClient';

async function checkCollectorStatus() {
    console.log('🔍 Checking Telegram Collector Status...\n');

    if (!supabase) {
        console.error('❌ Supabase not available');
        return;
    }

    try {
        // 1. Check total messages
        const { count: totalCount, error: countError } = await supabase
            .from('telegram_messages')
            .select('*', { count: 'exact', head: true });

        console.log(`📊 Total Messages in DB: ${totalCount || 0}`);

        // 2. Check last message time
        const { data: lastMessage, error: lastError } = await supabase
            .from('telegram_messages')
            .select('created_at, channel, message')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (lastMessage) {
            const lastDate = new Date((lastMessage as any).created_at);
            const now = new Date();
            const minutesAgo = Math.floor((now.getTime() - lastDate.getTime()) / 60000);

            console.log(`\n⏰ Last Message:`);
            console.log(`   Time: ${lastDate.toLocaleString('ko-KR')}`);
            console.log(`   Channel: ${lastMessage.channel}`);
            console.log(`   Preview: ${((lastMessage as any).message || '').substring(0, 60)}...`);
            console.log(`   Minutes Ago: ${minutesAgo}`);

            if (minutesAgo > 30) {
                console.log(`\n❌ COLLECTOR STOPPED: Last message was ${minutesAgo} minutes ago`);
                console.log(`   Expected: Messages every 5-10 minutes during active hours`);
                console.log(`\n💡 Solution:`);
                console.log(`   1. Check if collector process is running`);
                console.log(`   2. Restart: cd JIKTOO-collector && run_collector.bat`);
            } else if (minutesAgo > 10) {
                console.log(`\n⚠️  COLLECTOR DELAYED: ${minutesAgo} minutes since last message`);
            } else {
                console.log(`\n✅ COLLECTOR ACTIVE: Recent data (${minutesAgo}m ago)`);
            }
        } else {
            console.log('\n❌ NO MESSAGES FOUND: Collector has never run or DB is empty');
            console.log('\n💡 Solution: Run collector for the first time');
            console.log('   cd JIKTOO-collector && run_collector.bat');
        }

        // 3. Check today's activity
        const today = new Date().toISOString().split('T')[0];
        const { count: todayCount } = await supabase
            .from('telegram_messages')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', `${today}T00:00:00`);

        console.log(`\n📅 Today's Messages: ${todayCount || 0}`);

    } catch (error) {
        console.error('Error:', error);
    }

    process.exit(0);
}

checkCollectorStatus();
