/**
 * 브라우저 콘솔에서 실행할 수 있는 간단한 포트폴리오 임포트 스크립트
 * 
 * 사용법:
 * 1. 브라우저 개발자 도구 (F12) 열기
 * 2. Console 탭 선택
 * 3. 아래 코드 전체 복사 후 붙여넣기
 * 4. Enter 키 입력
 */

(async function () {
    console.log('🚀 실제 포트폴리오 임포트 시작...');

    // LocalStorage에 직접 저장
    const krPortfolio = [
        { ticker: '082850', stockName: '지엔씨에너지', shares: 85, avgPrice: 31044, currentPrice: 31044 },
        { ticker: '042700', stockName: '한미반도체', shares: 5, avgPrice: 121200, currentPrice: 116190 },
        { ticker: '035420', stockName: 'NAVER', shares: 24, avgPrice: 246760, currentPrice: 235594 },
        { ticker: '000660', stockName: 'SK하이닉스', shares: 5, avgPrice: 586111, currentPrice: 546016 },
        { ticker: '003230', stockName: '삼양식품', shares: 3, avgPrice: 1345000, currentPrice: 1250737 },
        { ticker: '087010', stockName: '펩트론', shares: 5, avgPrice: 278042, currentPrice: 244060 }
    ];

    const usPortfolio = [
        { ticker: 'TER', stockName: '테라다인', shares: 7, avgPrice: 175.23, currentPrice: 194.81 },
        { ticker: 'BTIM', stockName: '비트마인 이머션 테크놀로지스', shares: 31, avgPrice: 29.79, currentPrice: 31.30 },
        { ticker: 'AIRN', stockName: '아이렌', shares: 17, avgPrice: 38.80, currentPrice: 39.84 },
        { ticker: 'NFLX', stockName: '넷플릭스', shares: 5, avgPrice: 96.69, currentPrice: 94.20 },
        { ticker: 'INTC', stockName: '인텔', shares: 7, avgPrice: 39.87, currentPrice: 36.75 },
        { ticker: 'NVO', stockName: '노보노디스크(ADR)', shares: 6, avgPrice: 52.30, currentPrice: 47.99 },
        { ticker: 'VTLE', stockName: '비스트라 에너지', shares: 3, avgPrice: 183.97, currentPrice: 162.69 }
    ];

    // LocalStorage에 저장
    localStorage.setItem('jiktoo_portfolio_KR', JSON.stringify(krPortfolio));
    localStorage.setItem('jiktoo_portfolio_US', JSON.stringify(usPortfolio));
    localStorage.setItem('jiktoo_portfolio_cash_KR', '15238265');
    localStorage.setItem('jiktoo_portfolio_cash_US', '76.41');

    console.log('✅ 포트폴리오 임포트 완료!');
    console.log('📊 KR: 6종목, 15,238,265원');
    console.log('📊 US: 7종목, $76.41');
    console.log('🔄 페이지를 새로고침하세요!');

    alert('✅ 포트폴리오 임포트 완료!\n\n페이지를 새로고침(F5)하면 실제 포트폴리오가 표시됩니다.');
})();
