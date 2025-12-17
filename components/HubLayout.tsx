// copy-of-sepa-ai/components/HubLayout.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';

interface HubLayoutProps {
    title: string;
    links: { path: string; icon: React.FC<{ className?: string }>; label: string }[];
}

const HubLayout: React.FC<HubLayoutProps> = ({ title, links }) => {
    return (
        <div className="animate-fade-in space-y-8">
            <header className="text-center">
                <h1 className="text-4xl font-bold text-white">{title}</h1>
                <p className="text-gray-400 mt-2">원하는 분석 도구를 선택하여 탐색을 시작하세요.</p>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {links.map((link) => (
                    <NavLink
                        key={link.path}
                        to={link.path}
                        className="group flex flex-col items-center justify-center p-6 bg-gray-800/50 border border-gray-700 rounded-xl shadow-lg hover:bg-gray-700/70 hover:border-cyan-500 transition-all transform hover:-translate-y-1"
                    >
                        <div className="p-4 bg-gray-900/50 rounded-full mb-4 border-2 border-transparent group-hover:border-cyan-500/50 transition-colors">
                             <link.icon className="h-10 w-10 text-cyan-400 transition-transform group-hover:scale-110" />
                        </div>
                        <p className="text-lg font-bold text-white">{link.label}</p>
                    </NavLink>
                ))}
            </div>
        </div>
    );
};

export default HubLayout;