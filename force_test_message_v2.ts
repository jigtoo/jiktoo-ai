// force_test_message_v2.ts
// Inject test message using minimal columns (channel, text, date)

import { supabase } from './services/supabaseClient';

async function forceTestMessageV2() {
    console.log('💉 Injecting test message (Minimal Schema)...\n');

    if (!supabase) {
        console.error('❌ Supabase not available');
        return;
    }

    try {
        const testMessage = {
            channel: 'SYSTEM_TEST_V2',
            text: '[테스트 V2] 텔레그램 수집 시스템 정상화 확인 필요',
            date: new Date().toISOString()
        };

        const { data, error } = await (supabase as any)
            .from('telegram_messages')
            .insert(testMessage)
            .select();

        if (error) {
            console.error('❌ Failed:', error.message);
        } else {
            console.log('✅ Success! Message injected.');
            console.log('   App should now show "Collector 상태: 정상" (if monitoring logic works)');

            // Check count
            const { count } = await supabase
                .from('telegram_messages')
                .select('*', { count: 'exact', head: true });
            console.log(`\n📊 Total Messages: ${count}`);
        }

    } catch (error) {
        console.error('Error:', error);
    }

    process.exit(0);
}

forceTestMessageV2();
