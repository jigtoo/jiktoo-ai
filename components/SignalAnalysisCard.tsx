import React from 'react';
import type { QuantitativeSignalResult } from '../types';
import { LogoIcon, NewsIcon, TrendingUpIcon, CommunityIcon, ShieldCheckIcon, CheckCircleIcon, XCircleIcon, AlertIcon, BrainIcon } from './icons';

interface SignalAnalysisCardProps {
    result: QuantitativeSignalResult;
}

const InsightScoreGauge: React.FC<{ score: number }> = ({ score }) => {
    const percentage = Math.max(0, Math.min(100, score));
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    let colorClass = 'text-green-400';
    if (score < 75) colorClass = 'text-yellow-400';
    if (score < 50) colorClass = 'text-red-400';

    return (
        <div className="relative w-24 h-24 flex items-center justify-center">
            <svg className="w-full h-full" viewBox="0 0 90 90">
                <circle className="text-gray-700" strokeWidth="8" stroke="currentColor" fill="transparent" r={radius} cx="45" cy="45" />
                <circle
                    className={colorClass}
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="45" cy="45"
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.5s ease-in-out' }}
                />
            </svg>
            <span className={`absolute text-2xl font-bold ${colorClass}`}>{score}</span>
        </div>
    );
};

const ScoreItem: React.FC<{ icon: React.ReactNode, label: string, score: number }> = ({ icon, label, score }) => (
    <div className="p-3 bg-gray-800/60 rounded-lg text-center">
        <div className="flex items-center justify-center gap-2 text-sm text-gray-400">{icon}{label}</div>
        <p className="text-2xl font-bold text-white mt-1">{score}</p>
    </div>
);

const PlanItem: React.FC<{ label: string; value: React.ReactNode; className?: string }> = ({ label, value, className }) => (
    <div>
        <h5 className="text-sm font-semibold text-gray-400">{label}</h5>
        <div className={`text-base font-semibold ${className}`}>{value}</div>
    </div>
);


export const SignalAnalysisCard: React.FC<SignalAnalysisCardProps> = ({ result }) => {
    const { ticker, pattern, scores, entry_plan, risk_plan, targets, position_sizing, tripwires, thesis, decision, notes } = result;
    
    const decisionConfig = {
        'ENTER': { text: '진입', color: 'bg-green-600', icon: <CheckCircleIcon /> },
        'WAIT': { text: '관망', color: 'bg-yellow-600', icon: <AlertIcon /> },
        'INVALID': { text: '무효', color: 'bg-red-600', icon: <XCircleIcon /> },
    };
    const currentDecision = decisionConfig[decision];

    return (
        <div className="bg-gray-800/70 border border-gray-700 rounded-xl shadow-2xl animate-fade-in">
            <header className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-gray-900/50 rounded-t-xl">
                <div>
                    <h3 className="text-2xl font-bold text-white">퀀트 시그널 분석: {ticker}</h3>
                    <p className="font-mono text-gray-400 capitalize">{pattern} Pattern</p>
                </div>
                <div className={`flex items-center gap-2 px-4 py-2 text-lg font-bold rounded-lg text-white ${currentDecision.color}`}>
                    {currentDecision.icon}
                    <span>{currentDecision.text}</span>
                </div>
            </header>

            <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Scores */}
                <div className="lg:col-span-1 space-y-4">
                     <div className="flex flex-col items-center gap-4">
                        <InsightScoreGauge score={scores.InsightScore} />
                        {scores.PsychologicalEdge && (
                            <div className="w-full p-3 text-center bg-purple-900/30 rounded-lg border border-purple-600/50">
                                <h4 className="flex items-center justify-center gap-2 text-sm font-semibold text-purple-300">
                                    <BrainIcon className="h-5 w-5" />
                                    심리적 우위 점수
                                </h4>
                                <p className="text-3xl font-bold text-purple-300">{scores.PsychologicalEdge}</p>
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <ScoreItem icon={<NewsIcon />} label="뉴스(News)" score={scores.News} />
                        <ScoreItem icon={<TrendingUpIcon />} label="수급(Flow)" score={scores.Flow} />
                        <ScoreItem icon={<CommunityIcon />} label="심리(Psy)" score={scores.Psy} />
                        <ScoreItem icon={<ShieldCheckIcon />} label="방어(Defense)" score={scores.Defense} />
                    </div>
                </div>

                {/* Right Column: Plan & Thesis */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="p-4 bg-gray-900/40 rounded-lg border-l-4 border-cyan-500">
                        <h4 className="flex items-center gap-2 text-lg font-bold text-cyan-300 mb-2">
                            <LogoIcon className="h-5 w-5" />
                            AI 분석 요약 (Thesis)
                        </h4>
                        <p className="text-sm text-gray-200">{thesis}</p>
                        {notes && <p className="text-xs text-gray-400 mt-2">참고: {notes}</p>}
                    </div>

                    <div className="p-4 bg-gray-900/40 rounded-lg">
                        <h4 className="text-lg font-bold text-gray-200 mb-3">실행 계획 (Action Plan)</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                            <PlanItem label="진입 전략" value={`${entry_plan.type} at ${entry_plan.levels.join(', ')}`} className="text-green-400" />
                            <PlanItem label="거래량 조건" value={entry_plan.volume_condition} className="text-white" />
                            <PlanItem label="손절매" value={risk_plan.stop} className="text-red-400" />
                            <PlanItem label="목표가" value={targets.join(' / ')} className="text-cyan-300" />
                            <PlanItem label="위험/보상 비율" value={risk_plan.rr} className="text-white" />
                            <PlanItem label="트레일링 스탑" value={risk_plan.trailing} className="text-white" />
                        </div>
                    </div>
                    
                     <div className="p-4 bg-gray-900/40 rounded-lg">
                        <h4 className="text-lg font-bold text-gray-200 mb-3">최종 체크리스트</h4>
                        <ul className="text-sm space-y-2">
                             <li className="flex items-center gap-2">
                                {scores.InsightScore >= 75 ? <CheckCircleIcon className="text-green-400 h-5 w-5" /> : <XCircleIcon className="text-red-400 h-5 w-5" />}
                                <span>InsightScore ≥ 75 (현재: {scores.InsightScore})</span>
                            </li>
                             <li className="flex items-center gap-2">
                                {parseFloat(risk_plan.rr) >= 2.5 ? <CheckCircleIcon className="text-green-400 h-5 w-5" /> : <XCircleIcon className="text-red-400 h-5 w-5" />}
                                <span>R:R ≥ 2.5 (현재: {risk_plan.rr})</span>
                            </li>
                        </ul>
                    </div>

                    <div className="p-4 bg-gray-900/40 rounded-lg">
                        <h4 className="text-lg font-bold text-yellow-300 mb-3">실패 시나리오 (Tripwires)</h4>
                        <ul className="text-sm list-disc list-inside space-y-1 text-gray-300">
                           {tripwires.map((wire, i) => <li key={i}>{wire}</li>)}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};