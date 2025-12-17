// services/api/marketData.ts
import { MarketTarget } from '../../types';

export interface GlobalMarketData {
    indexValue: number;
    changeRate: number;
    topSectors: string[];
}

export const fetchGlobalMarketData = async (market: MarketTarget): Promise<GlobalMarketData> => {
    // Mock Data for now, should connect to real API later
    if (market === 'KR') {
        return {
            indexValue: 2650.45,
            changeRate: 0.75,
            topSectors: ['Semiconductors', 'Automotive', 'Bio']
        };
    } else {
        return {
            indexValue: 5120.30,
            changeRate: -0.21,
            topSectors: ['Tech', 'Healthcare', 'Energy']
        };
    }
}
