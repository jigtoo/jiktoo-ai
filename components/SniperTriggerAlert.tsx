// components/SniperTriggerAlert.tsx
import React, { useEffect, useState } from 'react';
import { sniperTriggerService, SniperTrigger } from '../services/SniperTriggerService';

export const SniperTriggerAlert: React.FC = () => {
    const [triggers, setTriggers] = useState<SniperTrigger[]>([]);
    const [scanTime, setScanTime] = useState<Date | null>(null);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isClosed, setIsClosed] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            const { triggers: latest, scanTime: time } = sniperTriggerService.getLastTriggers();
            setTriggers(latest);
            setScanTime(time);
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    if (triggers.length === 0 || isClosed) {
        // Don't show anything if there are no triggers or user closed it
        return null;
    }

    return (
        <div className="fixed top-4 right-4 z-50 max-w-md animate-slide-in-right">
            <div className="bg-gradient-to-r from-cyan-900 to-blue-900 border-2 border-cyan-400 rounded-xl shadow-2xl p-4 space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl animate-pulse">🎯</span>
                        <h3 className="text-lg font-bold text-cyan-300">Sniper Trigger</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-cyan-400">
                            {scanTime?.toLocaleTimeString('ko-KR')}
                        </span>
                        <button
                            onClick={() => setIsMinimized(!isMinimized)}
                            className="text-cyan-400 hover:text-cyan-200 transition-colors px-2 py-1 rounded hover:bg-cyan-800/30"
                            title={isMinimized ? "펼치기" : "접기"}
                        >
                            {isMinimized ? '▼' : '▲'}
                        </button>
                        <button
                            onClick={() => setIsClosed(true)}
                            className="text-red-400 hover:text-red-200 transition-colors px-2 py-1 rounded hover:bg-red-800/30"
                            title="닫기"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Triggers (collapsible) */}
                {!isMinimized && (
                    <>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {triggers.map((trigger, index) => (
                                <div
                                    key={`${trigger.ticker}-${index}`}
                                    className="bg-gray-900/80 rounded-lg p-3 border border-cyan-500/50 hover:border-cyan-400 transition-all"
                                >
                                    <div className="flex items-start justify-between mb-1">
                                        <div>
                                            <span className="text-white font-bold">{trigger.stockName}</span>
                                            <span className="text-gray-400 text-xs ml-2">({trigger.ticker})</span>
                                        </div>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${trigger.type === 'VOLUME_SPIKE'
                                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
                                            : 'bg-orange-500/20 text-orange-300 border border-orange-500/50'
                                            }`}>
                                            {trigger.type === 'VOLUME_SPIKE' ? '거래량 폭발' : '변동성 돌파'}
                                        </span>
                                    </div>

                                    <div className="text-sm text-gray-300 mb-2">
                                        {trigger.details}
                                    </div>

                                    <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-3">
                                            <span className="text-cyan-400">
                                                가격: {trigger.currentPrice.toLocaleString()}원
                                            </span>
                                            <span className={`font-bold ${trigger.changeRate >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                                                {trigger.changeRate > 0 ? '+' : ''}{trigger.changeRate.toFixed(2)}%
                                            </span>
                                        </div>
                                        <span className="text-yellow-400 font-bold">
                                            점수: {trigger.score}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Footer with explanation */}
                        <div className="pt-2 border-t border-cyan-700">
                            <div className="text-center text-xs text-cyan-400/70 mb-2">
                                {triggers.length}개의 기회가 감지되었습니다
                            </div>
                            <div className="p-2 bg-orange-900/20 border border-orange-500/30 rounded">
                                <p className="text-xs text-orange-300 font-semibold mb-1">⚡ 스나이퍼 트리거란?</p>
                                <p className="text-xs text-gray-300 leading-relaxed">
                                    <strong>단기 모멘텀 포착</strong> 신호입니다. 거래량/변동성 돌파 순간을 실시간 감지합니다.
                                    <br />
                                    <span className="text-orange-200">• 단기 관점: 당일~수일 보유</span>
                                </p>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
