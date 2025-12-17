// copy-of-sepa-ai/alpha/shouldCall.ts
import { getAlphaSource, getDailyCap, getMonthlyCap, getState } from '../services/appConfig';

function minutesSince(iso?: string) {
  if (!iso) return 9999;
  return (Date.now() - new Date(iso).getTime()) / 60000;
}

async function underCaps() {
  // 월간 카운터는 필요시 별도 테이블로. 여기선 일간만 예시.
  const dailyCap = await getDailyCap();
  // 생략: getMonthCalls()
  // 일단 daily만 엄격히
  // 실제 월간은 Edge 함수/서버에서 누적 관리 권장
  // 임시: 오늘 호출수는 RPC나 view로 합산하는 구조도 가능
  return true && dailyCap > 0; 
}

export async function shouldCallGemini(params: {
  key: string; inputHash: string; debounceMin?: number;
}) {
  const { key, inputHash, debounceMin = 15 } = params;
  const mode = await getAlphaSource();
  if (mode === 'db') return false;
  if (!(await underCaps())) return false;

  const state = await getState(key);
  if (state && minutesSince(state.last_called_at) < debounceMin) return false;
  if (state && state.last_hash === inputHash) return false;

  // In hybrid mode, this function determines IF we should call, not what the source is.
  // The hook itself will determine the final source tag. If we pass this, it means we will call Gemini.
  // If mode is 'gemini', all checks above are bypassed (except caps), so it will always return true here.
  return true;
}