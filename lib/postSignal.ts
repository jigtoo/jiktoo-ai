// copy-of-sepa-ai/lib/postSignal.ts
import { supabase } from '../services/supabaseClient';
import { USE_REALTIME_ALPHA } from '../config';
import type { RealtimeSignal } from '../types';

export async function postSignal(signal: RealtimeSignal) {
  if (!USE_REALTIME_ALPHA || !supabase) return;
  try {
    // FIX: Cast payload to `any` to avoid Supabase client type inference issues. The insert method expects an array of objects.
    const { error } = await supabase.from('realtime_signals').insert([{
      source: signal.source,
      ticker: signal.ticker,
      stock_name: signal.stockName,
      rationale: signal.rationale,
      weight: signal.weight ?? 0.5, // Default weight if not provided
      meta: signal.meta ?? {},
      signal_type: signal.source // Use source as default signal_type
    }] as any);
    if (error) throw error;
  } catch (e: any) {
    // Avoid spamming console for duplicate key errors which are expected for idempotency
    if (e.message && !e.message.includes('duplicate key value violates unique constraint')) {
      console.error('[postSignal]', e.message);
    }
  }
}
