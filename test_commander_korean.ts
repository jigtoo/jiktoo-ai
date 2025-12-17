
import { strategyCommander } from './services/gemini/StrategyCommander';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function testCommander() {
    console.log('🧪 Testing Strategy Commander Language Output...');

    const marketData = {
        market: 'KR',
        regime: 'WEAK_BULL',
        score: 65,
        trend: 'UPTREND'
    };

    const headlines = [
        '[Breakling] Samsung Electronics Earnings Surprise',
        'Fed hints at rate cuts in Q3',
        'Tesla production ramps up in Texas',
        '코스피 외국인 순매수 전환',
        '바이오 섹터 강세 지속 전망'
    ];

    try {
        const decision = await strategyCommander.decideStrategy(marketData, headlines, []);

        console.log('--- Decision Result ---');
        console.log('Market Status:', decision.marketStatus);
        console.log('Rationale:', decision.rationale);

        // Simple check for Korean characters
        const hasKorean = /[가-힣]/.test(decision.rationale);
        if (hasKorean) {
            console.log('✅ Korean output detected!');
        } else {
            console.warn('❌ Output seems to be English (No Korean chars detected). Logic might need strict enforcement.');
        }

    } catch (error) {
        console.error('Test failed:', error);
    }
}

testCommander();
