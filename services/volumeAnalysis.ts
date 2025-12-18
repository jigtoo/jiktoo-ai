// services/volumeAnalysis.ts
/**
 * Volume Analysis Utilities for Panic Sell Recovery Detection
 * 거래량 분석 유틸리티: 공포 매도 후 반등 감지
 */

import { fetchDailyCandles, type OHLCV } from './dataService';
import type { MarketTarget } from '../types';

export interface VolumeClimaxSignal {
    isClimax: boolean;
    volumeRatio: number;      // 평균 대비 배수
    priceChange: number;      // 동반된 가격 변화율
    climaxDate: string;
    avgVolume: number;
    peakVolume: number;
}

export interface CapitulationRecoverySignal {
    isRecovering: boolean;
    capitulationDate: string | null;
    recoveryStartDate: string | null;
    volumeNormalized: boolean;     // 거래량 정상화 여부
    priceStabilized: boolean;      // 가격 안정화 여부
    strength: number;              // 신호 강도 (0-100)
    daysFromBottom: number;
}

/**
 * Calculate average volume over a period
 * 기간별 평균 거래량 계산
 */
export function calculateAverageVolume(candles: OHLCV[], period: number = 20): number {
    if (candles.length < period) return 0;

    const recentCandles = candles.slice(-period);
    const totalVolume = recentCandles.reduce((sum, candle) => sum + candle.volume, 0);
    return totalVolume / period;
}

/**
 * Detect Volume Climax (거래량 급증 감지)
 * 조건:
 * - 최근 3일 이내 거래량이 20일 평균 대비 2배 이상
 * - 동시에 주가 -5% 이상 하락
 */
export function detectVolumeClimax(candles: OHLCV[]): VolumeClimaxSignal {
    if (candles.length < 20) {
        return {
            isClimax: false,
            volumeRatio: 0,
            priceChange: 0,
            climaxDate: '',
            avgVolume: 0,
            peakVolume: 0
        };
    }

    const avgVolume = calculateAverageVolume(candles, 20);
    const recentCandles = candles.slice(-3); // 최근 3일

    for (const candle of recentCandles) {
        const volumeRatio = candle.volume / avgVolume;
        const priceChange = ((candle.close - candle.open) / candle.open) * 100;

        // Volume Climax 조건: 거래량 2배 이상 + 가격 -5% 이상 하락
        if (volumeRatio >= 2.0 && priceChange <= -5.0) {
            return {
                isClimax: true,
                volumeRatio,
                priceChange,
                climaxDate: candle.date,
                avgVolume,
                peakVolume: candle.volume
            };
        }
    }

    return {
        isClimax: false,
        volumeRatio: 0,
        priceChange: 0,
        climaxDate: '',
        avgVolume,
        peakVolume: 0
    };
}

/**
 * Detect Capitulation Recovery (항복 매도 후 회복 감지)
 * 조건:
 * 1. Volume Climax 발생 후
 * 2. 거래량이 평균 수준으로 회귀 (평균 대비 1.5배 이하)
 * 3. 주가가 2일 연속 하락 폭 감소 또는 반등
 * 4. 최저가 대비 +2% 이상 회복
 */
export function detectCapitulationRecovery(
    candles: OHLCV[],
    climaxSignal: VolumeClimaxSignal
): CapitulationRecoverySignal {
    if (!climaxSignal.isClimax || candles.length < 5) {
        return {
            isRecovering: false,
            capitulationDate: null,
            recoveryStartDate: null,
            volumeNormalized: false,
            priceStabilized: false,
            strength: 0,
            daysFromBottom: 0
        };
    }

    const avgVolume = calculateAverageVolume(candles, 20);
    const climaxIndex = candles.findIndex(c => c.date === climaxSignal.climaxDate);

    if (climaxIndex === -1 || climaxIndex >= candles.length - 2) {
        return {
            isRecovering: false,
            capitulationDate: climaxSignal.climaxDate,
            recoveryStartDate: null,
            volumeNormalized: false,
            priceStabilized: false,
            strength: 0,
            daysFromBottom: 0
        };
    }

    // 캐피튤레이션 이후 캔들들
    const postClimaxCandles = candles.slice(climaxIndex + 1);

    if (postClimaxCandles.length < 2) {
        return {
            isRecovering: false,
            capitulationDate: climaxSignal.climaxDate,
            recoveryStartDate: null,
            volumeNormalized: false,
            priceStabilized: false,
            strength: 0,
            daysFromBottom: 0
        };
    }

    // 1. 거래량 정상화 체크 (평균 대비 1.5배 이하)
    const recentVolume = postClimaxCandles[postClimaxCandles.length - 1].volume;
    const volumeNormalized = (recentVolume / avgVolume) <= 1.5;

    // 2. 가격 안정화 체크 (2일 연속 하락 폭 감소 또는 반등)
    let priceStabilized = false;
    if (postClimaxCandles.length >= 2) {
        const day1Change = ((postClimaxCandles[postClimaxCandles.length - 2].close - postClimaxCandles[postClimaxCandles.length - 2].open) / postClimaxCandles[postClimaxCandles.length - 2].open) * 100;
        const day2Change = ((postClimaxCandles[postClimaxCandles.length - 1].close - postClimaxCandles[postClimaxCandles.length - 1].open) / postClimaxCandles[postClimaxCandles.length - 1].open) * 100;

        // 2일 연속 상승 또는 하락 폭 감소
        priceStabilized = (day1Change > 0 && day2Change > 0) || (day1Change < 0 && day2Change > day1Change);
    }

    // 3. 최저가 대비 회복률 체크
    const climaxLow = candles[climaxIndex].low;
    const currentClose = postClimaxCandles[postClimaxCandles.length - 1].close;
    const recoveryPercent = ((currentClose - climaxLow) / climaxLow) * 100;

    // 4. 신호 강도 계산 (0-100)
    let strength = 0;
    if (volumeNormalized) strength += 30;
    if (priceStabilized) strength += 30;
    if (recoveryPercent >= 2.0) strength += 40;

    const isRecovering = volumeNormalized && priceStabilized && recoveryPercent >= 2.0;

    return {
        isRecovering,
        capitulationDate: climaxSignal.climaxDate,
        recoveryStartDate: isRecovering ? postClimaxCandles[postClimaxCandles.length - 1].date : null,
        volumeNormalized,
        priceStabilized,
        strength,
        daysFromBottom: postClimaxCandles.length
    };
}

/**
 * Analyze stock for panic sell recovery pattern
 * 종목의 공포 매도 후 반등 패턴 분석
 */
export async function analyzePanicSellRecovery(
    ticker: string,
    market: MarketTarget
): Promise<{
    volumeClimax: VolumeClimaxSignal;
    capitulationRecovery: CapitulationRecoverySignal;
}> {
    try {
        // Fetch 60 days of data for analysis
        const candles = await fetchDailyCandles(ticker, market, 60);

        if (candles.length < 20) {
            throw new Error('Insufficient data for analysis');
        }

        const volumeClimax = detectVolumeClimax(candles);
        const capitulationRecovery = detectCapitulationRecovery(candles, volumeClimax);

        return {
            volumeClimax,
            capitulationRecovery
        };
    } catch (error) {
        console.error(`[Volume Analysis] Error analyzing ${ticker}:`, error);
        throw error;
    }
}
