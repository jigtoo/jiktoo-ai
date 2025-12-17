-- Clean up the System Check logs
DELETE FROM ai_thought_logs 
WHERE message LIKE '%시스템 점검용%';

DELETE FROM system_commands
WHERE command = 'TEST_SNIPER';
