import React from 'react';
import type { VcpAnalysis, CandlestickAnalysis } from '../types';
import { ChartIcon } from './icons';

interface ChartPatternAnalyzerProps {
    vcpAnalysis: VcpAnalysis;
    candlestickAnalysis?: CandlestickAnalysis;
}

const ReliabilityBadge: React.FC<{ reliability: '높음' | '중간' | '낮음' }> = ({ reliability }) => {
    const config = {
        '높음': 'bg-green-500/20 text-green-300 border-green-500/30',
        '중간': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
        '낮음': 'bg-red-500/20 text-red-300 border-red-500/30',
    };
    const style = config[reliability] || 'bg-gray-500/20 text-gray-300 border-gray-500/30';

    return (
        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${style}`}>
            신뢰도: {reliability}
        </span>
    );
};

export const ChartPatternAnalyzer: React.FC<ChartPatternAnalyzerProps> = ({ vcpAnalysis, candlestickAnalysis }) => {
    return (
        <div className="bg-gray-800/60 rounded-lg border border-gray-700 p-4 space-y-4">
            <header className="text-center">
                 <h3 className="text-xl font-bold text-gray-100">AI 차트 패턴 분석</h3>
                 <p className="text-sm text-gray-400">VCP 및 캔들스틱 패턴을 종합적으로 분석합니다.</p>
            </header>

            {/* VCP Analysis Section */}
            <div className="bg-gray-900/40 p-4 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                    <ChartIcon />
                    <h4 className="font-bold text-teal-300">VCP 분석 요약</h4>
                </div>
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{vcpAnalysis.analysisText}</p>
            </div>

            {/* Candlestick Analysis Section */}
            {candlestickAnalysis && candlestickAnalysis.patterns && candlestickAnalysis.patterns.length > 0 && (
                <div className="bg-gray-900/40 p-4 rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                         <ChartIcon />
                         <h4 className="font-bold text-teal-300">주요 캔들스틱 패턴</h4>
                    </div>
                    <div className="space-y-3">
                        {candlestickAnalysis.patterns.map((pattern, index) => (
                            pattern && (
                                <div key={index} className="pl-4 border-l-2 border-teal-500/50">
                                    <div className="flex justify-between items-center flex-wrap gap-2">
                                        <h5 className="font-semibold text-gray-200">{pattern.patternName}</h5>
                                        <ReliabilityBadge reliability={pattern.reliability} />
                                    </div>
                                    <p className="text-gray-400 text-xs mt-1">위치: {pattern.location}</p>
                                    <p className="text-gray-400 text-sm mt-1">{pattern.interpretation}</p>
                                </div>
                            )
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
