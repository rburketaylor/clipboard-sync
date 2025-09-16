import sys
import urllib.request

URL = "http://localhost:8000/health"

try:
    with urllib.request.urlopen(URL, timeout=5) as resp:
        code = resp.getcode()
        sys.exit(0 if 200 <= code < 300 else 1)
except Exception:
    sys.exit(1)

