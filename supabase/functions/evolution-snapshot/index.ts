// supabase/functions/evolution-snapshot/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    let stage = 'init';
    try {
        const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

        // 1. Process and snapshot recent signals
        stage = 'read';
        const sinceISO = new Date(Date.now() - 15 * 60_000).toISOString(); // 15 minute window
        const { data: recentSignals, error: signalError } = await supabaseAdmin
            .from('realtime_signals')
            .select('source, ticker, stock_name, rationale, weight, detected_at') // stock_name and weight are needed
            .gte('detected_at', sinceISO);

        if (signalError) throw new Error(`Failed to fetch recent signals: ${signalError.message}`);

        const fetched = recentSignals?.length || 0;

        if (!recentSignals || fetched === 0) {
            return new Response(JSON.stringify({
                status: 'ok',
                fetched: 0,
                grouped: 0,
                inserted: 0,
                window: sinceISO
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }
        
        const signalsByTicker: Record<string, any[]> = {};
        for (const signal of recentSignals) {
            signalsByTicker[signal.ticker] = signalsByTicker[signal.ticker] || [];
            signalsByTicker[signal.ticker].push(signal);
        }

        const snapshotRows = Object.entries(signalsByTicker).map(([ticker, signals]) => {
            const latestSignal = signals.sort((a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime())[0];
            const stockName = latestSignal?.stock_name;
            const sources = [...new Set(signals.map(s => s.source))];
            const rationale = signals.map(s => `[${s.source} ${s.weight?.toFixed(2) || ''}] ${s.rationale}`).join(' / ');
            
            const totalWeight = signals.reduce((sum, s) => sum + (s.weight || 0), 0);
            const avgWeight = signals.length > 0 ? totalWeight / signals.length : 0;
            const confidence = Math.round(avgWeight * 100);

            return { 
                ticker, 
                stock_name: stockName, 
                sources: sources, 
                rationale, 
                confidence: confidence,
                created_at: latestSignal.detected_at
            };
        });

        const grouped = snapshotRows.length;
        
        stage = 'insert';
        const { error: insertSignalError } = await supabaseAdmin
            .from('evolution_signal_snapshot')
            .insert(snapshotRows);

        if (insertSignalError) throw new Error(`Failed to insert signal snapshot: ${insertSignalError.message}`);

        const inserted = snapshotRows.length;

        return new Response(JSON.stringify({
            status: 'ok',
            fetched,
            grouped,
            inserted,
            window: sinceISO
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error(`[evolution-snapshot] Error at stage '${stage}':`, errorMessage);
        return new Response(JSON.stringify({
            status: 'error',
            stage: stage,
            message: errorMessage
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});