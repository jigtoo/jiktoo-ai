// services/technicalAnalysis.ts
/**
 * Technical Analysis Utilities for Daily Leader Selection
 * MACD, Moving Averages, and Price Action Analysis
 */

import type { OHLCV } from './dataService';

export interface MACDResult {
    macd: number;
    signal: number;
    histogram: number;
    isBullish: boolean;  // MACD > Signal
}

export interface MovingAveragePosition {
    above20MA: boolean;
    above120MA: boolean;
    above240MA: boolean;
    ma20: number;
    ma120: number;
    ma240: number;
}

export interface IntradayPriceChange {
    openPrice: number;
    closePrice: number;
    changePercent: number;
    isUp5Percent: boolean;
}

/**
 * Calculate EMA (Exponential Moving Average)
 */
function calculateEMA(prices: number[], period: number): number[] {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);

    // First EMA is SMA
    let sum = 0;
    for (let i = 0; i < period; i++) {
        sum += prices[i];
    }
    ema[period - 1] = sum / period;

    // Calculate remaining EMAs
    for (let i = period; i < prices.length; i++) {
        ema[i] = (prices[i] - ema[i - 1]) * multiplier + ema[i - 1];
    }

    return ema;
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 * Default: MACD(12, 26, 9)
 */
export function calculateMACD(
    candles: OHLCV[],
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9
): MACDResult | null {
    if (candles.length < slowPeriod + signalPeriod) {
        return null;
    }

    const closePrices = candles.map(c => c.close);

    // Calculate 12-day and 26-day EMAs
    const ema12 = calculateEMA(closePrices, fastPeriod);
    const ema26 = calculateEMA(closePrices, slowPeriod);

    // Calculate MACD line
    const macdLine: number[] = [];
    for (let i = slowPeriod - 1; i < ema12.length; i++) {
        macdLine.push(ema12[i] - ema26[i]);
    }

    // Calculate Signal line (9-day EMA of MACD)
    const signalLine = calculateEMA(macdLine, signalPeriod);

    // Get latest values
    const latestMACD = macdLine[macdLine.length - 1];
    const latestSignal = signalLine[signalLine.length - 1];
    const histogram = latestMACD - latestSignal;

    return {
        macd: latestMACD,
        signal: latestSignal,
        histogram,
        isBullish: latestMACD > latestSignal
    };
}

/**
 * Calculate Simple Moving Average
 */
function calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return 0;

    const recentPrices = prices.slice(-period);
    const sum = recentPrices.reduce((acc, price) => acc + price, 0);
    return sum / period;
}

/**
 * Check Moving Average Position
 * Returns whether current price is above 20MA, 120MA, 240MA
 */
export function checkMovingAveragePosition(candles: OHLCV[]): MovingAveragePosition | null {
    if (candles.length < 240) {
        return null;
    }

    const closePrices = candles.map(c => c.close);
    const currentPrice = closePrices[closePrices.length - 1];

    const ma20 = calculateSMA(closePrices, 20);
    const ma120 = calculateSMA(closePrices, 120);
    const ma240 = calculateSMA(closePrices, 240);

    return {
        above20MA: currentPrice > ma20,
        above120MA: currentPrice > ma120,
        above240MA: currentPrice > ma240,
        ma20,
        ma120,
        ma240
    };
}

/**
 * Calculate Intraday Price Change
 * Returns percentage change from open to close
 */
export function calculateIntradayChange(candle: OHLCV): IntradayPriceChange {
    const changePercent = ((candle.close - candle.open) / candle.open) * 100;

    return {
        openPrice: candle.open,
        closePrice: candle.close,
        changePercent,
        isUp5Percent: changePercent >= 5.0
    };
}

/**
 * Check if volume is significant compared to 120-day average
 */
export function isVolumeSignificant(
    candles: OHLCV[],
    threshold: number = 1.5  // 평균 대비 1.5배 이상
): { isSignificant: boolean; volumeRatio: number; avgVolume: number } {
    if (candles.length < 120) {
        return { isSignificant: false, volumeRatio: 0, avgVolume: 0 };
    }

    // Calculate 120-day average volume
    const recentCandles = candles.slice(-120);
    const totalVolume = recentCandles.reduce((sum, c) => sum + c.volume, 0);
    const avgVolume = totalVolume / 120;

    // Compare today's volume
    const todayVolume = candles[candles.length - 1].volume;
    const volumeRatio = todayVolume / avgVolume;

    return {
        isSignificant: volumeRatio >= threshold,
        volumeRatio,
        avgVolume
    };
}

/**
 * Comprehensive Daily Leader Analysis
 * Combines all criteria for daily leader selection
 */
export interface DailyLeaderCriteria {
    macd: MACDResult | null;
    movingAverage: MovingAveragePosition | null;
    intradayChange: IntradayPriceChange;
    volumeSignificance: { isSignificant: boolean; volumeRatio: number; avgVolume: number };
    meetsAllCriteria: boolean;
    score: number;  // 0-100
}

export function analyzeDailyLeaderCriteria(candles: OHLCV[]): DailyLeaderCriteria {
    if (candles.length === 0) {
        return {
            macd: null,
            movingAverage: null,
            intradayChange: { openPrice: 0, closePrice: 0, changePercent: 0, isUp5Percent: false },
            volumeSignificance: { isSignificant: false, volumeRatio: 0, avgVolume: 0 },
            meetsAllCriteria: false,
            score: 0
        };
    }

    const macd = calculateMACD(candles);
    const movingAverage = checkMovingAveragePosition(candles);
    const intradayChange = calculateIntradayChange(candles[candles.length - 1]);
    const volumeSignificance = isVolumeSignificant(candles);

    // Calculate score
    let score = 0;
    if (macd?.isBullish) score += 25;
    if (movingAverage?.above20MA) score += 25;
    if (intradayChange.isUp5Percent) score += 25;
    if (volumeSignificance.isSignificant) score += 25;

    // Check if meets all criteria
    const meetsAllCriteria =
        (macd?.isBullish ?? false) &&
        (movingAverage?.above20MA ?? false) &&
        intradayChange.isUp5Percent &&
        volumeSignificance.isSignificant;

    return {
        macd,
        movingAverage,
        intradayChange,
        volumeSignificance,
        meetsAllCriteria,
        score
    };
}
