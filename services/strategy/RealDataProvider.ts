import { MarketDataProvider } from './StrategyEngine';
import { OHLCV } from '../dataService'; // Correct import path
import { TechnicalAnalysis } from './TechnicalAnalysis';

/**
 * Real Market Data Provider
 * Wraps historical OHLCV data and provides indicator values using TechnicalAnalysis utility.
 */
export class RealDataProvider implements MarketDataProvider {
    private candles: OHLCV[];

    constructor(candles: OHLCV[]) {
        // Ensure candles are sorted by date (ascending)
        this.candles = candles.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    public getCandles(): OHLCV[] {
        return this.candles;
    }

    /**
     * Resolves the latest value for a specific indicator.
     * @param indicator Indicator name (e.g., 'SMA', 'RSI', 'PRICE')
     * @param params Parameters (e.g., [20] for SMA 20)
     */
    public getValue(indicator: string, params: any[]): number | null {
        if (!this.candles || this.candles.length === 0) return null;

        const latestCandle = this.candles[this.candles.length - 1];

        // 1. Basic Price Data
        if (indicator === 'PRICE' || indicator === 'CLOSE') return latestCandle.close;
        if (indicator === 'OPEN') return latestCandle.open;
        if (indicator === 'HIGH') return latestCandle.high;
        if (indicator === 'LOW') return latestCandle.low;
        if (indicator === 'VOLUME') return latestCandle.volume;

        // 2. Technical Indicators
        try {
            // Extract close prices for TA
            const closes = this.candles.map(c => c.close);

            switch (indicator) {
                case 'SMA': {
                    const period = Number(params[0]) || 20;
                    const values = TechnicalAnalysis.SMA(closes, period);
                    return values[values.length - 1] ?? null;
                }
                case 'EMA': {
                    const period = Number(params[0]) || 20;
                    const values = TechnicalAnalysis.EMA(closes, period);
                    return values[values.length - 1] ?? null;
                }
                case 'RSI': {
                    const period = Number(params[0]) || 14;
                    const values = TechnicalAnalysis.RSI(closes, period);
                    return values[values.length - 1] ?? null;
                }
                case 'BB_UPPER': {
                    const period = Number(params[0]) || 20;
                    const multiplier = Number(params[1]) || 2;
                    const bands = TechnicalAnalysis.BollingerBands(closes, period, multiplier);
                    return bands.upper[bands.upper.length - 1] ?? null;
                }
                case 'BB_LOWER': {
                    const period = Number(params[0]) || 20;
                    const multiplier = Number(params[1]) || 2;
                    const bands = TechnicalAnalysis.BollingerBands(closes, period, multiplier);
                    return bands.lower[bands.lower.length - 1] ?? null;
                }
                case 'MACD': {
                    // Not implemented in TechnicalAnalysis yet, placeholder
                    return null;
                }
                default:
                    console.warn(`[RealDataProvider] Unknown indicator: ${indicator}`);
                    return null;
            }
        } catch (error) {
            console.error(`[RealDataProvider] Error calculating ${indicator}:`, error);
            return null;
        }
    }

    /**
     * Checks if a crossover occurred recently (e.g., in the last candle).
     */
    public checkCrossover(indicatorA: string, paramsA: any[], indicatorB: string, paramsB: any[], direction: 'UP' | 'DOWN'): boolean {
        if (this.candles.length < 2) return false;

        // Get values for Today (T) and Yesterday (T-1)
        const valA_T = this.getValueAtOffset(indicatorA, paramsA, 0);
        const valA_Prev = this.getValueAtOffset(indicatorA, paramsA, 1);

        const valB_T = this.getValueAtOffset(indicatorB, paramsB, 0);
        const valB_Prev = this.getValueAtOffset(indicatorB, paramsB, 1);

        if (valA_T === null || valA_Prev === null || valB_T === null || valB_Prev === null) return false;

        if (direction === 'UP') {
            // Golden Cross: A was below B yesterday, A is above B today
            return valA_Prev <= valB_Prev && valA_T > valB_T;
        } else {
            // Dead Cross: A was above B yesterday, A is below B today
            return valA_Prev >= valB_Prev && valA_T < valB_T;
        }
    }

    /**
     * Helper to get value at a specific offset from the end (0 = latest, 1 = previous)
     */
    private getValueAtOffset(indicator: string, params: any[], offset: number): number | null {
        if (offset < 0 || offset >= this.candles.length) return null;

        const targetIndex = this.candles.length - 1 - offset;
        if (targetIndex < 0) return null;

        if (indicator === 'PRICE' || indicator === 'CLOSE') return this.candles[targetIndex].close;

        // Extract closes
        const closes = this.candles.map(c => c.close);

        return this.calculateAndPick(indicator, params, targetIndex, closes);
    }

    private calculateAndPick(indicator: string, params: any[], index: number, closes: number[]): number | null {
        switch (indicator) {
            case 'SMA': {
                const values = TechnicalAnalysis.SMA(closes, Number(params[0]) || 20);
                return values[index] ?? null;
            }
            case 'EMA': {
                const values = TechnicalAnalysis.EMA(closes, Number(params[0]) || 20);
                return values[index] ?? null;
            }
            case 'RSI': {
                const values = TechnicalAnalysis.RSI(closes, Number(params[0]) || 14);
                return values[index] ?? null;
            }
            case 'BB_UPPER': {
                const bands = TechnicalAnalysis.BollingerBands(closes, Number(params[0]) || 20, Number(params[1]) || 2);
                return bands.upper[index] ?? null;
            }
            case 'BB_LOWER': {
                const bands = TechnicalAnalysis.BollingerBands(closes, Number(params[0]) || 20, Number(params[1]) || 2);
                return bands.lower[index] ?? null;
            }
            default: return null;
        }
    }
}
