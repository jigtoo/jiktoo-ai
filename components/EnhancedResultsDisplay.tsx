
// copy-of-sepa-ai/components/EnhancedResultsDisplay.tsx


import React from 'react';
import type { AnalysisResult, MarketTarget, UserNote, RealtimeNewsItem } from '../types';

import { UserNoteEditor } from './UserNoteEditor';
import { PublicForum } from './PublicForum';
import { ExecutiveDecisionBriefing } from './ExecutiveDecisionBriefing';
import { PsychologyAnalyzer } from './PsychologyAnalyzer';
import { CatalystAnalyzer } from './CatalystAnalyzer';
import { BrandPowerAnalyzer } from './BrandPowerAnalyzer';
import { FairValueAnalyzer } from './FairValueAnalyzer';
import { FundamentalDataSheet } from './FundamentalDataSheet';
import { KeyIndicatorAnalyzer } from './KeyIndicatorAnalyzer';
import { ChartPatternAnalyzer } from './ChartPatternAnalyzer';
import { IchimokuAnalysis } from './IchimokuAnalysis';
import { WhaleTrackerAnalyzer } from './WhaleTrackerAnalyzer';
import { TradingPlaybookAnalyzer } from './TradingPlaybookAnalyzer';
import { GovernanceAnalyzer } from './GovernanceAnalyzer';
import { AnalystConsensus } from './AnalystConsensus';
import { ShortSellingAnalyzer } from './ShortSellingAnalyzer';
import { HedgeFundAnalyzer } from './HedgeFundAnalyzer';
import { PreMortemAnalyzer } from './PreMortemAnalyzer';
import { EconomicMoatAnalyzer } from './EconomicMoatAnalyzer'; // This import is already correct and present
import { BrainIcon, StrategistIcon, ChartIcon } from './icons';
import { SentimentBadge } from './SentimentBadge';

// Convert sentiment string to score for SentimentBadge
const getSentimentScore = (sentiment: string): number => {
    switch (sentiment) {
        case '매우 긍정적':
        case '매우긍정적':
            return 0.8;
        case '긍정적':
        case '긍정':
            return 0.4;
        case '중립적':
        case '중립':
            return 0;
        case '부정적':
        case '부정':
            return -0.4;
        case '매우 부정적':
        case '매우부정적':
            return -0.8;
        default:
            return 0;
    }
};

const RealtimeNewsFeed: React.FC<{ newsItems: RealtimeNewsItem[] }> = ({ newsItems }) => (
    <div className="bg-gray-800/60 rounded-lg border border-gray-700 p-4 space-y-3">
        <h3 className="font-bold text-lg text-purple-300">실시간 뉴스 피드</h3>
        {newsItems.length > 0 ? newsItems.map((news, index) => (
            <div key={index} className="p-3 bg-gray-900/40 rounded-md border border-gray-700 hover:border-purple-500/50 transition-all">
                <a href={news.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-gray-200 hover:text-purple-300 hover:underline">
                    {news.headline}
                </a>
                <div className="text-xs text-gray-500 mt-2 flex items-center justify-between">
                    <span>{news.source} • {news.publishedTime}</span>
                    <SentimentBadge score={getSentimentScore(news.sentiment)} size="sm" showLabel={false} />
                </div>
            </div>
        )) : <p className="text-sm text-gray-500 text-center">관련 뉴스가 없습니다.</p>}
    </div>
);

interface EnhancedResultsDisplayProps {
    result: AnalysisResult;
    // FIX: Changed isAiGuided to a required parameter to match its usage in ExecutiveDecisionBriefing.tsx and the function signature in App.tsx.
    onOpenFormForAnalysis: (analysis: AnalysisResult, isAiGuided: boolean) => void;
    onUpdateUserNote: (note: UserNote) => void;
    onGoHome: () => void;
    marketTarget: MarketTarget;
}

export const EnhancedResultsDisplay: React.FC<EnhancedResultsDisplayProps> = ({
    result,
    onOpenFormForAnalysis,
    onUpdateUserNote,
    onGoHome,
    marketTarget,
}) => {
    let currentPrice: number;
    if (typeof result.referencePrice === 'number') {
        currentPrice = result.referencePrice;
    } else if (typeof result.referencePrice === 'string') {
        // FIX: The variable 'referencePrice' was not defined. It should be 'result.referencePrice'.
        const cleaned = result.referencePrice.replace(/[^\d.-]/g, "");
        currentPrice = cleaned ? parseFloat(cleaned) : 0;
    } else {
        currentPrice = 0;
    }

    const { psychoanalystAnalysis, strategistAnalysis } = result;

    return (
        <div className="space-y-8 animate-fade-in">
            <ExecutiveDecisionBriefing result={result} onOpenFormForAnalysis={onOpenFormForAnalysis} onGoHome={onGoHome} />

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                {/* --- AI 심리분석가 (Qualitative) --- */}
                <div className="space-y-6">
                    <div className="sticky top-2 z-10 bg-gray-900/80 backdrop-blur-sm p-2 rounded-lg">
                        <h2 className="flex items-center gap-3 text-2xl font-bold text-purple-300">
                            <BrainIcon className="h-8 w-8" />
                            AI 심리분석가 (질적 분석)
                        </h2>
                        <p className="text-gray-400 pl-11 -mt-1">"시장의 감정과 내러티브는 어떠한가?"</p>
                    </div>

                    <RealtimeNewsFeed newsItems={psychoanalystAnalysis.realtimeNews} />
                    <PsychologyAnalyzer analysis={psychoanalystAnalysis.psychologyAnalysis} />
                    <CatalystAnalyzer analysis={psychoanalystAnalysis.catalystAnalysis} />
                    {psychoanalystAnalysis.brandPowerAnalysis && (
                        <BrandPowerAnalyzer analysis={psychoanalystAnalysis.brandPowerAnalysis} />
                    )}
                </div>

                {/* --- AI 전략가 (Quantitative) --- */}
                <div className="space-y-6">
                    <div className="sticky top-2 z-10 bg-gray-900/80 backdrop-blur-sm p-2 rounded-lg">
                        <h2 className="flex items-center gap-3 text-2xl font-bold text-teal-300">
                            <StrategistIcon className="h-8 w-8" />
                            AI 전략가 (양적 분석)
                        </h2>
                        <p className="text-gray-400 pl-11 -mt-1">"데이터와 차트는 무엇을 말하는가?"</p>
                    </div>

                    <div className="bg-gray-800/70 border border-gray-700 rounded-xl shadow-lg p-2 h-[500px] flex items-center justify-center">
                        <div className="text-center text-gray-500">
                            <ChartIcon className="h-12 w-12 mx-auto mb-2" />
                            <p>차트 기능이 비활성화되었습니다.</p>
                        </div>
                    </div>

                    <FairValueAnalyzer analysis={strategistAnalysis.fairValueAnalysis} currentPrice={currentPrice} marketTarget={marketTarget} />
                    <EconomicMoatAnalyzer analysis={strategistAnalysis.economicMoatAnalysis} />
                    <FundamentalDataSheet analysis={strategistAnalysis.fundamentalAnalysis} />
                    <KeyIndicatorAnalyzer analysis={strategistAnalysis.technicalAnalysis.keyIndicators} currentPrice={currentPrice} marketTarget={marketTarget} />
                    <ChartPatternAnalyzer vcpAnalysis={strategistAnalysis.technicalAnalysis.vcpAnalysis} candlestickAnalysis={strategistAnalysis.technicalAnalysis.candlestickAnalysis} />
                    <IchimokuAnalysis analysis={strategistAnalysis.technicalAnalysis.ichimokuAnalysis} />
                    <WhaleTrackerAnalyzer analysis={strategistAnalysis.technicalAnalysis.whaleTrackerAnalysis} marketTarget={marketTarget} />
                    <TradingPlaybookAnalyzer analysis={strategistAnalysis.technicalAnalysis.tradingPlaybookAnalysis} />
                    <GovernanceAnalyzer analysis={strategistAnalysis.governanceAnalysis} />
                    <AnalystConsensus analysis={strategistAnalysis.analystConsensus} />
                    {strategistAnalysis.shortSellingAnalysis && (
                        <ShortSellingAnalyzer analysis={strategistAnalysis.shortSellingAnalysis} />
                    )}
                    {strategistAnalysis.hedgeFundAnalysis && (
                        <HedgeFundAnalyzer analysis={strategistAnalysis.hedgeFundAnalysis} />
                    )}
                </div>
            </div>

            <PreMortemAnalyzer analysis={strategistAnalysis.preMortemAnalysis} />

            <UserNoteEditor
                userNote={result.userNote}
                onSave={onUpdateUserNote}
            />

            <PublicForum notes={result.publicNotes || []} />
        </div>
    );
};
