import sys
import os

# Add parent directory to path so we can run this script directly
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

from backend.app.database.db import init_db

if __name__ == "__main__":
    print("Initializing database...")
    init_db()
    print("Database tables initialized successfully!")
