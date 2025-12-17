// check_actual_collector_status.ts
import { supabase } from './services/supabaseClient';

async function checkActualStatus() {
    console.log('🔍 Checking ACTUAL Collector Status...\n');

    if (!supabase) {
        console.error('❌ Supabase not available');
        return;
    }

    // Check telegram_messages
    const { count: msgCount, error: msgError } = await supabase
        .from('telegram_messages')
        .select('*', { count: 'exact', head: true });

    console.log(`📊 Telegram Messages: ${msgCount || 0}`);

    if (msgCount && msgCount > 0) {
        const { data: latest } = await supabase
            .from('telegram_messages')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(3);

        console.log('\n📱 Latest 3 messages:');
        (latest || []).forEach((msg: any, idx) => {
            const date = new Date(msg.date);
            const minutesAgo = Math.floor((Date.now() - date.getTime()) / 60000);
            console.log(`\n${idx + 1}. [${msg.channel}] ${minutesAgo}분 전`);
            console.log(`   ${(msg.text || msg.message || '').substring(0, 80)}...`);
        });
    }

    // Check telegram_state
    const { data: state } = await supabase
        .from('telegram_state')
        .select('*');

    if (state && state.length > 0) {
        console.log('\n⚙️  Collector State:');
        state.forEach((s: any) => {
            console.log(`   ${s.channel}: last_message_id = ${s.last_message_id}`);
        });
    }

    process.exit(0);
}

checkActualStatus();
