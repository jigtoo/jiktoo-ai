// inject_intelligence_to_app.ts
// This script directly injects AI intelligence analysis logs into Supabase
// so they appear in the app's ThoughtStream component in real-time.

import { supabase } from './services/supabaseClient';

const DEMO_INTELLIGENCE_LOGS = [
    {
        ticker: '005930',
        action: 'ANALYSIS',
        confidence: 95,
        message: '[텔레그램 첩보] 삼성전자 10조원 자사주 매입 발표 - 강력한 주가 부양 신호 포착',
        details: {
            source: 'Telegram Intelligence Service',
            sentiment: 'BULLISH',
            urgency: 'HIGH',
            reasoning: '대규모 자사주 매입은 경영진의 주가 저평가 인식과 주주가치 제고 의지를 나타냅니다.',
            suggestedAction: 'BUY',
            relatedTickers: ['005930'],
            confidenceScore: 95
        },
        strategy: 'NEWS_ANALYSIS'
    },
    {
        ticker: null,
        action: 'SCAN',
        confidence: 85,
        message: '[실시간 감시] 뉴스 크롤러 가동 중 - 24시간 시장 정보 수집 활성화',
        details: {
            activeChannels: ['Tier1_Disclosure', 'MarketNews_KR', 'US_Earnings'],
            messagesProcessed: 127,
            lastUpdate: new Date().toISOString()
        },
        strategy: 'INTELLIGENCE_GATHERING'
    },
    {
        ticker: 'TSLA',
        action: 'DECISION',
        confidence: 78,
        message: '[미국 시장] Tesla 야간 급등 감지 (+3.2%) - 프리마켓 모멘텀 분석',
        details: {
            priceChange: 3.2,
            volume: 'Above Average',
            catalyst: 'Positive analyst upgrade',
            marketRegime: 'WEAK_BULL'
        },
        strategy: 'EAGLE_EYE'
    },
    {
        ticker: null,
        action: 'ANALYSIS',
        confidence: 100,
        message: '[자가 진화] 지난 50건 매매 복기 완료 - 전략 파라미터 최적화 진행 중',
        details: {
            totalTrades: 50,
            winRate: 62,
            bestStrategy: 'VOLUME_SPIKE',
            worstStrategy: 'CHART_PATTERN',
            adjustments: 'VOLUME_SPIKE 비중 +10%, CHART_PATTERN 진입 기준 상향'
        },
        strategy: 'EVOLUTION'
    }
];

async function injectIntelligence() {
    console.log('🚀 [Intelligence Injection] Starting...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (!supabase) {
        console.error('❌ Supabase client not initialized!');
        return;
    }

    for (const log of DEMO_INTELLIGENCE_LOGS) {
        try {
            const { data, error } = await supabase
                .from('ai_thought_logs')
                .insert({
                    ticker: log.ticker,
                    action: log.action,
                    confidence: log.confidence,
                    message: log.message,
                    details: log.details,
                    strategy: log.strategy,
                    created_at: new Date().toISOString()
                })
                .select();

            if (error) {
                console.error(`❌ Failed to inject log: ${log.message}`, error);
            } else {
                console.log(`✅ Injected: [${log.action}] ${log.message}`);
            }

            // Delay between insertions to simulate real-time stream
            await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (err) {
            console.error('Error:', err);
        }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ [Intelligence Injection] Complete!');
    console.log('');
    console.log('📱 이제 앱을 열고 "AI 실시간 생각 스트림" 섹션을 확인하세요.');
    console.log('💡 F12 개발자 도구 > Network > WS 탭에서도 실시간 데이터 수신을 확인할 수 있습니다.');

    process.exit(0);
}

injectIntelligence();
