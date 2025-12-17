import { supabase } from './services/supabaseClient';

async function verify() {
    console.log('[Verify] Injecting Test Signal into user_intelligence_briefings...');

    const { error } = await supabase.rpc('insert_briefing', {
        p_title: '[TEST] 직투 AI 시스템 연결 점검',
        p_content: '이 메시지는 AI의 실시간 감지 능력을 테스트하기 위한 인공 신호입니다. 본 메시지가 분석된다면 시스템은 정상 작동 중입니다. (관련종목: 삼성전자, SK하이닉스)',
        p_related_tickers: '005930,000660',
        p_source_url: 'http://system.check'
    });

    if (error) {
        console.error('[Verify] Injection Failed:', error);
    } else {
        console.log('[Verify] Signal Injected. Please check the Dashboard.');
    }
}

verify();
