// components/UserWatchlistDashboard.tsx
import React, { useState } from 'react';
import type { useUserWatchlist } from '../hooks/useUserWatchlist';
import type { MarketTarget, UserWatchlistItem } from '../types';
import { WatchlistIcon, PlusIcon, TrashIcon, RefreshIcon, CloseIcon } from './icons';
import { ErrorDisplay } from './ErrorDisplay';
import { formatStockDisplay } from '../utils/stockDisplay';

interface UserWatchlistDashboardProps extends ReturnType<typeof useUserWatchlist> {
    marketTarget: MarketTarget;
}

const WatchlistModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    items: UserWatchlistItem[];
    onRemove: (ticker: string) => void;
}> = ({ isOpen, onClose, items, onRemove }) => {
    if (!isOpen) return null;

    // Sort items alphabetically by stockName (Korean)
    const sortedItems = [...items].sort((a, b) => a.stockName.localeCompare(b.stockName, 'ko'));

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md m-4 flex flex-col" style={{ maxHeight: '80vh' }} onClick={e => e.stopPropagation()}>
                <header className="p-4 flex justify-between items-center border-b border-gray-700">
                    <h3 className="text-xl font-bold text-white">전체 관심종목 ({items.length}개)</h3>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-600">
                        <CloseIcon className="h-6 w-6" />
                    </button>
                </header>
                <div className="p-4 overflow-y-auto">
                    {sortedItems.length > 0 ? (
                        <div className="space-y-2">
                            {sortedItems.map(item => (
                                <div key={item.ticker} className="flex justify-between items-center p-2 bg-gray-900/50 rounded-md">
                                    <div>
                                        <span className="font-semibold text-white">{formatStockDisplay(item.stockName, item.ticker)}</span>
                                    </div>
                                    <button
                                        onClick={() => onRemove(item.ticker)}
                                        className="p-1 text-gray-500 hover:text-red-400"
                                        aria-label={`${item.stockName} 삭제`}
                                    >
                                        <TrashIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 py-8">추가된 관심종목이 없습니다.</p>
                    )}
                </div>
            </div>
        </div>
    );
};


export const UserWatchlistDashboard: React.FC<UserWatchlistDashboardProps> = ({
    watchlistItems,
    isLoading,
    error,
    addStock,
    removeStock,
    marketTarget,
}) => {
    const [query, setQuery] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [addError, setAddError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);


    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setIsAdding(true);
        setAddError(null);
        const result = await addStock(query);
        if (result.success) {
            setQuery('');
            // Removed scroll to end logic as it's no longer needed with the modal/accordion approach
        } else {
            setAddError(result.message || '종목을 추가하지 못했습니다.');
        }
        setIsAdding(false);
    };


    return (
        <>
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl shadow-lg p-4">
                <header className="flex justify-between items-center gap-2 mb-4">
                    <div className="flex items-center gap-3">
                        <WatchlistIcon />
                        <h2 className="text-2xl font-bold text-gray-200">나의 관심종목 ({watchlistItems.length}개)</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsModalOpen(true)} className="px-3 py-1 text-xs font-semibold bg-gray-600 text-white rounded-md hover:bg-gray-500">
                            전체 보기
                        </button>
                    </div>
                </header>

                {error && <ErrorDisplay title="관심종목 오류" message={error} />}

                <form onSubmit={handleAdd} className="flex gap-2 mb-4">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="종목명 또는 티커를 입력하여 추가..."
                        className="flex-grow px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white"
                        disabled={isAdding}
                    />
                    <button
                        type="submit"
                        className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white font-semibold rounded-md hover:bg-cyan-700 disabled:opacity-50"
                        disabled={isAdding || !query.trim()}
                    >
                        {isAdding ? <RefreshIcon className="h-5 w-5 animate-spin" /> : <PlusIcon className="h-5 w-5" />}
                        <span className="hidden sm:inline">추가</span>
                    </button>
                </form>
                {addError && <p className="text-red-400 text-sm text-center -mt-2 mb-2">{addError}</p>}

                {/* Accordion-style Watchlist */}
                <div className="border border-gray-600 rounded-lg overflow-hidden">
                    {/* Accordion Header (Always Visible) */}
                    <button
                        onClick={() => setIsModalOpen(!isModalOpen)}
                        className="w-full p-3 bg-gray-700/50 hover:bg-gray-700 flex justify-between items-center transition-colors"
                    >
                        <span className="text-gray-300 text-sm font-semibold">
                            {watchlistItems.length > 0
                                ? `${watchlistItems.length}개 종목 관리`
                                : '관심종목 없음'}
                        </span>
                        <span className="text-gray-400 text-xs">
                            {isModalOpen ? '▲ 접기' : '▼ 펼치기'}
                        </span>
                    </button>

                    {/* Accordion Body (Expandable) */}
                    {isModalOpen && (
                        <div className="bg-gray-900/50 max-h-80 overflow-y-auto border-t border-gray-700">
                            {watchlistItems.length > 0 ? (
                                <div className="divide-y divide-gray-700">
                                    {[...watchlistItems]
                                        .sort((a, b) => a.stockName.localeCompare(b.stockName, 'ko'))
                                        .map(item => (
                                            <div
                                                key={item.ticker}
                                                className="p-3 flex justify-between items-center hover:bg-gray-700/30 transition-colors"
                                            >
                                                <div className="flex-1">
                                                    <div className="font-semibold text-white text-sm">{formatStockDisplay(item.stockName, item.ticker)}</div>
                                                </div>
                                                <button
                                                    onClick={() => removeStock(item.ticker)}
                                                    className="ml-3 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs rounded transition-colors flex items-center gap-1"
                                                    aria-label={`${item.stockName} 삭제`}
                                                >
                                                    <TrashIcon className="h-3.5 w-3.5" />
                                                    <span>삭제</span>
                                                </button>
                                            </div>
                                        ))
                                    }
                                </div>
                            ) : (
                                <p className="text-center text-gray-500 py-8">추가된 관심종목이 없습니다.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <WatchlistModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                items={watchlistItems}
                onRemove={removeStock}
            />
        </>
    );
};