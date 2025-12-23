// services/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, IS_SUPABASE_ENABLED } from '../config';
import type { Json } from '../types';

export type Database = {
  public: {
    Tables: {
      portfolios: {
        Row: {
          id: string;
          created_at: string;
          owner: string;
          positions: Json;
          meta: Json;
          updated_at: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          owner?: string; // Should be handled by DB default
          positions: Json;
          meta: Json;
          updated_at?: string;
        };
        Update: {
          id?: string;
          positions?: Json;
          meta?: Json;
          updated_at?: string;
        };
      };
      user_watchlist: {
        Row: {
          id: string;
          owner: string;
          market: string;
          items: Json;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner: string;
          market: string;
          items: Json;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner?: string;
          market?: string;
          items?: Json;
          updated_at?: string;
        };
      };
      user_strategies: { // Add this
        Row: {
          id: string;
          owner: string;
          created_at: string;
          name: string;
          description: string;
          rules: Json;
          backtest_result: Json;
          is_active: boolean;
          market: string;
        };
        Insert: {
          id?: string;
          owner?: string;
          created_at?: string;
          name: string;
          description: string;
          rules: Json;
          backtest_result: Json;
          is_active?: boolean;
          market: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          rules?: Json;
          backtest_result?: Json;
          is_active?: boolean;
          market?: string;
        };
      };
      strategies: {
        Row: {
          id: string;
          created_at: string;
          name: string;
          market: string;
          genome: Json;
          performance_metrics: Json;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          name: string;
          market: string;
          genome: Json;
          performance_metrics: Json;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          name?: string;
          market?: string;
          genome?: Json;
          performance_metrics?: Json;
          is_active?: boolean;
        };
      };
      sim_results: {
        Row: {
          id: string;
          created_at: string;
          mode: string;
          asset: string;
          start_date: string;
          end_date: string;
          final_return: number;
          config: Json;
          insight: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          mode: string;
          asset: string;
          start_date: string;
          end_date: string;
          final_return: number;
          config: Json;
          insight: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          mode?: string;
          asset?: string;
          start_date?: string;
          end_date?: string;
          final_return?: number;
          config?: Json;
          insight?: string;
        };
      };
      ai_thought_logs: {
        Row: {
          id: number;
          created_at: string;
          ticker: string | null;
          action: string;
          confidence: number | null;
          message: string;
          details: Json | null;
          strategy: string | null;
        };
        Insert: {
          id?: number;
          created_at?: string;
          ticker?: string | null;
          action: string;
          confidence?: number | null;
          message: string;
          details?: Json | null;
          strategy?: string | null;
        };
        Update: {
          id?: number;
          created_at?: string;
          ticker?: string | null;
          action?: string;
          confidence?: number | null;
          message?: string;
          details?: Json | null;
          strategy?: string | null;
        };
      };
      ai_trader_logs: {
        Row: {
          market: string;
          style: string;
          logs: Json;
          updated_at: string;
        };
        Insert: {
          id?: string; // Auto-generated
          market: string;
          style: string;
          logs: Json;
          updated_at?: string;
        };
        Update: {
          id?: string;
          market?: string;
          style?: string;
          logs?: Json;
          updated_at?: string;
        };
      };
      ai_trader_portfolios: {
        Row: {
          market: string;
          style: string;
          data: Json;
          updated_at: string;
        };
        Insert: {
          market: string;
          style: string;
          data: Json;
          updated_at?: string;
        };
        Update: {
          market?: string;
          style?: string;
          data?: Json;
          updated_at?: string;
        };
      };
      portfolio_items: {
        Row: {
          id: string;
          created_at: string;
          market: string;
          data: Json;
        };
      };
      watchlist_items: {
        Row: {
          market: string;
          items: Json;
          updated_at: string;
        };
        Insert: {
          market: string;
          items: Json;
          updated_at?: string;
        };
        Update: {
          market?: string;
          items?: Json;
          updated_at?: string;
        };
      };
      tenbagger_reports: {
        Row: {
          market: string;
          report_data: Json;
          updated_at: string;
        };
        Insert: {
          market: string;
          report_data: Json;
          updated_at?: string;
        };
        Update: {
          market?: string;
          report_data?: Json;
          updated_at?: string;
        };
      };
      strategy_reports: {
        Row: {
          market: string;
          report_data: Json;
          updated_at: string;
        };
      };
      trading_playbooks: {
        Row: {
          market: string;
          stories: Json;
          updated_at: string;
        };
        Insert: {
          market: string;
          stories: Json;
          updated_at?: string;
        };
        Update: {
          market?: string;
          stories?: Json;
          updated_at?: string;
        };
      };
      portfolio_chat_history: {
        Row: {
          market: string;
          messages: Json;
          updated_at: string;
        };
        Insert: {
          market: string;
          messages: Json;
          updated_at?: string;
        };
        Update: {
          market?: string;
          messages?: Json;
          updated_at?: string;
        };
      };
      bfl_scanner_results: {
        Row: {
          market: string;
          results: Json;
          updated_at: string;
        };
        Insert: {
          market: string;
          results: Json;
          updated_at?: string;
        };
        Update: {
          market?: string;
          results?: Json;
          updated_at?: string;
        };
      };
      coin_stock_scanner_results: {
        Row: {
          market: string;
          results: Json;
          updated_at: string;
        };
        Insert: {
          market: string;
          results: Json;
          updated_at?: string;
        };
        Update: {
          market?: string;
          results?: Json;
          updated_at?: string;
        };
      };
      material_radar_results: {
        Row: {
          market: string;
          results: Json;
          updated_at: string;
        };
        Insert: {
          market: string;
          results: Json;
          updated_at?: string;
        };
        Update: {
          market?: string;
          results?: Json;
          updated_at?: string;
        };
      };
      chart_pattern_screener_results: {
        Row: {
          market: string;
          results: Json;
          updated_at: string;
        };
        Insert: {
          market: string;
          results: Json;
          updated_at?: string;
        };
        Update: {
          market?: string;
          results?: Json;
          updated_at?: string;
        };
      };
      alpha_engine_playbooks: {
        Row: {
          id: string;
          market: string;
          ticker: string;
          stock_name: string;
          strategy_name: string;
          strategy_summary: string | null;
          ai_confidence: number | null;
          key_levels: Json | null;
          strategy_type: string | null;
          analysis_checklist: Json | null;
          is_user_recommended: boolean | null;
          source: string | null;
          sources: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          market: string;
          ticker: string;
          stock_name: string;
          strategy_name: string;
          strategy_summary?: string | null;
          ai_confidence?: number | null;
          key_levels?: Json | null;
          strategy_type?: string | null;
          analysis_checklist?: Json | null;
          is_user_recommended?: boolean | null;
          source?: string | null;
          sources?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          market?: string;
          ticker?: string;
          stock_name?: string;
          strategy_name?: string;
          strategy_summary?: string | null;
          ai_confidence?: number | null;
          key_levels?: Json | null;
          strategy_type?: string | null;
          analysis_checklist?: Json | null;
          is_user_recommended?: boolean | null;
          source?: string | null;
          sources?: string[] | null;
          updated_at?: string;
        };
      };
      telegram_messages: {
        Row: {
          id: number;
          created_at: string;
          message: string;
          market: string;
          channel: string | null;
        };
        Insert: {
          id?: number;
          created_at?: string;
          message: string;
          market: string;
          channel?: string | null;
        };
        Update: {
          id?: number;
          created_at?: string;
          message?: string;
          market?: string;
          channel?: string | null;
        };
      };
      telegram_urls: {
        Row: {
          channel: string;
          channel_id: string | null;
          message_id: number;
          url: string;
          first_seen_at: string;
          last_fetched_at: string | null;
          http_status: number | null;
          final_url: string | null;
          content_length: number | null;
          title: string | null;
          fetch_error: string | null;
        };
        Insert: {
          channel: string;
          channel_id?: string | null;
          message_id: number;
          url: string;
          first_seen_at?: string;
          last_fetched_at?: string | null;
          http_status?: number | null;
          final_url?: string | null;
          content_length?: number | null;
          title?: string | null;
          fetch_error?: string | null;
        };
        Update: {
          channel?: string;
          channel_id?: string | null;
          message_id?: number;
          url?: string;
          first_seen_at?: string;
          last_fetched_at?: string | null;
          http_status?: number | null;
          final_url?: string | null;
          content_length?: number | null;
          title?: string | null;
          fetch_error?: string | null;
        };
      };
      telegram_subscriptions: {
        Row: {
          chat_id: string;
          created_at: string;
          user_id: string | null;
        };
        Insert: {
          chat_id: string;
          created_at?: string;
          user_id?: string | null;
        };
        Update: {
          chat_id?: string;
          created_at?: string;
          user_id?: string | null;
        };
      };
      community_posts: {
        Row: {
          author: string;
          content: string;
          created_at: string;
          downvotes: number;
          id: string;
          market: string;
          stock_name: string;
          ticker: string;
          title: string;
          upvotes: number;
        };
        Insert: {
          author: string;
          content: string;
          created_at?: string;
          downvotes?: number;
          market: string;
          stock_name: string;
          ticker: string;
          title: string;
          upvotes?: number;
        };
        Update: {
          author?: string;
          content?: string;
          created_at?: string;
          downvotes?: number;
          market?: string;
          stock_name?: string;
          ticker?: string;
          title?: string;
          upvotes?: number;
        };
      };
      intelligence_briefings: {
        Row: {
          id: string;
          created_at: string;
          title: string;
          content: string;
          related_tickers: string | null;
          source_url: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          title: string;
          content: string;
          related_tickers?: string | null;
          source_url?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          title?: string;
          content?: string;
          related_tickers?: string | null;
          source_url?: string | null;
        };
      };
      model_training_log: {
        Row: {
          id: string;
          trained_at: string;
          model_version: string;
          training_sample_count: number | null;
          accuracy: number | null;
          improvement_note: string | null;
          market: string;
        };
        Insert: {
          id?: string;
          trained_at: string;
          model_version: string;
          training_sample_count?: number | null;
          accuracy?: number | null;
          improvement_note?: string | null;
          market: string;
        };
        Update: {
          id?: string;
          trained_at?: string;
          model_version?: string;
          training_sample_count?: number | null;
          accuracy?: number | null;
          improvement_note?: string | null;
          market?: string;
        };
      };
      // FIX: Add missing 'execution_log' table definition to fix TypeScript inference errors for realtime subscriptions.
      execution_log: {
        Row: {
          id: string;
          queue_id: string;
          started_at: string | null;
          completed_at: string | null;
          status: 'running' | 'done' | 'failed';
          result_summary: string | null;
          error_details: string | null;
          kpi_metrics_before: Json | null;
          kpi_metrics_after: Json | null;
        };
        Insert: {
          id?: string;
          queue_id: string;
          started_at?: string | null;
          completed_at?: string | null;
          status: 'running' | 'done' | 'failed';
          result_summary?: string | null;
          error_details?: string | null;
          kpi_metrics_before?: Json | null;
          kpi_metrics_after?: Json | null;
        };
        Update: {
          id?: string;
          queue_id?: string;
          started_at?: string | null;
          completed_at?: string | null;
          status?: 'running' | 'done' | 'failed';
          result_summary?: string | null;
          error_details?: string | null;
          kpi_metrics_before?: Json | null;
          kpi_metrics_after?: Json | null;
        };
      },
      alert_accuracy_log: {
        Row: {
          id: string;
          date: string;
          total_alerts: number | null;
          true_positives: number | null;
          false_positives: number | null;
          false_negatives: number | null;
          market: string;
        };
        Insert: {
          id?: string;
          date: string;
          total_alerts?: number | null;
          true_positives?: number | null;
          false_positives?: number | null;
          false_negatives?: number | null;
          market: string;
        };
        Update: {
          id?: string;
          date?: string;
          total_alerts?: number | null;
          true_positives?: number | null;
          false_positives?: number | null;
          false_negatives?: number | null;
          market?: string;
        };
      };
      feedback_reflection_log: {
        Row: {
          id: string;
          date: string;
          feedback_received: number | null;
          feedback_applied: number | null;
          market: string;
        };
        Insert: {
          id?: string;
          date: string;
          feedback_received?: number | null;
          feedback_applied?: number | null;
          market: string;
        };
        Update: {
          id?: string;
          date?: string;
          feedback_received?: number | null;
          feedback_applied?: number | null;
          market?: string;
        };
      };
      rule_change_log: {
        Row: {
          id: string;
          changed_at: string;
          rule_type: string | null;
          target: string | null;
          before_value: string | null;
          after_value: string | null;
          market: string;
        };
        Insert: {
          id?: string;
          changed_at: string;
          rule_type?: string | null;
          target?: string | null;
          before_value?: string | null;
          after_value?: string | null;
          market: string;
        };
        Update: {
          id?: string;
          changed_at?: string;
          rule_type?: string | null;
          target?: string | null;
          before_value?: string | null;
          after_value?: string | null;
          market?: string;
        };
      };
      alert_explanation: {
        Row: {
          id: string;
          alert_id: string;
          top_keywords: string[] | null;
          supporting_sentences: string[] | null;
          similarity_score: number | null;
          explanation: string | null;
          market: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          alert_id: string;
          top_keywords?: string[] | null;
          supporting_sentences?: string[] | null;
          similarity_score?: number | null;
          explanation?: string | null;
          market: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          alert_id?: string;
          top_keywords?: string[] | null;
          supporting_sentences?: string[] | null;
          similarity_score?: number | null;
          explanation?: string | null;
          market?: string;
          created_at?: string;
        };
      };
      ai_predictions: {
        Row: import('../types').AIPredictionsDBRow;
        Insert: Omit<import('../types').AIPredictionsDBRow, 'id' | 'created_at'>;
        Update: Partial<Omit<import('../types').AIPredictionsDBRow, 'id' | 'created_at'>>;
      };
      growth_journal: {
        Row: import('../types').GrowthJournalDBRow;
        // FIX: Directly define the Insert type for growth_journal
        Insert: {
          prediction_id: string;
          entry_data: Json;
        };
        Update: Partial<Omit<import('../types').GrowthJournalDBRow, 'id' | 'created_at'>>;
      };
      // FIX: Add missing 'system_signal_outbox' table definition to fix TypeScript error in useAIEvolution hook.
      system_signal_outbox: {
        Row: {
          id: string;
          created_at: string;
          event_type: string;
          route_key: string | null;
          payload: Json | null;
          delivery_status: 'pending' | 'done' | 'error';
          last_error: string | null;
          attempts: number;
          last_attempt_at: string | null;
          delivered_at: string | null;
          dedupe_key: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          event_type: string;
          route_key?: string | null;
          payload?: Json | null;
          delivery_status?: 'pending' | 'done' | 'error';
          last_error?: string | null;
          attempts?: number;
          dedupe_key?: string | null;
        };
        Update: {
          id?: string;
          delivery_status?: 'pending' | 'done' | 'error';
          last_error?: string | null;
          attempts?: number;
          last_attempt_at?: string | null;
          delivered_at?: string | null;
        };
      };
      // FIX: Add missing 'ai_learning_reports' table definition to fix TypeScript error in useAIEvolution hook.
      ai_learning_reports: {
        Row: {
          id: number;
          created_at: string;
          market: string;
          window_from: string;
          window_to: string;
          total_msgs: number;
          // FIX: Changed `any` to `Json` to align with types and fix realtime type inference.
          top_channels: Json;
          top_keywords: Json;
          sample_msgs: Json;
          summary: string;
        };
        Insert: {
          id?: number;
          created_at?: string;
          market: string;
          window_from: string;
          window_to: string;
          total_msgs: number;
          // FIX: Changed `any` to `Json` to align with types and fix realtime type inference.
          top_channels: Json;
          top_keywords: Json;
          sample_msgs: Json;
          summary: string;
        };
        Update: {
          id?: number;
          created_at?: string;
          market?: string;
          window_from?: string;
          window_to?: string;
          total_msgs?: number;
          top_channels?: Json;
          top_keywords?: Json;
          sample_msgs?: Json;
          summary?: string;
        };
      };
      // FIX: Add missing definition for `realtime_signals` table to resolve `never` type error in `postSignal.ts`.
      realtime_signals: {
        Row: {
          id: string;
          detected_at: string;
          source: string;
          ticker: string;
          stock_name: string | null;
          rationale: string;
          weight: number;
          meta: Json | null;
          signal_type: string;
        };
        Insert: {
          id?: string;
          detected_at?: string;
          source: string;
          ticker: string;
          stock_name: string | null;
          rationale: string;
          weight: number;
          meta?: Json | null;
          signal_type?: string;
        };
        Update: {
          // Not typically updated
        };
      };
    };
    Views: {
      ai_evolution_timeline: {
        Row: {
          event_type: string;
          content: string;
          created_at: string;
        };
      };
      collector_health: {
        Row: {
          now_utc: string;
          last_ingested_at: string;
          minutes_since_last: number | null;
        };
      };
    };
    Functions: {
      rpc_subscribe_telegram: {
        Args: {
          p_chat_id: string;
          p_user_id: string;
        };
        Returns: void;
      };
      rpc_get_portfolio_my: {
        Args: {};
        Returns: Json; // You might want to type this more specifically if the return structure is fixed.
      };
      rpc_upsert_portfolio_my: {
        Args: {
          p_positions: Json;
          p_meta: Json;
        };
        Returns: string; // uuid
      };
      get_all_briefings: {
        Args: {};
        Returns: Json;
      };
      insert_briefing: {
        Args: {
          p_title: string;
          p_content: string;
          p_related_tickers: string | null;
          p_source_url: string | null;
        };
        Returns: Json;
      };
      rpc_get_user_watchlist: {
        Args: {
          p_market: string;
        };
        Returns: Json;
      };
      rpc_upsert_user_watchlist: {
        Args: {
          p_market: string;
          p_items: Json;
        };
        Returns: void;
      };
      rpc_get_value_pivot_history: {
        Args: {
          p_market: string;
        };
        Returns: Json;
      };
      rpc_upsert_value_pivot_history: {
        Args: {
          p_market: string;
        };
        Returns: void;
      };
      rpc_get_daily_quant_metrics: {
        Args: {
          p_market: string;
        };
        Returns: Json;
      };
      rpc_populate_mock_quant_data: {
        Args: {
          p_market: string;
        };
        Returns: void;
      };
      rpc_get_brainwave_events: {
        Args: {
          p_limit?: number;
        };
        Returns: Json;
      };
      fn_approve_tuning: {
        Args: {
          p_proposal_id: string;
        };
        Returns: void;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

if (!IS_SUPABASE_ENABLED) {
  console.warn("Supabase URL or Anon Key is not set in config.ts. Community and other DB features will be disabled.");
}

const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

export const supabase = IS_SUPABASE_ENABLED
  ? createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storage: isBrowser ? localStorage : undefined,
      storageKey: 'sepa-auth',
    }
  })
  : null;


// NOTE: The automatic anonymous sign-in logic has been removed from this file.
// It is now handled centrally and robustly in the main `App.tsx` entry point
// to ensure authentication completes before the app renders, preventing race conditions.