// supabase/functions/adaptation-run/index.ts
import 'https://deno.land/std@0.224.0/dotenv/load.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// This function is designed to be triggered by a cron job (e.g., every 10 minutes)
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    console.log('[Adaptation Engine] Starting adaptation cycle...');

    const { data, error } = await supabaseAdmin.rpc('fn_run_adaptation_cycle');

    if (error) {
      throw new Error(`Failed to run adaptation cycle: ${error.message}`);
    }

    console.log('[Adaptation Engine] Cycle completed.', data);

    return new Response(JSON.stringify({
      message: "Adaptation cycle completed successfully.",
      summary: data
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e: any) {
    console.error('[Adaptation Engine] Top-level error:', e.message);
    
    // Attempt to send a telemetry signal about the failure
    try {
        const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
        // FIX: The .insert() method expects an array of objects. Wrap the payload object in an array.
        await supabaseAdmin.from('system_signal_outbox').insert([{
          event_type: 'cron.error',
          route_key: 'ops',
          payload: {
            severity: 'critical',
            title: 'Adaptation Engine Function Failed',
            message: `The entire 'adaptation-run' Edge Function failed: ${e.message}`,
            dedupe_key: `adaptation_run_critical_fail`
          }
        }] as any);
    } catch(telemetryError) {
        console.error("[Adaptation Engine] FAILED TO SEND CRITICAL TELEMETRY:", telemetryError);
    }

    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});