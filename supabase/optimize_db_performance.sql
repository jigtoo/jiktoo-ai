
-- 1. ai_growth_journals 인덱스 추가 (Evolution 시스템 성능 향상)
CREATE INDEX IF NOT EXISTS idx_ai_growth_journals_created_at ON ai_growth_journals (created_at DESC);

-- 2. user_intelligence_briefings 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_user_briefings_created_at ON user_intelligence_briefings (created_at DESC);

-- 3. rule_change_log 및 model_training_log 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_rule_change_log_changed_at ON rule_change_log (changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_model_training_log_trained_at ON model_training_log (trained_at DESC);

-- 4. telegram_messages 인덱스 추가 (IntelligenceFlowMonitor 성능 향상)
CREATE INDEX IF NOT EXISTS idx_telegram_messages_created_at ON telegram_messages (created_at DESC);

-- 5. ai_thought_logs 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_ai_thought_logs_created_at ON ai_thought_logs (created_at DESC);
