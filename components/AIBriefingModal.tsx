import React from 'react';
import type { PortfolioItem } from '../types';
import { CloseIcon, BrainIcon, InfoIcon, StrategyIcon } from './icons';
import { LoadingSpinner } from './LoadingSpinner';

interface AIBriefingModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: PortfolioItem | null;
    isLoading: boolean;
}

export const AIBriefingModal: React.FC<AIBriefingModalProps> = ({ isOpen, onClose, item, isLoading }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" 
            onClick={onClose}
        >
            <div 
                className="bg-gray-900 border border-cyan-700/50 rounded-xl shadow-2xl w-full max-w-2xl m-4 flex flex-col" 
                style={{maxHeight: '90vh'}} 
                onClick={e => e.stopPropagation()}
            >
                <header className="p-4 flex justify-between items-center border-b border-gray-700 flex-shrink-0">
                     <div className="flex items-center gap-3">
                        <BrainIcon className="h-6 w-6 text-cyan-400"/>
                        <h2 className="text-xl font-bold text-white">
                            AI 오토파일럿 브리핑: {item?.stockName}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-600">
                        <CloseIcon className="h-6 w-6" />
                    </button>
                </header>
                
                <div className="p-6 overflow-y-auto">
                   {isLoading && <LoadingSpinner message="AI가 최신 정보를 바탕으로 브리핑을 생성 중입니다..." />}
                   {!isLoading && item && item.aiBriefing && (
                        <div className="space-y-6">
                            <div className="p-4 bg-gray-800/50 rounded-lg border-l-4 border-yellow-500">
                                <h3 className="flex items-center gap-2 font-bold text-yellow-300 mb-1">
                                    <InfoIcon className="h-5 w-5"/>
                                    이벤트 발생
                                </h3>
                                <p className="text-gray-200">{item.aiBriefing.triggeredBy}</p>
                            </div>
                             <div className="p-4 bg-gray-800/50 rounded-lg">
                                <h3 className="flex items-center gap-2 font-bold text-gray-300 mb-1">
                                    <BrainIcon className="h-5 w-5"/>
                                    AI 현재 상황 분석
                                </h3>
                                <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{item.aiBriefing.summary}</p>
                            </div>
                             <div className="p-4 bg-green-900/30 rounded-lg border border-green-700/50">
                                <h3 className="flex items-center gap-2 font-bold text-green-300 mb-1">
                                    <StrategyIcon className="h-5 w-5"/>
                                    AI 대응 전략 제안
                                </h3>
                                <p className="text-green-200 font-semibold text-lg">{item.aiBriefing.recommendedAction}</p>
                            </div>
                        </div>
                   )}
                   {!isLoading && (!item || !item.aiBriefing) && (
                       <p className="text-center text-gray-500">브리핑 정보를 불러올 수 없습니다.</p>
                   )}
                </div>
            </div>
        </div>
    );
};
