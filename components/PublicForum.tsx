
import React from 'react';
import type { PublicNote } from '../types';
import { ChatBotIcon, UserIcon } from './icons';

interface PublicForumProps {
    notes: PublicNote[];
}

const personaConfig: Record<string, { icon: React.ReactNode; color: string }> = {
    'Bullish Investor': { icon: <UserIcon />, color: 'border-green-500/50' },
    'Skeptical Analyst': { icon: <UserIcon />, color: 'border-red-500/50' },
    'Cautious Planner': { icon: <UserIcon />, color: 'border-yellow-500/50' },
    'default': { icon: <UserIcon />, color: 'border-gray-500/50' },
};


export const PublicForum: React.FC<PublicForumProps> = ({ notes }) => {
    if (!notes || notes.length === 0) {
        return null; // Don't render if there are no notes
    }

    return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl shadow-lg p-4 sm:p-6 mt-8">
            <div className="flex items-center gap-3 mb-4">
                <ChatBotIcon className="h-6 w-6 text-cyan-400" />
                <h3 className="text-xl font-bold text-gray-100">집단지성 토론장</h3>
            </div>
            <div className="space-y-4">
                {notes.map((note, index) => {
                    const config = personaConfig[note.author] || personaConfig.default;
                    return (
                        <div key={index} className={`p-4 bg-gray-900/50 rounded-lg border-l-4 ${config.color}`}>
                            <div className="flex items-center gap-2 mb-2">
                                {config.icon}
                                <p className="font-semibold text-gray-300">{note.author}</p>
                            </div>
                            <p className="text-sm text-gray-200 leading-relaxed italic">
                                "{note.note}"
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
