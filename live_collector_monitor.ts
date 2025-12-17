// live_collector_monitor.ts
// Real-time monitoring of collector activity

import { supabase } from './services/supabaseClient';

async function monitorCollector() {
    console.log('🔴 LIVE COLLECTOR MONITOR - Press Ctrl+C to stop\n');
    console.log('Checking every 10 seconds...\n');

    let lastCount = 0;
    let checkCount = 0;

    const check = async () => {
        checkCount++;

        if (!supabase) {
            console.log('❌ Supabase not available');
            return;
        }

        try {
            // Get current message count
            const { count } = await supabase
                .from('telegram_messages')
                .select('*', { count: 'exact', head: true });

            const currentCount = count || 0;
            const newMessages = currentCount - lastCount;

            const timestamp = new Date().toLocaleTimeString('ko-KR');

            if (newMessages > 0) {
                console.log(`✅ [${timestamp}] NEW MESSAGES: +${newMessages} (Total: ${currentCount})`);

                // Show latest message
                const { data: latest } = await supabase
                    .from('telegram_messages')
                    .select('channel, text, date')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (latest) {
                    console.log(`   📱 Latest: [${(latest as any).channel}] ${((latest as any).text || '').substring(0, 60)}...`);
                }
            } else if (checkCount === 1) {
                console.log(`ℹ️  [${timestamp}] Starting count: ${currentCount} messages`);
            } else {
                console.log(`⏳ [${timestamp}] No new messages yet... (Total: ${currentCount})`);
            }

            lastCount = currentCount;

        } catch (error) {
            console.error('Error:', error);
        }
    };

    // Initial check
    await check();

    // Check every 10 seconds
    setInterval(check, 10000);
}

monitorCollector();
