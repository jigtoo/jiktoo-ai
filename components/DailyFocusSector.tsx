import React from 'react';
import type { DailyOnePick, MarketTarget, DailyOnePickStock } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorDisplay } from './ErrorDisplay';
import { SparklesIcon, BrainIcon } from './icons';

interface DailyOnePickProps {
    onePick: DailyOnePick | null;
    isLoading: boolean;
    error: string | null;
    onFetch: () => void;
    onSelectStock: (ticker: string, rationale: string, stockName: string) => void;
    marketTarget: MarketTarget;
}

const RankIndicator: React.FC<{ rank: number }> = ({ rank }) => {
    const styles = [
        { bg: 'bg-yellow-400', text: 'text-black', shadow: 'shadow-yellow-300/50' }, // 1st
        { bg: 'bg-gray-300', text: 'text-black', shadow: 'shadow-gray-200/50' }, // 2nd
        { bg: 'bg-orange-400', text: 'text-black', shadow: 'shadow-orange-300/50' }, // 3rd
    ];
    const style = styles[rank - 1] || { bg: 'bg-gray-600', text: 'text-white', shadow: '' };

    return (
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${style.bg} ${style.text} shadow-lg ${style.shadow}`}>
            {rank}
        </div>
    );
};

const PickCard: React.FC<{ pick: DailyOnePickStock; onSelect: () => void; marketTarget: MarketTarget }> = ({ pick, onSelect, marketTarget }) => {
    const usButtonClass = 'from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600';
    const krButtonClass = 'from-cyan-600 to-blue-700 hover:from-cyan-700 hover:to-blue-800';
    const buttonClass = marketTarget === 'US' ? usButtonClass : krButtonClass;
    
    return (
        <div className="bg-gray-900/50 p-3 rounded-lg flex flex-col">
            <div className="flex items-center gap-3">
                <RankIndicator rank={pick.rank} />
                <div>
                    <h3 className="font-bold text-cyan-300">{pick.stockName}</h3>
                    <p className="font-mono text-xs text-gray-400">{pick.ticker}</p>
                </div>
            </div>
            <p className="text-sm text-gray-300 mt-2 flex-grow">{pick.reason}</p>
            <button
                onClick={onSelect}
                className={`mt-3 w-full px-3 py-1.5 bg-gradient-to-r ${buttonClass} text-white text-xs font-bold rounded-md shadow-md transition-transform transform hover:scale-105`}
            >
                심층 분석
            </button>
        </div>
    );
};

export const DailyFocusSector: React.FC<DailyOnePickProps> = ({ onePick, isLoading, error, onFetch, onSelectStock, marketTarget }) => {
    
    if (isLoading) {
        return (
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl shadow-lg p-4 h-full flex flex-col items-center justify-center">
                <LoadingSpinner message="AI가 오늘의 원픽 종목을 선정 중..." showWittyMessages={true} />
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl shadow-lg p-4 h-full flex flex-col items-center justify-center">
               <ErrorDisplay
                    title="원픽 선정 실패"
                    message={error}
                    onRetry={onFetch}
                />
            </div>
        );
    }
    
    const usButtonClass = 'from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600';
    const krButtonClass = 'from-cyan-600 to-blue-700 hover:from-cyan-700 hover:to-blue-800';
    const buttonClass = marketTarget === 'US' ? usButtonClass : krButtonClass;

    if (!onePick) {
        return (
             <div className="bg-gray-800/50 border border-gray-700 rounded-xl shadow-lg p-4 h-full flex flex-col items-center justify-center text-center">
                <SparklesIcon className="h-8 w-8 mb-4 text-cyan-400" />
                <h3 className="text-lg font-bold text-gray-100">AI 오늘의 원픽</h3>
                <p className="text-sm text-gray-400 mt-2 mb-6 max-w-sm">AI가 모든 시장 변수를 종합하여, 오늘 가장 높은 확률로 상승할 종목들을 순위별로 선정합니다.</p>
                <button 
                    onClick={onFetch} 
                    className={`flex items-center justify-center px-4 py-2 bg-gradient-to-r ${buttonClass} text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-500 transition duration-200`}
                >
                    <span>오늘의 원픽 확인</span>
                </button>
            </div>
        );
    }

    const { picks, overallReason } = onePick;

    if (!picks || picks.length === 0) {
        return (
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl shadow-lg p-4 h-full flex flex-col">
               <h2 className="text-lg font-bold text-gray-100 text-center mb-3">AI 오늘의 원픽</h2>
               <div className="flex-grow flex flex-col justify-center items-center text-center bg-gray-900/50 p-4 rounded-lg">
                   <BrainIcon className="h-8 w-8 mb-4 text-cyan-400" />
                   <p className="text-sm text-gray-300 mt-2 flex-grow">{overallReason}</p>
                    <button 
                        onClick={onFetch} 
                        className={`mt-4 w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg shadow-md transition-transform transform hover:scale-105`}
                    >
                        다시 선정하기
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-800/50 border border-cyan-700/50 rounded-xl shadow-lg p-4 h-full flex flex-col">
            <h2 className="text-lg font-bold text-gray-100 text-center mb-3 flex-shrink-0">AI 오늘의 원픽</h2>
            
            <div className="flex-grow flex flex-col min-h-0">
                <div className="flex-grow space-y-3 overflow-y-auto pr-2">
                    {picks.sort((a, b) => a.rank - b.rank).map(pick => (
                        <PickCard 
                            key={pick.ticker} 
                            pick={pick} 
                            onSelect={() => onSelectStock(pick.ticker, pick.reason, pick.stockName)} 
                            marketTarget={marketTarget}
                        />
                    ))}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-700/50 flex-shrink-0">
                    <div className="flex items-start gap-3">
                        <BrainIcon className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-semibold text-gray-200">선정 배경</h4>
                            <p className="text-sm text-gray-400 mt-1">{overallReason}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
