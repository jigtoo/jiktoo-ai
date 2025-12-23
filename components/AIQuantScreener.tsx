
import React, { useState } from 'react';
import type { DashboardStock, MarketTarget } from '../types';
import { StockCard } from './StockCard';
import { LoadingSpinner } from './LoadingSpinner';
import { InfoIcon, MagnifyingGlassIcon as ScreenerIcon, RefreshIcon, AIEvolutionIcon } from './icons';
import { ErrorDisplay } from './ErrorDisplay';

const Tooltip: React.FC<{ text: string }> = ({ text }) => {
    return (
        <span className="absolute left-1/2 -top-2 -translate-y-full -translate-x-1/2 w-48 bg-gray-900 text-white text-xs rounded-lg py-1.5 px-2.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg pointer-events-none before:content-[''] before:absolute before:left-1/2 before:top-full before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-gray-900">
            {text}
        </span>
    );
};

interface RangeSliderProps {
    label: string;
    tooltip: string;
    min: number;
    max: number;
    step: number;
    value: [number, number];
    unit: string;
    onChange: (value: [number, number]) => void;
}

const RangeSlider: React.FC<RangeSliderProps> = ({ label, tooltip, min, max, step, value, unit, onChange }) => {
    return (
        <div>
            <div className="flex items-center gap-2 mb-1">
                <label className="text-sm font-semibold text-gray-300">{label}</label>
                <div className="relative group">
                    <InfoIcon className="h-4 w-4 text-gray-500 cursor-help" />
                    <Tooltip text={tooltip} />
                </div>
            </div>
            <div className="flex items-center gap-4">
                <span className="text-xs font-mono text-gray-400">{min}{unit}</span>
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value[1]}
                    onChange={(e) => onChange([value[0], Number(e.target.value)])}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm font-mono text-cyan-300 font-bold w-16 text-right">{value[1]}{unit} 이하</span>
            </div>
        </div>
    );
};

const RecipeButton: React.FC<{
    title: string;
    description: string;
    active: boolean;
    onClick: () => void;
    icon?: React.ReactNode;
}> = ({ title, description, active, onClick, icon }) => (
    <button
        onClick={onClick}
        className={`p-4 rounded-xl border text-left transition-all ${active
            ? 'bg-blue-500/20 border-blue-500/50 shadow-lg shadow-blue-500/10'
            : 'bg-gray-800/50 border-gray-700 hover:border-gray-600 hover:bg-gray-800'
            }`}
    >
        <div className="font-bold text-gray-100 mb-1 flex items-center gap-2">
            {icon}
            {title}
        </div>
        <div className="text-xs text-gray-400">{description}</div>
    </button>
);

interface AIQuantScreenerProps {
    marketTarget: MarketTarget;
    results: any[];
    isLoading: boolean;
    error: string | null;
    handleScan: (type: 'value' | 'power' | 'turnaround' | 'genome' | 'hof' | 'all') => void;
    activeRecipe: string | null;
}

export const AIQuantScreener: React.FC<AIQuantScreenerProps> = ({
    results,
    isLoading,
    error,
    handleScan,
    activeRecipe
}) => {
    // Internal state moved to useAIQuantScreener hook
    // const [isLoading, setIsLoading] = useState(false);
    // ...




    return (
        <div className="bg-gray-800 rounded-3xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <ScreenerIcon className="h-6 w-6 text-blue-400" />
                    AI 퀀트 스크리너
                </h2>
                {isLoading && <LoadingSpinner />}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <RecipeButton
                    title="🧬 게놈 헌터 (Evolved)"
                    description="타임머신에서 검증된 활성 전략으로 종목 발굴"
                    active={activeRecipe === 'genome'}
                    onClick={() => handleScan('genome')}
                    icon={<AIEvolutionIcon className="w-4 h-4 text-purple-400" />}
                />
                <RecipeButton
                    title="💎 슈퍼 밸류 + 피벗 (Wide)"
                    description="저평가 우량주 및 중소형주의 반등 시점 포착"
                    active={activeRecipe === 'value'}
                    onClick={() => handleScan('value')}
                />
                <RecipeButton
                    title="🚀 파워 플레이 (Wide)"
                    description="강력한 모멘텀(20%+) 및 숨은 강자 발굴"
                    active={activeRecipe === 'power'}
                    onClick={() => handleScan('power')}
                />
                <RecipeButton
                    title="🔄 턴어라운드 + 매집"
                    description="바닥권 대량 거래(폭풍 전야) 및 추세 전환"
                    active={activeRecipe === 'turnaround'}
                    onClick={() => handleScan('turnaround')}
                />
                <RecipeButton
                    title="🏆 명예의 전당 (Precision)"
                    description="미너비니, 래리 윌리엄스 + AI Insight (정밀 타격)"
                    active={activeRecipe === 'hof'}
                    onClick={() => handleScan('hof')}
                />
                <button
                    onClick={() => handleScan('all')}
                    disabled={isLoading}
                    className={`col-span-1 md:col-span-2 lg:col-span-5 p-3 rounded-xl border border-dashed border-indigo-500/50 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 transition-all font-bold flex items-center justify-center gap-2 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <RefreshIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    {isLoading && activeRecipe === 'all' ? '전체 스캔 진행 중...' : '원클릭: 모든 전략 순차 실행 (명예의 전당 포함)'}
                </button>
            </div>

            {error && <ErrorDisplay message={error} onRetry={() => activeRecipe && handleScan(activeRecipe as any)} />}

            {results.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {results.map((stock, index) => (
                        <StockCard
                            key={`${stock.ticker}-${index}`}
                            stock={stock}
                            onSelect={(ticker, rationale, name) => console.log(`Selected ${name} (${ticker})`)}
                        />
                    ))}
                </div>
            )}

            {!isLoading && !error && results.length === 0 && (
                <div className="text-center text-gray-500 py-12">
                    위 전략 버튼을 클릭하여 AI 스캔을 시작하세요.
                </div>
            )}
        </div>
    );
};