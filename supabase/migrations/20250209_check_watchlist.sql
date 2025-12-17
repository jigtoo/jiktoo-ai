-- Check user watchlist for stale data
SELECT * FROM public.user_watchlist WHERE market = 'US';
SELECT * FROM public.user_watchlist WHERE market = 'KR';

-- Check playbook sources to see where stocks are coming from
SELECT 
    ticker, 
    stock_name, 
    source, 
    sources,
    created_at 
FROM public.alpha_engine_playbooks 
WHERE market = 'US'
ORDER BY created_at DESC
LIMIT 20;
