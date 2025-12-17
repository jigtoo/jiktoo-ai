-- Clean up invalid tickers from alpha_engine_playbooks
DELETE FROM alpha_engine_playbooks 
WHERE ticker LIKE '%종목코드%' 
   OR ticker LIKE '%StockCode%' 
   OR ticker = 'N/A' 
   OR ticker = 'Unknown';

-- Optional: Clean up other tables if needed
DELETE FROM user_watchlist 
WHERE items::text LIKE '%종목코드%';
