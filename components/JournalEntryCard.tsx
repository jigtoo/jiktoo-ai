import React from 'react';
import type { AIGrowthJournalEntry } from '../types';
import { MagnifyingGlassIcon, CpuChipIcon, CheckCircleIcon, XCircleIcon, SparklesIcon } from './icons';

interface JournalEntryCardProps {
    entry: AIGrowthJournalEntry;
}

const caseTypeConfig = {
    'False Positive': {
        icon: <XCircleIcon className="h-6 w-6 text-red-400" />,
        color: 'border-red-500/50 bg-red-900/20',
        textColor: 'text-red-300',
    },
    'False Negative': {
        icon: <XCircleIcon className="h-6 w-6 text-yellow-400" />,
        color: 'border-yellow-500/50 bg-yellow-900/20',
        textColor: 'text-yellow-300',
    },
    'Success Case': {
        icon: <CheckCircleIcon className="h-6 w-6 text-green-400" />,
        color: 'border-green-500/50 bg-green-900/20',
        textColor: 'text-green-300',
    }
};

const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div>
        <h4 className="flex items-center gap-2 font-semibold text-gray-200 mb-2">
            {icon}
            <span>{title}</span>
        </h4>
        <div className="pl-7 text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{children}</div>
    </div>
);


export const JournalEntryCard: React.FC<JournalEntryCardProps> = ({ entry }) => {
    const config = caseTypeConfig[entry.caseType];
    
    return (
        <div className={`p-4 rounded-xl border-2 ${config.color} shadow-lg animate-fade-in`}>
            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-3 border-b border-gray-700/50">
                <h3 className="text-xl font-bold text-white">{entry.caseTitle}</h3>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${config.color} ${config.textColor}`}>
                    {config.icon}
                    <span>{entry.caseType}</span>
                </div>
            </header>
            <div className="pt-4 space-y-4">
                <Section title="사건 개요" icon={<MagnifyingGlassIcon className="h-5 w-5 text-cyan-400" />}>
                    {entry.summary}
                </Section>
                 <details className="bg-gray-800/50 p-3 rounded-lg">
                    <summary className="font-semibold text-cyan-400 cursor-pointer">상세 분석 및 개선 사항 보기</summary>
                    <div className="mt-3 pt-3 border-t border-gray-700/50 space-y-4">
                        <Section title="근본 원인 분석" icon={<MagnifyingGlassIcon className="h-5 w-5 text-yellow-400" />}>
                            {entry.rootCauseAnalysis}
                        </Section>
                        <Section title="모델 개선 사항" icon={<CpuChipIcon className="h-5 w-5 text-green-400" />}>
                            {entry.modelImprovements}
                        </Section>
                        <Section title="향후 모니터링 계획" icon={<SparklesIcon className="h-5 w-5 text-purple-400" />}>
                            {entry.futureMonitoringPlan}
                        </Section>
                    </div>
                </details>
            </div>
        </div>
    );
};
