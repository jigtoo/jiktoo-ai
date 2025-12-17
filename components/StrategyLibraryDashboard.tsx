// Placeholder to ensure I wait for views
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { useStrategyLibrary } from '../hooks/useStrategyLibrary';
import type { UserStrategy, MarketTarget, MarketHealth } from '../types';
import type { useAITrader } from '../hooks/useAITrader';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorDisplay } from './ErrorDisplay';
import { BookOpenIcon, TrashIcon, InfoIcon, PlusIcon, ImportIcon, StoreIcon, HeartIcon, DuplicateIcon, CheckCircleIcon, AITradingLabIcon, EditIcon } from './icons';
import { AITraderDashboard } from './AITraderDashboard';

interface StrategyLibraryDashboardProps extends ReturnType<typeof useStrategyLibrary> {
    aiTraderData: ReturnType<typeof useAITrader>;
    marketTarget: MarketTarget;
    marketStatus: MarketHealth['status'] | undefined;
    onEdit?: (strategy: UserStrategy) => void;
}

const StrategyCard: React.FC<{
    strategy: UserStrategy;
    onDelete: (id: string) => void;
    onToggleActive: (id: string, isActive: boolean) => void;
    onEdit?: (strategy: UserStrategy) => void;
}> = ({ strategy, onDelete, onToggleActive, onEdit }) => {
    const { backtest_result: br } = strategy;
    return (
        <div className="bg-gray-800/70 border border-gray-700 rounded-xl shadow-lg p-4 space-y-3">
            <div className="flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-white">{strategy.name}</h3>
                        {strategy.isDefault && (
                            <span className="px-2 py-0.5 text-xs font-semibold bg-cyan-800 text-cyan-200 rounded-md">(기본 탑재)</span>
                        )}
                    </div>
                    <p className="text-xs text-gray-500">생성일: {new Date(strategy.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                    {onEdit && (
                        <button onClick={() => onEdit(strategy)} className="p-1 text-gray-400 hover:text-blue-400" title="수정 (빌더로 불러오기)">
                            <EditIcon />
                        </button>
                    )}
                    {!strategy.isDefault && (
                        <button onClick={() => onDelete(strategy.id)} className="p-1 text-gray-400 hover:text-red-400"><TrashIcon /></button>
                    )}
                </div>
            </div>

            <p className="text-sm text-gray-400 italic line-clamp-2 h-10">"{strategy.description}"</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-xs">
                <div className="bg-gray-900/50 p-2 rounded-md"><p className="font-semibold text-gray-400">승률</p><p className="font-bold text-lg text-white">{(br.winRate || 0).toFixed(1)}%</p></div>
                <div className="bg-gray-900/50 p-2 rounded-md"><p className="font-semibold text-gray-400">손익비</p><p className="font-bold text-lg text-white">{(br.profitFactor || 0).toFixed(2)}</p></div>
                <div className="bg-gray-900/50 p-2 rounded-md"><p className="font-semibold text-gray-400">CAGR</p><p className="font-bold text-lg text-white">{(br.cagr || 0).toFixed(1)}%</p></div>
                <div className="bg-gray-900/50 p-2 rounded-md"><p className="font-semibold text-gray-400">MDD</p><p className="font-bold text-lg text-red-400">{(br.maxDrawdown || 0).toFixed(1)}%</p></div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-3 border-t border-gray-700">
                <span className="text-sm font-semibold text-gray-300">알파 엔진 활성화</span>
                <label htmlFor={`toggle-${strategy.id}`} className="flex items-center cursor-pointer">
                    <div className="relative">
                        <input type="checkbox" id={`toggle-${strategy.id}`} className="sr-only" checked={strategy.is_active} onChange={(e) => onToggleActive(strategy.id, e.target.checked)} />
                        <div className={`block w-12 h-6 rounded-full ${strategy.is_active ? 'bg-cyan-500' : 'bg-gray-600'}`}></div>
                        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${strategy.is_active ? 'transform translate-x-6' : ''}`}></div>
                    </div>
                </label>
            </div>
        </div>
    );
};

const MarketStrategyCard: React.FC<{
    template: UserStrategy;
    onImport: () => void;
    isImported: boolean;
}> = ({ template, onImport, isImported }) => {
    return (
        <div className="bg-gray-800/70 border border-gray-700 rounded-xl shadow-lg p-4 space-y-3">
            <h3 className="text-xl font-bold text-white">{template.name}</h3>
            <p className="text-sm text-gray-400 italic line-clamp-2 h-10">"{template.description}"</p>

            <div className="flex justify-between items-center text-xs text-gray-500">
                <span>제작: JIKTOO AI</span>
                <div className="flex items-center gap-4 opacity-50">
                    <div className="flex items-center gap-1"><HeartIcon className="h-4 w-4" /> <span>1.2k</span></div>
                    <div className="flex items-center gap-1"><DuplicateIcon className="h-4 w-4" /> <span>345</span></div>
                </div>
            </div>

            <div className="pt-3 border-t border-gray-700">
                <button
                    onClick={onImport}
                    disabled={isImported}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:bg-gray-600"
                >
                    {isImported ? <><CheckCircleIcon /> 추가됨</> : <><ImportIcon /> 내 라이브러리로 가져오기</>}
                </button>
            </div>
        </div>
    );
};

const StrategyMarketPlaceholder: React.FC = () => (
    <div className="text-center text-gray-400 py-12 px-4 bg-gray-800/30 rounded-lg">
        <StoreIcon className="h-12 w-12 mx-auto mb-4 text-gray-500" />
        <h3 className="text-xl font-semibold text-gray-200">전략 마켓 (준비 중)</h3>
        <p className="mt-2 max-w-md mx-auto">
            향후 이곳에서 직투 AI가 개발한 새로운 추천 전략이나 다른 우수한 투자자들의 검증된 전략을 발견하고, 클릭 한 번으로 당신의 라이브러리에 추가할 수 있게 될 것입니다.
        </p>
    </div>
);


export const StrategyLibraryDashboard: React.FC<StrategyLibraryDashboardProps> = ({
    strategies,
    isLoading,
    error,
    deleteStrategy,
    toggleStrategyActive,
    templateStrategies,
    importStrategy,
    aiTraderData,
    marketTarget,
    marketStatus,
    onEdit, // Destructure onEdit
}) => {
    const [activeTab, setActiveTab] = useState<'library' | 'lab' | 'market'>('library');

    const importedTemplateIds = new Set(strategies.map(s => s.name)); // Using name as a simple check

    const renderMyLibrary = () => {
        if (isLoading) return <LoadingSpinner message="나만의 전략 라이브러리를 불러오는 중..." />;
        if (error) return <ErrorDisplay title="라이브러리 로딩 실패" message={error} />;
        if (strategies.length === 0) return (
            <div className="text-center text-gray-400 py-8 px-4 bg-gray-800/30 rounded-lg">
                <InfoIcon className="h-16 w-16 mx-auto mb-4 text-gray-600" />
                <h3 className="text-xl font-semibold text-gray-200">라이브러리가 비어있습니다.</h3>
                <p className="mt-2">
                    '전략 마켓' 탭에서 추천 전략을 가져오거나 '새 전략 만들기'로 당신만의 전략을 만들어보세요.
                </p>
            </div>
        );
        return (
            <div className="space-y-4">
                {strategies.map(s => (
                    <StrategyCard
                        key={s.id}
                        strategy={s}
                        onDelete={deleteStrategy}
                        onToggleActive={toggleStrategyActive}
                        onEdit={onEdit}
                    />
                ))}
            </div>
        );
    };

    const renderStrategyMarket = () => (
        <div className="space-y-4">
            <StrategyMarketPlaceholder />
            {templateStrategies.map(template => (
                <MarketStrategyCard
                    key={template.id}
                    template={template}
                    onImport={() => importStrategy(template.id)}
                    isImported={importedTemplateIds.has(template.name)}
                />
            ))}
        </div>
    );

    return (
        <div className="animate-fade-in space-y-8">
            <header className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <BookOpenIcon className="h-10 w-10 text-cyan-400" />
                    <div>
                        <h2 className="text-3xl font-bold text-gray-100">전략 라이브러리</h2>
                        <p className="text-gray-400">나만의 투자 전략을 만들고, 관리하고, 자동화하는 공간입니다.</p>
                    </div>
                </div>
                <Link to="/strategy-lab-v2" className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700">
                    <PlusIcon />
                    새 전략 만들기
                </Link>
            </header>

            <div className="flex items-center gap-2 p-1 bg-gray-800/80 rounded-lg">
                <button
                    onClick={() => setActiveTab('library')}
                    className={`w-full py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'library' ? 'bg-cyan-600/50 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                >
                    나의 라이브러리 ({strategies.length})
                </button>
                <button
                    onClick={() => setActiveTab('lab')}
                    className={`w-full py-2 text-sm font-semibold rounded-md transition-colors flex items-center justify-center gap-2 ${activeTab === 'lab' ? 'bg-cyan-600/50 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                >
                    <AITradingLabIcon />
                    AI 트레이딩 랩
                </button>
                <button
                    onClick={() => setActiveTab('market')}
                    className={`w-full py-2 text-sm font-semibold rounded-md transition-colors flex items-center justify-center gap-2 ${activeTab === 'market' ? 'bg-cyan-600/50 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                >
                    <StoreIcon />
                    전략 마켓 (개발중)
                </button>
            </div>

            {activeTab === 'library' && renderMyLibrary()}
            {activeTab === 'lab' && <AITraderDashboard {...aiTraderData} marketTarget={marketTarget} marketStatus={marketStatus} />}
            {activeTab === 'market' && renderStrategyMarket()}
        </div>
    );
};