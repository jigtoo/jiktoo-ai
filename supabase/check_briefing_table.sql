-- Check if 'user_intelligence_briefings' exists and has the 'title' column
-- Run this to verify the table state.

SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name = 'user_intelligence_briefings'
ORDER BY 
    ordinal_position;
