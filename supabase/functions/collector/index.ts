// supabase/functions/collector/index.ts
import 'https://deno.land/std@0.224.0/dotenv/load.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// @ts-ignore
Deno.serve(async (req) => {
  console.log("Collector function invoked...");

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("Received payload:", JSON.stringify(payload, null, 2));

    const { message, market, channel } = payload; 

    if (!message || !market) {
      const errorMsg = "Bad request: 'message' or 'market' field is missing from the request.";
      console.error(errorMsg, "Payload:", JSON.stringify(payload));
      return new Response(JSON.stringify({ error: errorMsg }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // @ts-ignore
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    // @ts-ignore
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error("Supabase environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) are not set.");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    console.log(`Inserting message for market '${market}' from channel '${channel || 'N/A'}'...`);

    // FIX: The .insert() method expects an array of objects. Wrap the payload object in an array.
    const { error } = await supabaseAdmin.from('telegram_messages').insert([{
      message,
      market,
      channel: channel || null, 
    }] as any);

    if (error) {
      console.error('Supabase insert error:', JSON.stringify(error, null, 2));
      throw error;
    }

    console.log("Successfully inserted message into 'telegram_messages'.");

    return new Response(JSON.stringify({ status: 'ok', message: 'Message received and stored.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error('Handler error:', err);
    
    let errorMessage = err.message;
    if (err instanceof SyntaxError) {
        errorMessage = "Invalid JSON format in request body.";
    } else if (err.code) { // Supabase PostgREST error
        errorMessage = `Database error: ${err.message} (Hint: ${err.hint})`;
    }

    return new Response(JSON.stringify({ error: `[Collector Error] ${errorMessage}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});