// components/StrategyBlockBuilder.tsx

import React from 'react';
import { LogicGroup, StrategyCondition } from '../types';

interface StrategyBlockBuilderProps {
    logic: LogicGroup;
    onChange: (newLogic: LogicGroup) => void;
    isRoot?: boolean;
}

const OperatorBadge = ({ operator }: { operator: string }) => {
    let color = 'bg-gray-600';
    if (operator === 'AND') color = 'bg-blue-600';
    if (operator === 'OR') color = 'bg-purple-600';

    return (
        <span className={`px-2 py-1 rounded text-xs font-bold text-white ${color} mr-2`}>
            {operator}
        </span>
    );
};

export const StrategyBlockBuilder: React.FC<StrategyBlockBuilderProps> = ({ logic, onChange, isRoot = false }) => {

    // Helper to update a specific child
    const updateChild = (index: number, newChild: LogicGroup | StrategyCondition) => {
        const newChildren = [...logic.children];
        newChildren[index] = newChild;
        onChange({ ...logic, children: newChildren });
    };

    // Helper to toggle operator
    const toggleOperator = () => {
        const newOp = logic.operator === 'AND' ? 'OR' : 'AND';
        onChange({ ...logic, operator: newOp });
    };

    return (
        <div className={`
            flex flex-col gap-2 
            ${isRoot ? 'w-full' : 'ml-6 border-l-2 border-slate-700 pl-4 py-2'}
        `}>
            {/* Group Header */}
            <div className="flex items-center mb-2">
                {!isRoot && (
                    <button
                        onClick={toggleOperator}
                        className="mr-2 hover:scale-110 transition-transform"
                        title="Click to toggle AND/OR"
                    >
                        <OperatorBadge operator={logic.operator} />
                    </button>
                )}
                {isRoot && <span className="text-sm font-semibold text-slate-400">ROOT LOGIC</span>}
            </div>

            {/* Children */}
            {logic.children.map((child, idx) => {
                const isGroup = child.type === 'GROUP';

                return (
                    <div key={child.id || idx} className="relative group">

                        {/* Connecting Line for Logic Flow */}
                        {!isRoot && idx > 0 && (
                            <div className="absolute -left-6 -top-3 w-4 h-full border-l-2 border-slate-700 h-6 rounded-bl-lg"></div>
                        )}

                        {isGroup ? (
                            <StrategyBlockBuilder
                                logic={child as LogicGroup}
                                onChange={(newGroup) => updateChild(idx, newGroup)}
                            />
                        ) : (
                            <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex items-center justify-between hover:border-blue-500 transition-colors shadow-sm">
                                <div className="flex items-center gap-2 text-sm text-slate-200">
                                    {/* Indicator Logic Display */}
                                    <span className="font-mono text-blue-300">{(child as StrategyCondition).indicator}</span>

                                    {/* Params */}
                                    {(child as StrategyCondition).params?.length > 0 && (
                                        <span className="text-slate-500 text-xs">
                                            ({(child as StrategyCondition).params.map(p => p.value).join(', ')})
                                        </span>
                                    )}

                                    {/* Operator */}
                                    <span className="font-bold text-yellow-500 mx-1">
                                        {(child as StrategyCondition).operator}
                                    </span>

                                    {/* Value */}
                                    <span className="font-mono text-green-300">
                                        {(child as StrategyCondition).comparisonValue}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Operator Display between items (Visual Only) */}
                        {idx < logic.children.length - 1 && (
                            <div className="flex items-center my-1 ml-4 opacity-50">
                                <div className="w-0.5 h-2 bg-slate-600 mx-auto"></div>
                                <span className="text-[10px] text-slate-500 uppercase font-bold mx-2">{logic.operator}</span>
                                <div className="w-0.5 h-2 bg-slate-600 mx-auto"></div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
