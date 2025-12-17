import sys
import re

def main():
    path = sys.argv[1]
    keyword = "text"
    try:
        with open(path, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
            for i, line in enumerate(lines):
                if keyword in line:
                    print(f"--- Line {i+1} ---")
                    start = max(0, i - 2)
                    end = min(len(lines), i + 3)
                    for j in range(start, end):
                        print(f"{j+1}: {lines[j].rstrip()}")
                    print("----------------")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
