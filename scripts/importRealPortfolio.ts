// scripts/importRealPortfolio.ts
/**
 * 실제 포트폴리오 데이터를 직투 시스템에 임포트하는 스크립트
 * 
 * 사용법:
 * 1. 브라우저 콘솔에서 실행
 * 2. 또는 Node.js 스크립트로 실행
 */

import { supabase } from '../services/supabaseClient';

// 한국 주식 포트폴리오
const KR_PORTFOLIO = [
    {
        ticker: '082850',
        stockName: '지엔씨에너지',
        shares: 85,
        avgPrice: 31044,
        currentPrice: 31044, // 실제 가격으로 업데이트 필요
        market: 'KR' as const
    },
    {
        ticker: '042700',
        stockName: '한미반도체',
        shares: 5,
        avgPrice: 121200,
        currentPrice: 116190,
        market: 'KR' as const
    },
    {
        ticker: '035420',
        stockName: 'NAVER',
        shares: 24,
        avgPrice: 246760,
        currentPrice: 235594,
        market: 'KR' as const
    },
    {
        ticker: '000660',
        stockName: 'SK하이닉스',
        shares: 5,
        avgPrice: 586111,
        currentPrice: 546016,
        market: 'KR' as const
    },
    {
        ticker: '003230',
        stockName: '삼양식품',
        shares: 3,
        avgPrice: 1345000,
        currentPrice: 1250737,
        market: 'KR' as const
    },
    {
        ticker: '087010',
        stockName: '펩트론',
        shares: 5,
        avgPrice: 278042,
        currentPrice: 244060,
        market: 'KR' as const
    }
];

// 미국 주식 포트폴리오
const US_PORTFOLIO = [
    {
        ticker: 'TER',
        stockName: '테라다인',
        shares: 7,
        avgPrice: 175.23,
        currentPrice: 194.81,
        market: 'US' as const
    },
    {
        ticker: 'BTIM',
        stockName: '비트마인 이머션 테크놀로지스',
        shares: 31,
        avgPrice: 29.79,
        currentPrice: 31.30,
        market: 'US' as const
    },
    {
        ticker: 'AIRN',
        stockName: '아이렌',
        shares: 17,
        avgPrice: 38.80,
        currentPrice: 39.84,
        market: 'US' as const
    },
    {
        ticker: 'NFLX',
        stockName: '넷플릭스',
        shares: 5,
        avgPrice: 96.69,
        currentPrice: 94.20,
        market: 'US' as const
    },
    {
        ticker: 'INTC',
        stockName: '인텔',
        shares: 7,
        avgPrice: 39.87,
        currentPrice: 36.75,
        market: 'US' as const
    },
    {
        ticker: 'NVO',
        stockName: '노보노디스크(ADR)',
        shares: 6,
        avgPrice: 52.30,
        currentPrice: 47.99,
        market: 'US' as const
    },
    {
        ticker: 'VTLE',
        stockName: '비스트라 에너지',
        shares: 3,
        avgPrice: 183.97,
        currentPrice: 162.69,
        market: 'US' as const
    }
];

const KR_CASH = 15238265; // 원화
const US_CASH = 76.41; // 달러

/**
 * 포트폴리오를 Supabase에 저장
 */
export async function importRealPortfolio() {
    if (!supabase) {
        console.error('[Portfolio Import] Supabase not initialized');
        return;
    }

    try {
        // 1. 기존 포트폴리오 삭제 (선택사항)
        console.log('[Portfolio Import] Clearing existing portfolio...');
        await supabase.from('user_portfolio').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        // 2. KR 포트폴리오 저장
        console.log('[Portfolio Import] Importing KR portfolio...');
        for (const item of KR_PORTFOLIO) {
            const { error } = await supabase.from('user_portfolio').insert({
                ticker: item.ticker,
                stock_name: item.stockName,
                shares: item.shares,
                avg_price: item.avgPrice,
                current_price: item.currentPrice,
                market: item.market,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

            if (error) {
                console.error(`[Portfolio Import] Failed to import ${item.stockName}:`, error);
            } else {
                console.log(`[Portfolio Import] ✅ ${item.stockName} imported`);
            }
        }

        // 3. US 포트폴리오 저장
        console.log('[Portfolio Import] Importing US portfolio...');
        for (const item of US_PORTFOLIO) {
            const { error } = await supabase.from('user_portfolio').insert({
                ticker: item.ticker,
                stock_name: item.stockName,
                shares: item.shares,
                avg_price: item.avgPrice,
                current_price: item.currentPrice,
                market: item.market,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

            if (error) {
                console.error(`[Portfolio Import] Failed to import ${item.stockName}:`, error);
            } else {
                console.log(`[Portfolio Import] ✅ ${item.stockName} imported`);
            }
        }

        // 4. 현금 정보 저장 (별도 테이블 또는 LocalStorage)
        localStorage.setItem('portfolio_cash_KR', KR_CASH.toString());
        localStorage.setItem('portfolio_cash_US', US_CASH.toString());

        console.log('[Portfolio Import] ✅ Import complete!');
        console.log(`[Portfolio Import] KR: ${KR_PORTFOLIO.length} stocks, ${KR_CASH.toLocaleString()}원 cash`);
        console.log(`[Portfolio Import] US: ${US_PORTFOLIO.length} stocks, $${US_CASH} cash`);

        return {
            success: true,
            kr: { stocks: KR_PORTFOLIO.length, cash: KR_CASH },
            us: { stocks: US_PORTFOLIO.length, cash: US_CASH }
        };

    } catch (error) {
        console.error('[Portfolio Import] Error:', error);
        return { success: false, error };
    }
}

// 브라우저 콘솔에서 사용 가능하도록 window에 노출
if (typeof window !== 'undefined') {
    (window as any).importRealPortfolio = importRealPortfolio;
}
