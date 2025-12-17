import React, { useState } from 'react';
import { useMarketLogic } from '../hooks/useMarketLogic';
import { useMorningBriefing } from '../hooks/useMorningBriefing';
import type { MarketTarget } from '../types';
import { SunIcon, ChevronDownIcon, ChevronUpIcon } from './icons';

interface OracleBriefProps {
    marketTarget: MarketTarget;
}

// Ticker to Stock Name mapping
const getStockName = (ticker: string): string => {
    const stockNames: Record<string, string> = {
        // Korean stocks
        '005930': '삼성전자',
        '000660': 'SK하이닉스',
        '035420': 'NAVER',
        '035720': '카카오',
        '051910': 'LG화학',
        '006400': '삼성SDI',
        '005380': '현대차',
        '000270': '기아',
        '068270': '셀트리온',
        '207940': '삼성바이오로직스',
        '373220': 'LG에너지솔루션',
        '005490': 'POSCO홀딩스',
        '028260': '삼성물산',
        '012330': '현대모비스',
        '066570': 'LG전자',
        '003670': '포스코퓨처엠',
        '096770': 'SK이노베이션',
        '034730': 'SK',
        '017670': 'SK텔레콤',
        '032830': '삼성생명',
        '018260': '삼성에스디에스',
        '009150': '삼성전기',
        '010950': 'S-Oil',
        '011200': 'HMM',
        '003550': 'LG',
        '105560': 'KB금융',
        '055550': '신한지주',
        '086790': '하나금융지주',
        '316140': '우리금융지주',
        '000810': '삼성화재',
        '247540': '에코프로비엠',
        '086520': '에코프로',
        '263750': '펄어비스',
        '294870': 'HD현대일렉트릭',
        '042700': '한미반도체',
        '010140': '삼성중공업',
        '042660': '대우조선해양',
        '009540': 'HD한국조선해양',
        '011070': 'LG이노텍',
        '036570': '엔씨소프트',
        '251270': '넷마블',
        '009830': '한화솔루션',
        '011210': '현대위아',
        '000720': '현대건설',
        '006360': 'GS건설',
        '047810': '한국항공우주',
        '079550': 'LIG넥스원',
        '010120': 'LS ELECTRIC',
        '001450': '현대해상',
        '000080': '하이트진로',
        '028050': '삼성엔지니어링',
        '000100': '유한양행',
        '128940': '한미약품',
        '006280': '녹십자',
        '009240': '한샘',
        '021240': '코웨이',
        '030200': 'KT',
        '032640': 'LG유플러스',
        '034020': '두산에너빌리티',
        '015760': '한국전력',
        '035250': '강원랜드',
        '010620': '현대미포조선',
        '001440': '대한전선',
        '004020': '현대제철',
        '010130': '고려아연',
        '001040': 'CJ',
        '097950': 'CJ제일제당',
        '271560': '오리온',
        '004370': '농심',
        '282330': 'BGF리테일',
        '139480': '이마트',
        '023530': '롯데쇼핑',
        '069960': '현대백화점',
        '007070': 'GS리테일',
        '026960': '동서',
        '005690': '파라다이스',
        '112040': '위메이드',
        '035900': 'JYP Ent.',
        '122870': '와이지엔터테인먼트',
        '352820': '하이브',
        '041510': '에스엠',
        '000990': 'DB하이텍',
        '293490': '카카오게임즈',
        '267250': 'HD현대일렉트릭', // 중복 방지용 (위에도 있음)
        '403630': 'HPSP',
        '052690': '한전기술',

    };

    return stockNames[ticker] || ticker;
};

export const OracleBrief: React.FC<OracleBriefProps> = ({ marketTarget }) => {
    const { logicChains, isLoading: logicLoading, refresh } = useMarketLogic(marketTarget);
    const { briefing, isLoading: briefingLoading } = useMorningBriefing(marketTarget, null, null);
    const [expandedLogicId, setExpandedLogicId] = useState<string | null>(null);
    const [isBriefingExpanded, setIsBriefingExpanded] = useState(false);
    const [isOracleExpanded, setIsOracleExpanded] = useState(false); // Default to collapsed

    const isLoading = logicLoading || briefingLoading;

    // Helper to display stock name properly
    const displayStock = (ticker: string) => {
        // If backend returns "Name (Ticker)" format, use it directly
        if (ticker.includes('(') && ticker.includes(')')) return ticker;
        // Otherwise try to map
        return getStockName(ticker);
    };

    if (isLoading && !logicChains && !briefing) {
        return (
            <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/60 rounded-xl shadow-2xl p-4 mb-6 animate-pulse border border-gray-700/50">
                <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
                <div className="space-y-3">
                    <div className="h-10 bg-gray-700/50 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 mb-6">
            {/* Morning Briefing Section */}
            {briefing && (
                <div className="bg-gradient-to-br from-yellow-900/20 to-orange-900/10 rounded-xl shadow-lg border border-yellow-700/30 overflow-hidden transition-all duration-300">
                    <button
                        type="button"
                        onClick={() => setIsBriefingExpanded(!isBriefingExpanded)}
                        className="w-full px-5 py-3 flex items-center justify-between hover:bg-yellow-700/10 transition-colors group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-yellow-500/10 rounded-lg group-hover:bg-yellow-500/20 transition-colors">
                                <SunIcon className="h-5 w-5 text-yellow-400" />
                            </div>
                            <div className="text-left">
                                <h2 className="text-lg font-bold text-yellow-400 leading-none">모닝 브리핑</h2>
                                <span className="text-xs text-yellow-500/70 font-medium">
                                    {new Date().toLocaleDateString('ko-KR')} • {briefing.title}
                                </span>
                            </div>
                        </div>
                        {isBriefingExpanded ? (
                            <ChevronUpIcon className="h-5 w-5 text-yellow-500/50" />
                        ) : (
                            <ChevronDownIcon className="h-5 w-5 text-yellow-500/50" />
                        )}
                    </button>

                    {isBriefingExpanded && (
                        <div className="px-6 pb-6 space-y-4">
                            <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/40 rounded-lg p-4 border border-gray-700/50">
                                <h3 className="text-lg font-bold text-yellow-300 mb-2">{briefing.title}</h3>
                                <p className="text-gray-300 leading-relaxed">{briefing.summary}</p>
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold text-orange-400 uppercase tracking-wide flex items-center gap-2">
                                    <span className="w-1 h-4 bg-orange-500 rounded-full"></span>
                                    핵심 포인트
                                </h4>
                                {briefing.keyPoints.map((point, index) => (
                                    <div
                                        key={index}
                                        className="flex items-start gap-3 bg-gradient-to-r from-gray-800/60 to-gray-900/40 border border-gray-700/40 rounded-lg p-3 hover:border-orange-500/50 transition-colors"
                                    >
                                        <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                            {index + 1}
                                        </div>
                                        <p className="text-gray-300 leading-relaxed flex-1">{point}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Oracle Logic Chains Section (Accordion Style) */}
            {logicChains && logicChains.length > 0 && (
                <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/10 rounded-xl shadow-2xl border border-indigo-700/30 overflow-hidden transition-all duration-300">
                    <button
                        type="button"
                        onClick={() => setIsOracleExpanded(!isOracleExpanded)}
                        className="w-full px-5 py-3 flex items-center justify-between hover:bg-indigo-700/10 transition-colors group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/10 rounded-lg group-hover:bg-indigo-500/20 transition-colors">
                                <span className="text-xl">🔮</span>
                            </div>
                            <div className="text-left">
                                <h2 className="text-lg font-bold text-indigo-300 leading-none">Oracle Market Logic (오라클 브리핑)</h2>
                                <span className="text-xs text-indigo-400/70 font-medium">
                                    AI 심층 시장 분석 • {logicChains.length}개의 로직 체인
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span
                                onClick={(e) => { e.stopPropagation(); refresh(); }}
                                className="text-xs text-gray-400 hover:text-indigo-400 transition-colors cursor-pointer px-2 py-1 rounded hover:bg-gray-700/50"
                            >
                                🔄 새로고침
                            </span>
                            {isOracleExpanded ? (
                                <ChevronUpIcon className="h-5 w-5 text-indigo-500/50" />
                            ) : (
                                <ChevronDownIcon className="h-5 w-5 text-indigo-500/50" />
                            )}
                        </div>
                    </button>

                    {isOracleExpanded && (
                        <div className="p-6 space-y-3 border-t border-indigo-700/20">
                            {logicChains.map((chain) => (
                                <div
                                    key={chain.id}
                                    className={`bg-gradient-to-br from-gray-800/60 to-gray-900/40 rounded-lg border transition-all duration-200 overflow-hidden ${expandedLogicId === chain.id
                                        ? 'border-indigo-500/50 shadow-lg ring-1 ring-indigo-500/20'
                                        : 'border-gray-700/50 hover:border-indigo-600/40 hover:shadow-md'
                                        }`}
                                >
                                    <button
                                        type="button"
                                        className="w-full p-4 text-left"
                                        onClick={() => setExpandedLogicId(expandedLogicId === chain.id ? null : chain.id)}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="px-2 py-0.5 bg-gray-700/80 text-gray-200 text-xs font-bold rounded">
                                                    {chain.primaryKeyword}
                                                </span>
                                                {chain.alphaGap >= 70 && (
                                                    <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs font-bold rounded flex items-center gap-1">
                                                        💎 Alpha Gap {chain.alphaGap}%
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs text-gray-500">
                                                {new Date(chain.timestamp).toLocaleDateString('ko-KR')}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 text-sm font-medium flex-wrap">
                                            <span className="text-gray-400">{chain.cause}</span>
                                            <span className="text-gray-600">➜</span>
                                            <span className="text-gray-300">{chain.effect}</span>
                                            <span className="text-gray-600">➜</span>
                                            <span className="text-indigo-400 font-bold">{chain.beneficiarySector}</span>
                                        </div>
                                    </button>

                                    {expandedLogicId === chain.id && (
                                        <div className="px-4 pb-4 pt-0 bg-gray-900/30 border-t border-gray-700/50">
                                            <div className="mt-3 text-sm text-gray-400 leading-relaxed">
                                                <p className="font-semibold text-gray-300 mb-1">💡 투자 논리:</p>
                                                {chain.rationale}
                                            </div>

                                            {chain.relatedTickers.length > 0 && (
                                                <div className="mt-3">
                                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                        관련 종목
                                                    </span>
                                                    <div className="flex gap-2 mt-1 flex-wrap">
                                                        {chain.relatedTickers.map(ticker => (
                                                            <span key={ticker} className="px-2 py-1 bg-gray-800/80 border border-gray-600/50 rounded text-xs font-medium text-gray-300 shadow-sm">
                                                                {displayStock(ticker)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
