import React from 'react';
import type { ChartPatternResult, ScreenerScores, ScreenerTimeframe } from '../types';
import { CheckCircleIcon, XCircleIcon, TargetIcon, StopLossIcon, ValueIcon, InfoIcon, TrendingUpIcon, StrategyIcon } from './icons';

interface ScreenerResultCardProps {
    result: ChartPatternResult;
}

const ScoreGauge: React.FC<{ score: number; tier: ScreenerScores['tier'] }> = ({ score, tier }) => {
    const percentage = Math.max(0, Math.min(100, score));
    const radius = 32;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    const tierConfig: Record<ScreenerScores['tier'], { color: string, shadow: string, textColor: string }> = {
        'S': { color: 'text-purple-400', shadow: 'drop-shadow-[0_2px_10px_rgba(192,132,252,0.6)]', textColor: 'text-purple-300' },
        'A': { color: 'text-green-400', shadow: 'drop-shadow-[0_2px_10px_rgba(74,222,128,0.5)]', textColor: 'text-green-300' },
        'B': { color: 'text-yellow-400', shadow: '', textColor: 'text-yellow-300' },
        'C': { color: 'text-red-400', shadow: '', textColor: 'text-red-300' },
    };
    
    const config = tierConfig[tier];

    return (
        <div className="relative w-24 h-24 flex-shrink-0">
            <svg className={`w-full h-full ${config.shadow}`} viewBox="0 0 72 72">
                <circle className="text-gray-700" strokeWidth="6" stroke="currentColor" fill="transparent" r={radius} cx="36" cy="36" />
                <circle
                    className={config.color}
                    strokeWidth="6"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="36" cy="36"
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 1s ease-out' }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-bold ${config.textColor}`}>{score}</span>
                <span className={`px-2 py-0.5 -mt-1 text-xs font-bold rounded ${config.color.replace('text-','bg-')}/20 ${config.textColor}`}>Tier {tier}</span>
            </div>
        </div>
    );
};

const ScoreBar: React.FC<{ label: string, value: number, penalty?: number }> = ({ label, value, penalty = 0 }) => (
    <div>
        <div className="flex justify-between items-baseline text-sm">
            <span className="text-gray-300">{label}</span>
            <div>
                <span className="font-mono font-semibold text-white">{value}</span>
                {penalty > 0 && <span className="font-mono text-red-400"> (-{penalty})</span>}
            </div>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1">
            <div className="bg-cyan-400 h-1.5 rounded-full" style={{ width: `${value / 20 * 100}%` }}></div>
        </div>
    </div>
);

export const ScreenerResultCard: React.FC<ScreenerResultCardProps> = ({ result }) => {
    const { stockName, symbol, timeframe, scores, strategy_hits, risk, trade_plan } = result;
    
    const timeframeMap: Record<ScreenerTimeframe, string> = {
        'Intraday': '분봉',
        'Daily': '일봉',
        'Weekly': '주봉',
        'Monthly': '월봉',
    };

    return (
        <div className="bg-gray-800/70 border border-gray-700 rounded-xl shadow-lg animate-fade-in">
            <header className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-gray-900/50 rounded-t-xl">
                <div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-2xl font-bold text-white">{stockName}</h3>
                        <p className="font-mono text-gray-400">{symbol}</p>
                        <span className="px-2 py-1 text-xs font-bold bg-gray-700 text-gray-300 rounded-full">{timeframeMap[timeframe] || timeframe}</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                     <div className="flex flex-wrap gap-2 justify-end">
                        {risk.tags.map(tag => (
                            <span key={tag} className="px-2 py-1 text-xs font-semibold bg-yellow-900/70 text-yellow-300 rounded-md">{tag}</span>
                        ))}
                    </div>
                    <ScoreGauge score={scores.final} tier={scores.tier} />
                </div>
            </header>

            <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Trade Plan */}
                <div className="space-y-4 bg-gray-900/40 p-4 rounded-lg">
                     <h4 className="text-lg font-bold text-gray-200 text-center">AI 트레이딩 플랜</h4>
                     <div className="p-3 bg-gray-800/50 rounded-md text-center">
                        <p className="text-sm text-gray-400 flex items-center justify-center gap-1"><StrategyIcon className="h-4 w-4 text-purple-400" />추천 투자 스타일</p>
                        <p className="font-mono text-lg font-bold text-purple-300">{trade_plan.suitable_for}</p>
                     </div>
                     <div className="p-3 bg-gray-800/50 rounded-md text-center">
                        <p className="text-sm text-gray-400 flex items-center justify-center gap-1"><TrendingUpIcon className="h-4 w-4 text-green-400" />진입 전략</p>
                        <p className="font-mono text-lg font-bold text-green-300">{trade_plan.entry.level.toLocaleString()}</p>
                        <p className="text-xs text-gray-500 capitalize">{trade_plan.entry.type}</p>
                     </div>
                     <div className="p-3 bg-gray-800/50 rounded-md text-center">
                        <p className="text-sm text-gray-400 flex items-center justify-center gap-1"><StopLossIcon className="h-4 w-4" />손절매</p>
                        <p className="font-mono text-lg font-bold text-red-300">{trade_plan.stop.level.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">{trade_plan.stop.reason}</p>
                     </div>
                      <div className="p-3 bg-gray-800/50 rounded-md text-center">
                        <p className="text-sm text-gray-400 flex items-center justify-center gap-1"><TargetIcon className="h-4 w-4" />목표가</p>
                        {trade_plan.targets.map((target, i) => (
                             <div key={i}>
                                <p className="font-mono text-lg font-bold text-cyan-300">{target.level ? target.level.toLocaleString() : `트레일링 (${target.trail})`}</p>
                                <p className="text-xs text-gray-500">{target.method}</p>
                            </div>
                        ))}
                     </div>
                     <div className="p-3 bg-gray-800/50 rounded-md text-center">
                        <p className="text-sm text-gray-400 flex items-center justify-center gap-1"><ValueIcon className="h-4 w-4" />포지션 사이징</p>
                        <p className="font-mono text-lg font-bold text-white">{trade_plan.position_size.shares.toLocaleString()} 주</p>
                        <p className="text-xs text-gray-500">계좌의 {trade_plan.position_size.risk_per_trade_pct}% 리스크</p>
                     </div>
                </div>

                {/* Center Column: Strategies */}
                <div className="space-y-4 bg-gray-900/40 p-4 rounded-lg">
                    <h4 className="text-lg font-bold text-gray-200 text-center">포착된 전략</h4>
                    <div className="space-y-3">
                        {strategy_hits.filter(s => s.passed).map(hit => (
                            <div key={hit.name} className="p-3 bg-gray-800/50 rounded-md">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <CheckCircleIcon className="h-5 w-5 text-green-400" />
                                        <p className="font-semibold text-gray-200">{hit.name}</p>
                                    </div>
                                    <p className="text-xs font-mono text-green-300">신뢰도: {(hit.confidence * 100).toFixed()}%</p>
                                </div>
                                <div className="pl-7 mt-1 text-xs text-gray-400 space-y-1">
                                    {hit.notes.map((note, i) => <p key={i}>- {note}</p>)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Column: Scores */}
                <div className="space-y-4 bg-gray-900/40 p-4 rounded-lg">
                     <h4 className="text-lg font-bold text-gray-200 text-center">세부 점수</h4>
                     <div className="space-y-4">
                        <ScoreBar label="추세 점수" value={scores.trend} />
                        <ScoreBar label="모멘텀 점수" value={scores.momentum} />
                        <ScoreBar label="거래량 점수" value={scores.volume} />
                        <ScoreBar label="리스크" value={0} penalty={scores.risk_penalty} />
                        <ScoreBar label="타이밍" value={0} penalty={scores.timing_penalty} />
                     </div>
                </div>
            </div>
        </div>
    );
};