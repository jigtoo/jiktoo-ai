
import React from 'react';
import type { AnalystConsensus as AnalystConsensusType } from '../types';
import { CommunityIcon } from './icons';

interface AnalystConsensusProps {
    analysis: AnalystConsensusType;
}

const ratingConfig: Record<string, string> = {
    'Strong Buy': 'bg-green-600 text-white',
    'Buy': 'bg-green-500/80 text-white',
    'Hold': 'bg-yellow-500/20 text-yellow-300',
    'Sell': 'bg-red-500/80 text-white',
    'Strong Sell': 'bg-red-600 text-white',
    'N/A': 'bg-gray-500 text-white',
};

export const AnalystConsensus: React.FC<AnalystConsensusProps> = ({ analysis }) => {
    if (!analysis) {
        return null;
    }

    const { summary, ratings } = analysis;
    
    if (!ratings || ratings.length === 0) {
        return (
            <div className="bg-gray-800/60 rounded-lg border border-gray-700 p-4">
                <header className="text-center mb-2">
                    <h3 className="text-xl font-bold text-gray-100">애널리스트 컨센서스</h3>
                </header>
                <p className="text-sm text-gray-400 text-center p-4">{summary || "애널리스트 분석 정보가 없습니다."}</p>
            </div>
        );
    }

    return (
        <div className="bg-gray-800/60 rounded-lg border border-gray-700 p-4 space-y-4">
            <header className="text-center">
                 <h3 className="text-xl font-bold text-gray-100">애널리스트 컨센서스</h3>
            </header>
            
            <p className="text-sm text-gray-400 text-center italic">"{summary}"</p>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-400 uppercase bg-gray-900/50">
                        <tr>
                            <th scope="col" className="px-4 py-2">증권사/분석가</th>
                            <th scope="col" className="px-4 py-2 text-center">투자의견</th>
                            <th scope="col" className="px-4 py-2 text-right">목표주가</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ratings.map((item, index) => (
                             <tr key={index} className="border-b border-gray-700/50">
                                <td className="px-4 py-2 font-medium text-gray-200">{item.analyst}</td>
                                <td className="px-4 py-2 text-center">
                                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-md ${ratingConfig[item.rating] || ratingConfig['N/A']}`}>
                                        {item.rating}
                                    </span>
                                </td>
                                <td className="px-4 py-2 text-right font-mono text-cyan-300">{item.priceTarget || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
