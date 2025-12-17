

import React, { useState } from 'react';
import { SearchIcon, CloseIcon, CheckCircleIcon } from './icons';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorDisplay } from './ErrorDisplay';
import type { MarketTarget } from '../types';


interface GlobalAnalysisStatusBarProps {
    status: 'idle' | 'loading' | 'error';
    stockName?: string;
    progress?: number;
    error?: string | null;
    onSearch: (query: string, rationale?: string, stockName?: string) => void;
    onCancel: () => void;
    marketTarget: MarketTarget;
}

export const GlobalAnalysisStatusBar: React.FC<GlobalAnalysisStatusBarProps> = ({
    status,
    stockName,
    progress = 0,
    error,
    onSearch,
    onCancel,
    marketTarget
}) => {
    const [inputValue, setInputValue] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputValue.trim()) {
            onSearch(inputValue.trim());
            setInputValue('');
        }
    };

    const usButtonClass = 'from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600';
    const krButtonClass = 'from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700';
    const buttonClass = marketTarget === 'US' ? usButtonClass : krButtonClass;


    const renderIdle = () => (
        <form onSubmit={handleSubmit} className="flex gap-2 items-center justify-center w-full max-w-lg mx-auto">
            <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={marketTarget === 'KR' ? "종목명 또는 종목 번호 입력" : "종목 또는 티커 입력"}
                className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition duration-200"
                aria-label="Stock Input"
                autoComplete="off"
            />
            <button
                type="submit"
                disabled={!inputValue.trim()}
                className={`flex items-center justify-center px-6 py-3 bg-gradient-to-r ${buttonClass} text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-500 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
                aria-label="Analyze Stock"
            >
                <SearchIcon />
                <span className="ml-2 hidden sm:inline">분석</span>
            </button>
        </form>
    );

    const renderLoading = () => (
        <div className="w-full max-w-lg mx-auto p-3 bg-gray-800 border-2 border-gray-700 rounded-lg flex items-center gap-4">
            <LoadingSpinner progress={progress} showWittyMessages={true} />
            <div className="flex-grow">
                <p className="font-semibold text-gray-200">AI가 {stockName} 종목을 분석 중입니다...</p>
                <p className="text-sm text-gray-400">최상의 결과를 위해 잠시만 기다려주세요.</p>
            </div>
            <button
                onClick={onCancel}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-full transition-colors"
                aria-label="Cancel analysis"
            >
                <CloseIcon />
            </button>
        </div>
    );

    const renderError = () => (
        <div className="w-full max-w-lg mx-auto">
            <ErrorDisplay
                title="분석 실패"
                message={error || '알 수 없는 오류가 발생했습니다. 종목명을 확인하시거나 잠시 후 다시 시도해주세요.'}
                onRetry={() => {
                    if (stockName) {
                        onSearch(stockName, `재시도: 이전 오류 - ${error}`, stockName);
                    }
                }}
            />
        </div>
    );

    switch (status) {
        case 'loading':
            return renderLoading();
        case 'error':
            return renderError();
        case 'idle':
        default:
            return renderIdle();
    }
};