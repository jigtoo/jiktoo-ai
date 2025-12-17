import React from 'react';
import type { KeyIndicatorAnalysis, MarketTarget } from '../types';
import { marketInfo } from '../services/marketInfo';

const RsiGauge = ({ value, interpretation }: { value: number; interpretation: string }) => {
    const clampedValue = Math.max(0, Math.min(100, value));
    const angle = clampedValue * 1.8; // 0 to 180 degrees for the arc
    const needleRotation = clampedValue * 1.8 - 90;

    let color = "#34d399"; // green-500
    let textColor = "text-green-400";
    if (value > 70) {
        color = "#f87171"; // red-400
        textColor = "text-red-400";
    } else if (value < 30) {
        color = "#34d399";
        textColor = "text-green-400";
    }

    if(value >= 30 && value <= 70) {
        if(interpretation === '중립') {
            color = "#34d399";
            textColor = "text-green-400";
        }
    }
    
    const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
        const angleInRadians = (angleInDegrees - 180) * Math.PI / 180.0;
        return {
            x: centerX + (radius * Math.cos(angleInRadians)),
            y: centerY + (radius * Math.sin(angleInRadians))
        };
    };

    const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
        const start = polarToCartesian(x, y, radius, endAngle);
        const end = polarToCartesian(x, y, radius, startAngle);
        const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
        const d = `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
        return d;
    };

    return (
        <div className="flex flex-col items-center justify-center space-y-2">
            <svg width="180" height="100" viewBox="0 0 180 100">
                {/* Track */}
                <path
                    d={describeArc(90, 90, 70, 0, 180)}
                    stroke="#374151"
                    strokeWidth="20"
                    fill="none"
                    strokeLinecap="round"
                />
                {/* Value arc */}
                <path
                    d={describeArc(90, 90, 70, 0, angle)}
                    stroke={color}
                    strokeWidth="20"
                    fill="none"
                    strokeLinecap="round"
                    style={{ transition: 'all 0.5s ease-in-out' }}
                />
                {/* Needle */}
                <g transform={`rotate(${needleRotation} 90 90)`}>
                    <polygon points="87,90 93,90 90,20" fill={color} />
                </g>
                <circle cx="90" cy="90" r="10" fill="white" />
                <circle cx="90" cy="90" r="4" fill="#374151" />
            </svg>

            <div className="-mt-4 text-center">
                <p className={`text-4xl font-bold ${textColor}`}>{value.toFixed(1)}</p>
                <p className={`text-lg font-semibold ${textColor}`}>{interpretation}</p>
            </div>
        </div>
    );
};


export const KeyIndicatorAnalyzer: React.FC<{
    analysis: KeyIndicatorAnalysis;
    currentPrice: number;
    marketTarget: MarketTarget;
}> = ({ analysis, currentPrice, marketTarget }) => {
    if (!analysis) return null;

    const { rsi, movingAverages, volumeAnalysis, vwap } = analysis;
    const currency = marketInfo[marketTarget].currency;
    const formatOptions = { maximumFractionDigits: marketTarget === 'KR' ? 0 : 2 };

    return (
        <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-700">
            <h2 className="text-2xl font-bold text-center text-white mb-2">핵심 기술 지표 분석</h2>
            <p className="text-sm text-center text-gray-400 mb-6">RSI, 이동평균선, 거래량, VWAP 등 순수 차트 지표를 분석합니다.</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-800 p-6 rounded-lg flex flex-col items-center justify-around">
                    <h3 className="text-lg font-bold text-cyan-400">RSI (14일)</h3>
                    <RsiGauge value={rsi.value} interpretation={rsi.interpretation} />
                </div>
                <div className="bg-gray-800 p-6 rounded-lg">
                    <h3 className="text-lg font-bold text-cyan-400 mb-6">이동평균선</h3>
                    <div className="space-y-4">
                        {[
                            { label: '20일선', data: movingAverages.shortTerm },
                            { label: '60일선', data: movingAverages.mediumTerm },
                            { label: '120일선', data: movingAverages.longTerm }
                        ].map(({label, data}) => {
                            const trendColors = { '상승': 'text-green-400', '하락': 'text-red-400', '횡보': 'text-gray-400' };
                            const trendColor = trendColors[data.trend] || 'text-gray-400';
                            return (
                                <div key={label} className="flex justify-between items-center text-base">
                                    <span className="text-gray-300">{label}</span>
                                    <div className="flex items-center gap-4">
                                        <span className={`font-semibold w-12 text-right ${trendColor}`}>{data.trend}</span>
                                        <span className="font-mono font-bold text-white w-28 text-right">{data.value.toLocaleString(undefined, formatOptions)}{currency}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <p className="text-sm text-gray-400 mt-6 pt-4 border-t border-gray-700/50">{movingAverages.summary}</p>
                </div>
                <div className="bg-gray-800 p-6 rounded-lg">
                    <h3 className="text-lg font-bold text-cyan-400 mb-4">거래량 분석</h3>
                    <p className="text-xl font-bold text-white mb-3">{volumeAnalysis.recentVolumeVsAverage}</p>
                    <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap">{volumeAnalysis.interpretation}</p>
                </div>
                <div className="bg-gray-800 p-6 rounded-lg">
                    <h3 className="text-lg font-bold text-cyan-400 mb-4">VWAP (당일 거래량가중평균가)</h3>
                    <p className="text-2xl font-bold text-white mb-3">{vwap.value.toLocaleString(undefined, formatOptions)}{currency} ({vwap.pricePosition})</p>
                    <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap">{vwap.interpretation}</p>
                </div>
            </div>
        </div>
    );
};