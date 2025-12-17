// REAL_WORKING_DEMO.ts
// This will ACTUALLY process a user briefing and show the REAL AI analysis

import { intelligenceBriefingProcessor } from './services/IntelligenceBriefingProcessor';
import { supabase } from './services/supabaseClient';

async function realWorkingDemo() {
    console.log('🎯 REAL WORKING DEMO - No fake data, actual AI processing\n');

    if (!supabase) {
        console.error('❌ Supabase not available');
        return;
    }

    // Step 1: Create a REAL user briefing
    console.log('Step 1: Creating user briefing...');
    const { data: briefingData, error: briefingError } = await (supabase as any).rpc('insert_briefing', {
        p_title: '[실전 테스트] 오늘 포착한 급등주 정보',
        p_content: '에코프로비엠(247540)이 유럽 배터리 업체와 대규모 계약 체결 소식. 장중 +8% 급등 중. 2차전지 섹터 전반 강세.',
        p_related_tickers: '247540',
        p_source_url: null
    });

    if (briefingError) {
        console.error('Failed:', briefingError.message);
        return;
    }

    const briefingId = briefingData[0].id;
    console.log(`✅ Briefing created: ID ${briefingId}\n`);

    // Step 2: Let AI ACTUALLY process it
    console.log('Step 2: AI is now ACTUALLY analyzing (using Gemini API)...');
    console.log('(This will take 5-10 seconds - REAL AI processing, not fake)\n');

    const analysis = await intelligenceBriefingProcessor.processBriefing(briefingId);

    if (!analysis) {
        console.error('❌ AI processing failed');
        return;
    }

    // Step 3: Show REAL results
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ REAL AI ANALYSIS COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`Sentiment: ${analysis.sentiment}`);
    console.log(`Urgency: ${analysis.urgency}`);
    console.log(`Actionable: ${analysis.actionable}`);
    console.log(`Related Tickers: ${analysis.relatedTickers.join(', ')}\n`);

    if (analysis.tradingSignals.length > 0) {
        console.log('📊 REAL Trading Signals Generated:');
        analysis.tradingSignals.forEach((signal, idx) => {
            console.log(`\n${idx + 1}. ${signal.ticker}`);
            console.log(`   Action: ${signal.action}`);
            console.log(`   Confidence: ${signal.confidence}%`);
            console.log(`   Reasoning: ${signal.reasoning}`);
        });
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📱 NOW CHECK YOUR APP:');
    console.log('   AI 진화 연구소 → AI 실시간 생각 스트림');
    console.log('   You will see a NEW entry with REAL AI analysis');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    process.exit(0);
}

realWorkingDemo();
