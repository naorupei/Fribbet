
import os

import psycopg
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def test_connection():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is missing from .env")

    with psycopg.connect(DATABASE_URL) as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT current_database(), version()")
            result = cursor.fetchone()
            print("Connected to database:", result[0])
            print("PostgreSQL version:", result[1].split(",")[0])

if __name__ == "__main__":
    test_connection()
