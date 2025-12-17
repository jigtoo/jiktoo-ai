import React, { useMemo, useState } from 'react';
import type { AlertAccuracyLog } from '../types';
import { BrainIcon, CrosshairIcon, ChecklistIcon, ScaleIcon } from './icons';

interface AlertAccuracyTrackerProps {
    data: AlertAccuracyLog[];
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

const TrendChart: React.FC<{ data: AlertAccuracyLog[] }> = ({ data }) => {
    const [tooltip, setTooltip] = useState<{ x: number; y: number; content: React.ReactNode } | null>(null);

    const width = 500;
    const height = 250;
    const padding = { top: 20, right: 20, bottom: 40, left: 40 };

    const contentWidth = width - padding.left - padding.right;
    const contentHeight = height - padding.top - padding.bottom;

    const { xScale, yScale, paths, circles } = useMemo(() => {
        if (!data || data.length < 2) return { xScale: () => 0, yScale: () => 0, paths: [], circles: [] };

        const maxVal = Math.max(...data.flatMap(d => [d.true_positives, d.false_positives, d.false_negatives]));

        const xScale = (index: number) => padding.left + (index / (data.length - 1)) * contentWidth;
        const yScale = (val: number) => padding.top + contentHeight - (val / maxVal) * contentHeight;

        const createPath = (key: keyof AlertAccuracyLog) =>
            data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d[key] as number)}`).join(' ');

        const colors: Record<string, string> = { tp: '#22c55e', fp: '#ef4444', fn: '#eab308' };

        const paths = [
            { key: 'tp', d: createPath('true_positives'), color: colors.tp, label: '정탐' },
            { key: 'fp', d: createPath('false_positives'), color: colors.fp, label: '오탐' },
            { key: 'fn', d: createPath('false_negatives'), color: colors.fn, label: '미탐' },
        ];
        
        const circles = data.flatMap((d, i) => [
            { key: `tp-${i}`, cx: xScale(i), cy: yScale(d.true_positives), color: colors.tp, value: d.true_positives, label: '정탐' },
            { key: `fp-${i}`, cx: xScale(i), cy: yScale(d.false_positives), color: colors.fp, value: d.false_positives, label: '오탐' },
            { key: `fn-${i}`, cx: xScale(i), cy: yScale(d.false_negatives), color: colors.fn, value: d.false_negatives, label: '미탐' },
        ]);

        return { xScale, yScale, paths, circles };
    }, [data]);
    
    if (!data || data.length === 0) return null;

    const handleMouseOver = (e: React.MouseEvent, circle: any) => {
        const date = data[parseInt(circle.key.split('-')[1])].date;
        setTooltip({
            x: e.clientX,
            y: e.clientY,
            content: (
                <>
                    <div className="font-bold">{new Date(date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}</div>
                    <div>{circle.label}: {circle.value}</div>
                </>
            ),
        });
    };

    return (
        <div className="relative bg-gray-900/50 rounded-lg p-4">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                {/* Y-axis grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map(tick => (
                    <line key={tick} x1={padding.left} y1={yScale(tick * Math.max(...data.map(d => d.total_alerts)))} x2={width - padding.right} y2={yScale(tick * Math.max(...data.map(d => d.total_alerts)))} stroke="#4b5563" strokeWidth="0.5" strokeDasharray="2,2" />
                ))}
                {/* Chart Paths */}
                {paths.map(p => <path key={p.key} d={p.d} fill="none" stroke={p.color} strokeWidth="2" />)}
                {/* Data point circles with tooltips */}
                {circles.map(c => <circle key={c.key} cx={c.cx} cy={c.cy} r="4" fill={c.color} className="cursor-pointer" onMouseMove={e => handleMouseOver(e, c)} onMouseLeave={() => setTooltip(null)} />)}
                {/* X-axis labels */}
                {data.map((d, i) => (
                    <text key={d.date} x={xScale(i)} y={height - padding.bottom + 15} fill="#9ca3af" fontSize="10" textAnchor="middle">
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
                {paths.map(p => (
                    <div key={p.key} className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: p.color }}></span>
                        <span className="text-gray-300">{p.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const AlertAccuracyTracker: React.FC<AlertAccuracyTrackerProps> = ({ data }) => {
    const latestData = data && data.length > 0 ? data[data.length - 1] : null;

    const { precision, recall, f1Score } = useMemo(() => {
        if (!latestData) return { precision: 0, recall: 0, f1Score: 0 };
        const { true_positives: tp, false_positives: fp, false_negatives: fn } = latestData;
        const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0;
        const recall = (tp + fn) > 0 ? tp / (tp + fn) : 0;
        const f1Score = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;
        return { precision, recall, f1Score };
    }, [latestData]);

    return (
        <div>
            <h3 className="text-2xl font-bold text-gray-200 mb-4 border-b-2 border-gray-700 pb-2">2단계: 알림 정확도 추이</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <KpiCard title="정밀도 (Precision)" value={`${(precision * 100).toFixed(1)}%`} icon={<CrosshairIcon className="h-5 w-5"/>} tooltip="AI가 '정답'이라고 한 것들 중, 실제 '정답'의 비율. 오탐(False Positive)이 적을수록 높아집니다." />
                <KpiCard title="재현율 (Recall)" value={`${(recall * 100).toFixed(1)}%`} icon={<ChecklistIcon className="h-5 w-5"/>} tooltip="실제 '정답'들 중에서, AI가 '정답'이라고 맞춘 비율. 미탐(False Negative)이 적을수록 높아집니다." />
                <KpiCard title="F1 점수 (F1 Score)" value={f1Score.toFixed(2)} icon={<ScaleIcon className="h-5 w-5"/>} tooltip="정밀도와 재현율의 조화평균. 두 지표가 모두 높을 때 점수가 높아져 모델의 전반적인 성능을 나타냅니다." />
            </div>
            <TrendChart data={data} />
        </div>
    );
};
