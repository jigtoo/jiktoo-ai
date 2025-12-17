
import os
import time
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_ANON_KEY")

if not url or not key:
    print("❌ Error: SUPABASE_URL or SUPABASE_ANON_KEY not found in .env")
    exit(1)

supabase: Client = create_client(url, key)

def inject_test_log():
    print("💉 Injecting TEST Intelligence Log...")
    
    # 1. Analyzing state
    msg_1 = {
        "action": "ANALYSIS",
        "strategy": "CONTENT_ANALYSIS",
        "ticker": "TEST-AGENCY",
        "message": "[Intel] ⏳ AI Analyzing: [Breaking] Global Semi Sector Outlook...",
        "confidence": 0,
        "created_at": datetime.utcnow().isoformat()
    }
    
    try:
        data = supabase.table("ai_thought_logs").insert(msg_1).execute()
        print("✅ Inserted 'Analyzing' log.")
    except Exception as e:
        print(f"❌ Failed to insert log 1: {e}")

    time.sleep(2)

    # 2. Result state
    msg_2 = {
        "action": "ANALYSIS",
        "strategy": "CONTENT_ANALYSIS",
        "ticker": "SOXX",
        "message": "[Intel] ✅ 분석 완료: Global Semi Sector Outlook -> BULLISH (Supply shortage confirmed)",
        "confidence": 88,
        "details": {
            "source_title": "[Breaking] Global Semi Sector Outlook",
            "analysis_result": {
                "sentiment": "BULLISH",
                "urgency": "HIGH"
            }
        },
        "created_at": datetime.utcnow().isoformat()
    }

    try:
        data = supabase.table("ai_thought_logs").insert(msg_2).execute()
        print("✅ Inserted 'Result' log.")
        print("🎉 Test Complete. Please check the 'AI Reading & Interpretation' column in your dashboard.")
    except Exception as e:
        print(f"❌ Failed to insert log 2: {e}")

if __name__ == "__main__":
    inject_test_log()
