// components/ShadowDashboard.tsx
import React, { useEffect, useState } from 'react';
// import { virtualTradingService, VirtualAccount } from '../services/VirtualTradingService'; // REMOVED: Backend Service
// import { autoPilotService } from '../services/AutoPilotService'; // REMOVED: Backend Service
import { useAITrader } from '../hooks/useAITrader'; // NEW: Hook
import { supabase } from '../services/supabaseClient';
// import { marketRegimeService, MarketRegimeStatus } from '../services/MarketRegimeService'; // REMOVED: Backend Service
// import { isMockDataEnabled } from '../services/dataService'; // REMOVED: Backend Service (causes 500)
import { MarketRegimeStatus } from '../types';
import { SniperTriggerAlert } from './SniperTriggerAlert';
import { PerformanceDashboard } from './PerformanceDashboard';
import { TelegramNotificationSettings } from './TelegramNotificationSettings';
import { MarketRegimeIndicator } from './MarketRegimeIndicator';
import { formatStockDisplay, enhanceStockName } from '../utils/stockDisplay';
import { sendSystemCommand } from '../utils/commandSender';
import type { MarketTarget, TradingStrategy, VirtualAccount } from '../types';

interface ShadowDashboardProps {
    marketTarget?: MarketTarget;
}

export const ShadowDashboard: React.FC<ShadowDashboardProps> = ({ marketTarget = 'KR' }) => {
    // const [account, setAccount] = useState<VirtualAccount | null>(null); // Replaced by hook
    const [isAutoPilotOn, setIsAutoPilotOn] = useState(true); // [Auto-Start] Default to ON
    const [regimeStatus, setRegimeStatus] = useState<MarketRegimeStatus | null>(null);
    const [recentLessons, setRecentLessons] = useState<{ date: string; lesson: string; score: number }[]>([]);
    const isMock = false; // Default to false in frontend, or fetch from config API if needed

    // Use the Hook!
    const { portfolio, tradeLogs, activeStyle, allPortfolios } = useAITrader(marketTarget, null, null);

    // [Unified] Use the single confirmed portfolio directly
    // If portfolio is null (loading or empty), defaults will handle it.

    // Fallback constants
    const DEFAULT_CAPITAL = marketTarget === 'KR' ? 50000000 : 30000;

    const account: VirtualAccount = {
        cash: portfolio?.cash ?? DEFAULT_CAPITAL,
        totalAsset: portfolio?.currentValue ?? DEFAULT_CAPITAL,
        positions: (portfolio?.holdings || []).map(h => ({
            ticker: h.ticker,
            stockName: (h.stockName && h.stockName !== h.ticker) ? h.stockName : enhanceStockName(h.ticker, h.ticker),
            avgPrice: h.entryPrice,
            quantity: h.quantity,
            currentPrice: h.currentPrice || h.entryPrice, // Use real-time price if available
            profitRate: 0,
            profitAmount: 0,
            strategy: (h as any)._strategy as 'DAY' | 'SWING' | 'LONG' || 'SWING',
            isFallback: h.isFallback // [New] Propagate fallback status
        })),
        tradeLogs: tradeLogs.map(l => ({
            id: l.id,
            timestamp: new Date(l.timestamp).getTime(),
            type: l.type as 'BUY' | 'SELL',
            ticker: l.ticker,
            stockName: l.stockName,
            price: l.price,
            quantity: l.quantity,
            amount: l.price * l.quantity,
            fee: 0,
            balanceAfter: 0,
            reason: l.reason
        })),
        initialCapital: portfolio?.initialCapital ?? DEFAULT_CAPITAL
    };

    // For "Global War Chest" - Uses data fetched for BOTH markets
    const allAccounts = {
        KR: allPortfolios?.KR || null,
        US: allPortfolios?.US || null
    };

    // [FRONTEND FIX] Fetch Regime Status from DB instead of backend service
    useEffect(() => {
        if (!supabase) return;

        const fetchRegime = async () => {
            const { data, error } = await supabase
                .from('market_regime_logs')
                .select('*')
                .eq('market', marketTarget)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (data) {
                const row = data as any;
                setRegimeStatus({
                    regime: row.regime,
                    score: row.score,
                    confidence: row.confidence,
                    factors: row.factors,
                    detailedFactors: row.detailed_factors,
                    recommendedExposure: row.recommended_exposure,
                    timestamp: new Date(row.created_at).getTime(),
                } as MarketRegimeStatus);
            }
        };

        fetchRegime();

        // Poll every 30s
        const interval = setInterval(fetchRegime, 30000);

        // Optional: Realtime subscription
        const channel = supabase.channel('regime_changes')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'market_regime_logs' }, payload => {
                if (payload.new.market === marketTarget) fetchRegime();
            })
            .subscribe();

        // Fetch AI Lessons (Moved inside)
        const fetchLessons = async () => {
            if (!supabase) return;
            const { data } = await supabase
                .from('ai_trade_journals')
                .select('created_at, lessons_learned, score')
                .order('created_at', { ascending: false })
                .limit(3);

            if (data) {
                setRecentLessons((data as any[]).map(d => ({
                    date: new Date(d.created_at).toLocaleDateString(),
                    lesson: d.lessons_learned,
                    score: d.score
                })));
            }
        };
        fetchLessons();

        return () => {
            clearInterval(interval);
            supabase.removeChannel(channel);
        };
    }, [marketTarget]);

    const toggleAutoPilot = async () => {
        // Optimistic Toggle or wait for confirmation
        const newState = !isAutoPilotOn;
        setIsAutoPilotOn(newState); // Optimistic UI update

        const cmd = newState ? 'START_AUTOPILOT' : 'STOP_AUTOPILOT';
        const success = await sendSystemCommand(cmd);
        if (success) {
            alert(`명령 전송 완료: ${cmd}. (${newState ? 'ON' : 'OFF'})`);
        } else {
            alert('명령 전송 실패. DB 연결을 확인하세요.');
            setIsAutoPilotOn(!newState); // Revert on failure
        }
    };


    const resetAccount = () => {
        alert("Reset temporarily disabled in Dashboard (Safety Mode).");
    };

    // Strategy is now auto-selected by AI, no manual intervention needed

    if (!account) return <div>Loading Shadow Trader...</div>;

    const totalReturn = ((account.totalAsset - account.initialCapital) / account.initialCapital) * 100;
    const winCount = account.tradeLogs.filter(l => l.type === 'SELL' && l.amount > (l.price * l.quantity)).length;
    const totalTrades = account.tradeLogs.filter(l => l.type === 'SELL').length;
    const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;

    return (
        <>
            <SniperTriggerAlert />
            <div className="bg-gray-900 text-white p-6 rounded-xl shadow-2xl border border-gray-700">
                <header className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 flex items-center gap-2">
                            🌑 SHADOW TRADER
                            {isMock && <span className="text-xs bg-yellow-500 text-black px-2 py-0.5 rounded-full font-extrabold tracking-tighter">TEST MODE</span>}
                        </h2>
                        <p className="text-xs text-gray-400">Autonomous Virtual Trading Engine {isMock && '(Using Synthetic Data)'}</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={toggleAutoPilot}
                            className={`px-4 py-2 rounded-lg font-bold transition-all ${isAutoPilotOn
                                ? 'bg-green-600 hover:bg-green-500 animate-pulse'
                                : 'bg-gray-700 hover:bg-gray-600'
                                }`}
                        >
                            {isAutoPilotOn ? '🟢 AUTO-PILOT ON' : '🔴 AUTO-PILOT OFF'}
                        </button>
                        <button
                            onClick={async () => {
                                const success = await sendSystemCommand('SYNC_ACCOUNT');
                                if (success) {
                                    alert('동기화 명령 전송 완료. 서버 로그를 확인하세요.');
                                } else {
                                    alert('명령 전송 실패.');
                                }
                            }}
                            className="px-3 py-2 bg-green-900/50 hover:bg-green-800 rounded-lg text-xs text-green-200"
                        >
                            🔄 계좌 동기화 (원격)
                        </button>
                        <button onClick={resetAccount} className="px-3 py-2 bg-red-900/50 hover:bg-red-800 rounded-lg text-xs text-red-200">
                            Reset
                        </button>
                    </div>
                </header>

                {/* Market Regime Card */}
                {regimeStatus && (
                    <div className="bg-gray-800 p-4 rounded-lg mb-6 border border-gray-600 bg-gradient-to-r from-gray-800 to-gray-900">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Market Regime (시장 국면)</h3>
                                <div className="text-2xl font-bold text-white flex items-center gap-3 mt-1">
                                    <span className={`${regimeStatus.score >= 60 ? 'text-red-400' : regimeStatus.score <= 40 ? 'text-blue-400' : 'text-yellow-400'}`}>
                                        {regimeStatus.regime.replace('_', ' ')}
                                    </span>
                                    <span className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300 font-mono">Score: {regimeStatus.score}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-gray-400 text-xs font-semibold">Recommended Exposure (비중)</div>
                                <div className={`text-2xl font-mono font-bold ${regimeStatus.recommendedExposure > 0.5 ? 'text-green-400' : 'text-orange-400'}`}>
                                    {(regimeStatus.recommendedExposure * 100).toFixed(0)}%
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                            <div className="bg-gray-700/30 p-2 rounded border border-gray-700">
                                <span className="text-gray-400 block mb-1">Macro (거시경제)</span>
                                <span className="font-bold text-white text-sm">{regimeStatus.factors.macro}</span>
                            </div>
                            <div className="bg-gray-700/30 p-2 rounded border border-gray-700">
                                <span className="text-gray-400 block mb-1">Technical (기술적)</span>
                                <span className="font-bold text-white text-sm">{regimeStatus.factors.technical}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* AI Evolution Log (Lessons Learned) */}
                {recentLessons.length > 0 && (
                    <div className="bg-gray-800 p-4 rounded-lg mb-6 border border-gray-600">
                        <h3 className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
                            🧠 AI Evolution Log (최근 학습된 교훈)
                            <span className="animate-pulse w-2 h-2 rounded-full bg-green-500"></span>
                        </h3>
                        <div className="space-y-2">
                            {recentLessons.map((item, idx) => (
                                <div key={idx} className="bg-gray-700/50 p-3 rounded border-l-4 border-purple-500">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs text-gray-400">{item.date}</span>
                                        <span className="text-xs font-bold text-yellow-400">Score: {item.score}</span>
                                    </div>
                                    <p className="text-sm text-gray-200 italic">"{item.lesson}"</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Market Regime Indicator */}
                <div className="mb-6">
                    <MarketRegimeIndicator status={regimeStatus} marketTarget={marketTarget} />
                </div>


                {/* Strategy Performance Dashboard */}
                <div className="bg-gray-800 p-4 rounded-lg mb-6 border border-gray-600">
                    <h3 className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-3">
                        전략별 성과 (Strategy Performance)
                        <span className="ml-2 text-cyan-400 text-xs font-normal">자율 선택 모드</span>
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                        {(['DAY', 'SWING', 'LONG'] as TradingStrategy[]).map((strategy) => {
                            // Calculate strategy-specific stats
                            const strategyTrades = account.tradeLogs.filter(log =>
                                log.reason?.includes(`[${strategy}]`)
                            );
                            const sellTrades = strategyTrades.filter(log => log.type === 'SELL');
                            const profitableTrades = sellTrades.filter(log => log.amount > (log.price * log.quantity));

                            const winRate = sellTrades.length > 0
                                ? (profitableTrades.length / sellTrades.length) * 100
                                : 0;

                            // Calculate total profit/loss for this strategy
                            let totalProfit = 0;
                            sellTrades.forEach(sell => {
                                const buyLog = account.tradeLogs.find(log =>
                                    log.ticker === sell.ticker &&
                                    log.type === 'BUY' &&
                                    log.timestamp < sell.timestamp &&
                                    log.reason?.includes(`[${strategy}]`)
                                );
                                if (buyLog) {
                                    totalProfit += (sell.price - buyLog.price) * sell.quantity - (sell.fee + buyLog.fee);
                                }
                            });

                            const strategyLabel = strategy === 'DAY' ? '단타' : strategy === 'SWING' ? '스윙' : '장기';
                            const profitRate = sellTrades.length > 0
                                ? (totalProfit / (sellTrades.reduce((sum, t) => sum + (t.price * t.quantity), 0) || 1)) * 100
                                : 0;

                            return (
                                <div
                                    key={strategy}
                                    className="bg-gray-700/30 p-3 rounded border border-gray-700 hover:border-cyan-600 transition-all"
                                >
                                    <div className="text-gray-300 font-bold text-sm mb-2">{strategyLabel}</div>
                                    <div className="space-y-1 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">수익률:</span>
                                            <span className={`font-bold ${profitRate >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {profitRate > 0 ? '+' : ''}{profitRate.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">거래:</span>
                                            <span className="font-mono text-gray-300">{sellTrades.length}회</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">승률:</span>
                                            <span className={`font-bold ${winRate >= 50 ? 'text-cyan-400' : 'text-orange-400'}`}>
                                                {winRate.toFixed(0)}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-3 text-xs text-gray-500 italic text-center">
                        💡 AI가 시장 상황에 따라 자동으로 전략을 선택합니다
                    </div>
                </div>

                {/* Account Summary */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-gray-800 p-4 rounded-lg col-span-2 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-10">
                            <span className="text-4xl">💰</span>
                        </div>
                        <div className="text-gray-400 text-xs mb-2">Global War Chest (통합 자산 현황)</div>
                        <div className="grid grid-cols-2 gap-4 border-t border-gray-700 pt-2">
                            <div>
                                <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">🇰🇷 KRW Cash</span>
                                <div className="text-xl font-mono text-white">
                                    {Math.floor(allAccounts?.KR?.cash || 0).toLocaleString()} <span className="text-xs text-gray-500">원</span>
                                </div>
                            </div>
                            <div>
                                <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">🇺🇸 USD Cash</span>
                                <div className="text-xl font-mono text-green-400">
                                    $ {(allAccounts?.US?.cash || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-800 p-4 rounded-lg">
                        <div className="text-gray-400 text-xs">현재 시장 누적 수익률</div>
                        <div className={`text-xl font-mono font-bold mt-1 ${totalReturn >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                            {totalReturn > 0 ? '+' : ''}{totalReturn.toFixed(2)}%
                        </div>
                        <div className="text-gray-500 text-[10px] mt-2 text-right">
                            Win Rate: <span className="text-yellow-400">{winRate.toFixed(1)}%</span>
                        </div>
                    </div>
                </div>

                {/* Performance Dashboard */}
                <PerformanceDashboard marketTarget={marketTarget} />

                {/* Telegram Notification Settings */}
                <TelegramNotificationSettings />

                {/* Active Positions */}
                <div className="mb-6">
                    <h3 className="text-lg font-bold mb-3 text-gray-300">보유 포지션 ({account.positions.length})</h3>
                    <div className="bg-gray-800 rounded-lg overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-700 text-gray-400">
                                <tr>
                                    <th className="p-3">종목</th>
                                    <th className="p-3">수량</th>
                                    <th className="p-3">평단가</th>
                                    <th className="p-3">현재가</th>
                                    <th className="p-3">수익률</th>
                                </tr>
                            </thead>
                            <tbody>
                                {account.positions.length === 0 ? (
                                    <tr><td colSpan={5} className="p-4 text-center text-gray-500">보유 중인 종목이 없습니다.</td></tr>
                                ) : (
                                    account.positions.map(p => (
                                        <tr key={p.ticker} className="border-b border-gray-700 hover:bg-gray-700/50">
                                            <td className="p-3 font-bold">{formatStockDisplay(enhanceStockName(p.stockName, p.ticker), p.ticker)}</td>
                                            <td className="p-3">{p.quantity}주</td>
                                            <td className="p-3">{Math.floor(p.avgPrice).toLocaleString()}</td>
                                            <td className="p-3">
                                                {p.currentPrice.toLocaleString()}
                                                {p.isFallback && (
                                                    <span className="ml-1 text-[10px] bg-yellow-600 text-white px-1.5 py-0.5 rounded cursor-help" title="Data is from Daily Close (Yesterday) due to permission limits.">
                                                        🕒
                                                    </span>
                                                )}
                                            </td>
                                            <td className={`p-3 font-bold ${p.profitRate >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                                                {p.profitRate > 0 ? '+' : ''}{p.profitRate.toFixed(2)}%
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Trade Logs */}
                <div>
                    <h3 className="text-lg font-bold mb-3 text-gray-300">매매 기록 (최근 10건)</h3>
                    <div className="bg-gray-800 rounded-lg overflow-hidden">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-gray-700 text-gray-400">
                                <tr>
                                    <th className="p-2">일시</th>
                                    <th className="p-2">구분</th>
                                    <th className="p-2">종목</th>
                                    <th className="p-2">가격</th>
                                    <th className="p-2">수량</th>
                                    <th className="p-2">금액</th>
                                    <th className="p-2">근거</th>
                                </tr>
                            </thead>
                            <tbody>
                                {account.tradeLogs.slice(0, 10).map((log, idx) => (
                                    <tr key={idx} className="border-b border-gray-700 hover:bg-gray-750">
                                        <td className="p-2 text-gray-500 text-[10px] whitespace-nowrap">
                                            {new Date(log.timestamp).toLocaleString('ko-KR', {
                                                month: 'numeric', day: 'numeric',
                                                hour: '2-digit', minute: '2-digit', second: '2-digit',
                                                hour12: false
                                            })}
                                        </td>
                                        <td className="p-2">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${log.type === 'BUY' ? 'bg-red-900 text-red-200' : 'bg-blue-900 text-blue-200'}`}>
                                                {log.type}
                                            </span>
                                        </td>
                                        <td className="p-2 font-bold text-gray-200">
                                            {formatStockDisplay(enhanceStockName(log.stockName, log.ticker), log.ticker)}
                                        </td>
                                        <td className="p-2">{log.price?.toLocaleString() || '0'}</td>
                                        <td className="p-2">{log.quantity || '0'}</td>
                                        <td className="p-2">{log.amount?.toLocaleString() || '0'}</td>
                                        <td className="p-2 text-gray-400 text-xs break-words max-w-md whitespace-normal">
                                            {log.reason || '정보 없음'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
};
