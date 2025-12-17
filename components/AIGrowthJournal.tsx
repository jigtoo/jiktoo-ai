import React from 'react';
import type { AIGrowthJournalEntry } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorDisplay } from './ErrorDisplay';
import { JournalEntryCard } from './JournalEntryCard';
import { BrainIcon, InfoIcon } from './icons';

interface AIGrowthJournalProps {
    journal: AIGrowthJournalEntry[];
    isLoading: boolean;
    error: string | null;
    showTitle?: boolean;
}

export const AIGrowthJournal: React.FC<AIGrowthJournalProps> = ({ journal, isLoading, error, showTitle = true }) => {
    
    const renderContent = () => {
        if (isLoading) {
            return <LoadingSpinner message="AI 성장 기록을 불러오는 중..." />;
        }
        if (error) {
            return <ErrorDisplay title="성장 일지 로딩 실패" message={error} />;
        }
        if (journal.length === 0) {
            return (
                <div className="text-center text-gray-500 py-10">
                    <InfoIcon className="h-10 w-10 mx-auto mb-3" />
                    <p>아직 기록된 성장 일지가 없습니다.</p>
                </div>
            );
        }
        return (
            <div className="space-y-6">
                {journal.map(entry => (
                    <JournalEntryCard key={entry.id} entry={entry} />
                ))}
            </div>
        );
    };

    return (
        <div className={showTitle ? "my-8" : ""}>
            {showTitle && (
                <>
                    <h2 className="text-2xl font-bold text-gray-100 mb-4 text-center flex items-center justify-center gap-3">
                        <BrainIcon className="h-8 w-8 text-cyan-400" />
                        AI 성장 일지 (AI Growth Journal)
                    </h2>
                    <p className="text-center text-gray-400 text-sm mb-6 max-w-2xl mx-auto">
                        AI는 자신의 실수를 복기하고 학습하여 스스로 진화합니다. 모든 중요한 학습 과정이 여기에 투명하게 기록됩니다.
                    </p>
                </>
            )}
            {renderContent()}
        </div>
    );
};
