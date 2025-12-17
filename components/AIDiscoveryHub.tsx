

import React from 'react';
import { StockCard } from './StockCard';
import { LoadingSpinner } from './LoadingSpinner';
import { InfoIcon, SparklesIcon } from './icons';
import type { DashboardStock, MarketTarget } from '../types';
import { ErrorDisplay } from './ErrorDisplay';

interface AIPicksProps {
  stocks: DashboardStock[] | null;
  onSelectStock: (ticker: string, rationale: string, stockName: string) => void;
  isLoading: boolean;
  error: string | null;
  onFetchStocks: () => void;
  analyzingTicker: string | null;
  marketTarget: MarketTarget;
}

export const DiscoveryHub: React.FC<AIPicksProps> = ({
    stocks, onSelectStock, isLoading, error, onFetchStocks, analyzingTicker, marketTarget
}) => {
  const usButtonClass = 'from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600';
  const krButtonClass = 'from-cyan-600 to-blue-700 hover:from-cyan-700 hover:to-blue-800';
  const buttonClass = marketTarget === 'US' ? usButtonClass : krButtonClass;
  
  const handleFetchClick = () => {
    onFetchStocks();
  };

  const renderContent = () => {
      if (isLoading && !stocks) { // Show big spinner only on initial load
        return <LoadingSpinner message="최적의 매수 신호를 보이는 종목을 스캔하고 검증하고 있습니다..." />;
      }
      
      if (stocks === null) {
        return (
            <div className="flex flex-col items-center text-center">
                <h3 className="text-xl font-bold text-gray-200">오늘의 AI 추천</h3>
                <p className="text-gray-400 text-sm max-w-lg mx-auto mt-2 mb-6">AI가 성공적인 투자자들의 원칙에 따라 지금 주목해야 할 최적의 매수 신호 종목을 탐색합니다.</p>
                <button 
                    onClick={handleFetchClick} 
                    disabled={isLoading}
                    className={`flex items-center justify-center px-6 py-2.5 bg-gradient-to-r ${buttonClass} text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-500 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105`}
                    aria-label="Fetch recommendations"
                >
                    <span>추천 종목 보기</span>
                </button>
            </div>
        );
      }
      
      return (
        <>
            <div className="flex flex-col items-center mb-6 gap-4 text-center">
                <button 
                    onClick={handleFetchClick} 
                    disabled={isLoading}
                    className="flex items-center justify-center px-6 py-2.5 bg-gray-700 text-white font-semibold rounded-lg shadow-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-500 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <span>{isLoading ? '탐색 중...' : '재탐색'}</span>
                </button>
            </div>

            {error ? (
                <ErrorDisplay
                    title="추천 종목 탐색 실패"
                    message={error}
                    onRetry={onFetchStocks}
                />
            ) : stocks.length === 0 ? (
                <div className="text-center text-gray-500 py-16 px-4">
                    <InfoIcon className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                    <h3 className="text-xl font-semibold text-gray-400">기준에 맞는 매수신호 포착 실패</h3>
                    <p className="mt-2 max-w-md mx-auto">현재 시장 상황에서 매수 신호 기준을 충족하는 종목이 없습니다. AI는 섣부른 추천 대신 원칙을 지키며 관망합니다.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {stocks.map((stock) => (
                    stock && stock.ticker && stock.stockName ? 
                        <StockCard 
                            key={stock.ticker} 
                            stock={stock} 
                            onSelect={onSelectStock} 
                            isAnalyzing={analyzingTicker === stock.ticker}
                        /> : null
                    ))}
                </div>
            )}
        </>
      );
  }

  const headerStyleBase = "flex items-center justify-center gap-2 w-full py-3 text-sm sm:text-base font-bold transition-colors duration-200";
  const usHeaderStyle = "text-white bg-orange-600/50";
  const krHeaderStyle = "text-white bg-cyan-600/50";
  const headerStyle = marketTarget === 'US' ? usHeaderStyle : krHeaderStyle;

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl shadow-lg">
      <header className="p-1 bg-gray-900/50 rounded-t-xl">
        <div className={`${headerStyleBase} ${headerStyle} rounded-lg`}>
          <SparklesIcon />
          <span>AI 추천 종목</span>
        </div>
      </header>

      <div className="p-4 sm:p-6 min-h-[250px] flex flex-col justify-center">
        {renderContent()}
      </div>
    </div>
  );
};