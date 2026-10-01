import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from parent root .env or local
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/my_database")
FASTAPI_PORT = int(os.getenv("FASTAPI_PORT", "8000"))
