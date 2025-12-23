// services/strategy/StrategyPresets.ts

import { LogicGroup } from '../../types';

export interface StrategyPreset {
    id: string;
    name: string;
    description: string;
    author: string;
    logic: LogicGroup;
}

export const STRATEGY_PRESETS: StrategyPreset[] = [
    {
        id: 'MINERVINI_TREND_TEMPLATE',
        name: 'Minervini Trend Template (미너비니 추세 템플릿)',
        description: '마크 미너비니의 초고수익 성장주 투자를 위한 2단계 상승 추세 확인 조건식입니다.',
        author: 'Mark Minervini',
        logic: {
            id: 'root_minervini',
            type: 'GROUP',
            operator: 'AND',
            children: [
                // 1. Current Price > 150 SMA and 200 SMA
                {
                    id: 'c_gt_sma150',
                    type: 'INDICATOR',
                    indicator: 'Close',
                    params: [],
                    operator: '>',
                    comparisonType: 'INDICATOR',
                    comparisonValue: 'SMA(150)'
                },
                {
                    id: 'c_gt_sma200',
                    type: 'INDICATOR',
                    indicator: 'Close',
                    params: [],
                    operator: '>',
                    comparisonType: 'INDICATOR',
                    comparisonValue: 'SMA(200)'
                },
                // 2. 150 SMA > 200 SMA
                {
                    id: 'sma150_gt_sma200',
                    type: 'INDICATOR',
                    indicator: 'SMA',
                    params: [{ name: 'period', value: 150 }],
                    operator: '>',
                    comparisonType: 'INDICATOR',
                    comparisonValue: 'SMA(200)'
                },
                // 3. 200 SMA is rising (slope > 0) - approximated by current > 1 month ago
                {
                    id: 'sma200_rising',
                    type: 'INDICATOR',
                    indicator: 'SMA',
                    params: [{ name: 'period', value: 200 }],
                    operator: '>',
                    comparisonType: 'INDICATOR',
                    comparisonValue: 'SMA(200, 20)' // subset params not fully supported in V1 UI but logic engine logic exists
                },
                // 4. Current Price > 50 SMA
                {
                    id: 'c_gt_sma50',
                    type: 'INDICATOR',
                    indicator: 'Close',
                    params: [],
                    operator: '>',
                    comparisonType: 'INDICATOR',
                    comparisonValue: 'SMA(50)'
                }
            ]
        }
    },
    {
        id: 'LARRY_WILLIAMS_VOLATILITY',
        name: 'Larry Williams Volatility Breakout (변동성 돌파)',
        description: '래리 윌리엄스의 단기 변동성 돌파 전략. 전일 변동폭의 일정 비율 이상 상승 시 매수합니다.',
        author: 'Larry Williams',
        logic: {
            id: 'root_lw',
            type: 'GROUP',
            operator: 'AND',
            children: [
                {
                    id: 'vol_breakout',
                    type: 'PRICE',
                    indicator: 'Close',
                    params: [],
                    operator: '>',
                    comparisonType: 'INDICATOR',
                    comparisonValue: 'Open + (Range * 0.5)'
                },
                {
                    id: 'uptrend_filter',
                    type: 'PRICE',
                    indicator: 'Close',
                    params: [],
                    operator: '>',
                    comparisonType: 'INDICATOR',
                    comparisonValue: 'SMA(50)' // Basic trend filter
                }
            ]
        }
    },
    {
        id: 'RSI_OVERSOLD_REVERSAL',
        name: 'RSI Oversold Reversal (과매도 반등)',
        description: '전통적인 RSI 과매도 구간(30이하)에서의 반등을 노리는 역추세 전략입니다.',
        author: 'Classic Technical',
        logic: {
            id: 'root_rsi',
            type: 'GROUP',
            operator: 'AND',
            children: [
                {
                    id: 'rsi_oversold',
                    type: 'INDICATOR',
                    indicator: 'RSI',
                    params: [{ name: 'period', value: 14 }],
                    operator: '<',
                    comparisonType: 'NUMBER',
                    comparisonValue: 30
                },
                {
                    id: 'price_reversal',
                    type: 'PRICE',
                    indicator: 'Close',
                    params: [],
                    operator: '>',
                    comparisonType: 'INDICATOR',
                    comparisonValue: 'Open' // Bullish candle
                }
            ]
        }
    },
    {
        id: 'GOLDEN_CROSS_WITH_VOLUME',
        name: 'Golden Cross + Volume Boom (거래량 실린 골든크로스)',
        description: '20일선이 60일선을 돌파할 때 거래량이 평소보다 2배 이상 터지는 강력한 매수 신호.',
        author: 'Jiktoo Standard',
        logic: {
            id: 'root_gc',
            type: 'GROUP',
            operator: 'AND',
            children: [
                {
                    id: 'ma_cross',
                    type: 'INDICATOR',
                    indicator: 'SMA',
                    params: [{ name: 'period', value: 20 }],
                    operator: 'CROSS_UP',
                    comparisonType: 'INDICATOR',
                    comparisonValue: 'SMA(60)'
                },
                {
                    id: 'volume_spike',
                    type: 'INDICATOR',
                    indicator: 'Volume',
                    params: [],
                    operator: '>',
                    comparisonType: 'INDICATOR',
                    comparisonValue: 'SMA(Volume, 20) * 2'
                }
            ]
        }
    },
    {
        id: 'BOLLINGER_SQUEEZE_BREAKOUT',
        name: 'Bollinger Band Squeeze (볼린저 밴드 스퀴즈)',
        description: '밴드폭이 좁아지는 스퀴즈(응축) 발생 후 상단 밴드를 돌파할 때 진입하는 급등주 포착 전략.',
        author: 'John Bollinger',
        logic: {
            id: 'root_bb',
            type: 'GROUP',
            operator: 'AND',
            children: [
                // 1. Band Width is narrow (Squeeze) - approximated by Width < 0.10 (10%)
                {
                    id: 'bb_squeeze',
                    type: 'INDICATOR',
                    indicator: 'BollingerBandWidth',
                    params: [{ name: 'period', value: 20 }, { name: 'stdDev', value: 2 }],
                    operator: '<',
                    comparisonType: 'NUMBER',
                    comparisonValue: 0.1
                },
                // 2. Price breaks Upper Band
                {
                    id: 'price_break_upper',
                    type: 'PRICE',
                    indicator: 'Close',
                    params: [],
                    operator: '>',
                    comparisonType: 'INDICATOR',
                    comparisonValue: 'BollingerBandUpper(20, 2)'
                }
            ]
        }
    },
    {
        id: 'STOCHASTIC_POP',
        name: 'Stochastic Pop (스토캐스틱 팝)',
        description: '스토캐스틱이 80을 "돌파"하여 과매수 구간으로 진입할 때 오히려 강력한 모멘텀으로 보고 추격 매수하는 전략.',
        author: 'Momentum Traders',
        logic: {
            id: 'root_stoch',
            type: 'GROUP',
            operator: 'AND',
            children: [
                {
                    id: 'stoch_k_cross_80',
                    type: 'INDICATOR',
                    indicator: 'StochK',
                    params: [{ name: 'period', value: 14 }],
                    operator: 'CROSS_UP',
                    comparisonType: 'NUMBER',
                    comparisonValue: 80
                },
                {
                    id: 'trend_check',
                    type: 'PRICE',
                    indicator: 'Close',
                    params: [],
                    operator: '>',
                    comparisonType: 'INDICATOR',
                    comparisonValue: 'SMA(50)' // Trend alignment
                }
            ]
        }
    },
    {
        id: 'TRIPLE_MA_ALIGNMENT',
        name: 'Triple Moving Average Alignment (3중 정배열)',
        description: '단기(20), 중기(60), 장기(120) 이평선이 완벽한 정배열을 이룰 때 눌림목 매수.',
        author: 'Trend Follower',
        logic: {
            id: 'root_tma',
            type: 'GROUP',
            operator: 'AND',
            children: [
                { id: '20_gt_60', type: 'INDICATOR', indicator: 'SMA', params: [{ name: 'period', value: 20 }], operator: '>', comparisonType: 'INDICATOR', comparisonValue: 'SMA(60)' },
                { id: '60_gt_120', type: 'INDICATOR', indicator: 'SMA', params: [{ name: 'period', value: 60 }], operator: '>', comparisonType: 'INDICATOR', comparisonValue: 'SMA(120)' },
                { id: 'price_above_20', type: 'PRICE', indicator: 'Close', params: [], operator: '>', comparisonType: 'INDICATOR', comparisonValue: 'SMA(20)' }
            ]
        }
    },
    {
        id: 'INSTITUTIONAL_DOUBLE_BUYING',
        name: 'AI 매집봉 포착 (기관/외국인 쌍끌이)',
        description: '외국인과 기관이 동시에 순매수하며, 거래량이 터진 양봉(매집봉)을 포착하여 수급 주도주를 선취매합니다.',
        author: 'Jiktoo AI',
        logic: {
            id: 'root_double_buy',
            type: 'GROUP',
            operator: 'AND',
            children: [
                { id: 'for_net_buy', type: 'INDICATOR', indicator: 'ForeignerNetBuy', params: [], operator: '>', comparisonType: 'NUMBER', comparisonValue: 0 },
                { id: 'inst_net_buy', type: 'INDICATOR', indicator: 'InstitutionNetBuy', params: [], operator: '>', comparisonType: 'NUMBER', comparisonValue: 0 },
                { id: 'vol_spike', type: 'INDICATOR', indicator: 'Volume', params: [], operator: '>', comparisonType: 'INDICATOR', comparisonValue: 'SMA(Volume, 20) * 2' },
                { id: 'bullish_candle', type: 'PRICE', indicator: 'Close', params: [], operator: '>', comparisonType: 'INDICATOR', comparisonValue: 'Open' }
            ]
        }
    },
    {
        id: 'MARKET_LEADER_UPPER_LIMIT',
        name: 'AI 상한가 포착 엔진 (시장 주도주)',
        description: '강력한 재료와 함께 상한가(30%)에 도달하거나 급등하는 시장 주도주를 실시간으로 포착합니다.',
        author: 'Jiktoo AI',
        logic: {
            id: 'root_upper_limit',
            type: 'GROUP',
            operator: 'AND',
            children: [
                { id: 'price_surge', type: 'PRICE', indicator: 'Close', params: [], operator: '>', comparisonType: 'INDICATOR', comparisonValue: 'PrevClose * 1.25' },
                { id: 'vol_explosion', type: 'INDICATOR', indicator: 'Volume', params: [], operator: '>', comparisonType: 'INDICATOR', comparisonValue: 'SMA(Volume, 5) * 5' },
                { id: 'new_high', type: 'PRICE', indicator: 'Close', params: [], operator: '>=', comparisonType: 'INDICATOR', comparisonValue: 'Highest(250)' }
            ]
        }
    },
    // [WIDE SCAN] Relaxed Minervini for Watchlist Building
    {
        id: 'MINERVINI_WATCHLIST',
        name: 'Minervini Watchlist (Wide Scan)',
        description: '미너비니 조건의 완화 버전. 상승 추세(50일 > 200일)에 있으며 신고가 근처(25%)에 있는 모든 후보군을 포착합니다.',
        author: 'Mark Minervini (Relaxed)',
        logic: {
            id: 'root_minervini_relaxed',
            type: 'GROUP',
            operator: 'AND',
            children: [
                // 1. Medium Trend Up: 50 MA > 150 MA
                { id: 'sma50_gt_sma150', type: 'INDICATOR', indicator: 'SMA', params: [{ name: 'period', value: 50 }], operator: '>', comparisonType: 'INDICATOR', comparisonValue: 'SMA(150)' },
                // 2. Long Trend Up: Price > 200 MA
                { id: 'price_gt_sma200', type: 'PRICE', indicator: 'Close', params: [], operator: '>', comparisonType: 'INDICATOR', comparisonValue: 'SMA(200)' },
                // 3. Near Highs: Price >= 52-week High * 0.75 (Within 25%)
                { id: 'near_high', type: 'PRICE', indicator: 'Close', params: [], operator: '>=', comparisonType: 'INDICATOR', comparisonValue: 'Highest(250) * 0.75' }
            ]
        }
    },
    // [AI INSIGHT] Volume Dry-Up (Silent Accumulation)
    {
        id: 'VOLUME_DRY_UP',
        name: 'Volume Dry-Up (폭풍 전야)',
        description: '급등 전 거래량이 말라붙는 "개미 털기" 구간을 포착합니다. 변동성이 축소되며 주요 지지선을 지킬 때 유효합니다.',
        author: 'Jiktoo AI',
        logic: {
            id: 'root_dry_up',
            type: 'GROUP',
            operator: 'AND',
            children: [
                // 1. Low Volatility: Range is small (< 3% of Open)
                // { id: 'low_volatility', type: 'PRICE', indicator: 'High', params: [], operator: '<', comparisonType: 'INDICATOR', comparisonValue: 'Low * 1.03' },
                // 2. Volume Dry Up: Volume < SMA(Volume, 20) * 0.6 (60% of average)
                { id: 'vol_dry', type: 'INDICATOR', indicator: 'Volume', params: [], operator: '<', comparisonType: 'INDICATOR', comparisonValue: 'SMA(Volume, 20) * 0.6' },
                // 3. Trend Support: Price > SMA(50)
                { id: 'trend_support', type: 'PRICE', indicator: 'Close', params: [], operator: '>', comparisonType: 'INDICATOR', comparisonValue: 'SMA(50)' }
            ]
        }
    }
];
