// check_real_intelligence.ts
// Check if there are any REAL telegram messages or news captured today

import { supabase } from './services/supabaseClient';

async function checkRealIntelligence() {
    console.log('🔍 [Real Intelligence Check] Searching for today\'s captured data...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (!supabase) {
        console.error('❌ Supabase not available');
        return;
    }

    const today = new Date().toISOString().split('T')[0]; // 2025-12-10

    // 1. Check telegram_messages table
    console.log('\n📱 [1] Checking Telegram Messages...');
    const { data: telegramData, error: telegramError } = await supabase
        .from('telegram_messages')
        .select('*')
        .gte('created_at', `${today}T00:00:00`)
        .order('created_at', { ascending: false })
        .limit(10);

    if (telegramError) {
        console.log(`   ⚠️  Error: ${telegramError.message}`);
    } else if (!telegramData || telegramData.length === 0) {
        console.log('   ❌ No telegram messages found for today');
    } else {
        console.log(`   ✅ Found ${telegramData.length} telegram messages today:`);
        telegramData.forEach((msg: any, idx) => {
            console.log(`   ${idx + 1}. [${msg.channel || 'Unknown'}] ${msg.message?.substring(0, 80)}...`);
        });
    }

    // 2. Check telegram_urls table
    console.log('\n🔗 [2] Checking Telegram URLs/Articles...');
    const { data: urlData, error: urlError } = await supabase
        .from('telegram_urls')
        .select('*')
        .gte('created_at', `${today}T00:00:00`)
        .order('created_at', { ascending: false })
        .limit(10);

    if (urlError) {
        console.log(`   ⚠️  Error: ${urlError.message}`);
    } else if (!urlData || urlData.length === 0) {
        console.log('   ❌ No URLs found for today');
    } else {
        console.log(`   ✅ Found ${urlData.length} URLs today:`);
        urlData.forEach((url: any, idx) => {
            console.log(`   ${idx + 1}. ${url.title || url.url}`);
        });
    }

    // 3. Check ai_thought_logs for intelligence analysis
    console.log('\n🧠 [3] Checking AI Analysis Logs...');
    const { data: thoughtData, error: thoughtError } = await supabase
        .from('ai_thought_logs')
        .select('*')
        .gte('created_at', `${today}T00:00:00`)
        .eq('strategy', 'NEWS_ANALYSIS')
        .order('created_at', { ascending: false })
        .limit(10);

    if (thoughtError) {
        console.log(`   ⚠️  Error: ${thoughtError.message}`);
    } else if (!thoughtData || thoughtData.length === 0) {
        console.log('   ❌ No AI news analysis found for today');
    } else {
        console.log(`   ✅ Found ${thoughtData.length} AI analyses today:`);
        thoughtData.forEach((log: any, idx) => {
            console.log(`   ${idx + 1}. [${log.ticker || 'MARKET'}] ${log.message}`);
        });
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 [Summary]');
    console.log(`   Telegram Messages: ${telegramData?.length || 0}`);
    console.log(`   URLs Captured: ${urlData?.length || 0}`);
    console.log(`   AI Analyses: ${thoughtData?.length || 0}`);

    if ((telegramData?.length || 0) === 0 && (urlData?.length || 0) === 0) {
        console.log('\n💡 [Diagnosis]');
        console.log('   텔레그램 크롤러가 실행되지 않았거나,');
        console.log('   텔레그램 봇 설정이 아직 완료되지 않은 것 같습니다.');
        console.log('\n   해결 방법:');
        console.log('   1. 텔레그램 봇이 실행 중인지 확인');
        console.log('   2. .env 파일에 TELEGRAM_BOT_TOKEN 등 설정 확인');
        console.log('   3. 텔레그램 채널에 봇이 초대되어 있는지 확인');
    }

    process.exit(0);
}

checkRealIntelligence();
