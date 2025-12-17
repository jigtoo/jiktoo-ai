// components/RiskDashboard.tsx
import React from 'react';
import type { useRiskDashboard } from '../hooks/useRiskDashboard';
import type { RiskAlert, RiskSeverity, PortfolioItem } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorDisplay } from './ErrorDisplay';
import { ShieldCheckIcon, AlertIcon, NewsIcon, BrainIcon, TrendingUpIcon, TrendingDownIcon } from './icons';

const RiskScoreGauge: React.FC<{ score: number; summary: string }> = ({ score, summary }) => {
    const percentage = Math.max(0, Math.min(100, score));
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - ((100 - percentage) / 100) * circumference;

    let colorClass = 'text-green-400';
    let textLabel = '안전';
    if (score >= 40) {
        colorClass = 'text-yellow-400';
        textLabel = '주의';
    }
    if (score >= 70) {
        colorClass = 'text-red-400';
        textLabel = '위험';
    }

    return (
        <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-gray-800/50 rounded-lg">
            <div className="relative w-32 h-32 flex-shrink-0" aria-label={`포트폴리오 리스크 점수: ${score}점, ${textLabel}`}>
                <svg className="w-full h-full" viewBox="0 0 120 120">
                    <circle className="text-gray-700" strokeWidth="10" stroke="currentColor" fill="transparent" r={radius} cx="60" cy="60" />
                    <circle
                        className={colorClass}
                        strokeWidth="10"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r={radius}
                        cx="60"
                        cy="60"
                        style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.5s ease-in-out' }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-4xl font-bold ${colorClass}`}>{score}</span>
                    <span className={`text-md font-semibold ${colorClass}`}>{textLabel}</span>
                </div>
            </div>
            <div className="text-center md:text-left">
                <h4 className="font-bold text-lg text-white">AI 종합 진단</h4>
                <p className="text-gray-300 mt-1">{summary}</p>
            </div>
        </div>
    );
};

const RiskAlertCard: React.FC<{ alert: RiskAlert }> = ({ alert }) => {
    const severityConfig: Record<RiskSeverity, { color: string; label: string; }> = {
        '높음': { color: 'border-red-500 bg-red-900/30 text-red-300', label: '높음' },
        '중간': { color: 'border-yellow-500 bg-yellow-900/30 text-yellow-300', label: '중간' },
        '낮음': { color: 'border-blue-500 bg-blue-900/30 text-blue-300', label: '낮음' },
    };

    const config = severityConfig[alert.severity];
    const priceChange = alert.priceChangePercent;
    const priceChangeColor = priceChange && priceChange > 0 ? 'text-green-400' : priceChange && priceChange < 0 ? 'text-red-400' : 'text-gray-400';

    return (
        <div className={`p-4 rounded-lg border-l-4 ${config.color}`}>
            <div className="flex justify-between items-start">
                <div>
                    <p className={`text-sm font-bold ${config.color.split(' ')[2]}`}>{alert.riskType}</p>
                    <div className="flex items-center gap-3 mt-1">
                        <h4 className="text-lg font-bold text-white">{alert.stockName} <span className="font-mono text-gray-400">({alert.ticker})</span></h4>
                        {typeof priceChange === 'number' && (
                            <span className={`font-mono font-bold flex items-center gap-1 ${priceChangeColor}`}>
                                {priceChange > 0 ? <TrendingUpIcon className="h-4 w-4"/> : <TrendingDownIcon className="h-4 w-4"/>}
                                {priceChange.toFixed(1)}%
                            </span>
                        )}
                    </div>
                </div>
                <span className={`px-2 py-1 text-xs font-bold rounded-md ${config.color}`}>
                    위험도: {config.label}
                </span>
            </div>
            <p className="text-sm text-gray-300 mt-2">{alert.summary}</p>
            {alert.relatedNews && (
                 <div className="mt-3 pt-3 border-t border-gray-700/50 flex items-start gap-2 text-xs text-gray-400">
                    <NewsIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <p><strong>관련 정보:</strong> {alert.relatedNews}</p>
                </div>
            )}
            {alert.marketReactionAnalysis && (
                <div className="mt-3 pt-3 border-t border-gray-700/50">
                    <h5 className="flex items-center gap-2 text-sm font-bold text-cyan-300 mb-1">
                        <BrainIcon className="h-5 w-5" />
                        AI 현재 시장 반응 분석
                    </h5>
                    <p className="text-sm text-gray-300">{alert.marketReactionAnalysis}</p>
                </div>
            )}
            <p className="text-right text-xs text-gray-500 mt-2">{new Date(alert.timestamp).toLocaleString()}</p>
        </div>
    );
};


interface RiskDashboardProps {
    riskData: ReturnType<typeof useRiskDashboard>['riskData'];
    isLoading: ReturnType<typeof useRiskDashboard>['isLoading'];
    error: ReturnType<typeof useRiskDashboard>['error'];
    onRefresh: ReturnType<typeof useRiskDashboard>['onRefresh'];
    portfolioItems: PortfolioItem[];
}

export const RiskDashboard: React.FC<RiskDashboardProps> = ({ riskData, isLoading, error, onRefresh, portfolioItems }) => {
    const renderContent = () => {
        if (isLoading) {
            return <LoadingSpinner message="포트폴리오의 잠재적 위험을 분석하고 있습니다..." />;
        }

        if (error) {
            return <ErrorDisplay title="리스크 분석 실패" message={error} onRetry={onRefresh} />;
        }
        
        if (!portfolioItems || portfolioItems.length === 0) {
            return (
                <div className="text-center text-gray-500 py-20 bg-gray-800/30 rounded-lg">
                    <ShieldCheckIcon className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                    <h3 className="text-xl font-semibold text-gray-400">포트폴리오가 비어있습니다.</h3>
                    <p className="mt-2">'내 포트폴리오' 탭에서 종목을 추가하여 AI 리스크 분석을 시작하세요.</p>
                </div>
            );
        }

        if (!riskData) {
            return (
                <div className="text-center text-gray-500 py-20">
                    <p>리스크 데이터를 불러올 수 없습니다.</p>
                </div>
            );
        }

        return (
            <div className="space-y-8">
                <RiskScoreGauge score={riskData.portfolioRiskScore.score} summary={riskData.portfolioRiskScore.summary} />
                <div>
                    <h3 className="text-2xl font-bold text-gray-100 mb-4">현재 활성화된 위험 경보</h3>
                    {riskData.alerts.length > 0 ? (
                        <div className="space-y-4">
                            {riskData.alerts.map(alert => <RiskAlertCard key={alert.id} alert={alert} />)}
                        </div>
                    ) : (
                        <div className="text-center text-gray-500 py-12 bg-gray-800/30 rounded-lg">
                            <p>현재 포트폴리오에 감지된 위험이 없습니다. 훌륭한 상태입니다!</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="animate-fade-in space-y-8">
            <header className="text-center">
                 <div className="inline-block bg-gray-800 p-2 rounded-full mb-4">
                    <ShieldCheckIcon className="h-10 w-10 text-cyan-400" />
                </div>
                <h2 className="text-3xl font-bold text-gray-100">AI 리스크 관리 대시보드</h2>
                <p className="text-gray-400 max-w-3xl mx-auto">
                    '수익'만큼 중요한 '방어'. AI가 24시간 당신의 포트폴리오를 감시하며 잠재적 위험을 분석하고 경고합니다.
                </p>
            </header>
            {renderContent()}
        </div>
    );
};