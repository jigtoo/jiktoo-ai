
import requests
import os
from supabase import create_client
from dotenv import load_dotenv
from bs4 import BeautifulSoup
import datetime

load_dotenv()

supabase_url = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_ANON_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY")

if not supabase_url or not supabase_key:
    print("❌ Error: Supabase credentials missing.")
    exit(1)

sb = create_client(supabase_url, supabase_key)

TARGET_URL = "http://spot.rassiro.com/rd/20251211/1000323"
ORIGINAL_MSG = "[rassiro_channel] [리포트 브리핑]에스엠씨지, '유리용기는 시간을 들여야...' Not Rated - 키움증권"

def fetch_url_content(url):
    try:
        print(f"🌍 Fetching URL: {url}...")
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Try to find main content (heuristics for rassiro/news sites)
        text = ""
        article = soup.find('div', class_='news_body') or soup.find('div', class_='article_view') or soup.find('body')
        if article:
            text = article.get_text(separator=' ', strip=True)
        else:
            text = soup.get_text(separator=' ', strip=True)
            
        return text[:1000] # Limit to 1000 chars
    except Exception as e:
        print(f"⚠️ Failed to fetch URL: {e}")
        return "(Content fetch failed - using simulation)"

def simulate_pipeline():
    # 1. Fetch
    content = fetch_url_content(TARGET_URL)
    
    if "Content fetch failed" in content:
        # Fallback simulation if URL is dead/unreachable
        content = "에스엠씨지(SMCG)에 대해 키움증권은 유리용기 산업의 특성상 시간을 들여야 가치가 드러난다고 평가했다. 투자의견은 Not Rated, 목표가는 제시하지 않았다. 동사는 화장품 유리용기 제조사로..."

    print(f"📝 Extracted Content: {content[:50]}...")

    # 2. Construct Enhanced Message (Simulating what a Crawler would do)
    full_message = f"{ORIGINAL_MSG}\n\n[Auto-Crawled Summary]:\n{content}\n\nOriginal Link: {TARGET_URL}"

    # 3. Insert into Supabase
    print("🚀 Inserting into 'telegram_messages'...")
    data = {
        "channel": "rassiro_channel",
        "message": full_message,
        "created_at": datetime.datetime.utcnow().isoformat()
    }
    
    try:
        res = sb.table("telegram_messages").insert(data).execute()
        print("✅ Message Inserted Successfully.")
        print("💡 The Dashboard should now pick this up, and since it is long (>100 chars), the AI will analyze it.")
    except Exception as e:
        print(f"❌ Insert Failed: {e}")

if __name__ == "__main__":
    simulate_pipeline()
