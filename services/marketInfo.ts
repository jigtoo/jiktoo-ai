// services/marketInfo.ts
import { MarketTarget } from '../types';

export interface MarketInfoType {
    name: string;
    currency: string;
    vixProxy: string;
    marketOpen: string;
    marketClose: string;
    pennyStockThreshold?: number; // Added optional field
}

export const MARKET_INFO: Record<MarketTarget, MarketInfoType> = {
    KR: {
        name: 'South Korea (KOSPI/KOSDAQ)',
        currency: 'KRW',
        vixProxy: 'KOSPI Volatility',
        marketOpen: '09:00',
        marketClose: '15:30',
        pennyStockThreshold: 2000
    },
    US: {
        name: 'United States (NYSE/NASDAQ)',
        currency: 'USD',
        vixProxy: 'VIX',
        marketOpen: '09:30', // EST local
        marketClose: '16:00', // EST local
        pennyStockThreshold: 5
    }
};

export const getMarketInfo = (target: MarketTarget) => MARKET_INFO[target];

// Alias for backward compatibility (This fixes the import error)
export const marketInfo = MARKET_INFO;
