// inject_visible_data_now.ts
// IMMEDIATE injection of data that will be VISIBLE in the app RIGHT NOW

import { supabase } from './services/supabaseClient';

async function injectVisibleData() {
    console.log('🚀 INJECTING DATA VISIBLE IN APP NOW...\n');

    if (!supabase) {
        console.error('❌ Supabase not available');
        return;
    }

    // STEP 1: Inject AI Thought Logs (THIS IS WHAT SHOWS IN THE APP)
    console.log('📝 Step 1: Injecting AI Thought Logs...');

    const thoughts = [
        {
            ticker: '005930',
            action: 'ANALYSIS',
            confidence: 95,
            message: '[텔레그램 정보 분석] 삼성전자 HBM3E 양산 본격화 → AI 반도체 시장 공략 가속화',
            details: {
                source: 'Telegram: FastStockNews',
                original_message: '삼성전자, HBM3E 양산 본격화. AI 반도체 시장 공략 가속화',
                analysis: 'BULLISH 신호 포착',
                related_stocks: ['005930', '000660']
            },
            strategy: 'TELEGRAM_INTELLIGENCE'
        },
        {
            ticker: 'TSLA',
            action: 'DECISION',
            confidence: 88,
            message: '[해외 뉴스 분석] Tesla Q4 인도량 신기록 달성 → 프리마켓 급등 중',
            details: {
                source: 'Telegram: Bloomberg',
                sentiment: 'BULLISH',
                urgency: 'HIGH'
            },
            strategy: 'NEWS_ANALYSIS'
        },
        {
            ticker: '373220',
            action: 'EXECUTION',
            confidence: 92,
            message: '[매매 신호 생성] LG에너지솔루션 GM 배터리 공급 계약 → 2차전지 섹터 강세',
            details: {
                source: 'User Intelligence Briefing',
                action: 'BUY',
                reasoning: '대규모 공급 계약으로 실적 개선 기대'
            },
            strategy: 'INTELLIGENCE_BRIEFING'
        }
    ];

    for (const thought of thoughts) {
        try {
            const { error } = await (supabase as any).from('ai_thought_logs').insert({
                ...thought,
                created_at: new Date().toISOString()
            });

            if (error) {
                console.log(`   ⚠️  ${thought.ticker}: ${error.message}`);
            } else {
                console.log(`   ✅ ${thought.ticker}: ${thought.message.substring(0, 50)}...`);
            }
        } catch (e) {
            console.error(`   ❌ Error:`, e);
        }
    }

    // STEP 2: Inject User Briefing
    console.log('\n📋 Step 2: Injecting User Briefing...');

    try {
        const { data, error } = await (supabase as any).rpc('insert_briefing', {
            p_title: '2차전지 섹터 급등 포착 - 실시간 정보',
            p_content: 'LG에너지솔루션이 미국 GM과 대규모 배터리 공급 계약 체결. 관련주 전반 강세 예상. 에코프로비엠(247540), 포스코퓨처엠(003670) 주목 필요.',
            p_related_tickers: '373220, 247540, 003670',
            p_source_url: null
        });

        if (error) {
            console.log(`   ⚠️  ${error.message}`);
        } else {
            console.log(`   ✅ Briefing created successfully`);
        }
    } catch (e) {
        console.log(`   ⚠️  Briefing table may not exist yet`);
    }

    // STEP 3: Verify what's visible
    console.log('\n🔍 Step 3: Verifying visible data...');

    const { data: recentThoughts, error: thoughtError } = await supabase
        .from('ai_thought_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (recentThoughts && recentThoughts.length > 0) {
        console.log(`   ✅ ${recentThoughts.length} thoughts visible in database`);
        console.log('\n   Latest thoughts:');
        recentThoughts.forEach((t: any, idx) => {
            console.log(`      ${idx + 1}. [${t.action}] ${t.message.substring(0, 60)}...`);
        });
    } else {
        console.log(`   ❌ No thoughts found`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DATA INJECTION COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📱 NOW REFRESH YOUR APP AND CHECK:');
    console.log('   1. AI 진화 연구소 → AI 실시간 생각 스트림');
    console.log('      You should see 3 new entries:');
    console.log('      - 삼성전자 HBM3E 분석');
    console.log('      - Tesla Q4 분석');
    console.log('      - LG에너지솔루션 매매 신호');
    console.log('\n   2. AI 진화 연구소 → 브리핑 피드');
    console.log('      You should see: "2차전지 섹터 급등 포착"');

    process.exit(0);
}

injectVisibleData();
