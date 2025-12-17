// supabase/functions/executor-run/index.ts
import 'https://deno.land/std@0.224.0/dotenv/load.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// FIX: Add Deno type declaration to resolve "Cannot find name 'Deno'" error.
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// This function is designed to be triggered by a cron job (e.g., every 2 minutes)
// @ts-ignore
Deno.serve(async (req) => {
  // Self-check logic (runs on cold start)
  if (!(globalThis as any).selfCheckCompleted) {
    try {
      console.log('[Executor Self-Check] Running boot checks...');
      const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

      const { data: checkResult, error: checkError } = await supabaseAdmin.rpc('self_check_system_state');

      if (checkError) throw checkError;

      // DDL Guard checks
      if (checkResult.trigger_exists) {
          console.log('[Executor Self-Check] PASSED: DDL guard trigger "trg_guard_dangerous_ddl" is present.');
      } else {
          console.error('[Executor Self-Check] FAILED: DDL guard trigger "trg_guard_dangerous_ddl" is MISSING.');
      }

      if (checkResult.function_regex_pattern) {
          console.log(`[Executor Self-Check] PASSED: DDL guard function found. Blocking regex version includes: "${checkResult.function_regex_pattern}".`);
      } else {
          console.error('[Executor Self-Check] FAILED: DDL guard function "fn_guard_dangerous_ddl" is MISSING or regex not found.');
      }

      // NEW Telemetry checks
      if (checkResult.telemetry_rule_ok) {
          console.log('[Executor Self-Check] PASSED: Telemetry rule for "system.healthy" event is present and active.');
      } else {
          console.error('[Executor Self-Check] FAILED: Telemetry rule for "system.healthy" event is MISSING or inactive.');
      }

      if (checkResult.telemetry_route_ok) {
          console.log('[Executor Self-Check] PASSED: Telemetry route key "ops" is configured.');
      } else {
          console.error('[Executor Self-Check] FAILED: Telemetry route key "ops" is MISSING in sys_config.');
      }
      
      (globalThis as any).selfCheckCompleted = true;
    } catch (checkError) {
      console.error('[Executor Self-Check] CRITICAL FAILURE during boot checks:', checkError.message);
    }
  }
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    
    const { data: jobs, error: selectError } = await supabaseAdmin.rpc('get_pending_executions', { batch_size: 10 });
    if (selectError) {
      throw new Error(`Failed to fetch pending executions: ${selectError.message}`);
    }

    if (!jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ message: "No pending jobs to execute." }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Executor] Fetched ${jobs.length} jobs to process.`);

    for (const job of jobs) {
      if (!job || !job.id) {
        console.error('[Executor] Skipping invalid job without ID:', job);
        continue;
      }

      const startTime = new Date().toISOString();
      let kpi_before = null;
      
      try {
        const { data: kpiData } = await supabaseAdmin.from('v_exec_kpi_summary_7d_latest').select('*').single();
        kpi_before = kpiData;
      } catch (kpiError) {
        console.warn(`[Executor] Could not capture KPI snapshot before job ${job.id}: ${kpiError.message}`);
      }

      try {
        let result_summary = 'No action taken.';

        switch (job.command_type) {
          case 'NOOP':
            console.log(`[Executor] Executing NOOP job ${job.id}.`);
            result_summary = `NOOP command executed successfully for smoke testing.`;
            break;
          case 'SQL_EXEC':
            const sql = job.command_payload?.sql;
            const isDdlSafe = job.command_payload?.ddl_safe === true;

            if (!sql) throw new Error("SQL_EXEC command is missing 'sql' in payload.");
            
            // Allow 'db_ops' for operational SQL commands.
            if (job.target_system === 'db_schema' || job.target_system === 'policy_engine' || job.target_system === 'db_ops') {
                const rpcName = isDdlSafe ? 'apply_safe_ddl' : 'execute_sql';
                const rpcParams = isDdlSafe ? { p_sql: sql } : { sql_query: sql };
                
                console.log(`[Executor] Executing job ${job.id} via ${rpcName}.`);
                const { data: sqlResult, error: sqlError } = await supabaseAdmin.rpc(rpcName, rpcParams);
                
                if (sqlError) throw sqlError;
                result_summary = `SQL executed successfully. Result: ${JSON.stringify(sqlResult)}`;
            } else {
                throw new Error(`SQL_EXEC not allowed for target system: ${job.target_system}`);
            }
            break;
          default:
            throw new Error(`Unsupported command type: ${job.command_type}`);
        }
        
        let kpi_after = null;
        try {
          const { data: kpiData } = await supabaseAdmin.from('v_exec_kpi_summary_7d_latest').select('*').single();
          kpi_after = kpiData;
        } catch (kpiError) {
          console.warn(`[Executor] Could not capture KPI snapshot after job ${job.id}: ${kpiError.message}`);
        }

        // FIX: The .insert() method expects an array of objects. Wrap the payload object in an array.
        await supabaseAdmin.from('execution_log').insert([{
          queue_id: job.id, // Ensured to be valid by check above
          started_at: startTime,
          completed_at: new Date().toISOString(),
          status: 'done',
          result_summary,
          kpi_metrics_before: kpi_before,
          kpi_metrics_after: kpi_after,
        }] as any);
        await supabaseAdmin.from('execution_queue').update({ status: 'done' }).eq('id', job.id);
        console.log(`[Executor] Job ${job.id} completed successfully.`);

      } catch (executionError: any) {
        console.error(`[Executor] Execution failed for job ${job.id}:`, executionError);

        // FIX: The .insert() method expects an array of objects. Wrap the payload object in an array.
        await supabaseAdmin.from('execution_log').insert([{
          queue_id: job.id, // Ensured to be valid by check above
          started_at: startTime,
          completed_at: new Date().toISOString(),
          status: 'failed',
          error_details: executionError.message,
          kpi_metrics_before: kpi_before,
        }] as any);
        
        const newStatus = job.attempts >= 3 ? 'failed' : 'pending';

        await supabaseAdmin.from('execution_queue').update({ status: newStatus }).eq('id', job.id);
        
        if (executionError.code === '42P16') {
            let recoveryJobsEnqueued = false;
            const originalSql = job.command_payload?.sql;
            const viewNameMatch = originalSql?.match(/\bCREATE\s+(OR\s+REPLACE\s+)?VIEW\s+([\w."]+)/i);

            if (originalSql && viewNameMatch && viewNameMatch[2]) {
                try {
                    const viewName = viewNameMatch[2];
                    const viewNameV3 = `${viewName}_v3`;
                    
                    const sqlStep1 = originalSql.replace(/(\bVIEW\s+)([\w."]+)/i, `$1${viewNameV3}`);
                    const sqlStep2 = `CREATE OR REPLACE VIEW ${viewName} AS SELECT * FROM ${viewNameV3};`;

                    const { error: enqueueError } = await supabaseAdmin.from('execution_queue').insert([
                        { target_system: 'db_schema', command_type: 'SQL_EXEC', command_payload: { sql: sqlStep1, ddl_safe: true, source_job_id: job.id }, priority: 10, requested_by: 'JIKTOO_SELF_HEALING_42P16' },
                        { target_system: 'db_schema', command_type: 'SQL_EXEC', command_payload: { sql: sqlStep2, ddl_safe: true, source_job_id: job.id }, priority: 9, requested_by: 'JIKTOO_SELF_HEALING_42P16' }
                    ] as any);

                    if (enqueueError) throw enqueueError;
                    recoveryJobsEnqueued = true;
                    console.log(`[Executor] Successfully enqueued self-healing jobs for failed job ${job.id}.`);
                } catch (selfHealingError) {
                    console.error(`[Executor] Error during self-healing for job ${job.id}:`, selfHealingError);
                }
            }
            
            const telemetryMessage = `Job ${job.id} (${job.command_type}) failed due to a view dependency issue (42P16). This typically happens when trying to replace a view that another view depends on.`;
            const finalMessage = recoveryJobsEnqueued
                ? `${telemetryMessage} **Self-healing action automatically enqueued:** A proxy view will be created to resolve the dependency.`
                : telemetryMessage;

            // FIX: The .insert() method expects an array of objects. Wrap the payload object in an array.
            await supabaseAdmin.from('system_signal_outbox').insert([{
              event_type: 'executor.error',
              route_key: 'ops',
              payload: { severity: 'critical', title: `Executor Failed: View Dependency (42P16)${recoveryJobsEnqueued ? ' [Auto-Healing Enqueued]' : ''}`, message: finalMessage, suggested_fix: 'The system has attempted to auto-heal by creating a proxy view. Please monitor the execution log.', queue_id: job.id, attempts: job.attempts, command_type: job.command_type, target_system: job.target_system, sql_snippet: job.command_payload?.sql?.substring(0, 200) || null, error_code: executionError.code, error_message: executionError.message, dedupe_key: `exec_fail_42P16_${job.id}` }
            }] as any);
        } else {
            // FIX: The .insert() method expects an array of objects. Wrap the payload object in an array.
            await supabaseAdmin.from('system_signal_outbox').insert([{
              event_type: 'executor.error',
              route_key: 'ops',
              payload: { severity: 'error', title: 'Executor Task Failed', message: `Job ${job.id} (${job.command_type}) failed: ${executionError.message}`, queue_id: job.id, attempts: job.attempts, command_type: job.command_type, target_system: job.target_system, sql_snippet: job.command_payload?.sql?.substring(0, 100) || null, error_code: executionError.code || null, error_message: executionError.message, dedupe_key: `exec_fail_${job.id}` }
            }] as any);
        }
      }
    }

    return new Response(JSON.stringify({ message: `Processed ${jobs.length} jobs.` }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error("[Executor] Top-level error:", e.message);
    try {
        const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
        // FIX: The .insert() method expects an array of objects. Wrap the payload object in an array.
        await supabaseAdmin.from('system_signal_outbox').insert([{
          event_type: 'cron.error',
          route_key: 'ops',
          payload: { severity: 'critical', title: 'Executor Function Failed', message: `The entire 'executor-run' Edge Function failed: ${e.message}`, dedupe_key: `executor_run_critical_fail` }
        }] as any);
    } catch(telemetryError) {
        console.error("[Executor] FAILED TO SEND CRITICAL TELEMETRY:", telemetryError);
    }

    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});