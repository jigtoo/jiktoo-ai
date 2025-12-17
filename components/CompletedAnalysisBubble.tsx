import React from 'react';
import { CheckCircleIcon, CloseIcon } from './icons';

interface CompletedAnalysisBubbleProps {
    stockName: string;
    onView: () => void;
    onClose: () => void;
}

export const CompletedAnalysisBubble: React.FC<CompletedAnalysisBubbleProps> = ({ stockName, onView, onClose }) => {
    
    const handleClose = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent triggering onView
        onClose();
    };

    return (
        <div 
            className="fixed bottom-6 right-6 z-30 flex items-center gap-4 p-4 pr-12 rounded-full bg-green-800/90 backdrop-blur-md border border-green-600 text-white shadow-2xl cursor-pointer hover:bg-green-700/90 transition-colors animate-fade-in"
            onClick={onView}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onView()}
        >
            <CheckCircleIcon className="h-8 w-8 text-green-300 flex-shrink-0 animate-pulse" />
            <div>
                <p className="font-bold">{stockName}</p>
                <p className="text-sm text-green-200">분석 완료! 클릭하여 리포트를 확인하세요.</p>
            </div>
            <button 
                onClick={handleClose}
                className="absolute top-1/2 right-3 -translate-y-1/2 p-2 rounded-full text-green-200 hover:bg-green-600/50 transition-colors"
                aria-label="알림 닫기"
            >
                <CloseIcon className="h-5 w-5" />
            </button>
        </div>
    );
};