-- 1. Inspect where these specific problem tickers are hiding
select 'alpha_engine_playbooks' as source, id, ticker, stock_name, created_at 
from alpha_engine_playbooks 
where ticker in ('샘표', 'LX세미콘', '000660', 'NA', 'undefined')
   or ticker ~ '[가-힣]';

select 'watchlist_items' as source, market, items 
from watchlist_items;

-- 2. Delete the invalid text-based tickers from Playbook (The main culprit for AutoPilot errors)
delete from alpha_engine_playbooks 
where ticker in ('샘표', 'LX세미콘', 'NA', 'undefined')
   or ticker ~ '[가-힣]'; -- Remove any ticker containing Korean characters

-- 3. Check if 000660 exists and looks weird (optional, usually 000660 is valid but maybe the entry is stale)
-- We won't delete 000660 yet, just the text ones.
