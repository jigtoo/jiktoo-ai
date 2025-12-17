
// components/MaterialRadarDashboard.tsx
import React from 'react';
import type { DetectedMaterial, MarketTarget, MaterialSignal } from '../types';
import type { useMaterialRadar } from '../hooks/useMaterialRadar';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorDisplay } from './ErrorDisplay';
import { RadarIcon, InfoIcon, TrendingUpIcon, NewsIcon, CommunityIcon, ScaleIcon, CheckCircleIcon, RefreshIcon } from './icons';

interface MaterialRadarDashboardProps {
    radar: ReturnType<typeof useMaterialRadar>;
    marketTarget: MarketTarget;
    // isEmbedded?: boolean; // Removed as it's always full page now
}

const SignalIcon: React.FC<{ type: MaterialSignal['type'] }> = ({ type }) => {
    switch (type) {
        case 'volume': return <TrendingUpIcon className="h-5 w-5 text-green-400" />;
        case 'news': return <NewsIcon className="h-5 w-5 text-sky-400" />;
        case 'social': return <CommunityIcon className="h-5 w-5 text-purple-400" />;
        case 'regulatory': return <ScaleIcon className="h-5 w-5 text-yellow-400" />;
        default: return <InfoIcon className="h-5 w-5 text-gray-400" />;
    }
};

const ReliabilityGauge: React.FC<{ score: number; grade: string }> = ({ score, grade }) => {
    const percentage = Math.max(0, Math.min(100, score));
    const radius = 24;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    const gradeConfig: Record<string, { color: string, textColor: string }> = {
        'A': { color: 'text-green-400', textColor: 'text-green-300' },
        'B': { color: 'text-yellow-400', textColor: 'text-yellow-300' },
        'C': { color: 'text-red-400', textColor: 'text-red-300' },
    };

    const config = gradeConfig[grade] || { color: 'text-gray-400', textColor: 'text-gray-300' };

    return (
        <div className="relative w-16 h-16 flex-shrink-0" aria-label={`AI 신뢰도: ${score}점, 등급: ${grade}`}>
            <svg className="w-full h-full" viewBox="0 0 56 56">
                <circle className="text-gray-700" strokeWidth="5" stroke="currentColor" fill="transparent" r={radius} cx="28" cy="28" />
                <circle
                    className={config.color}
                    strokeWidth="5"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="28"
                    cy="28"
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.5s ease-in-out' }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-xl font-bold ${config.textColor}`}>{grade}</span>
            </div>
        </div>
    );
};

const MaterialCard: React.FC<{ material: DetectedMaterial }> = ({ material }) => {
    return (
        <div className="bg-gray-800/70 border border-gray-700 rounded-xl shadow-lg animate-fade-in">
            <header className="p-4 flex justify-between items-start gap-4 bg-gray-900/50 rounded-t-xl">
                <div>
                    <h3 className="text-xl font-bold text-white">{material.title}</h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {material.relatedStocks.map(s => (
                            <span key={s.ticker} className="px-2 py-1 text-xs font-semibold bg-gray-700 text-gray-300 rounded-md">{s.stockName} ({s.ticker})</span>
                        ))}
                    </div>
                </div>
                <div className="text-center">
                    <ReliabilityGauge score={material.reliabilityScore} grade={material.reliabilityGrade} />
                    <p className="text-xs font-bold text-gray-400 mt-1">신뢰도</p>
                </div>
            </header>

            <div className="p-4 space-y-4">
                <div className="p-3 bg-gray-900/40 rounded-lg border-l-4 border-cyan-500">
                    <h4 className="font-bold text-cyan-300 mb-1">AI 브리핑</h4>
                    <p className="text-sm text-gray-300">{material.aiBriefing}</p>
                </div>

                <details className="bg-gray-900/40 rounded-lg">
                    <summary className="p-3 font-semibold text-cyan-400 cursor-pointer">신호 타임라인 보기</summary>
                    <div className="mt-3 pt-3 border-t border-gray-700 space-y-3">
                        {material.signals.map((signal, index) => (
                            <div key={index} className="flex items-start gap-3">
                                <div className="flex-shrink-0 mt-0.5"><SignalIcon type={signal.type} /></div>
                                <div>
                                    <p className="text-sm text-gray-200">{signal.text}</p>
                                    <p className="text-xs text-gray-500">{signal.timestamp}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </details>
            </div>
        </div>
    );
};

export const MaterialRadarDashboard: React.FC<MaterialRadarDashboardProps> = ({ radar, marketTarget }) => {
    const { detectedMaterials, isLoading, error, handleScan, handleLoadSample, dataType, lastScanTime } = radar;

    const usButtonClass = 'from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600';
    const krButtonClass = 'from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700';
    const buttonClass = marketTarget === 'US' ? usButtonClass : krButtonClass;

    const renderInitialState = () => (
        <div className="text-center p-10 bg-gray-800/30 rounded-lg space-y-4">
            <p className="text-gray-400">AI의 실시간 분석을 실행하여 시장의 미세 신호를 포착하세요.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
                <button
                    onClick={() => handleScan()}
                    disabled={isLoading}
                    className={`w-full sm:w-auto px-6 py-3 bg-gradient-to-r ${buttonClass} text-white font-bold rounded-lg shadow-lg transition-transform transform hover:scale-105 disabled:opacity-50`}
                >
                    실시간 재료 탐지 실행
                </button>
            </div>
        </div>
    );

    const renderContent = () => {
        if (isLoading && !detectedMaterials) {
            return <div className="mt-8"><LoadingSpinner message="AI가 시장의 미세 신호를 감지하고 있습니다..." showWittyMessages={true} /></div>;
        }

        if (error) {
            return <ErrorDisplay title="재료 탐지 실패" message={error} onRetry={() => handleScan()} />;
        }

        if (!detectedMaterials) {
            return renderInitialState();
        }

        if (detectedMaterials.length === 0) {
            return (
                <div className="text-center text-gray-500 py-20 px-4 bg-gray-800/30 rounded-lg">
                    <InfoIcon className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                    <h3 className="text-xl font-semibold text-gray-400">포착된 재료 없음</h3>
                    <p className="mt-2">현재 시장에서 유의미한 사전 신호(재료)가 감지되지 않았습니다.</p>
                </div>
            );
        }

        return (
            <div className="space-y-6">
                {detectedMaterials.map(material => <MaterialCard key={material.id} material={material} />)}
            </div>
        );
    };

    // FullHeader is now always rendered as the component is no longer embedded
    const FullHeader = () => (
        <header className="p-4 bg-gray-800/30 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-center sm:text-left">
                <div className="inline-block bg-gray-700 p-3 rounded-full mb-3">
                    <RadarIcon className="h-10 w-10 text-cyan-400" />
                </div>
                <h2 className="text-3xl font-bold text-gray-100">AI 재료 탐지 레이더</h2>
                <p className="text-gray-400 mt-1 max-w-3xl">
                    '소문에 사서 뉴스에 팔아라' - AI가 뉴스가 되기 전의 미세한 신호를 다중 채널에서 실시간으로 포착하여 선반영 기회를 제공합니다.
                </p>
            </div>
            {detectedMaterials && (
                <div className="flex-shrink-0 flex flex-col items-center gap-2">
                    <button
                        onClick={() => handleScan()}
                        disabled={isLoading}
                        className={`flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg shadow-md hover:bg-gray-600 transition-colors disabled:opacity-50`}
                    >
                        <RefreshIcon className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
                        <span>재탐색</span>
                    </button>
                    {lastScanTime && (
                        <div className={`p-2 rounded-md text-center text-xs w-full ${dataType === 'sample' ? 'bg-yellow-900/40 text-yellow-300' : 'bg-gray-900/50 text-gray-400'}`}>
                            <p>마지막 스캔: {new Date(lastScanTime).toLocaleString('ko-KR')}</p>
                            <p>({dataType === 'sample' ? '샘플 데이터' : '실시간 데이터'})</p>
                        </div>
                    )}
                </div>
            )}
        </header>
    );

    return (
        <div className="animate-fade-in space-y-8">
            <FullHeader /> {/* Always render the full header */}

            {renderContent()}
        </div>
    );
};
