// services/strategy/StrategyEngine.ts

import { LogicGroup } from '../../types';
import { evaluateStrategyLatest, Bar } from './BacktestEngine';
import { RealDataProvider } from './RealDataProvider';

/**
 * Interface for the Data Provider that the engine uses to resolve indicators.
 * It abstracts away the raw price data array.
 */
export interface MarketDataProvider {
    getValue(indicator: string, params: any[]): number | null;
    checkCrossover(indicatorA: string, paramsA: any[], indicatorB: string, paramsB: any[], direction: 'UP' | 'DOWN'): boolean;
    // New: Access to raw candles for BacktestEngine compatibility
    getCandles?(): any[];
}

/**
 * Strategy Engine 2.0 (Unified with BacktestEngine)
 * Evaluates the LogicGroup tree using the robust parsing logic from BacktestEngine.
 */
export class StrategyEngine {

    public evaluate(logic: LogicGroup, dataProvider: MarketDataProvider): boolean {
        // 1. Try to get raw candles for the advanced engine
        let candles: any[] = [];

        if (typeof (dataProvider as any).getCandles === 'function') {
            candles = (dataProvider as any).getCandles();
        } else if (dataProvider instanceof RealDataProvider) {
            candles = (dataProvider as RealDataProvider).getCandles();
        } else {
            console.warn('[StrategyEngine] Provider does not support raw candle access. Falling back to legacy evaluation (Not Implemented).');
            return false;
        }

        if (!candles || candles.length === 0) return false;

        // 2. Map to Bar interface
        const bars: Bar[] = candles.map(c => ({
            t: new Date(c.date).getTime(),
            o: c.open,
            h: c.high,
            l: c.low,
            c: c.close,
            v: c.volume
        }));

        // 3. Evaluate using BacktestEngine's Universal Evaluator
        return evaluateStrategyLatest(logic, bars);
    }
}
