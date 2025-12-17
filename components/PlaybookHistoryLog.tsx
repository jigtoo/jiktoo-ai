
// copy-of-sepa-ai/components/PlaybookHistoryLog.tsx
import React from 'react';
// FIX: Import 'InfoIcon' to resolve 'Cannot find name' error.
import { HistoryIcon, CheckCircleIcon, XCircleIcon, PlusIcon, RefreshIcon, InfoIcon } from './icons';

interface PlaybookHistoryLogProps {
    log: { stockName: string; decision: string; reason: string; }[];
}

const decisionConfig: Record<string, { icon: React.ReactNode; color: string }> = {
    '유지': { icon: <CheckCircleIcon className="h-5 w-5" />, color: 'text-green-400' },
    '수정': { icon: <RefreshIcon className="h-5 w-5" />, color: 'text-yellow-400' },
    '제외': { icon: <XCircleIcon className="h-5 w-5" />, color: 'text-red-400' },
    '신규 편입': { icon: <PlusIcon className="h-5 w-5" />, color: 'text-cyan-400' },
};

export const PlaybookHistoryLog: React.FC<PlaybookHistoryLogProps> = ({ log }) => {
    if (!log || log.length === 0) {
        return (
            <div className="text-center text-gray-500 py-6 bg-gray-900/50 rounded-lg">
                <p>AI 결정 로그가 아직 없습니다.</p>
            </div>
        );
    }

    return (
        <section className="mt-4">
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                <div className="text-center mb-4">
                    <h3 className="text-xl font-bold text-gray-100 flex items-center justify-center gap-3">
                        <HistoryIcon className="h-6 w-6 text-cyan-400" />
                        AI 결정 로그
                    </h3>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {log.map((entry, index) => {
                        const config = decisionConfig[entry.decision] || { icon: <InfoIcon />, color: 'text-gray-400' };
                        return (
                             <div key={index} className="p-3 bg-gray-800/60 rounded-md flex items-start gap-3">
                                <div className={`flex-shrink-0 mt-0.5 ${config.color}`}>{config.icon}</div>
                                <div>
                                    <p className="font-semibold text-gray-200">
                                        {entry.stockName} - <span className={`font-bold ${config.color}`}>{entry.decision}</span>
                                    </p>
                                    <p className="text-sm text-gray-400">{entry.reason}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    );
};
