import sys
import os

def read_file(path):
    encodings = ['utf-8', 'euc-kr', 'cp949', 'utf-16']
    for enc in encodings:
        try:
            with open(path, 'r', encoding=enc) as f:
                content = f.read()
                print(f"--- Successfully read {path} with {enc} ---")
                print(content[:2000]) # First 2000 chars
                return
        except Exception as e:
            continue
    print(f"Failed to read {path} with any known encoding.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python debug_cat.py <file_path>")
    else:
        read_file(sys.argv[1])
