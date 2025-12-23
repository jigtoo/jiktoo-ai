
import 'dotenv/config';
process.env.GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
// import { gem2_ValueChain } from '../gems/Gem2_ValueChain';

async function main() {
    console.log("🚀 Starting Gem 2 Test...");
    const { gem2_ValueChain } = await import('../gems/Gem2_ValueChain');

    const newsText = `
    [특징주] HBM 대장주 SK하이닉스, 엔비디아 차세대 칩 소식에 강세
    엔비디아가 차세대 AI 가속기 '루빈'을 공개하면서 SK하이닉스에 대한 기대감이 커지고 있다.
    SK하이닉스는 현재 HBM3E를 엔비디아에 독점 공급하고 있어 최대 수혜주로 꼽힌다.
    한편, 삼성전자 역시 HBM3E 품질 테스트를 진행 중이며 공급 기대감이 유효하다.
    `;

    const result = await gem2_ValueChain.analyze(newsText);

    console.log("---------------------------------------------------");
    console.log("Theme:", result.theme);
    console.log("Direct Impact Sentiment:", result.directImpact.sentiment);
    console.log("Direct Impact Description:", result.directImpact.description);
    console.log("---------------------------------------------------");

    if (result.relatedStocks.length > 0) {
        console.log("Related Stocks:");
        result.relatedStocks.forEach(s => {
            console.log(`- ${s.name} (${s.ticker || 'No Ticker'}): ${s.relationship}`);
        });
    } else {
        console.log("No Related Stocks Found.");
    }
    console.log("---------------------------------------------------");

    if (result.theme !== 'Unknown') {
        console.log("✅ Gem 2 Test PASSED");
    } else {
        console.error("❌ Gem 2 Test FAILED");
        process.exit(1);
    }
}

import * as fs from 'fs';

main().catch(err => {
    console.error("UNKNOWN ERROR:", err);
    fs.writeFileSync('gem2_debug_error.log', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    process.exit(1);
});
