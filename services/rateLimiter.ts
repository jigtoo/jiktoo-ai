// services/rateLimiter.ts
import pLimit from 'p-limit';

/**
 * Global Rate Limiter for KIS API
 * Limits concurrent requests to prevent 429 errors.
 */
export const kisApiLimiter = pLimit(5);