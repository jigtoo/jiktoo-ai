
import React from 'react';
import type { AnalysisResult, GroundingSource, UserNote, MarketTarget } from '../types';
import { ExecutiveDecisionBriefing } from './ExecutiveDecisionBriefing';
import { LinkIcon } from './icons';
import { UserNoteEditor } from './UserNoteEditor';
import { PublicForum } from './PublicForum';


interface ResultsDisplayProps {
  result: AnalysisResult;
  sources?: GroundingSource[];
  // FIX: Changed isAiGuided to a required parameter to match its usage in ExecutiveDecisionBriefing.tsx and the function signature in App.tsx.
  onOpenFormForAnalysis: (analysis: AnalysisResult, isAiGuided: boolean) => void;
  onUpdateUserNote: (note: UserNote) => void;
  onGoHome: () => void;
  marketTarget: MarketTarget;
}

const ResultCard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl shadow-lg">
    <div className="flex items-center gap-3 p-4 border-b border-gray-700/50">
      {icon}
      <h3 className="text-xl font-bold text-gray-100">{title}</h3>
    </div>
    <div className="p-4 sm:p-6">
      {children}
    </div>
  </div>
);

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ result, sources, onOpenFormForAnalysis, onUpdateUserNote, onGoHome, marketTarget }) => {
  if (!result || !result.psychoanalystAnalysis || !result.strategistAnalysis) {
      return (
         <ResultCard title="분석 결과" icon={<LinkIcon />}>
            <p className="text-lg whitespace-pre-wrap">AI가 이 종목에 대한 유효한 분석 결과를 생성하지 못했습니다.</p>
            <p className="text-sm text-gray-400 mt-2">이는 일시적인 오류일 수 있습니다. 다른 종목을 시도해보거나 잠시 후 다시 시도해주세요.</p>
            <div className="mt-6 text-center">
                <button
                    onClick={onGoHome}
                    className="px-6 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500 transition-colors"
                >
                    메인으로 돌아가기
                </button>
            </div>
         </ResultCard>
      );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <ExecutiveDecisionBriefing result={result} onOpenFormForAnalysis={onOpenFormForAnalysis} onGoHome={onGoHome} />
      
      {/* FIX: Removed SynthesisDebate component which is obsolete and caused an import error. */}
      
      <UserNoteEditor
        userNote={result.userNote}
        onSave={onUpdateUserNote}
      />

      <PublicForum notes={result.publicNotes || []} />

      {sources && sources.length > 0 && (
        <ResultCard title="참고 데이터 소스" icon={<LinkIcon />}>
            <ul className="space-y-2">
                {sources.map((source, index) => (
                    <li key={index} className="truncate">
                       <a 
                         href={source.web.uri} 
                         target="_blank" 
                         rel="noopener noreferrer" 
                         className="text-blue-400 hover:text-blue-300 hover:underline transition-colors duration-200 flex items-center gap-2"
                       >
                        <span className="flex-shrink-0 w-4 h-4"><LinkIcon/></span>
                        <span className="truncate">{source.web.title || source.web.uri}</span>
                       </a>
                    </li>
                ))}
            </ul>
        </ResultCard>
      )}
    </div>
  );
};