// supabase/functions/api-gateway/index.ts
import 'https://deno.land/std@0.224.0/dotenv/load.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const url = new URL(req.url);
        const service = url.searchParams.get('service');

        let body: any = {};
        if (req.method === 'POST') {
            try {
                body = await req.json();
            } catch {
                // ignore body parse error
            }
        }

        const activeService = service || body.service;
        let targetUrl = '';
        let apiKey = '';

        switch (activeService) {
            // ✅ Polygon
            case 'polygon': {
                apiKey = Deno.env.get('POLYGON_API_KEY') ?? '';
                const polygonEndpoint = url.searchParams.get('endpoint');
                if (!polygonEndpoint) throw new Error('Polygon endpoint is required.');

                // Remove leading slash if present
                const cleanEndpoint = polygonEndpoint.startsWith('/') ? polygonEndpoint.substring(1) : polygonEndpoint;

                // FIX: Handle query parameters correctly
                const separator = cleanEndpoint.includes('?') ? '&' : '?';
                targetUrl = `https://api.polygon.io/${cleanEndpoint}${separator}apiKey=${apiKey}`;
                break;
            }

            // ✅ News API
            case 'newsapi': {
                apiKey = Deno.env.get('NEWS_API_KEY') ?? '';
                const newsQuery = url.searchParams.get('q');
                targetUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(newsQuery || '')}&language=en&sortBy=publishedAt&apiKey=${apiKey}`;
                break;
            }

            // ✅ Naver News
            case 'naver': {
                const naverId = Deno.env.get('NAVER_CLIENT_ID');
                const naverSecret = Deno.env.get('NAVER_CLIENT_SECRET');
                const naverQuery = url.searchParams.get('q');

                const naverUrl = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(naverQuery || '')}&display=10&sort=sim`;

                const naverRes = await fetch(naverUrl, {
                    headers: {
                        'X-Naver-Client-Id': naverId || '',
                        'X-Naver-Client-Secret': naverSecret || ''
                    }
                });

                if (!naverRes.ok) throw new Error(`Naver API error: ${naverRes.status}`);

                const naverData = await naverRes.json();
                return new Response(JSON.stringify(naverData), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200
                });
            }

            // ✅ Financial Modeling Prep
            case 'fmp': {
                apiKey = Deno.env.get('FMP_API_KEY') ?? '';
                const fmpEndpoint = url.searchParams.get('endpoint');
                if (!fmpEndpoint) throw new Error('FMP endpoint is required.');

                // Remove leading slash if present
                const cleanEndpoint = fmpEndpoint.startsWith('/') ? fmpEndpoint.substring(1) : fmpEndpoint;

                targetUrl = `https://financialmodelingprep.com/api/${cleanEndpoint}?apikey=${apiKey}`;
                break;
            }

            // ✅ FRED
            case 'fred': {
                apiKey = Deno.env.get('FRED_API_KEY') ?? '';
                const seriesIds = body.series_ids;
                if (!seriesIds || !Array.isArray(seriesIds)) throw new Error('FRED series_ids array is required.');

                const fredRequests = seriesIds.map((id: string) =>
                    fetch(`https://api.stlouisfed.org/fred/series/observations?series_id=${id}&api_key=${apiKey}&file_type=json&limit=1&sort_order=desc`)
                        .then((res) => res.json())
                        .then((data) => ({
                            id,
                            value: data.observations?.[0]?.value ?? 'N/A'
                        }))
                );

                const fredResults = await Promise.all(fredRequests);
                const fredData = fredResults.reduce((acc, res) => {
                    acc[res.id] = res.value;
                    return acc;
                }, {} as Record<string, string>);

                return new Response(JSON.stringify(fredData), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200
                });
            }

            // ✅ MarketAux
            case 'marketaux': {
                apiKey = Deno.env.get('MARKETAUX_API_KEY') ?? '';
                const marketauxQuery = url.searchParams.get('q');
                targetUrl = `https://api.marketaux.com/v1/news/all?symbols=${encodeURIComponent(marketauxQuery || '')}&filter_entities=true&language=en&api_token=${apiKey}`;
                break;
            }

            // ✅ 한국투자증권 KIS API
            case 'kis': {
                const appkey = Deno.env.get('KIS_APP_KEY');
                const appsecret = Deno.env.get('KIS_APP_SECRET');

                if (!appkey || !appsecret) throw new Error('KIS credentials missing in environment');

                const kisEndpoint = body.endpoint || url.searchParams.get('endpoint');
                const kisMethod = body.method || 'GET';
                const kisParams = body.params || {};

                // 1️⃣ 토큰 발급
                const kisTokenRes = await fetch('https://openapi.koreainvestment.com:9443/oauth2/tokenP', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        grant_type: 'client_credentials',
                        appkey,
                        appsecret
                    })
                });

                const kisTokenData = await kisTokenRes.json();
                console.log('[KIS] Token Response:', kisTokenData);

                if (!kisTokenRes.ok || !kisTokenData.access_token) {
                    throw new Error(`KIS Token failed: ${JSON.stringify(kisTokenData)}`);
                }

                // 2️⃣ 실데이터 호출
                const kisHeaders = {
                    'Content-Type': 'application/json',
                    authorization: `Bearer ${kisTokenData.access_token}`,
                    appkey,
                    appsecret,
                    tr_id: kisParams.tr_id || 'FHKST01010100',
                    custtype: 'P'
                };

                const kisUrl = `https://openapi.koreainvestment.com:9443${kisEndpoint}`;
                console.log('[KIS] Endpoint:', kisUrl);

                const kisResponse = await fetch(kisUrl, {
                    method: kisMethod,
                    headers: kisHeaders,
                    body: kisMethod === 'POST' ? JSON.stringify(kisParams) : undefined
                });

                const kisData = await kisResponse.json();
                return new Response(JSON.stringify(kisData), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: kisResponse.status
                });
            }

            default:
                throw new Error(`Unknown or missing service: ${activeService}`);
        }

        // 🔹 기본 처리 (Polygon, MarketAux 등)
        if (targetUrl) {
            console.log(`[API Gateway] Proxying to: ${targetUrl}`);
            const response = await fetch(targetUrl);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Upstream API error for service '${activeService}': ${response.status} ${errorText}`);
            }

            const data = await response.json();
            return new Response(JSON.stringify(data), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            });
        }

        throw new Error(`No target URL was resolved for service: ${activeService}`);

    } catch (err: any) {
        console.error('[API Gateway Error]', err);
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        });
    }
});
