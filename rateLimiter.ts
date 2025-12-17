// copy-of-sepa-ai/rateLimiter.ts
import pLimit from 'p-limit';

/**
 * KIS API는 조회성 트랜잭션에 대해 초당 10~20회의 비교적 여유로운 요청 제한을 가집니다.
 * 하지만, '초당 거래건수 초과' 오류를 방지하고 안정적인 운영을 위해, 애플리케이션의 모든 KIS 관련
 * API 호출을 제어하는 전역 리미터를 사용합니다.
 * 동시성(concurrency)을 5로 설정하여 여러 요청이 병렬로 처리될 수 있도록 허용하면서도,
 * API 서버에 과부하를 주지 않는 안전한 수준을 유지합니다.
 */
export const kisApiLimiter = pLimit(5);