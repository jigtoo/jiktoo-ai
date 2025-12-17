import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
    try {
        // CORS 처리
        if (req.method === 'OPTIONS') {
            return new Response('ok', {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST',
                    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
                },
            })
        }

        // Edge Function Secrets에서 KIS credentials 가져오기
        const kisAppKey = Deno.env.get('KIS_APP_KEY')
        const kisAppSecret = Deno.env.get('KIS_APP_SECRET')

        if (!kisAppKey || !kisAppSecret) {
            return new Response(
                JSON.stringify({ error: 'KIS credentials not configured in secrets' }),
                {
                    status: 500,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                }
            )
        }

        // KIS API 호출하여 WebSocket approval key 생성
        let approvalKey = ''

        try {
            const response = await fetch('https://openapi.koreainvestment.com:9443/oauth2/Approval', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    grant_type: 'client_credentials',
                    appkey: kisAppKey,
                    secretkey: kisAppSecret,
                }),
            })

            if (response.ok) {
                const data = await response.json()
                approvalKey = data.approval_key || ''
            }
        } catch (error) {
            console.error('Error generating approval key:', error)
        }

        // Credentials 반환
        return new Response(
            JSON.stringify({
                appKey: kisAppKey,
                appSecret: kisAppSecret,
                approvalKey: approvalKey,
            }),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
            }
        )
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
            }
        )
    }
})
