// components/TradeExplanation.tsx
import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';

interface TradeExplanationProps {
    ticker: string;
    tradeId?: string;
    onClose: () => void;
}

interface TradeData {
    id: string;
    ticker: string;
    stock_name: string;
    action: 'BUY' | 'SELL';
    price: number;
    quantity: number;
    reason: string;
    ai_confidence: number;
    trigger_type: string;
    trigger_score: number;
    market_regime: string;
    market_regime_score: number;
    context: any;
    created_at: string;
}

export const TradeExplanation: React.FC<TradeExplanationProps> = ({ ticker, tradeId, onClose }) => {
    const [trade, setTrade] = useState<TradeData | null>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    useEffect(() => {
        loadTradeData();
    }, [ticker, tradeId]);

    const loadTradeData = async () => {
        try {
            setLoading(true);

            let query = supabase
                .from('shadow_trader_trades')
                .select('*')
                .eq('ticker', ticker)
                .eq('action', 'BUY')
                .order('created_at', { ascending: false });

            if (tradeId) {
                query = query.eq('id', tradeId);
            }

            const { data, error } = await query.limit(1).single();

            if (error) {
                console.error('[TradeExplanation] Failed to load trade:', error);
                setTrade(null);
            } else {
                setTrade(data as TradeData);
            }
        } catch (err) {
            console.error('[TradeExplanation] Error loading trade:', err);
            setTrade(null);
        } finally {
            setLoading(false);
        }
    };

    const getTriggerEmoji = (triggerType: string): string => {
        switch (triggerType) {
            case 'VOLUME_SPIKE': return '📊';
            case 'VOLATILITY_BREAKOUT': return '⚡';
            case 'AI_SIGNAL': return '🤖';
            default: return '🎯';
        }
    };

    const getTriggerName = (triggerType: string): string => {
        switch (triggerType) {
            case 'VOLUME_SPIKE': return '거래량 폭발';
            case 'VOLATILITY_BREAKOUT': return '변동성 돌파';
            case 'AI_SIGNAL': return 'AI 신호';
            default: return triggerType;
        }
    };

    const getConfidenceColor = (confidence: number): string => {
        if (confidence >= 80) return 'text-green-400';
        if (confidence >= 60) return 'text-yellow-400';
        return 'text-orange-400';
    };

    const getConfidenceLabel = (confidence: number): string => {
        if (confidence >= 80) return '매우 높음';
        if (confidence >= 60) return '높음';
        if (confidence >= 40) return '보통';
        return '낮음';
    };

    const getRegimeEmoji = (regime: string): string => {
        if (regime?.includes('완화') || regime?.includes('EASING')) return '🟢';
        if (regime?.includes('긴축') || regime?.includes('TIGHTENING')) return '🔴';
        return '🟡';
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                <div className="bg-gray-900 p-8 rounded-xl border border-gray-700">
                    <div className="text-white">로딩 중...</div>
                </div>
            </div>
        );
    }

    if (!trade) {
        return (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
                <div className="bg-gray-900 p-8 rounded-xl border border-gray-700">
                    <div className="text-white mb-4">매매 데이터를 찾을 수 없습니다.</div>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
                    >
                        닫기
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-gray-900 rounded-xl border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-900 to-pink-900 p-6 rounded-t-xl">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-1">
                                🎯 {trade.stock_name} 매수 근거
                            </h2>
                            <p className="text-gray-300 text-sm">
                                {new Date(trade.created_at).toLocaleString('ko-KR')}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-300 hover:text-white text-2xl leading-none"
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Sniper Trigger */}
                    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-2xl">{getTriggerEmoji(trade.trigger_type)}</span>
                            <h3 className="text-lg font-bold text-white">Sniper Trigger</h3>
                            <span className={`ml-auto text-2xl font-bold ${getConfidenceColor(trade.trigger_score)}`}>
                                {trade.trigger_score}/100
                            </span>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-400">트리거 타입:</span>
                                <span className="text-white font-semibold">{getTriggerName(trade.trigger_type)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">신뢰도:</span>
                                <span className={`font-semibold ${getConfidenceColor(trade.trigger_score)}`}>
                                    {getConfidenceLabel(trade.trigger_score)}
                                </span>
                            </div>
                            {trade.context?.volume && (
                                <div className="flex justify-between">
                                    <span className="text-gray-400">거래량:</span>
                                    <span className="text-white font-mono">
                                        {(trade.context.volume / 10000).toFixed(0)}만주
                                    </span>
                                </div>
                            )}
                            {trade.context?.volumeRatio && (
                                <div className="flex justify-between">
                                    <span className="text-gray-400">평균 대비:</span>
                                    <span className="text-yellow-400 font-semibold">
                                        {trade.context.volumeRatio.toFixed(1)}배
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* AI Confidence */}
                    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-2xl">🤖</span>
                            <h3 className="text-lg font-bold text-white">AI 신뢰도</h3>
                            <span className={`ml-auto text-2xl font-bold ${getConfidenceColor(trade.ai_confidence)}`}>
                                {trade.ai_confidence}/100
                            </span>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-400">종합 판단:</span>
                                <span className={`font-semibold ${getConfidenceColor(trade.ai_confidence)}`}>
                                    {getConfidenceLabel(trade.ai_confidence)}
                                </span>
                            </div>
                            <div className="mt-3 p-3 bg-gray-900 rounded border border-gray-700">
                                <p className="text-gray-300 text-xs leading-relaxed">{trade.reason}</p>
                            </div>
                        </div>
                    </div>

                    {/* Market Regime */}
                    {trade.market_regime && (
                        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-2xl">{getRegimeEmoji(trade.market_regime)}</span>
                                <h3 className="text-lg font-bold text-white">시장 국면</h3>
                                <span className="ml-auto text-lg font-semibold text-white">
                                    {trade.market_regime}
                                </span>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">국면 점수:</span>
                                    <span className="text-white font-mono">{trade.market_regime_score}</span>
                                </div>
                                <div className="mt-2 p-3 bg-gray-900 rounded border border-gray-700">
                                    <p className="text-gray-400 text-xs">
                                        {trade.market_regime?.includes('완화') || trade.market_regime?.includes('EASING')
                                            ? '✅ 위험 자산 선호 환경 (Risk-On)'
                                            : trade.market_regime?.includes('긴축') || trade.market_regime?.includes('TIGHTENING')
                                                ? '⚠️ 위험 회피 환경 (Risk-Off)'
                                                : '⚖️ 중립적 환경'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Trade Details */}
                    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                        <h3 className="text-lg font-bold text-white mb-3">📋 매매 상세</h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <span className="text-gray-400 block mb-1">매수가</span>
                                <span className="text-white font-mono text-lg">{trade.price.toLocaleString()}원</span>
                            </div>
                            <div>
                                <span className="text-gray-400 block mb-1">수량</span>
                                <span className="text-white font-mono text-lg">{trade.quantity}주</span>
                            </div>
                            <div className="col-span-2">
                                <span className="text-gray-400 block mb-1">총 금액</span>
                                <span className="text-yellow-400 font-mono text-lg">
                                    {(trade.price * trade.quantity).toLocaleString()}원
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Historical Performance (향후 구현) */}
                    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 opacity-50">
                        <h3 className="text-lg font-bold text-white mb-3">📊 과거 유사 패턴</h3>
                        <p className="text-gray-400 text-sm">
                            (향후 구현 예정: 유사한 조건에서의 과거 성공률 표시)
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-800 rounded-b-xl border-t border-gray-700">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg text-white font-semibold transition-all"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
};
