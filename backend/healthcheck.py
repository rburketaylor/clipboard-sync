import sys
import urllib.request

from app.core.config import ensure_leading_slash, get_env


default_host = get_env("APP_HOST", default="localhost") or "localhost"
default_port = get_env("APP_PORT", default="8000") or "8000"
default_path = ensure_leading_slash(get_env("HEALTHCHECK_PATH", default="/health") or "/health")

URL = get_env(
    "HEALTHCHECK_URL",
    default=f"http://{default_host}:{default_port}{default_path}",
)

try:
    with urllib.request.urlopen(URL, timeout=5) as resp:
        code = resp.getcode()
        sys.exit(0 if 200 <= code < 300 else 1)
except Exception:
    sys.exit(1)
