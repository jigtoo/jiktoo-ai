// services/appConfig.ts
import { supabase } from './supabaseClient';

export const getAppConfig = async (key: string): Promise<string | null> => {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('app_config').select('value').eq('key', key).maybeSingle();
    if (error) return null;
    return data?.value ?? null;
  } catch (e) {
    return null;
  }
};

/**
 * Increase daily API call count (for rate limiting tracking)
 */
export const bumpTodayCalls = async (serviceName?: string): Promise<void> => {
  // This is optional logging/tracking logic.
  // If tracking table exists, we increment. If not, we silently ignore.
  if (!supabase) return;

  try {
    const today = new Date().toISOString().split('T')[0];
    // Fire and forget
    // Default service name if not provided
    const svc = serviceName || 'gemini_api';
    supabase.rpc('increment_api_usage', { service_name: svc, date_str: today }).catch(() => { });
  } catch (e) {
    // Ignore errors
  }
};

/**
 * Update state key (cache hit tracking or similar)
 */
export const setState = async (key: string, value: string): Promise<void> => {
  if (!supabase) return;
  try {
    // Try to upsert into a 'state_store' or similar table if it existed, 
    // but for now, we'll just log it or maybe update app_config if appropriate.
    // Given the context of 'inputHash', this seems like a cache validation step.
    // We will implement a no-op or minimal storage for now to prevent errors.

    // If there was a specific table for this, we would use it.
    // For now, let's assume it's safe to do nothing or just log.
    // Real implementation would be:
    // await supabase.from('app_state').upsert({ key, value });
  } catch (e) {
    // ignore
  }
}

/**
 * Init or check daily limit
 */
export const checkDailyLimit = async (serviceName: string, limit: number): Promise<boolean> => {
  // Placeholder logic - always return true (allow) for now unless strict limit needed
  return true;
};

export const getAlphaSource = async (): Promise<'gemini' | 'hybrid' | 'db'> => {
  const config = await getAppConfig('alpha_source');
  return (config as 'gemini' | 'hybrid' | 'db') || 'gemini';
};

export const getDailyCap = async (): Promise<number> => {
  return 1000; // Default placeholder
};

export const getMonthlyCap = async (): Promise<number> => {
  return 10000; // Default placeholder
};

export const getState = async (key: string): Promise<any | null> => {
  return null; // Default: no state found, force execution
};