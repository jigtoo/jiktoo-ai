
// components/MemoirDashboard.tsx
import React from 'react';
import type { useMemoir } from '../hooks/useMemoir';
// FIX: Corrected casing for JIKTOOMemoirEntry type import
import type { JIKTOOMemoirEntry } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorDisplay } from './ErrorDisplay';
import { ArchiveBoxIcon, CalendarIcon, CheckCircleIcon, XCircleIcon } from './icons';

interface MemoirDashboardProps {
    memoirData: ReturnType<typeof useMemoir>;
}

const MemoirCard: React.FC<{ entry: JIKTOOMemoirEntry }> = ({ entry }) => {
    const contentData = entry.content as any;
    const finalReturn = contentData?.finalReturn;
    const isSuccess = typeof finalReturn === 'number' && finalReturn >= 0;

    const rationale = contentData?.rationale || 'N/A';
    const purchaseDate = contentData?.purchaseDate || 'N/A';
    const closedDate = contentData?.closedDate || 'N/A';

    return (
        <div className={`p-4 bg-gray-800/50 rounded-lg border-l-4 ${isSuccess ? 'border-green-500' : 'border-red-500'}`}>
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-lg font-bold text-white">{entry.title}</h3>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                        <CalendarIcon className="h-4 w-4" />
                        {new Date(entry.created_at).toLocaleString('ko-KR')}
                    </p>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${isSuccess ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                    {isSuccess ? <CheckCircleIcon className="h-5 w-5" /> : <XCircleIcon className="h-5 w-5" />}
                    <span>{isSuccess ? '성공' : '실패'}</span>
                </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-700/50 text-sm">
                <p><strong>최종 수익률:</strong> 
                    <span className={`font-bold ${isSuccess ? 'text-green-400' : 'text-red-400'}`}>
                        {typeof finalReturn === 'number' ? `${finalReturn.toFixed(2)}%` : 'N/A'}
                    </span>
                </p>
                <p><strong>근거:</strong> {rationale}</p>
                <p className="text-xs text-gray-500 mt-1">
                    (편입: {purchaseDate}, 편출: {closedDate})
                </p>
            </div>
        </div>
    );
};


export const MemoirDashboard: React.FC<MemoirDashboardProps> = ({ memoirData }) => {
    const { memoirEntries, isLoading, error, fetchMemoir } = memoirData;

    const renderContent = () => {
        if (isLoading) {
            return <LoadingSpinner message="직투의 역사를 불러오는 중..." />;
        }
        if (error) {
            return <ErrorDisplay title="회고록 로드 실패" message={error} onRetry={fetchMemoir} />;
        }
        if (memoirEntries.length === 0) {
            return (
                <div className="text-center text-gray-500 py-20">
                    <p>아직 기록된 회고가 없습니다.</p>
                    <p className="text-xs mt-1">'직투픽스'에서 종목이 편출되면 자동으로 기록됩니다.</p>
                </div>
            );
        }
        return (
            <div className="space-y-4">
                {memoirEntries.map(entry => <MemoirCard key={entry.id} entry={entry} />)}
            </div>
        );
    };

    return (
        <div className="animate-fade-in space-y-8">
            <header className="text-center">
                <div className="inline-block bg-gray-800 p-2 rounded-full mb-4">
                    <ArchiveBoxIcon className="h-10 w-10 text-cyan-400" />
                </div>
                <h2 className="text-3xl font-bold text-gray-100">직투 회고록</h2>
                <p className="text-gray-400 max-w-3xl mx-auto">직투의 모든 중요한 판단과 그 결과가 영구적으로 기록되는 공간입니다. 과거의 성공과 실패로부터 배우고 진화합니다.</p>
            </header>
            {renderContent()}
        </div>
    );
};
