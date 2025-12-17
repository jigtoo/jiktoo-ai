// services/utils/dateUtils.ts
import { MarketTarget } from '../../types';

/**
 * Returns the current date in YYYY-MM-DD format (KST)
 */
export function getKoreanDate(): string {
    const now = new Date();
    // UTC+9 (KST) setup: simplified logic
    // Just using standard ISO for now, assuming server/local time is handled reasonably
    // or using offset
    const offset = 9 * 60 * 60 * 1000;
    const kstDate = new Date(now.getTime() + offset);
    return kstDate.toISOString().split('T')[0];
}

/**
 * Returns true if today is a weekend (Saturday or Sunday)
 */
export function isWeekend(): boolean {
    const day = new Date().getDay();
    return day === 0 || day === 6; // 0=Sun, 6=Sat
}

/**
 * Returns formatted timestamp string
 */
export function getTimestamp(): string {
    return new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
}

/**
 * Returns the market date string (YYYY-MM-DD) for the given market.
 * Uses local time logic for US market to determine "today" in trading terms.
 */
export function getMarketDateString(market: MarketTarget, dateObj: Date = new Date()): string {
    if (market === 'KR') {
        // Korea Standard Time (UTC+9)
        const utc = dateObj.getTime() + (dateObj.getTimezoneOffset() * 60000);
        const kstGap = 9 * 60 * 60 * 1000;
        const kstDate = new Date(utc + kstGap);
        return kstDate.toISOString().split('T')[0];
    } else {
        // US Eastern Time (UTC-5 or UTC-4) - Simplified to UTC-5 for now
        const utc = dateObj.getTime() + (dateObj.getTimezoneOffset() * 60000);
        const estGap = -5 * 60 * 60 * 1000;
        const estDate = new Date(utc + estGap);
        return estDate.toISOString().split('T')[0];
    }
}

/**
 * Returns the current market session state.
 */
export function getMarketSessionState(market: MarketTarget): { state: 'REGULAR' | 'PRE' | 'POST' | 'CLOSED', label: string } {
    const now = new Date();

    // Check weekend
    const day = now.getDay();
    if (day === 0 || day === 6) {
        return { state: 'CLOSED', label: '주말 휴장' };
    }

    // Simple time checking logic (Placeholder)
    // KOSPI/KOSDAQ: 09:00 ~ 15:30
    // US: 23:30 ~ 06:00 (approx, depends on DST)

    const hour = now.getHours();
    const minute = now.getMinutes();
    const timeVal = hour * 100 + minute;

    if (market === 'KR') {
        if (timeVal >= 900 && timeVal < 1530) return { state: 'REGULAR', label: '장중' };
        if (timeVal >= 830 && timeVal < 900) return { state: 'PRE', label: '장전 동시호가' };
        if (timeVal >= 1530 && timeVal < 1800) return { state: 'POST', label: '장마감/시간외' };
        return { state: 'CLOSED', label: '장마감' };
    } else {
        // Simple check for US market (Night time in Korea)
        // Assuming ~23:30 start
        if (timeVal >= 2330 || timeVal < 600) return { state: 'REGULAR', label: '장중' };
        return { state: 'CLOSED', label: '장마감' };
    }
}

/**
 * Returns whether the market is currently open and a status message.
 */
export function isMarketOpen(market: MarketTarget): { isOpen: boolean; message: string } {
    const sessionState = getMarketSessionState(market);
    const isOpen = sessionState.state === 'REGULAR';
    return {
        isOpen,
        message: sessionState.label
    };
}