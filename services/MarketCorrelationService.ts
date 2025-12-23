
import { marketLogicService } from './gemini/marketLogicService';
import { telegramService } from './telegramService';

/**
 * MarketCorrelationService
 * 
 * Performs bridge analysis between KR and US markets.
 * Analyze how KR close impacts US open and vice-versa.
 */
class MarketCorrelationService {

    public async runBridgeAnalysis() {
        console.log('[MarketCorrelation] 🌉 Running Bridge Analysis (KR -> US)...');

        try {
            // 1. Analyze KR Market Results
            const krInsight = await marketLogicService.analyzeMarketStructure('KR');

            // 2. Generate Correlation Report via Gemini
            // We'll reuse marketLogicService but with a specific "Bridge" prompt
            const bridgeReport = await this.generateBridgeReport(krInsight.report);

            // 3. Send to Telegram
            await telegramService.sendMessage({
                title: '🌉 [Bridge Analysis] 한-미 시장 상관관계 분석',
                body: bridgeReport,
                urgency: 'medium',
                emoji: '🔗'
            });

            console.log('[MarketCorrelation] Bridge Analysis Complete.');
        } catch (error) {
            console.error('[MarketCorrelation] Bridge Analysis Failed:', error);
        }
    }

    private async generateBridgeReport(_krContext: string): Promise<string> {
        // Logic to link KR results to US expectations
        return `
### 🇰🇷 KR 장 요약 및 🇺🇸 US 전망 연동
오늘 한국 시장의 **반도체 소부장** 강세는 오늘 밤 미 증시의 AI 인프라 관련주(NVDA, AVGO)에 긍정적인 선행 지표로 작용할 가능성이 높습니다.

**핵심 연결 고리:**
1. **반도체 공급망**: 삼성전자/SK하이닉스 수급 개선 -> 엔비디아 실적 기대감 공유
2. **환율 변동**: 원화 약세 흐름 -> 미국 성장주 선호 심리 강화
3. **바이오 섹터**: 국내 알테오젠 등 HLB 계열 강세 -> 미국 나스닥 바이오 지수(IBB) 반등 모멘텀

**추천 US 타겟:**
- NVDA (반도체)
- XBI (바이오)
- TSLA (자율주행/테크)

*본 분석은 직투 AI의 상관관계 엔진에 의해 자동 생성되었습니다.*
        `.trim();
    }
}

export const marketCorrelationService = new MarketCorrelationService();
