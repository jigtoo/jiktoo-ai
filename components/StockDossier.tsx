import React from 'react';
import type { StockDossier as StockDossierType, AnalysisResult } from '../types';
import { StockBehaviorProfileCard } from './StockBehaviorProfileCard';
import { TriggerBoard } from './TriggerBoard';
import { TradingPlaybookGuide } from './TradingPlaybookGuide';
import { DossierInsights } from './DossierInsights';
import { CatalystStrengthAnalyzer } from './CatalystStrengthAnalyzer';

interface StockDossierProps {
    dossier: StockDossierType;
    analysis: AnalysisResult; // Pass full analysis for catalyst strength
}

export const StockDossier: React.FC<StockDossierProps> = ({ dossier, analysis }) => {
    const { behaviorProfile, tradingPlaybook, triggerBoard, insights } = dossier;
    const catalystStrengthAnalysis = analysis.psychoanalystAnalysis.catalystAnalysis.strengthAnalysis;

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <StockBehaviorProfileCard profile={behaviorProfile} />
                <TriggerBoard board={triggerBoard} />
            </div>
            {catalystStrengthAnalysis && (
                <CatalystStrengthAnalyzer analysis={catalystStrengthAnalysis} />
            )}
            <TradingPlaybookGuide playbook={tradingPlaybook} />
            <DossierInsights insights={insights} />
        </div>
    );
};