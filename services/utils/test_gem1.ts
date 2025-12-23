// import { gem1_Reliability } from '../gems/Gem1_Reliability'; // Removed static import
import 'dotenv/config'; // Load env vars immediately

async function main() {
    const { gem1_Reliability } = await import('../gems/Gem1_Reliability');
    const validNews = `
    [속보] 삼성전자, 5세대 HBM3E 세계 최초 양산 돌입... 엔비디아 공급 임박
    삼성전자가 차세대 고대역폭메모리(HBM)인 HBM3E 12단 제품을 세계 최초로 양산하기 시작했다.
    업계에 따르면 삼성전자는 최근 엔비디아의 퀄(품질) 테스트를 통과하고 물량 공급을 위한 최종 조율에 들어갔다.
    이는 경쟁사 SK하이닉스보다 3개월 앞선 것으로, 주가에 긍정적인 영향을 미칠 것으로 보인다. 
    관련 소식에 삼성전자 주가는 장초반 3% 상승세다.
    `;

    const trashNews = `
    대박! 이거 모르면 바보? 내일 무조건 상한가 가는 종목 찌라시 공개!
    형님들 이거 진짜입니다. 아는 지인이 여의도 큰손인데 내일 A사 무조건 점상 간다고 합니다.
    지금 안 사면 평생 후회함!!!???!
    `;

    console.log("Testing Valid News...");
    const result1 = await gem1_Reliability.evaluate(validNews);
    console.log("Score:", result1.score);
    console.log("Pass:", result1.isPass);
    console.log("Source Analysis:", result1.analysis.source);
    if (result1.warning) console.log("Warning:", result1.warning);

    console.log("\nTesting Trash News...");
    const result2 = await gem1_Reliability.evaluate(trashNews);
    console.log("Score:", result2.score);
    console.log("Pass:", result2.isPass);
    console.log("Source Analysis:", result2.analysis.source);
    if (result2.warning) console.log("Warning:", result2.warning);

    if (result1.isPass && !result2.isPass) {
        console.log("\n✅ Gem 1 Test PASSED: Correctly filtered noise.");
    } else {
        console.error("\n❌ Gem 1 Test FAILED: Logic error.");
    }
}

main().catch(err => {
    console.error("UNKNOWN ERROR CAUGHT IN MAIN:", err);
});
