// components/MarketRegimeIndicator.tsx
import React, { useState } from 'react';
import { MarketRegimeStatus } from '../services/MarketRegimeService';

interface MarketRegimeIndicatorProps {
    status: MarketRegimeStatus | null;
    marketTarget: 'KR' | 'US';
}

export const MarketRegimeIndicator: React.FC<MarketRegimeIndicatorProps> = ({ status, marketTarget }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!status) {
        return (
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="text-gray-400 text-sm">시장 분석 대기 중...</div>
            </div>
        );
    }

    // Color coding based on regime
    const getRegimeColor = () => {
        switch (status.regime) {
            case 'STRONG_BULL': return 'text-green-400 border-green-500';
            case 'WEAK_BULL': return 'text-green-300 border-green-600';
            case 'SIDEWAYS': return 'text-yellow-400 border-yellow-600';
            case 'WEAK_BEAR': return 'text-red-300 border-red-600';
            case 'STRONG_BEAR': return 'text-red-400 border-red-500';
            default: return 'text-gray-400 border-gray-600';
        }
    };

    const getRegimeIcon = () => {
        switch (status.regime) {
            case 'STRONG_BULL': return '🟢';
            case 'WEAK_BULL': return '🟢';
            case 'SIDEWAYS': return '🟡';
            case 'WEAK_BEAR': return '🔴';
            case 'STRONG_BEAR': return '🔴';
            default: return '⚪';
        }
    };

    const getRegimeLabel = () => {
        switch (status.regime) {
            case 'STRONG_BULL': return '강세장';
            case 'WEAK_BULL': return '약한 상승';
            case 'SIDEWAYS': return '횡보';
            case 'WEAK_BEAR': return '약한 하락';
            case 'STRONG_BEAR': return '약세장';
            default: return '알 수 없음';
        }
    };

    const getConfidenceColor = () => {
        if (status.confidence >= 80) return 'text-green-400';
        if (status.confidence >= 60) return 'text-yellow-400';
        return 'text-red-400';
    };

    const getConfidenceLabel = () => {
        if (status.confidence >= 80) return '높음';
        if (status.confidence >= 60) return '보통';
        return '낮음 ⚠️';
    };

    const getDataQualityIcon = () => {
        switch (status.dataQuality) {
            case 'excellent': return '✨';
            case 'good': return '✓';
            case 'low': return '⚠️';
            default: return '?';
        }
    };

    return (
        <div className={`bg-gray-800 rounded-lg border-2 ${getRegimeColor()}`}>
            {/* Header */}
            <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getRegimeIcon()}</span>
                        <div>
                            <div className={`text-lg font-bold ${getRegimeColor()}`}>
                                {getRegimeLabel()}
                            </div>
                            <div className="text-xs text-gray-400">
                                {marketTarget === 'KR' ? '한국 시장' : '미국 시장'}
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-mono font-bold">{status.score}점</div>
                        <div className="text-xs text-gray-500">{status.lastUpdated}</div>
                    </div>
                </div>

                {/* Confidence & Data Quality */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-gray-700/30 p-2 rounded border border-gray-700">
                        <div className="text-gray-400 text-xs mb-1">AI 신뢰도</div>
                        <div className={`font-bold text-sm ${getConfidenceColor()}`}>
                            {status.confidence}% ({getConfidenceLabel()})
                        </div>
                    </div>
                    <div className="bg-gray-700/30 p-2 rounded border border-gray-700">
                        <div className="text-gray-400 text-xs mb-1">데이터 품질</div>
                        <div className="font-bold text-sm text-gray-300">
                            {getDataQualityIcon()} {status.dataQuality}
                        </div>
                    </div>
                </div>

                {/* Expand/Collapse Button */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full text-center text-xs text-cyan-400 hover:text-cyan-300 py-1 rounded hover:bg-gray-700/50 transition-all"
                >
                    {isExpanded ? '▲ 상세 근거 숨기기' : '▼ 상세 근거 보기'}
                </button>
            </div>

            {/* Detailed Factors (Expandable) */}
            {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-700 pt-3 space-y-3">
                    {/* Positive Factors */}
                    {status.detailedFactors.positive.length > 0 && (
                        <div>
                            <div className="text-green-400 font-bold text-sm mb-2">✅ 긍정 요인</div>
                            <ul className="space-y-1">
                                {status.detailedFactors.positive.map((factor, idx) => (
                                    <li key={idx} className="text-xs text-gray-300 pl-4">
                                        • {factor}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Negative Factors */}
                    {status.detailedFactors.negative.length > 0 && (
                        <div>
                            <div className="text-red-400 font-bold text-sm mb-2">❌ 부정 요인</div>
                            <ul className="space-y-1">
                                {status.detailedFactors.negative.map((factor, idx) => (
                                    <li key={idx} className="text-xs text-gray-300 pl-4">
                                        • {factor}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Neutral Info */}
                    {status.detailedFactors.neutral.length > 0 && (
                        <div>
                            <div className="text-gray-400 font-bold text-sm mb-2">ℹ️ 참고 정보</div>
                            <ul className="space-y-1">
                                {status.detailedFactors.neutral.map((info, idx) => (
                                    <li key={idx} className="text-xs text-gray-400 pl-4">
                                        • {info}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Recommended Exposure */}
                    <div className="bg-gray-700/30 p-3 rounded border border-gray-700">
                        <div className="text-gray-400 text-xs mb-1">권장 투자 비중</div>
                        <div className="flex items-center space-x-2">
                            <div className="flex-1 bg-gray-700 rounded-full h-2">
                                <div
                                    className="bg-cyan-500 h-2 rounded-full transition-all"
                                    style={{ width: `${status.recommendedExposure * 100}%` }}
                                />
                            </div>
                            <div className="text-cyan-400 font-bold text-sm">
                                {(status.recommendedExposure * 100).toFixed(0)}%
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};