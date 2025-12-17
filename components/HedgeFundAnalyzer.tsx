import React from 'react';
import type { HedgeFundAnalysis } from '../types';
import { BriefcaseIcon, TrendingUpIcon, TrendingDownIcon } from './icons';

interface HedgeFundAnalyzerProps {
    analysis?: HedgeFundAnalysis;
}

const sentimentConfig = {
    'Positive': 'bg-green-500/20 text-green-300 border-green-500/30',
    'Neutral': 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    'Negative': 'bg-red-500/20 text-red-300 border-red-500/30',
    'Mixed': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
};

export const HedgeFundAnalyzer: React.FC<HedgeFundAnalyzerProps> = ({ analysis }) => {
    if (!analysis) return null;

    const { summary, sentiment, topBuyers, topSellers } = analysis;

    const sentimentStyle = sentimentConfig[sentiment] || sentimentConfig['Neutral'];

    const NetActivityBar: React.FC = () => {
        const totalFunds = (topBuyers?.length || 0) + (topSellers?.length || 0);
        if (totalFunds === 0) return null;
        
        const buyPercentage = ((topBuyers?.length || 0) / totalFunds) * 100;
        
        return (
            <div className="w-full bg-red-900/40 rounded-full h-4 my-2 relative overflow-hidden border border-gray-700">
                <div 
                    className="h-full rounded-l-full bg-green-600 transition-all duration-500" 
                    style={{ width: `${buyPercentage}%` }}
                ></div>
                <div className="absolute inset-0 flex justify-between items-center px-2 text-xs font-bold text-white">
                    <span>매수</span>
                    <span>매도</span>
                </div>
            </div>
        );
    };


    return (
        <div className="bg-gray-800/60 rounded-lg border border-gray-700 p-4 space-y-6">
            <header className="text-center">
                 <h3 className="text-xl font-bold text-gray-100">AI 헤지펀드 동향 분석</h3>
                 <p className="text-sm text-gray-400">시장의 큰 손, 헤지펀드들은 어떻게 움직이고 있는가?</p>
            </header>

            <div className="bg-gray-900/40 p-4 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                    <BriefcaseIcon className="h-6 w-6 text-yellow-400" />
                    <h4 className="font-bold text-yellow-300">종합 분석</h4>
                    <span className={`ml-auto px-2 py-0.5 text-xs font-semibold rounded-full border ${sentimentStyle}`}>
                        {sentiment}
                    </span>
                </div>
                <p className="text-gray-300 text-sm">{summary}</p>
            </div>
            
            <div className="bg-gray-900/40 p-4 rounded-lg">
                <h4 className="font-bold text-yellow-300 mb-2 text-center">매수 vs 매도 펀드 활동</h4>
                <NetActivityBar />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                        <h5 className="flex items-center gap-2 font-semibold text-green-300 mb-2">
                           <TrendingUpIcon className="h-5 w-5"/> 주요 매수 펀드
                        </h5>
                        <ul className="space-y-2 text-sm">
                            {topBuyers && topBuyers.length > 0 ? topBuyers.map((buyer, index) => (
                                <li key={index} className="p-2 bg-gray-800/60 rounded-md">
                                    <p className="font-semibold text-gray-200">{buyer.fundName}</p>
                                    <p className="text-xs text-green-400">{buyer.changeDescription}</p>
                                </li>
                            )) : <p className="text-gray-500 text-xs italic">데이터 없음</p>}
                        </ul>
                    </div>
                     <div>
                        <h5 className="flex items-center gap-2 font-semibold text-red-300 mb-2">
                            <TrendingDownIcon className="h-5 w-5"/> 주요 매도 펀드
                        </h5>
                        <ul className="space-y-2 text-sm">
                           {topSellers && topSellers.length > 0 ? topSellers.map((seller, index) => (
                                <li key={index} className="p-2 bg-gray-800/60 rounded-md">
                                    <p className="font-semibold text-gray-200">{seller.fundName}</p>
                                    <p className="text-xs text-red-400">{seller.changeDescription}</p>
                                </li>
                            )) : <p className="text-gray-500 text-xs italic">데이터 없음</p>}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};
