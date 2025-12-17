
import os
from dotenv import load_dotenv

load_dotenv()
key = os.environ.get("SUPABASE_ANON_KEY")

with open("temp_key.txt", "w") as f:
    f.write(key)
