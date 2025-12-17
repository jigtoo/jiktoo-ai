
import React from 'react';
import type { BrandPowerAnalysis } from '../types';
import { CommunityIcon, SparklesIcon, TrendingUpIcon } from './icons';

interface BrandPowerAnalyzerProps {
    analysis: BrandPowerAnalysis;
}

export const BrandPowerAnalyzer: React.FC<BrandPowerAnalyzerProps> = ({ analysis }) => {
    if (!analysis || analysis.summary === "N/A") return null;
    
    const { summary, consumerTrendAlignment, onlineBuzz } = analysis;

    const trendConfig = {
        '선도': 'text-green-300',
        '동행': 'text-cyan-300',
        '부진': 'text-yellow-300',
    };

    const buzzConfig = {
        '매우 긍정적': 'text-green-300',
        '긍정적': 'text-cyan-300',
        '중립': 'text-gray-300',
        '부정적': 'text-red-300',
    };

    return (
        <div className="bg-gray-800/60 rounded-lg border border-gray-700 p-4 space-y-6">
            <header className="text-center">
                 <h3 className="text-xl font-bold text-gray-100">브랜드 파워 & 소비자 트렌드</h3>
                 <p className="text-sm text-gray-400">보이지 않는 자산, 소비자의 마음을 얻고 있는가?</p>
            </header>

            <div className="bg-gray-900/40 p-4 rounded-lg border-l-4 border-purple-500/80">
                <div className="flex items-center gap-3 mb-2">
                    <CommunityIcon className="h-6 w-6 text-purple-400" />
                    <h4 className="font-bold text-purple-300">AI 종합 분석</h4>
                </div>
                <p className="text-gray-300 text-sm">{summary}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-gray-900/40 p-3 rounded-lg">
                    <h5 className="flex items-center justify-center gap-2 text-sm font-semibold text-purple-300 mb-1">
                        <TrendingUpIcon className="h-4 w-4" />
                        트렌드 부합도
                    </h5>
                    <p className={`text-lg font-bold ${trendConfig[consumerTrendAlignment] || 'text-gray-300'}`}>{consumerTrendAlignment}</p>
                </div>
                <div className="bg-gray-900/40 p-3 rounded-lg">
                    <h5 className="flex items-center justify-center gap-2 text-sm font-semibold text-purple-300 mb-1">
                        <SparklesIcon className="h-4 w-4" />
                        온라인 버즈
                    </h5>
                    <p className={`text-lg font-bold ${buzzConfig[onlineBuzz] || 'text-gray-300'}`}>{onlineBuzz}</p>
                </div>
            </div>
        </div>
    );
};
