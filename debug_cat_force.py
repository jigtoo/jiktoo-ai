import sys
if __name__ == "__main__":
    path = sys.argv[1]
    try:
        with open(path, 'rb') as f:
            content = f.read()
            print(content.decode('utf-8', errors='ignore'))
    except Exception as e:
        print(f"Error: {e}")
