import React from 'react';
import type { AnalysisResult, MarketTarget } from '../types';
import { ResultsDisplay } from './ResultsDisplay';
import { CloseIcon, TargetIcon, StopLossIcon } from './icons';
import { marketInfo } from '../services/marketInfo';

interface AnalysisSnapshotModalProps {
    isOpen: boolean;
    onClose: () => void;
    analysis: AnalysisResult | null;
    marketTarget: MarketTarget;
}

export const AnalysisSnapshotModal: React.FC<AnalysisSnapshotModalProps> = ({ isOpen, onClose, analysis, marketTarget }) => {
    if (!isOpen || !analysis) return null;

    const buyPlan = analysis.synthesis?.buyPlan;
    const currency = marketInfo[marketTarget].currency;
    const formatOptions = { maximumFractionDigits: marketTarget === 'KR' ? 0 : 2 };

    return (
        <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" 
            onClick={onClose}
        >
            <div 
                className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-4xl m-4 flex flex-col" 
                style={{maxHeight: '90vh'}} 
                onClick={e => e.stopPropagation()}
            >
                <header className="p-4 flex justify-between items-center border-b border-gray-700 flex-shrink-0">
                    <h2 className="text-xl font-bold text-white">
                        분석 스냅샷: {analysis.stockName} (AI 분석 시점)
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-600">
                        <CloseIcon className="h-6 w-6" />
                    </button>
                </header>
                
                <div className="p-4 sm:p-6 overflow-y-auto">
                    {buyPlan && (
                        <div className="mb-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700 grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
                            <div>
                                <h4 className="flex items-center justify-center gap-2 text-sm font-semibold text-gray-400">
                                    <TargetIcon className="h-5 w-5 text-green-400" />
                                    <span>AI 추천 매수 진입점</span>
                                </h4>
                                <div className="text-2xl font-bold font-mono text-green-300 mt-1 h-8">
                                    {buyPlan.recommendedPrice
                                        ? <span>{currency}{buyPlan.recommendedPrice.toLocaleString(undefined, formatOptions)}</span>
                                        : buyPlan.entryConditionText
                                        ? <span className="text-base text-yellow-300 italic">{buyPlan.entryConditionText}</span>
                                        : <span>N/A</span>
                                    }
                                </div>
                            </div>
                             <div>
                                <h4 className="flex items-center justify-center gap-2 text-sm font-semibold text-gray-400">
                                    <StopLossIcon className="h-5 w-5 text-red-400" />
                                    <span>AI 추천 손절매 가격</span>
                                </h4>
                                <p className="text-2xl font-bold font-mono text-red-300 mt-1 h-8">
                                    {buyPlan.stopLossPrice ? `${currency}${buyPlan.stopLossPrice.toLocaleString(undefined, formatOptions)}` : 'N/A'}
                                </p>
                            </div>
                        </div>
                    )}
                    <ResultsDisplay
                        result={analysis}
                        sources={[]}
                        onOpenFormForAnalysis={() => {}} // This is a read-only view
                        onUpdateUserNote={() => {}}
                        onGoHome={onClose}
                        marketTarget={marketTarget}
                    />
                </div>
            </div>
        </div>
    );
};