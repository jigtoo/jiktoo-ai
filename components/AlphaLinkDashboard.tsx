// components/AlphaLinkDashboard.tsx
import React from 'react';
import type { useAlphaLink } from '../hooks/useAlphaLink';
import { LoadingSpinner } from './LoadingSpinner';
import { StrategyPlaybookCard } from './StrategyPlaybookCard';
import { BrainIcon } from './icons';

interface AlphaLinkDashboardProps {
    alphaLink: ReturnType<typeof useAlphaLink>;
    onSelectStock: (ticker: string, rationale: string, stockName: string) => void;
}

export const AlphaLinkDashboard: React.FC<AlphaLinkDashboardProps> = ({ alphaLink, onSelectStock }) => {
    const { playbooks, isLoading, error } = alphaLink;

    const renderContent = () => {
        if (isLoading && playbooks.length === 0) {
            return <div className="py-10"><LoadingSpinner message="신호 공명을 실시간으로 감지하고 있습니다..." /></div>;
        }
        if (error) {
            return <p className="text-center text-red-400">오류: {error}</p>;
        }
        if (playbooks.length === 0) {
            return (
                <div className="text-center py-10 space-y-4">
                    <p className="text-gray-500">아직 교차 검증된 고확신 신호가 없습니다...</p>
                </div>
            );
        }

        // CRITICAL FIX: Filter out empty/invalid playbooks
        // CRITICAL FIX: Filter out empty/invalid playbooks AND low confidence ones
        // User Request: Ignore scores around 55. Threshold set to 70.
        const validPlaybooks = playbooks.filter(playbook =>
            playbook.aiConfidence >= 70 &&
            playbook.strategySummary &&
            playbook.strategySummary.trim() !== '' &&
            !playbook.strategySummary.includes('제공되지 않았습니다')
        );

        if (validPlaybooks.length === 0) {
            return (
                <div className="text-center py-10 space-y-4">
                    <p className="text-gray-500">아직 교차 검증된 고확신 신호가 없습니다...</p>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {validPlaybooks.map(playbook => (
                    <StrategyPlaybookCard
                        key={`${playbook.id}-${playbook.ticker}`}
                        playbook={playbook}
                        onSelect={() => onSelectStock(playbook.ticker, playbook.strategySummary, playbook.stockName)}
                    />
                ))}
            </div>
        );
    };

    return (
        <div className="p-6 bg-gray-800/50 border border-cyan-500/30 rounded-xl shadow-lg mb-8">
            <header className="text-center mb-6 relative">

                <div className="inline-block bg-gray-700 p-3 rounded-full mb-3">
                    <BrainIcon className="h-10 w-10 text-cyan-300" />
                </div>
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400">알파-링크: 고확신 플레이북</h2>
                <p className="text-gray-400 max-w-2xl mx-auto mt-1">
                    여러 스캐너의 신호가 교차 검증되어 '공명'을 일으킨 최종 결과물만 보여줍니다.
                </p>
            </header>
            {renderContent()}
        </div>
    );
};
