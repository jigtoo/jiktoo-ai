// supabase/functions/telegram-service/index.ts
import 'https://deno.land/std@0.224.0/dotenv/load.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const VERSION = "telegram-service@v1.8 (Robustness Update)";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// @ts-ignore
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
// @ts-ignore
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
// @ts-ignore
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const sendTelegramMessage = async (chat_id: string, text: string) => {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error("TELEGRAM_BOT_TOKEN is not set in environment variables.");
  }
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id, text, parse_mode: 'Markdown' }),
  });

  if (!response.ok) {
    const errorBody = await response.json();
    if (response.status === 403 && errorBody.description && errorBody.description.includes("bot was blocked by the user")) {
        throw new Error(`텔레그램 알림이 차단되었습니다. 봇과의 대화를 시작하거나 차단을 해제한 후 다시 시도해주세요. (Chat ID: ${chat_id})`);
    }
    throw new Error(`Telegram API Error: ${errorBody.description || response.statusText}`);
  }
  return response.json();
};

// @ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const baseHeaders = { ...CORS_HEADERS, "Content-Type": "application/json", "x-telegram-service-version": VERSION };

  try {
    if (!TELEGRAM_BOT_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing one or more required environment variables (TELEGRAM_BOT_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).");
    }

    const payload = await req.json();
    const { type, chat_id, signals, target_chat_id } = payload; 

    if (!type) {
      throw new Error("Request body must include 'type'.");
    }
    
    console.log(`[${VERSION}] Received request: type=${type}`);
    
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        global: {
            headers: { Authorization: req.headers.get('Authorization')! }
        }
    });

    if (type === 'test') {
        if (!chat_id) throw new Error("Request body must include 'chat_id' for 'test' type.");
        const message = `✅ *테스트 성공* ✅\n\n'직투' AI 텔레그램 알림 시스템이 정상적으로 연결되었습니다.`;
        await sendTelegramMessage(chat_id, message);
        return new Response(JSON.stringify({ message: "Test message sent successfully.", version: VERSION }), { status: 200, headers: baseHeaders });
    
    } else if (type === 'subscribe') {
        if (!chat_id) throw new Error("Request body must include 'chat_id' for 'subscribe' type.");

        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new Error("Authorization header is missing. Cannot identify user.");
        
        const jwt = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);

        if (userError) throw new Error(`Failed to get user from JWT: ${userError.message}`);
        if (!user) throw new Error("Invalid JWT: User not found.");
        
        const { error: rpcError } = await supabaseAdmin.rpc('rpc_subscribe_telegram', {
            p_chat_id: chat_id,
            p_user_id: user.id
        });

        if (rpcError) {
            console.error('Supabase RPC error details:', JSON.stringify(rpcError, null, 2));
            if (rpcError.message.includes('function public.rpc_subscribe_telegram')) {
                throw new Error("데이터베이스 설정 오류: 'rpc_subscribe_telegram' 함수가 없습니다. README의 SQL 스크립트를 다시 실행하여 데이터베이스를 업데이트하세요.");
            }
            throw new Error(`Database error during subscription RPC: ${rpcError.message}`);
        }
        
        try {
            const message = `🎉 *구독 완료* 🎉\n\n'직투' AI 텔레그램 알림 구독이 완료되었습니다. 이제부터 핵심 투자 신호를 실시간으로 보내드립니다.`;
            await sendTelegramMessage(chat_id, message);
        } catch (telegramError) {
            console.warn(`[${VERSION}] Subscription to DB was successful for chat_id ${chat_id}, but sending the confirmation message failed: ${telegramError.message}`);
        }

        return new Response(JSON.stringify({ message: "Subscription successful.", version: VERSION }), { status: 200, headers: baseHeaders });

    } else if (type === 'notify') {
        if (!signals || !Array.isArray(signals)) throw new Error("Request body must include an array of 'signals' for 'notify' type.");
        
        let subscribers;
        if (target_chat_id) {
            subscribers = [{ chat_id: target_chat_id }];
        } else {
            const { data, error: subsError } = await supabaseAdmin.from('telegram_subscriptions').select('chat_id');
            if (subsError) throw new Error(`Failed to fetch subscribers: ${subsError.message}`);
            subscribers = data;
        }
        
        if (!subscribers || subscribers.length === 0) {
            const msg = target_chat_id ? `Target subscriber with chat_id ${target_chat_id} not found.` : "No subscribers found.";
            return new Response(JSON.stringify({ message: msg, version: VERSION }), { status: 200, headers: baseHeaders });
        }
        
        const notifyPromises = [];
        for (const signal of signals) {
            const message = `🚨 *JIKTOO AI 신호 포착* 🚨\n\n*종목:* ${signal.stockName} (${signal.ticker})\n*패턴:* ${signal.detectedPattern} (${signal.patternTimeframe})\n\n*AI 분석:* ${signal.aiCommentary}\n\n*매수 트리거:* \`${signal.triggerSignal}\`\n*무효화 조건:* \`${signal.invalidationCondition}\`\n*1차 목표가:* \`${signal.keyLevels.target}\``;
            for (const sub of subscribers) {
                notifyPromises.push(sendTelegramMessage(sub.chat_id, message));
            }
        }
        
        const results = await Promise.allSettled(notifyPromises);
        const failedSends = results.filter(r => r.status === 'rejected').length;
        if (failedSends > 0) {
            console.error(`[${VERSION}] Failed to send ${failedSends} out of ${notifyPromises.length} messages.`);
        }
        
        return new Response(JSON.stringify({ message: `Sent ${signals.length} signals to ${subscribers.length} subscribers. (${failedSends} failures)`, version: VERSION }), { status: 200, headers: baseHeaders });
    
    } else {
      throw new Error(`Invalid request type: '${type}'. Must be 'test', 'subscribe', or 'notify'.`);
    }

  } catch (err) {
    console.error(`[${VERSION}] Handler error:`, err);
    return new Response(JSON.stringify({ error: `[${VERSION}] ${err.message}` }), {
      status: 500,
      headers: baseHeaders,
    });
  }
});