
import os
import requests
import json
import time
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_ANON_KEY")

if not SUPABASE_KEY:
    # Fallback to reading temp file if env not set
    try:
        with open("temp_key.txt", "r") as f:
            SUPABASE_KEY = f.read().strip()
    except:
        pass

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

def check_recent_thoughts():
    print(f"Checking recently created thoughts...")
    
    # Select thoughts created in the last 2 minutes
    url = f"{SUPABASE_URL}/rest/v1/ai_thought_logs?select=*&order=created_at.desc&limit=5"
    
    r = requests.get(url, headers=HEADERS)
    if r.status_code != 200:
        print(f"❌ Error: {r.status_code} {r.text}")
        return

    data = r.json()
    print(f"Found {len(data)} recent thoughts.")
    
    found_analysis = False
    for thought in data:
        print(f"[{thought.get('created_at')}] {thought.get('action')} - {thought.get('message')}")
        if thought.get('strategy') == 'CONTENT_ANALYSIS':
            found_analysis = True
            print("   ✅ Start of Telegram Analysis logic confirmed!")

    if not found_analysis:
        print("⚠️ No 'CONTENT_ANALYSIS' strategy thoughts found yet. Waiting...")

if __name__ == "__main__":
    for i in range(3):
        check_recent_thoughts()
        if i < 2:
            print("Waiting 5s...")
            time.sleep(5)
