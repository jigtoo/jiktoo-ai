// copy-of-sepa-ai/components/ExecAlphaBriefBanner.tsx
import React, { useState } from 'react';
import type { ExecAlphaBrief } from '../types';
import { InfoIcon, CloseIcon } from './icons';

interface ExecAlphaBriefBannerProps {
    brief: ExecAlphaBrief | null;
    isLoading: boolean;
}

export const ExecAlphaBriefBanner: React.FC<ExecAlphaBriefBannerProps> = ({ brief, isLoading }) => {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) {
        return null;
    }

    let content;
    let icon = <InfoIcon className="h-5 w-5 flex-shrink-0" />;

    if (isLoading) {
        content = <span className="flex-grow italic text-gray-400">AI가 최신 시장 상황을 분석하고 있습니다...</span>;
        icon = <InfoIcon className="h-5 w-5 flex-shrink-0 animate-pulse" />;
    } else if (brief && brief.content) {
        content = <span className="flex-grow">{brief.content}</span>;
    } else {
        content = <span className="flex-grow italic text-gray-500">현재 생성된 경영진 요약이 없습니다. '전체 데이터 새로고침'을 눌러 AI 분석을 시작하세요.</span>;
    }

    return (
        <div className="relative z-10 bg-gray-700/50 text-cyan-200 px-4 py-2 text-sm text-center animate-fade-in flex items-center justify-center gap-2">
            {icon}
            <span className="font-semibold">[경영진 요약]:</span>
            {content}
            <button
                onClick={() => setIsVisible(false)}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-600 flex-shrink-0"
                aria-label="요약 숨기기"
            >
                <CloseIcon className="h-4 w-4" />
            </button>
        </div>
    );
};
