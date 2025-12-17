import re
import os

target_files = [
    'services/AutonomousScheduler.ts',
    'services/TelegramIntelligenceService.ts',
    'services/IntelligenceBriefingProcessor.ts'
]

def analyze_file(path):
    print(f"--- Analyzing {path} ---")
    try:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
    except:
        try:
             with open(path, 'r', encoding='latin-1') as f:
                content = f.read()
        except Exception as e:
            print(f"Failed to read: {e}")
            return

    # Find setInterval(..., number)
    matches = re.finditer(r'(setInterval|setTimeout)\s*\(([^,]+),\s*(\d+)\)', content)
    for m in matches:
        print(f"Line found: {m.group(0)}")

    # Check for "sleep"
    if 'sleep' in content:
         print("Found 'sleep' keyword usage")

if __name__ == "__main__":
    for p in target_files:
        if os.path.exists(p):
            analyze_file(p)
        else:
            print(f"File not found: {p}")
