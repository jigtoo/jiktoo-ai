// services/weekendLearningMode.ts
/**
 * 주말 학습 모드
 * KIS Proxy 없이도 과거 데이터로 학습 가능
 */

import { OHLCV, MarketTarget } from '../types';

// 금요일 종가 데이터 (샘플)
const FRIDAY_DATA_KR: Record<string, OHLCV[]> = {
    '005930': [ // 삼성전자
        { date: '2024-12-20', open: 71000, high: 72000, low: 70000, close: 71500, volume: 10000000 }
    ],
    '000660': [ // SK하이닉스
        { date: '2024-12-20', open: 185000, high: 187000, low: 183000, close: 186000, volume: 5000000 }
    ],
    '035420': [ // NAVER
        { date: '2024-12-20', open: 210000, high: 212000, low: 208000, close: 211000, volume: 3000000 }
    ]
};

const FRIDAY_DATA_US: Record<string, OHLCV[]> = {
    'AAPL': [
        { date: '2024-12-20', open: 195.0, high: 197.0, low: 194.0, close: 196.0, volume: 50000000 }
    ],
    'MSFT': [
        { date: '2024-12-20', open: 378.0, high: 380.0, low: 376.0, close: 379.0, volume: 30000000 }
    ],
    'NVDA': [
        { date: '2024-12-20', open: 495.0, high: 500.0, low: 490.0, close: 498.0, volume: 40000000 }
    ]
};

/**
 * 주말인지 확인
 */
export function isWeekend(): boolean {
    const day = new Date().getDay();
    return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

/**
 * 주말 학습 데이터 가져오기
 */
export function getWeekendLearningData(ticker: string, market: MarketTarget): OHLCV[] | null {
    if (!isWeekend()) return null;

    const dataSource = market === 'KR' ? FRIDAY_DATA_KR : FRIDAY_DATA_US;
    return dataSource[ticker] || null;
}

/**
 * 주말 학습 모드 메시지
 */
export function getWeekendMessage(): string {
    return '⚠️ 주말 학습 모드: 금요일 종가 데이터로 학습 중입니다. 월요일에 실시간 데이터로 전환됩니다.';
}
