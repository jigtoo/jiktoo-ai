// demo_intelligence_flow.ts
// This script demonstrates the COMPLETE intelligence flow:
// Telegram/News → AI Analysis → Trading Signal → Watchlist/Portfolio

import { supabase } from './services/supabaseClient';
import { intelligenceBriefingProcessor } from './services/IntelligenceBriefingProcessor';

const DEMO_SCENARIOS = [
    {
        type: 'telegram',
        source: 'FastStockNews',
        message: '[속보] 삼성전자, AI 반도체 신제품 발표 예정. 엔비디아와 경쟁 본격화',
        expectedTicker: '005930'
    },
    {
        type: 'telegram',
        source: 'Bloomberg',
        message: 'Tesla announces record Q4 deliveries, stock surges in pre-market',
        expectedTicker: 'TSLA'
    },
    {
        type: 'user_briefing',
        title: '2차전지 섹터 급등 포착',
        content: 'LG에너지솔루션이 미국 GM과 대규모 배터리 공급 계약 체결. 관련주 전반 강세 예상. 에코프로비엠, 포스코퓨처엠 주목 필요.',
        tickers: '373220, 003670',
        source: 'https://example.com/news/battery-sector'
    }
];

async function demonstrateIntelligenceFlow() {
    console.log('🎬 [Intelligence Flow Demo] Starting...\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (!supabase) {
        console.error('❌ Supabase not available');
        return;
    }

    // STEP 1: Inject Telegram Messages
    console.log('\n📱 STEP 1: Injecting Telegram Messages (Simulating Real Collection)');
    console.log('─────────────────────────────────────────────────────');

    for (const scenario of DEMO_SCENARIOS.filter(s => s.type === 'telegram')) {
        try {
            const { data, error } = await (supabase as any)
                .from('telegram_messages')
                .insert({
                    channel: scenario.source,
                    channel_id: `demo_${Date.now()}`,
                    message_id: Math.floor(Math.random() * 1000000),
                    sender_id: null,
                    text: scenario.message,
                    date: new Date().toISOString()
                })
                .select();

            if (error) {
                console.log(`   ⚠️  ${scenario.source}: ${error.message}`);
            } else {
                console.log(`   ✅ ${scenario.source}: "${scenario.message.substring(0, 50)}..."`);
            }

            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (e) {
            console.error(`   ❌ Error:`, e);
        }
    }

    // STEP 2: Inject User Briefing
    console.log('\n📝 STEP 2: Injecting User Intelligence Briefing');
    console.log('─────────────────────────────────────────────────────');

    const briefingScenario = DEMO_SCENARIOS.find(s => s.type === 'user_briefing')!;
    try {
        const { data: briefingData, error: briefingError } = await (supabase as any).rpc('insert_briefing', {
            p_title: briefingScenario.title,
            p_content: briefingScenario.content,
            p_related_tickers: briefingScenario.tickers,
            p_source_url: briefingScenario.source
        });

        if (briefingError) {
            console.log(`   ⚠️  ${briefingError.message}`);
        } else {
            console.log(`   ✅ Briefing Created: "${briefingScenario.title}"`);

            // STEP 3: Process the briefing immediately
            console.log('\n🤖 STEP 3: AI Processing Briefing → Extracting Trading Signals');
            console.log('─────────────────────────────────────────────────────');

            if (briefingData && briefingData[0]) {
                const analysis = await intelligenceBriefingProcessor.processBriefing(briefingData[0].id);

                if (analysis) {
                    console.log(`   ✅ Analysis Complete:`);
                    console.log(`      Sentiment: ${analysis.sentiment}`);
                    console.log(`      Urgency: ${analysis.urgency}`);
                    console.log(`      Actionable: ${analysis.actionable}`);
                    console.log(`      Trading Signals: ${analysis.tradingSignals.length}`);

                    if (analysis.tradingSignals.length > 0) {
                        console.log(`\n      📊 Extracted Signals:`);
                        analysis.tradingSignals.forEach((signal, idx) => {
                            console.log(`         ${idx + 1}. ${signal.ticker}: ${signal.action} (Confidence: ${signal.confidence}%)`);
                            console.log(`            Reasoning: ${signal.reasoning}`);
                        });
                    }
                } else {
                    console.log(`   ⚠️  Analysis failed or returned null`);
                }
            }
        }
    } catch (e) {
        console.error(`   ❌ Error:`, e);
    }

    // STEP 4: Show AI Thought Logs
    console.log('\n💭 STEP 4: Checking AI Thought Stream (What AI is Thinking)');
    console.log('─────────────────────────────────────────────────────');

    const { data: thoughts, error: thoughtError } = await supabase
        .from('ai_thought_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (thoughts && thoughts.length > 0) {
        console.log(`   ✅ Recent AI Thoughts (Last 5):`);
        thoughts.forEach((thought: any, idx) => {
            console.log(`      ${idx + 1}. [${thought.action}] ${thought.message}`);
            console.log(`         Confidence: ${thought.confidence}% | Strategy: ${thought.strategy || 'N/A'}`);
        });
    } else {
        console.log(`   ℹ️  No thoughts logged yet`);
    }

    // STEP 5: Summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ [Demo Complete] Intelligence Flow Demonstrated');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📱 Now check your app:');
    console.log('   1. AI 진화 연구소 → AI 실시간 생각 스트림');
    console.log('   2. AI 진화 연구소 → 브리핑 피드');
    console.log('   3. AI 진화 연구소 → AI 진화 타임라인');
    console.log('\n   You should see:');
    console.log('   - Telegram messages analyzed');
    console.log('   - User briefing processed');
    console.log('   - Trading signals extracted');
    console.log('   - AI thought process logged');

    process.exit(0);
}

demonstrateIntelligenceFlow();
