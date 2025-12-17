import React, { useMemo, useState } from 'react';
import type { FeedbackReflectionLog } from '../types';
import { HandshakeIcon } from './icons';

interface FeedbackReflectionTrackerProps {
    data: FeedbackReflectionLog[];
}

const KpiCard: React.FC<{ title: string; value: string; icon: React.ReactNode; tooltip: string }> = ({ title, value, icon, tooltip }) => (
    <div className="relative group bg-gray-800/60 p-4 rounded-lg text-center border border-gray-700">
        <div className="flex items-center justify-center gap-2 text-sm font-semibold text-gray-300">
            {icon}
            {title}
        </div>
        <p className="text-3xl font-bold text-cyan-300 mt-1">{value}</p>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-gray-900 text-white text-xs rounded-lg py-1.5 px-2.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg pointer-events-none before:content-[''] before:absolute before:left-1/2 before:top-full before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-gray-900">
            {tooltip}
        </div>
    </div>
);

const BarChart: React.FC<{ data: FeedbackReflectionLog[] }> = ({ data }) => {
    const [tooltip, setTooltip] = useState<{ x: number; y: number; content: React.ReactNode } | null>(null);

    const width = 500;
    const height = 250;
    const padding = { top: 20, right: 20, bottom: 40, left: 40 };

    const contentWidth = width - padding.left - padding.right;
    const contentHeight = height - padding.top - padding.bottom;
    const barWidth = contentWidth / (data.length * 2.5);

    const { xScale, yScale, bars } = useMemo(() => {
        if (!data || data.length === 0) return { xScale: () => 0, yScale: () => 0, bars: [] };

        const maxVal = Math.max(...data.map(d => d.feedback_received));
        const yScale = (val: number) => padding.top + contentHeight - (val / maxVal) * contentHeight;
        const xScale = (index: number) => padding.left + index * (contentWidth / data.length);
        
        const bars = data.flatMap((d, i) => [
            {
                key: `received-${i}`,
                x: xScale(i) + (contentWidth / data.length - barWidth * 2) / 2,
                y: yScale(d.feedback_received),
                width: barWidth,
                height: contentHeight - (yScale(d.feedback_received) - padding.top),
                fill: '#4b5563', // gray-600
                value: d.feedback_received,
                label: '받은 피드백',
                date: d.date,
            },
            {
                key: `applied-${i}`,
                x: xScale(i) + (contentWidth / data.length - barWidth * 2) / 2 + barWidth,
                y: yScale(d.feedback_applied),
                width: barWidth,
                height: contentHeight - (yScale(d.feedback_applied) - padding.top),
                fill: '#22d3ee', // cyan-400
                value: d.feedback_applied,
                label: '반영된 피드백',
                date: d.date,
            }
        ]);

        return { xScale, yScale, bars };
    }, [data, barWidth, contentHeight, contentWidth, padding.left, padding.top]);

    if (!data || data.length === 0) return null;

    const handleMouseOver = (e: React.MouseEvent, bar: any) => {
        setTooltip({
            x: e.clientX,
            y: e.clientY,
            content: (
                <>
                    <div className="font-bold">{new Date(bar.date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}</div>
                    <div>{bar.label}: {bar.value}</div>
                </>
            ),
        });
    };

    return (
         <div className="relative bg-gray-900/50 rounded-lg p-4">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                {/* Y-axis grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map(tick => (
                    <line key={tick} x1={padding.left} y1={yScale(tick * Math.max(...data.map(d => d.feedback_received)))} x2={width - padding.right} y2={yScale(tick * Math.max(...data.map(d => d.feedback_received)))} stroke="#4b5563" strokeWidth="0.5" strokeDasharray="2,2" />
                ))}
                {/* Bars */}
                {bars.map(bar => (
                    <rect key={bar.key} x={bar.x} y={bar.y} width={bar.width} height={bar.height} fill={bar.fill} className="transition-opacity duration-200 hover:opacity-80 cursor-pointer" onMouseMove={e => handleMouseOver(e, bar)} onMouseLeave={() => setTooltip(null)} />
                ))}
                {/* X-axis labels */}
                {data.map((d, i) => (
                    <text key={d.date} x={xScale(i) + (contentWidth / data.length) / 2} y={height - padding.bottom + 15} fill="#9ca3af" fontSize="10" textAnchor="middle">
                         {new Date(d.date).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                    </text>
                ))}
            </svg>
            {tooltip && (
                <div className="fixed p-2 text-xs bg-gray-800 text-white rounded-md shadow-lg pointer-events-none" style={{ left: tooltip.x + 15, top: tooltip.y + 15 }}>
                    {tooltip.content}
                </div>
            )}
            <div className="flex justify-center gap-4 mt-2 text-xs">
                 <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#4b5563]"></span><span className="text-gray-300">받은 피드백</span></div>
                 <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#22d3ee]"></span><span className="text-gray-300">반영된 피드백</span></div>
            </div>
        </div>
    );
};

export const FeedbackReflectionTracker: React.FC<FeedbackReflectionTrackerProps> = ({ data }) => {
    const reflectionRate = useMemo(() => {
        if (!data || data.length === 0) return 0;
        const totalReceived = data.reduce((sum, item) => sum + item.feedback_received, 0);
        const totalApplied = data.reduce((sum, item) => sum + item.feedback_applied, 0);
        return totalReceived > 0 ? (totalApplied / totalReceived) * 100 : 0;
    }, [data]);
    
    return (
        <div>
            <h3 className="text-2xl font-bold text-gray-200 mb-4 border-b-2 border-gray-700 pb-2">3단계: 피드백 반영 분석</h3>
            <div className="grid grid-cols-1 mb-6">
                <KpiCard title="누적 피드백 반영률" value={`${reflectionRate.toFixed(1)}%`} icon={<HandshakeIcon className="h-5 w-5"/>} tooltip="사용자로부터 받은 피드백 중, AI 모델 개선에 실제로 적용된 피드백의 비율입니다. AI와 사용자가 함께 성장하는 지표입니다." />
            </div>
            <BarChart data={data} />
        </div>
    );
};