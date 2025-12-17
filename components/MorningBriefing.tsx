
// components/MorningBriefing.tsx
import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorDisplay } from './ErrorDisplay';
import { InfoIcon } from './icons';

// Placeholder type
type MorningBriefingData = {
    title: string;
    summary: string;
    keyPoints: string[];
};

interface MorningBriefingProps {
    briefing: MorningBriefingData | null;
    isLoading: boolean;
    error: string | null;
    onGenerate: () => void;
}

export const MorningBriefing: React.FC<MorningBriefingProps> = ({ briefing, isLoading, error, onGenerate }) => {
    if (isLoading) {
        return <LoadingSpinner message="AI가 모닝 브리핑을 생성 중입니다..." />;
    }

    if (error) {
        // We render a placeholder instead of an error for this non-essential feature
        return (
             <div className="text-center text-gray-500 py-10 bg-gray-800/30 rounded-lg">
                <InfoIcon className="h-10 w-10 mx-auto mb-3" />
                <p className="font-semibold">모닝 브리핑 기능 (개발 중)</p>
                <p className="text-sm">이 섹션에서는 매일 아침 AI가 생성하는 시장 브리핑을 제공할 예정입니다.</p>
                <button onClick={onGenerate} className="mt-4 text-xs text-cyan-400 hover:underline">
                    재시도
                </button>
            </div>
        );
    }

    // Since this is a placeholder, we'll just show a "coming soon" message.
    return (
        <div className="text-center text-gray-500 py-10 bg-gray-800/30 rounded-lg">
            <InfoIcon className="h-10 w-10 mx-auto mb-3" />
            <p className="font-semibold">모닝 브리핑 기능 (개발 중)</p>
            <p className="text-sm">이 섹션에서는 매일 아침 AI가 생성하는 시장 브리핑을 제공할 예정입니다.</p>
        </div>
    );
};
