
SELECT 'ai_trade_journals' AS table_name, count(*) FROM ai_trade_journals
UNION ALL
SELECT 'ai_growth_journals', count(*) FROM ai_growth_journals;
