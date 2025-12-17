// utils/stockDisplay.ts
import type { MarketTarget } from '../types';

/**
 * Korean stock name translation map (English -> Korean)
 */
const KOREAN_STOCK_NAMES: Record<string, string> = {
    'Korean Air Lines Co., Ltd.': '대한항공',
    'Hyosung Heavy Industries Corporation': '효성중공업',
    'Doosan Robotics Inc.': '두산로보틱스',
    'HALLACAST Co.,Ltd.': '한라카스트',
    'LG Corp': 'LG',
    'Samsung Electronics Co., Ltd.': '삼성전자',
    'SK Innovation Co., Ltd.': 'SK이노베이션',
    'NAVER Corporation': '네이버',
    'Kakao Corp.': '카카오',
    'Hyundai Motor Company': '현대자동차',
    'Kia Corporation': '기아',
    'POSCO Holdings Inc.': '포스코홀딩스',
    'LG Energy Solution, Ltd.': 'LG에너지솔루션',
    'Samsung Biologics Co.,Ltd.': '삼성바이오로직스',
    'Celltrion, Inc.': '셀트리온',
    'SK Hynix Inc.': 'SK하이닉스',
    'Samsung SDI Co., Ltd.': '삼성SDI',
    'LG Chem, Ltd.': 'LG화학',
    'Hyundai Steel Company': '현대제철',
    'POSCO': '포스코',
    'Hanwha Aerospace Co., Ltd.': '한화에어로스페이스',
    'Korea Zinc Company, Ltd.': '고려아연',
    'KEPCO': '한국전력',
    'Korea Gas Corporation': '한국가스공사',
    'Shinhan Financial Group Co., Ltd.': '신한지주',
    'KB Financial Group Inc.': 'KB금융',
    'Hana Financial Group Inc.': '하나금융지주',
    'Woori Financial Group Inc.': '우리금융지주',
    'CLOBOT Co., Ltd.': '클로봇',
    'D&D Pharmatech Inc.': 'D&D파마텍',
    'Sanil Electric Co Ltd': '삼일전기',
    'Samyang NC Chem Corp.': '삼양엔씨켐',
    'SPG Co., Ltd.': 'SPG',
    'LX Hausys Ltd.': 'LX하우시스',
    'LincSolution Co., Ltd.': '링크솔루션',
    'Nota Inc.': '노타',
    'Peptron, Inc.': '펩트론',
    'Seobu T&D Co., Ltd.': '서부T&D',
    'Easys': '이지스',
    'Kyungbang': '경방',
    'BHI': '비에이치아이',
};

/**
 * Clean ticker by removing exchange suffixes (.KS, .KQ, .KO)
 */
export function cleanTicker(ticker: string): string {
    if (!ticker) return '';
    return ticker.replace(/\.(KS|KQ|KO)$/i, '');
}

/**
 * Translate English Korean stock name to Korean
 */
export function translateKoreanStockName(stockName: string): string {
    if (!stockName) return '';

    // Direct match
    if (KOREAN_STOCK_NAMES[stockName]) {
        return KOREAN_STOCK_NAMES[stockName];
    }

    // Partial match (for variations)
    for (const [eng, kor] of Object.entries(KOREAN_STOCK_NAMES)) {
        if (stockName.includes(eng) || eng.includes(stockName)) {
            return kor;
        }
    }

    return stockName;
}

/**
 * Format stock display as "StockName Ticker"
 * - Translates Korean stock names to Korean
 * - Cleans ticker suffixes (.KS, .KQ)
 * 
 * @example
 * formatStockDisplay("Korean Air Lines Co., Ltd.", "003490.KS") => "대한항공 003490"
 * formatStockDisplay("삼성전자", "005930") => "삼성전자 005930"
 * formatStockDisplay("Apple", "AAPL") => "Apple AAPL"
 */
export function formatStockDisplay(stockName: string, ticker: string): string {
    if (!stockName || !ticker) return stockName || ticker || '';

    const cleanedTicker = cleanTicker(ticker);
    const translatedName = translateKoreanStockName(stockName);

    return `${translatedName} ${cleanedTicker}`;
}

/**
 * Check if a ticker is Korean stock (6-digit number, optionally with .KS/.KQ suffix)
 */
export function isKoreanStock(ticker: string): boolean {
    const cleaned = cleanTicker(ticker);
    return /^\d{6}$/.test(cleaned);
}

/**
 * Get market from ticker format
 */
export function getMarketFromTicker(ticker: string): MarketTarget {
    return isKoreanStock(ticker) ? 'KR' : 'US';
}

const TICKER_MAP: Record<string, string> = {
    '005930': '삼성전자',
    '000660': 'SK하이닉스',
    '373220': 'LG에너지솔루션',
    '207940': '삼성바이오로직스',
    '005380': '현대차',
    '000270': '기아',
    '068270': '셀트리온',
    '005490': 'POSCO홀딩스',
    '035420': 'NAVER',
    '035720': 'Kakao',
    '006400': '삼성SDI',
    '051910': 'LG화학',
    '003670': '포스코퓨처엠',
    '012330': '현대모비스',
    '032830': '삼성생명',
    '055550': '신한지주',
    '105560': 'KB금융',
    '086790': '하나금융지주',
    '033780': 'KT&G',
    '015760': '한국전력',
    '003490': '대한항공',
    '000810': '삼성화재',
    '034730': 'SK',
    '018260': '삼성에스디에스',
    '017670': 'SK텔레콤',
    '011200': 'HMM',
    '010130': '고려아연',
    '009150': '삼성전기',
    '024110': '기업은행',
    '316140': '우리금융지주',
    '329180': '현대중공업',
    '003550': 'LG',
    '034020': '두산에너빌리티',
    '010950': 'S-Oil',
    '028260': '삼성물산',
    '096770': 'SK이노베이션',
    '009540': '한국조선해양',
    '010140': '삼성중공업',
    '000100': '유한양행',
    '090430': '아모레퍼시픽',
    '066570': 'LG전자',
    '028050': '삼성엔지니어링',
    '000720': '현대건설',
    '022100': '포스코 ICT',
    '012450': '한화에어로스페이스',
    '036570': '엔씨소프트',
    '251270': '넷마블',
    '035900': 'JYP Ent.',
    '122870': '와이지엔터테인먼트',
    '352820': '하이브',
    '005935': '삼성전자우',
    '069500': 'KODEX 200',
    '229200': 'KODEX 코스닥150',
    '233740': 'KODEX 코스닥150레버리지',
    '252670': 'KODEX 200선물인버스2X',
    '251340': 'KODEX 코스닥150선물인버스',
    '114800': 'KODEX 인버스',
    '005387': '현대차2우B',
    '005389': '현대차3우B',
    '000271': '기아(신)',
    '032640': 'LG유플러스',
    '011070': 'LG이노텍',
    '000040': 'KR모터스',
    '294870': 'HDC현대산업개발',
    '011760': '현대상사',
    '263750': '펄어비스',
    '003620': '쌍용 C&E',
    '000880': '한화',
    '308430': '네오위즈',
    '018290': '브이티',
    '290740': '대유에이피',
    '092730': '네오팜',

    // US Stocks
    'AAPL': '애플',
    'MSFT': '마이크로소프트',
    'GOOGL': '알파벳 A',
    'AMZN': '아마존',
    'NVDA': '엔비디아',
    'TSLA': '테슬라',
    'META': '메타',
    'AMD': 'AMD',
    'NFLX': '넷플릭스',
    'INTC': '인텔',
    'QCOM': '퀄컴',
    'AVGO': '브로드컴',
    'CSCO': '시스코',
    'TXN': '텍사스 인스트루먼트',
    'ADBE': '어도비',
    'CRM': '세일즈포스',
    'ORCL': '오라클',
    'AMAT': '어플라이드 머티리얼즈',
    'MU': '마이크론 테크놀로지',
    'PYPL': '페이팔',
    'KLAC': 'KLA'
};

/**
 * If ticker is in map, override stockName if it's currently missing or numeric
 */
export function enhanceStockName(stockName: string, ticker: string): string {
    const cleaned = cleanTicker(ticker);
    if ((!stockName || stockName === cleaned || /^\d+$/.test(stockName)) && TICKER_MAP[cleaned]) {
        return TICKER_MAP[cleaned];
    }
    return stockName;
}
