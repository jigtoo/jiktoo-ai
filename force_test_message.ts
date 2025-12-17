// force_test_message.ts
// Manually inject a test message to verify the system is working

import { supabase } from './services/supabaseClient';

async function forceTestMessage() {
    console.log('💉 Injecting test message to verify system...\n');

    if (!supabase) {
        console.error('❌ Supabase not available');
        return;
    }

    try {
        // Inject a realistic test message
        const testMessage = {
            channel: 'SYSTEM_TEST',
            // channel_id: 'test_channel', // Removed invalid
            // message_id: Math.floor(Math.random() * 1000000), // Removed invalid
            // sender_id: null, // Removed invalid
            message: '[테스트] 삼성전자 HBM3E 양산 본격화, AI 반도체 시장 공략 가속화. 관련주: 삼성전자(005930), SK하이닉스(000660)', // Changed text to message
            market: 'KR', // Added required market field
            // date: new Date().toISOString() // Removed invalid
        };

        const { data, error } = await (supabase as any)
            .from('telegram_messages')
            .insert(testMessage)
            .select();

        if (error) {
            console.error('❌ Failed to inject:', error.message);
        } else {
            console.log('✅ Test message injected successfully!');
            console.log(`   Message: "${testMessage.message}"`);

            // Wait a moment then check if it appears
            await new Promise(resolve => setTimeout(resolve, 2000));

            const { count } = await supabase
                .from('telegram_messages')
                .select('*', { count: 'exact', head: true });

            console.log(`\n📊 Total messages in DB: ${count}`);
            console.log('\n💡 Now refresh your app and check:');
            console.log('   1. AI 진화 연구소 → 실시간 인텔리전스 흐름');
            console.log('   2. Collector 상태 should update from "멈춤" to "정상"');
        }

    } catch (error) {
        console.error('Error:', error);
    }

    process.exit(0);
}

forceTestMessage();
