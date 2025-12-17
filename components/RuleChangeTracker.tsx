import React from 'react';
import type { RuleChangeLog } from '../types';
import { AdjustmentIcon, CalendarIcon } from './icons';

interface RuleChangeTrackerProps {
    data: RuleChangeLog[];
}

const LogItem: React.FC<{ log: RuleChangeLog }> = ({ log }) => {
    return (
        <div className="p-4 bg-gray-800/60 rounded-lg flex items-start gap-4">
            <div className="flex-shrink-0 mt-1">
                <AdjustmentIcon className="h-6 w-6 text-yellow-400"/>
            </div>
            <div className="flex-grow">
                <div className="flex justify-between items-center">
                    <p className="font-semibold text-gray-200">{log.rule_type}: <span className="text-cyan-300">{log.target}</span></p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                        <CalendarIcon className="h-4 w-4" />
                        {new Date(log.changed_at).toLocaleString('ko-KR')}
                    </p>
                </div>
                <div className="mt-2 text-sm flex items-center gap-2">
                    <span className="text-gray-400">변경:</span>
                    <span className="px-2 py-0.5 bg-red-900/50 text-red-300 rounded-md font-mono">{log.before_value}</span>
                    <span>→</span>
                    <span className="px-2 py-0.5 bg-green-900/50 text-green-300 rounded-md font-mono">{log.after_value}</span>
                </div>
            </div>
        </div>
    );
};


export const RuleChangeTracker: React.FC<RuleChangeTrackerProps> = ({ data }) => {
    return (
        <div>
            <h3 className="text-2xl font-bold text-gray-200 mb-4 border-b-2 border-gray-700 pb-2">4단계: 자동 조건 변경 히스토리</h3>
             <div className="space-y-3">
                {data.map(log => <LogItem key={log.id} log={log} />)}
            </div>
        </div>
    );
};