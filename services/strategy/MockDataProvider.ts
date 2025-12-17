// services/strategy/MockDataProvider.ts

import { MarketDataProvider } from './StrategyEngine';

export class MockDataProvider implements MarketDataProvider {
    private ticker: string;

    constructor(ticker: string) {
        this.ticker = ticker;
    }

    getValue(indicator: string, params: any[]): number | null {
        // In a real implementation, this would query the AlphaEngine or cache.
        // For MVP demo, we return random but realistic values to trigger some matches randomly.

        switch (indicator) {
            case 'Close': return this.randomPrice(100, 200);
            case 'Open': return this.randomPrice(100, 200);
            case 'High': return this.randomPrice(100, 200);
            case 'Low': return this.randomPrice(100, 200);
            case 'Volume': return Math.floor(Math.random() * 1000000);
            case 'RSI': return Math.random() * 100; // 0-100
            case 'SMA': return this.randomPrice(90, 210);
            case 'BollingerBandWidth': return Math.random() * 0.5; // 0 - 0.5
            case 'BollingerBandUpper': return this.randomPrice(110, 220);
            default: return Math.random() * 100;
        }
    }

    checkCrossover(indicatorA: string, paramsA: any[], indicatorB: string, paramsB: any[], direction: 'UP' | 'DOWN'): boolean {
        // Randomly return true for demo purposes (approx 5% chance)
        return Math.random() > 0.95;
    }

    private randomPrice(min: number, max: number): number {
        return Math.random() * (max - min) + min;
    }
}
