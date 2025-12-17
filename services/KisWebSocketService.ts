// services/KisWebSocketService.ts
/**
 * KIS WebSocket Service for Real-time Stock Quotes
 * Connects through kis-proxy WebSocket relay for stable real-time data
 * Supports both Korean (KR) and US markets
 */

import { MarketTarget } from '../types';
import { KIS_WS_PROXY_URL } from '../config';

interface StockQuote {
    ticker: string;
    price: number;
    changeRate: number;
    volume: number;
    timestamp: string;
}

type QuoteCallback = (quote: StockQuote) => void;

class KisWebSocketService {
    private ws: WebSocket | null = null;
    private config: KisWebSocketConfig | null = null;
    private subscriptions: Map<string, QuoteCallback[]> = new Map();
    private priceCache: Map<string, StockQuote> = new Map();
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private reconnectDelay: number = 3000;
    private isConnecting: boolean = false;

    /**
     * Initialize WebSocket connection to kis-proxy relay
     */
    async connect(): Promise<void> {
        if (this.ws?.readyState === WebSocket.OPEN) {
            console.log('[KIS WebSocket] Already connected');
            return;
        }

        if (this.isConnecting) {
            console.log('[KIS WebSocket] Connection in progress');
            return;
        }

        this.isConnecting = true;

        try {
            // Connect to kis-proxy WebSocket relay
            const wsUrl = KIS_WS_PROXY_URL;

            console.log(`[KIS WebSocket] Connecting to kis-proxy relay at ${wsUrl}`);

            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('[KIS WebSocket] Connected to kis-proxy successfully');
                this.isConnecting = false;
                this.reconnectAttempts = 0;
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (error) {
                    console.error('[KIS WebSocket] Failed to parse message:', error);
                }
            };

            this.ws.onerror = (error) => {
                console.error('[KIS WebSocket] Error:', error);
                this.isConnecting = false;
            };

            this.ws.onclose = () => {
                console.log('[KIS WebSocket] Connection closed');
                this.isConnecting = false;
                this.ws = null;

                // Auto-reconnect
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    console.log(`[KIS WebSocket] Reconnecting (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
                    setTimeout(() => {
                        this.connect();
                    }, this.reconnectDelay * this.reconnectAttempts);
                }
            };

        } catch (error) {
            console.error('[KIS WebSocket] Connection error:', error);
            this.isConnecting = false;
            throw error;
        }
    }

    // Note: kis-proxy handles authentication, so we don't need to send approval key

    /**
     * Subscribe to real-time quotes for a stock via kis-proxy
     */
    subscribe(ticker: string, marketTarget: MarketTarget, callback: QuoteCallback) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn('[KIS WebSocket] Not connected, cannot subscribe');
            return;
        }

        // Add callback to subscriptions
        if (!this.subscriptions.has(ticker)) {
            this.subscriptions.set(ticker, []);
        }
        this.subscriptions.get(ticker)!.push(callback);

        // Send subscription message to kis-proxy relay
        const trId = marketTarget === 'US' ? 'HDFSCNT0' : 'H0STCNT0';
        const stockCode = this.formatTicker(ticker, marketTarget);

        const subscribeMessage = {
            type: 'subscribe',
            ticker: ticker,
            tr_id: trId
        };

        this.ws.send(JSON.stringify(subscribeMessage));
        console.log(`[KIS WebSocket] Subscribed to ${ticker} (${marketTarget}) via kis-proxy`);
    }

    /**
     * Unsubscribe from real-time quotes
     */
    unsubscribe(ticker: string, marketTarget: MarketTarget) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return;
        }

        this.subscriptions.delete(ticker);

        const unsubscribeMessage = {
            type: 'unsubscribe',
            ticker: ticker
        };

        this.ws.send(JSON.stringify(unsubscribeMessage));
        console.log(`[KIS WebSocket] Unsubscribed from ${ticker}`);
    }

    /**
     * Handle incoming WebSocket messages from kis-proxy relay
     */
    private handleMessage(data: any) {
        try {
            // Handle kis-proxy relay message format
            if (data.type === 'realtime_data' && data.data) {
                const { tr_key, price_data } = data.data;

                // Extract stock quote data from kis-proxy format
                const ticker = tr_key;
                const price = parseFloat(price_data.stck_prpr || price_data.last || 0);
                const changeRate = parseFloat(price_data.prdy_ctrt || price_data.chg_rate || 0);
                const volume = parseInt(price_data.acml_vol || price_data.volume || 0);

                const quote: StockQuote = {
                    ticker,
                    price,
                    changeRate,
                    volume,
                    timestamp: new Date().toISOString()
                };

                // Update cache
                this.priceCache.set(ticker, quote);

                // Notify subscribers
                const callbacks = this.subscriptions.get(ticker);
                if (callbacks) {
                    callbacks.forEach(cb => cb(quote));
                }
            }

        } catch (error) {
            console.error('[KIS WebSocket] Error handling message:', error);
        }
    }

    /**
     * Format ticker for KIS WebSocket
     */
    private formatTicker(ticker: string, marketTarget: MarketTarget): string {
        if (marketTarget === 'US') {
            // US stocks: remove any suffix and use plain ticker
            return ticker.replace(/\.(.*?)$/, '');
        } else {
            // KR stocks: remove .KS or .KQ suffix
            return ticker.replace(/\.(KS|KQ)$/, '');
        }
    }

    /**
     * Parse ticker from WebSocket response
     */
    private parseTicker(output: any): string {
        return output.stck_shrn_iscd || output.symb || '';
    }

    /**
     * Get cached price for a stock
     */
    getCachedPrice(ticker: string): StockQuote | null {
        return this.priceCache.get(ticker) || null;
    }

    /**
     * Check if connected
     */
    isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    /**
     * Disconnect WebSocket
     */
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.subscriptions.clear();
        this.priceCache.clear();
        console.log('[KIS WebSocket] Disconnected');
    }
}

// Singleton instance
export const kisWebSocketService = new KisWebSocketService();
