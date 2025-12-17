// components/AIBriefingDashboard.tsx
import React, { useState } from 'react';
import type { useAIBriefing } from '../hooks/useAIBriefing';
import type { UserIntelligenceBriefing } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorDisplay } from './ErrorDisplay';
import { DataFeedIcon, InfoIcon } from './icons';

interface BriefingFormProps {
    onSubmit: (data: Omit<UserIntelligenceBriefing, 'id' | 'created_at'>) => Promise<{ success: boolean }>;
}

const BriefingForm: React.FC<BriefingFormProps> = ({ onSubmit }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [tickers, setTickers] = useState('');
    const [sourceUrl, setSourceUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) {
            alert('제목과 내용은 필수입니다.');
            return;
        }
        setIsSubmitting(true);
        const { success } = await onSubmit({
            title: title.trim(),
            content: content.trim(),
            related_tickers: tickers.trim() || null,
            source_url: sourceUrl.trim() || null,
        });

        if (success) {
            // Reset form only on successful submission
            setTitle('');
            setContent('');
            setTickers('');
            setSourceUrl('');
        }
        setIsSubmitting(false);
    };
    
    const inputStyle = "w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white";

    return (
        <form onSubmit={handleSubmit} className="p-4 bg-gray-800/50 rounded-lg space-y-4 border border-gray-700">
            <h3 className="text-xl font-bold text-center text-white">새 인텔리전스 브리핑</h3>
            <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-400 mb-1">제목 (필수)</label>
                <input id="title" type="text" value={title} onChange={e => setTitle(e.target.value)} className={inputStyle} placeholder="핵심 내용을 한 줄로 요약" required />
            </div>
             <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-400 mb-1">내용 (필수)</label>
                <textarea id="content" value={content} onChange={e => setContent(e.target.value)} className={inputStyle} rows={4} placeholder="AI에게 전달할 구체적인 정보나 분석 내용을 입력하세요." required></textarea>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label htmlFor="tickers" className="block text-sm font-medium text-gray-400 mb-1">관련 종목 티커 (선택)</label>
                    <input id="tickers" type="text" value={tickers} onChange={e => setTickers(e.target.value)} className={inputStyle} placeholder="예: AAPL, 005930.KS" />
                </div>
                <div>
                    <label htmlFor="sourceUrl" className="block text-sm font-medium text-gray-400 mb-1">출처 URL (선택)</label>
                    <input id="sourceUrl" type="url" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} className={inputStyle} placeholder="https://example.com/news/..." />
                </div>
            </div>
            <div className="flex justify-end">
                 <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-lg hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50"
                >
                    {isSubmitting ? '제출 중...' : 'AI에게 브리핑 제출'}
                </button>
            </div>
        </form>
    );
};

const BriefingCard: React.FC<{ briefing: UserIntelligenceBriefing }> = ({ briefing }) => {
    return (
        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
            <div className="flex justify-between items-start flex-wrap gap-2 mb-2">
                <h4 className="text-lg font-bold text-cyan-300">{briefing.title}</h4>
            </div>
            <p className="text-sm text-gray-300 whitespace-pre-wrap mb-3">{briefing.content}</p>
            <div className="flex justify-between items-end text-xs text-gray-500 border-t border-gray-700 pt-2">
                <div>
                    {briefing.related_tickers && <p><strong>관련 티커:</strong> {briefing.related_tickers}</p>}
                    {briefing.source_url && <p><strong>출처:</strong> <a href={briefing.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">링크 보기</a></p>}
                </div>
                <span>{new Date(briefing.created_at).toLocaleString('ko-KR')}</span>
            </div>
        </div>
    );
};

// Define props interface for AIBriefingDashboard
interface AIBriefingDashboardProps {
    briefingData: ReturnType<typeof useAIBriefing>;
}

export const AIBriefingDashboard: React.FC<AIBriefingDashboardProps> = ({ briefingData }) => {
    const { briefings, isLoading, error, handleSubmitBriefing, fetchBriefings } = briefingData;

    const renderContent = () => {
        if (isLoading && briefings.length === 0) {
            return <LoadingSpinner message="AI와의 브리핑 기록을 불러오는 중..." />;
        }
        if (briefings.length === 0 && !isLoading) {
             return (
                <div className="text-center text-gray-500 py-20 px-4 bg-gray-800/30 rounded-lg">
                    <InfoIcon className="h-16 w-16 mx-auto mb-4 text-gray-600" />
                    <h3 className="text-xl font-semibold text-gray-400">첫 번째 브리핑을 시작하세요</h3>
                    <p className="mt-2">위의 양식을 작성하여 당신의 인사이트를 AI에게 전달하고, AI의 학습 과정을 지켜보세요.</p>
                </div>
            );
        }
        return (
            <div className="space-y-4">
                {briefings.map(b => <BriefingCard key={b.id} briefing={b} />)}
            </div>
        );
    };

    return (
        <div className="animate-fade-in space-y-8">
            <header className="text-center">
                <div className="inline-block bg-gray-800 p-2 rounded-full mb-4">
                    <DataFeedIcon className="h-10 w-10 text-cyan-400" />
                </div>
                <h2 className="text-3xl font-bold text-gray-100">AI 인텔리전스 브리핑</h2>
                <p className="text-gray-400 max-w-3xl mx-auto">당신의 인사이트가 AI를 진화시킵니다. 중요한 정보, 뉴스, 분석을 AI에게 직접 전달하고 학습 과정을 추적하세요.</p>
            </header>
            
            <BriefingForm onSubmit={handleSubmitBriefing} />
            
            {error && <ErrorDisplay title="브리핑 기능 오류" message={error} onRetry={fetchBriefings} />}

            <div className="mt-8">
                <h3 className="text-2xl font-bold text-gray-200 mb-4 border-b-2 border-gray-700 pb-2">브리핑 피드</h3>
                {renderContent()}
            </div>
        </div>
    );
};