


import React, { useState, useEffect } from 'react';
import type { PortfolioItem, BuyPlan, MarketTarget } from '../types';
import { CloseIcon, PortfolioIcon, RefreshIcon } from './icons';
import { findStock } from '../services/gemini/stockService';
import { marketInfo } from '../services/marketInfo';

interface AddPositionFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (item: PortfolioItem) => void;
    initialData?: Partial<PortfolioItem> | null;
    aiRecommendation?: { buyPlan: BuyPlan; reason: string } | null;
    marketTarget: MarketTarget;
    portfolioCash: number;
}

export const AddPositionForm: React.FC<AddPositionFormProps> = ({ isOpen, onClose, onSave, initialData, aiRecommendation, marketTarget, portfolioCash }) => {
    const [query, setQuery] = useState('');
    const [foundStock, setFoundStock] = useState<{ stockName: string; ticker: string } | null>(null);
    const [isFetching, setIsFetching] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    
    const [entryPrice, setEntryPrice] = useState('');
    const [quantity, setQuantity] = useState('');
    const [memo, setMemo] = useState('');
    
    const isEditing = !!initialData?.id;
    const currency = marketInfo[marketTarget].currency;

    useEffect(() => {
        if (isOpen) {
            const stockName = initialData?.stockName || '';
            const ticker = initialData?.ticker || '';
            
            setQuery(stockName);
            setFoundStock(stockName && ticker ? { stockName, ticker } : null);
            
            if (aiRecommendation?.buyPlan) {
                if (aiRecommendation.buyPlan.recommendedPrice) {
                    setEntryPrice(aiRecommendation.buyPlan.recommendedPrice.toString());
                    const memoText = `[AI 매수 근거]\n${aiRecommendation.reason}\n\n[AI 포지션 사이징]\n${aiRecommendation.buyPlan.positionSizing}`;
                    setMemo(memoText);
                } else if (aiRecommendation.buyPlan.entryConditionText) {
                    setEntryPrice(''); // Price is conditional, user must enter it.
                    const memoText = `[AI 진입 조건]\n${aiRecommendation.buyPlan.entryConditionText}\n\n[AI 매수 근거]\n${aiRecommendation.reason}\n\n[AI 포지션 사이징]\n${aiRecommendation.buyPlan.positionSizing}`;
                    setMemo(memoText);
                } else {
                    // Fallback for safety
                    setEntryPrice('');
                    const memoText = `[AI 매수 근거]\n${aiRecommendation.reason}\n\n[AI 포지션 사이징]\n${aiRecommendation.buyPlan.positionSizing}`;
                    setMemo(memoText);
                }
            } else {
                setEntryPrice(initialData?.entryPrice?.toString() || '');
                setMemo(initialData?.memo || '');
            }

            setQuantity(initialData?.quantity?.toString() || '');
            setFetchError(null);
            setFormError(null);
            setIsFetching(false);
        }
    }, [initialData, isOpen, aiRecommendation]);
    
    useEffect(() => {
        if (isEditing || !query || query.length < 2 || (aiRecommendation && query)) {
             setFoundStock(initialData?.stockName && initialData?.ticker ? { stockName: initialData.stockName, ticker: initialData.ticker } : null);
             setFetchError(null);
             return;
        }

        const handler = setTimeout(async () => {
            setIsFetching(true);
            setFetchError(null);
            setFoundStock(null);

            try {
                const stock = await findStock(query, marketTarget);
                if (stock) {
                    setFoundStock(stock);
                } else {
                    setFetchError('해당 종목을 찾을 수 없습니다.');
                }
            } catch (err) {
                setFetchError(err instanceof Error ? err.message : '종목 정보 조회 실패');
            } finally {
                setIsFetching(false);
            }
        }, 700);

        return () => {
            clearTimeout(handler);
        };
    }, [query, isEditing, aiRecommendation, initialData, marketTarget]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        const price = parseFloat(entryPrice);
        const qty = parseFloat(quantity);
        
        const stockToSave = foundStock || (initialData?.ticker && initialData?.stockName ? { ticker: initialData.ticker, stockName: initialData.stockName } : null);

        if (!stockToSave || !stockToSave.ticker || !stockToSave.stockName || isNaN(price) || isNaN(qty) || price <= 0 || qty <= 0) {
            setFormError('유효한 값을 입력해주세요. 종목이 올바르게 선택되었는지 확인해주세요.');
            return;
        }

        const newTotalCost = price * qty;
        let cashRequired = newTotalCost;
        if (isEditing && initialData) {
            const originalCost = (initialData.entryPrice || 0) * (initialData.quantity || 0);
            cashRequired = newTotalCost - originalCost;
        }

        const formatOptions = { maximumFractionDigits: marketTarget === 'KR' ? 0 : 2 };
        if (cashRequired > portfolioCash) {
            setFormError(`보유 현금이 부족합니다. (추가 필요 현금: ${cashRequired.toLocaleString(undefined, formatOptions)}${currency}, 보유 현금: ${portfolioCash.toLocaleString(undefined, formatOptions)}${currency})`);
            return;
        }

        const positionData: PortfolioItem = {
            id: initialData?.id || crypto.randomUUID(),
            ticker: stockToSave.ticker.toUpperCase(),
            stockName: stockToSave.stockName,
            entryPrice: price,
            quantity: qty,
            memo,
            purchaseTimestamp: initialData?.purchaseTimestamp || new Date().toISOString(),
        };
        onSave(positionData);
    };
    
    const focusRingClass = marketTarget === 'US' ? 'focus:ring-orange-500' : 'focus:ring-cyan-500';
    const inputStyle = `w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md focus:outline-none focus:ring-2 ${focusRingClass} text-white disabled:opacity-50`;
    const isSaveDisabled = isFetching || !(foundStock || (initialData?.ticker && initialData?.stockName));
    
    const usButtonClass = 'from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600';
    const krButtonClass = 'from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700';
    const buttonClass = marketTarget === 'US' ? usButtonClass : krButtonClass;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
                <header className="p-4 flex justify-between items-center border-b border-gray-700">
                    <div className="flex items-center gap-3">
                        <PortfolioIcon />
                        <h2 className="text-xl font-bold text-white">{isEditing ? '포지션 수정' : (aiRecommendation ? 'AI 추천 포지션 추가' : '새 포지션 추가')}</h2>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-600">
                        <CloseIcon className="h-6 w-6" />
                    </button>
                </header>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label htmlFor="query" className="block text-sm font-medium text-gray-400 mb-1">종목명 또는 {marketTarget === 'KR' ? '종목 번호' : '티커'}</label>
                        <div className="relative">
                            <input 
                                id="query" 
                                type="text" 
                                value={query} 
                                onChange={e => setQuery(e.target.value)} 
                                className={inputStyle} 
                                placeholder={marketTarget === 'KR' ? "예: 삼성전자 또는 005930" : "예: Apple 또는 AAPL"}
                                required 
                                disabled={isEditing || !!aiRecommendation}
                                autoComplete="off"
                            />
                            {isFetching && (
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <RefreshIcon className="h-5 w-5 text-gray-400 animate-spin" />
                                </div>
                            )}
                        </div>
                        {fetchError && <p className="text-red-400 text-xs mt-1">{fetchError}</p>}
                        {(foundStock || (initialData?.ticker && initialData?.stockName)) && !isFetching && (
                            <div className="mt-2 p-2 bg-gray-900/50 rounded-md text-center">
                                <span className="font-bold text-cyan-400">{foundStock?.stockName || initialData?.stockName}</span>
                                <span className="text-gray-400 ml-2 font-mono">({foundStock?.ticker || initialData?.ticker})</span>
                            </div>
                        )}
                    </div>
                    
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="entryPrice" className="block text-sm font-medium text-gray-400 mb-1">1주 평균 금액 ({currency})</label>
                            <input id="entryPrice" type="number" step="any" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} className={inputStyle} placeholder="0" required />
                        </div>
                         <div>
                            <label htmlFor="quantity" className="block text-sm font-medium text-gray-400 mb-1">수량</label>
                            <input id="quantity" type="number" step="any" value={quantity} onChange={e => setQuantity(e.target.value)} className={inputStyle} placeholder="0" required />
                        </div>
                    </div>
                     <div>
                        <label htmlFor="memo" className="block text-sm font-medium text-gray-400 mb-1">메모 (선택)</label>
                        <textarea id="memo" value={memo} onChange={e => setMemo(e.target.value)} className={inputStyle} rows={4} placeholder="매수 이유, 전략 등"></textarea>
                    </div>

                    {formError && (
                        <div className="p-3 bg-red-900/30 text-red-300 text-sm rounded-md text-center">
                            {formError}
                        </div>
                    )}

                    <div className="pt-2 flex justify-end">
                        <button 
                            type="submit" 
                            className={`px-6 py-2 bg-gradient-to-r ${buttonClass} text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                            disabled={isSaveDisabled}
                        >
                            저장하기
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};