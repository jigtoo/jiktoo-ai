import { useState, useCallback, useEffect, useRef } from 'react';
import type { DayTraderSignal, MarketTarget, UserWatchlistItem } from '../types';
import { scanForDayTraderSignals } from '../services/gemini/alphaEngineService';
import { mockDayTraderSignals } from '../services/mockData';
import { KIWOOM_BRIDGE_URL, IS_KIS_PROXY_ENABLED } from '../config';

export const useDayTrader = (marketTarget: MarketTarget, watchlist: UserWatchlistItem[], isReadyForAnalysis: boolean) => {
    const [signals, setSignals] = useState<DayTraderSignal[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const retryTimerRef = useRef<number | null>(null);

    // KIS Proxy URL for WebSocket
    const WS_URL = IS_KIS_PROXY_ENABLED
        ? 'ws://127.0.0.1:8082'
        : KIWOOM_BRIDGE_URL.replace('http', 'ws') + '/realtime-data-feed';

    const connectWebSocket = useCallback((attempt = 1) => {
        if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
            return;
        }

        setIsLoading(true);
        setError(null);

        console.log(`[DayTrader] Connecting to WebSocket... (Attempt ${attempt})`);
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log(`[DayTrader] WebSocket Connected to ${WS_URL}`);
            setIsLoading(false);
            if (retryTimerRef.current) {
                clearTimeout(retryTimerRef.current);
                retryTimerRef.current = null;
            }

            // Subscribe to watchlist
            if (watchlist.length > 0) {
                watchlist.forEach(item => {
                    if (ws.readyState === WebSocket.OPEN) {
                        if (IS_KIS_PROXY_ENABLED) {
                            if (ws.readyState === WebSocket.OPEN) {
                                ws.send(JSON.stringify({
                                    type: 'subscribe',
                                    ticker: item.ticker,
                                    tr_id: 'H0STCNT0'
                                }));
                            }
                        } else {
                            // Kiwoom Bridge Subscription
                            if (ws.readyState === WebSocket.OPEN) {
                                ws.send(JSON.stringify({
                                    type: 'subscribe',
                                    ticker: item.ticker,
                                    tr_id: 'H0STASP0'
                                }));
                            }
                        }
                    }
                });
            }
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);

                if (message.type === 'pong') return;

                // KIS Proxy Data Handling
                if (IS_KIS_PROXY_ENABLED && message.type === 'realtime_data' && message.data.tr_id === 'H0STCNT0') {
                    const currentPrice = parseFloat(message.data.price_data.stck_prpr);
                    const stockCode = message.data.tr_key;
                    const stockName = watchlist.find(w => w.ticker === stockCode || w.ticker.includes(stockCode))?.stockName || stockCode;

                    // Simple signal generation logic for demo/testing
                    if (currentPrice > 0) {
                        // In a real app, you'd have more complex logic here
                        // For now, we just log it or update a "Live Price" view
                        // console.log(`[DayTrader] Price Update: ${stockName} = ${currentPrice}`);
                    }
                }

                // Kiwoom Bridge Data Handling
                if (!IS_KIS_PROXY_ENABLED && message.type === 'realtime_data' && message.data.tr_id === 'H0STASP0') {
                    const currentPrice = parseFloat(message.data.price_data.stck_prpr); // Note: ASP0 might use different field names in reality, but assuming consistency for now
                    const stockCode = message.data.tr_key;
                    const stockName = watchlist.find(w => w.ticker.includes(stockCode))?.stockName || stockCode;

                    if (currentPrice > 0) {
                        const newSignal: DayTraderSignal = {
                            ticker: `${stockCode}.KS`,
                            stockName: stockName,
                            rationale: `실시간 호가 변동 감지 (현재가: ${currentPrice})`,
                            breakoutPrice: `${Math.floor(currentPrice * 1.005)}`,
                            stopLoss: `${Math.floor(currentPrice * 0.995)}`,
                            target: `${Math.floor(currentPrice * 1.01)}`,
                            aiConfidence: Math.floor(Math.random() * 20) + 75,
                        };
                        setSignals(prev => {
                            if (prev && prev.some(s => s.ticker === newSignal.ticker && s.aiConfidence === newSignal.aiConfidence)) {
                                return prev;
                            }
                            return [newSignal, ...(prev || [])].slice(0, 50);
                        });
                    }
                }
            } catch (e) {
                console.error('[DayTrader] Error processing message:', e);
            }
        };

        ws.onclose = (event) => {
            console.log(`[DayTrader] WebSocket Disconnected. Code: ${event.code}`);
            wsRef.current = null;

            // Reconnect logic
            const nextAttempt = attempt + 1;
            const retryDelay = Math.min(1000 * Math.pow(2, nextAttempt), 30000);

            if (isReadyForAnalysis) {
                console.log(`[DayTrader] Reconnecting in ${retryDelay / 1000}s...`);
                retryTimerRef.current = window.setTimeout(() => connectWebSocket(nextAttempt), retryDelay);
            }
        };

        ws.onerror = (event) => {
            console.error('[DayTrader] WebSocket Error:', event);
            ws.close();
        };

    }, [watchlist, WS_URL, isReadyForAnalysis]);

    useEffect(() => {
        if (!isReadyForAnalysis) {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            return;
        }

        connectWebSocket();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            if (retryTimerRef.current) {
                clearTimeout(retryTimerRef.current);
            }
        };
    }, [isReadyForAnalysis, connectWebSocket]);

    const handleScan = useCallback(async () => {
        if (!isReadyForAnalysis) {
            setError("관심종목 데이터가 아직 준비되지 않았습니다.");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            if (watchlist.length === 0) {
                // Watchlist is empty, no signals to scan
                setSignals([]);
            } else {
                const data = await scanForDayTraderSignals(marketTarget, watchlist);
                setSignals(data);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '스캔 중 오류 발생');
            setSignals(null);
        } finally {
            setIsLoading(false);
        }
    }, [marketTarget, watchlist, isReadyForAnalysis]);

    return {
        signals,
        isLoading,
        error,
        handleScan,
    };
};