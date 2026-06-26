import sys
import os
import asyncio
sys.path.append(os.getcwd())
from app.db.session import Base, get_engine
from app.models.academics import Professor, Class, Course, Quiz, QuizLink, QuizAttempt

async def run_migrations():
    print("Fetching engine...")
    engine = get_engine()
    print(f"Connecting to {engine.url}...")
    try:
        async with engine.begin() as conn:
            print("Running create_all...")
            await conn.run_sync(Base.metadata.create_all)
            print("Migration successful.")
    except Exception as e:
        print(f"Migration failed: {e}")

if __name__ == "__main__":
    asyncio.run(run_migrations())
