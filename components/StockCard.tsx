


import React from 'react';
import type { DashboardStock } from '../types';

export const MarketBadge: React.FC<{ market: string }> = ({ market }) => {
    let colors = 'bg-gray-700 text-gray-300';
    switch (market.toUpperCase()) {
        case 'NASDAQ':
            colors = 'bg-blue-800 text-blue-200';
            break;
        case 'NYSE':
            colors = 'bg-sky-800 text-sky-200';
            break;
        case 'KOSPI':
            colors = 'bg-red-800 text-red-200';
            break;
        case 'KOSDAQ':
            colors = 'bg-purple-800 text-purple-200';
            break;
    }
    return <span className={`px-2 py-1 text-xs font-bold rounded-full ${colors}`}>{market}</span>
}

export const StockCard: React.FC<{ 
    stock: DashboardStock; 
    onSelect: (ticker: string, rationale: string, stockName: string) => void;
    isAnalyzing?: boolean;
}> = ({ stock, onSelect, isAnalyzing }) => (
  <div 
    onClick={() => !isAnalyzing && onSelect(stock.ticker, stock.rationale, stock.stockName)}
    className={`relative bg-gray-800 border border-gray-700/80 rounded-lg p-4 transition-all duration-200 transform shadow-lg flex flex-col justify-between h-full ${isAnalyzing ? 'cursor-wait opacity-60' : 'cursor-pointer hover:bg-gray-700/70 hover:border-cyan-500 hover:-translate-y-1'}`}
  >
    <div>
      <div className="flex justify-between items-start">
        <div className="pr-16">
          <h3 className="text-xl font-bold text-gray-100">{stock.stockName}</h3>
          <p className="text-sm font-mono text-gray-400">{stock.ticker}</p>
        </div>
        <MarketBadge market={stock.market} />
      </div>
      <div className="mt-3 p-3 bg-gray-900/50 rounded-md border-l-4 border-cyan-500">
        <p className="text-xs font-semibold text-cyan-300 mb-1">AI 추천 핵심 근거</p>
        <p className="text-gray-300 text-sm leading-relaxed">{stock.rationale}</p>
      </div>
    </div>
    <div className="mt-4 pt-3 border-t border-gray-700/50 flex justify-between items-end">
        <div>
            <p className="text-xs text-gray-400">기준가 <span className="text-gray-500">({stock.priceTimestamp})</span></p>
            <p className="font-mono text-gray-200 text-lg">{stock.referencePrice}</p>
        </div>
        <div className="text-right">
            <p className="text-xs text-gray-400">핵심 매수 지점 ({stock.pivotPoint})</p>
            <p className="text-lg font-bold text-cyan-400">{stock.distanceToPivot}</p>
        </div>
    </div>
  </div>
);