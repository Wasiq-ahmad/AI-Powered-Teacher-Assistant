import asyncio
from sqlalchemy import text
from app.db.session import get_engine

async def fix_columns():
    engine = get_engine()
    async with engine.begin() as conn:
        print("Checking for missing columns...")
        # Add file_path if not exists
        await conn.execute(text("ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS file_path TEXT;"))
        # Add original_filename if not exists
        await conn.execute(text("ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS original_filename TEXT;"))
        print("Database schema updated successfully.")

if __name__ == "__main__":
    asyncio.run(fix_columns())
