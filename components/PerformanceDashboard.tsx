// components/PerformanceDashboard.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';

interface TradeRecord {
    id: string;
    type: 'BUY' | 'SELL';
    ticker: string;
    stock_name: string;
    price: number;
    quantity: number;
    amount: number;
    outcome: string;
    profit_loss: number;
    profit_loss_rate: number;
    created_at?: string;
}

interface PerformanceDashboardProps {
    marketTarget?: 'KR' | 'US';
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ marketTarget = 'KR' }) => {
    const [trades, setTrades] = useState<TradeRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTrades = async () => {
            if (!supabase) {
                setError('Supabase client not initialized');
                setLoading(false);
                return;
            }

            try {
                const { data, error: fetchError } = await supabase
                    .from('shadow_trader_trades')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(200);

                if (fetchError) {
                    console.error('[PerformanceDashboard] Failed to fetch trades:', fetchError);
                    setError(fetchError.message || 'Failed to fetch trades');
                } else {
                    setTrades((data || []) as TradeRecord[]);
                    setError(null);
                }
            } catch (err) {
                console.error('[PerformanceDashboard] Exception fetching trades:', err);
                setError('Unexpected error fetching trades');
            } finally {
                setLoading(false);
            }
        };
        fetchTrades();
    }, []);

    // Compute basic stats
    const filteredTrades = trades.filter(t => {
        // Primitive way to distinguish markets if no market column explicitly stored
        // KR tickers are often 6 digits. US tickers are letters.
        const isKR = /^\d{6}$/.test(t.ticker);
        return marketTarget === 'KR' ? isKR : !isKR;
    });

    const totalTrades = filteredTrades.length;
    const winTrades = filteredTrades.filter(t => t.outcome === 'WIN').length;
    const winRate = totalTrades ? (winTrades / totalTrades) * 100 : 0;
    const totalProfit = filteredTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
    const avgProfit = totalTrades ? totalProfit / totalTrades : 0;

    const formatMoney = (amount: number) => {
        if (marketTarget === 'US') {
            return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        return `${Math.floor(amount).toLocaleString()}원`;
    };

    return (
        <div className="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700 mb-6">
            <h3 className="text-lg font-bold text-gray-200 mb-3">📈 Performance Dashboard ({marketTarget})</h3>
            {loading ? (
                <p className="text-gray-400">Loading performance data...</p>
            ) : error ? (
                <div className="text-yellow-400 text-sm">
                    <p>⚠️ {error}</p>
                    <p className="text-xs text-gray-500 mt-2">거래 데이터를 불러올 수 없습니다. RLS 정책을 확인하세요.</p>
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <p className="text-sm text-gray-400">Total Trades</p>
                        <p className="text-xl font-mono text-white">{totalTrades}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-400">Win Rate</p>
                        <p className="text-xl font-mono text-green-400">{winRate.toFixed(1)}%</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-400">Avg Profit</p>
                        <p className={`text-xl font-mono ${avgProfit >= 0 ? 'text-yellow-400' : 'text-blue-400'}`}>
                            {formatMoney(avgProfit)}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
