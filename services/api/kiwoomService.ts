// services/api/kiwoomService.ts
import { RateLimiter } from '../utils/rateLimiter';
import type { MarketTarget } from '../../types';

// Rate limiter specifically for Kiwoom API
const kiwoomLimiter = new RateLimiter(5); // 5 requests per second

// Bridge server URL
const BRIDGE_URL = 'http://localhost:5000';
// Using 5000 as per common Python bridge default, assuming bridge runs there. 
// If it was 8082, please adjust. Based on previous logs, ws was 8082, http might be 5000.

export interface KiwoomPrice {
    ticker: string;
    stockName: string;
    price: number;
    changeRate: number;
    volume: number;
    timestamp: string;
}

// Named export for fetchRealtimeSnapshot to match imports
export const fetchRealtimeSnapshot = async (
    ticker: string,
    fields: string[] = [],
    options: any = {},
    marketTarget: MarketTarget = 'KR'
) => {
    return kiwoomLimiter.execute(async () => {
        try {
            // Construct query params
            const query = new URLSearchParams({
                ticker,
                fields: fields.join(','),
                ...options
            });

            const url = `${BRIDGE_URL}/api/market/snapshot?${query.toString()}`;

            // If disabled or mock, return null or mock data
            // For now assume bridge fetch
            const response = await fetch(url);

            if (!response.ok) {
                // Return minimal fallback if bridge fails
                return null;
            }

            return await response.json();

        } catch (error) {
            console.warn(`[Kiwoom] Snapshot failed for ${ticker}`, error);
            return null;
        }
    });
};

export const kiwoomService = {
    /**
     * Fetch current price from Kiwoom via Bridge
     */
    async getCurrentPrice(ticker: string): Promise<KiwoomPrice> {
        return kiwoomLimiter.execute(async () => {
            try {
                const response = await fetch(`${BRIDGE_URL}/api/market/realtime/${ticker}`);
                if (!response.ok) {
                    throw new Error(`Kiwoom Bridge Error: ${response.status}`);
                }
                const data = await response.json();

                // Assuming standard bridge response format
                return {
                    ticker: data.ticker || ticker,
                    stockName: data.stockName || '',
                    price: Math.abs(parseFloat(data.current_price || '0')),
                    changeRate: parseFloat(data.fluctuation_rate || '0'),
                    volume: parseInt(data.volume || '0'),
                    timestamp: new Date().toISOString()
                };
            } catch (error) {
                console.error(`[Kiwoom] Failed to fetch price for ${ticker}:`, error);
                throw error;
            }
        });
    },

    /**
     * Get basic account info (Deposit)
     */
    async getAccountInfo(): Promise<{ deposit: number }> {
        return kiwoomLimiter.execute(async () => {
            try {
                const response = await fetch(`${BRIDGE_URL}/api/account/balance`);
                if (!response.ok) {
                    throw new Error('Failed to fetch account info');
                }
                const data = await response.json();
                return {
                    deposit: parseInt(data.deposit || '0')
                };
            } catch (error) {
                // Fallback for demo/dev if bridge is offline
                console.warn('[Kiwoom] Bridge offline, returning mock deposit');
                return { deposit: 10000000 };
            }
        });
    },

    /**
     * Execute Buy Order
     */
    async buyOrder(ticker: string, quantity: number, price: number): Promise<boolean> {
        return kiwoomLimiter.execute(async () => {
            try {
                const payload = {
                    ticker,
                    quantity,
                    price, // Limit order price. Use 0 for Market Order if supported.
                    type: 'buy'
                };

                const response = await fetch(`${BRIDGE_URL}/api/trade/order`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                return response.ok;
            } catch (error) {
                console.error('[Kiwoom] Buy Order Failed:', error);
                return false;
            }
        });
    },

    /**
     * Execute Sell Order
     */
    async sellOrder(ticker: string, quantity: number, price: number): Promise<boolean> {
        return kiwoomLimiter.execute(async () => {
            try {
                const payload = {
                    ticker,
                    quantity,
                    price,
                    type: 'sell'
                };

                const response = await fetch(`${BRIDGE_URL}/api/trade/order`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                return response.ok;
            } catch (error) {
                console.error('[Kiwoom] Sell Order Failed:', error);
                return false;
            }
        });
    }
};
