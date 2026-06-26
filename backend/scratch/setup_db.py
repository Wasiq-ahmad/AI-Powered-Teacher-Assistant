import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

# Connect to the default 'postgres' database as superuser
SUPERUSER_URL = "postgresql+asyncpg://postgres:awais%401212.@127.0.0.1:5432/postgres"

async def setup():
    engine = create_async_engine(SUPERUSER_URL, isolation_level="AUTOCOMMIT")
    async with engine.connect() as conn:
        print("Checking/Creating/Updating quiz_user...")
        try:
            # Try to create, if exists, update password
            await conn.execute(text("CREATE USER quiz_user WITH PASSWORD 'awais@1212.';"))
            print("User quiz_user created.")
        except Exception as e:
            msg = str(e).lower()
            if "already exists" in msg:
                print("User quiz_user already exists. Updating password...")
                await conn.execute(text("ALTER USER quiz_user WITH PASSWORD 'awais@1212.';"))
                print("Password for quiz_user updated.")
            else:
                print(f"Error handling user: {e}")

        print("Checking/Creating database teacher_assistant...")
        try:
            await conn.execute(text("CREATE DATABASE teacher_assistant;"))
            print("Database teacher_assistant created.")
        except Exception as e:
            msg = str(e).lower()
            if "already exists" in msg:
                print("Database teacher_assistant already exists.")
            else:
                print(f"Error creating database: {e}")

    # Now connect to teacher_assistant as superuser to grant schema perms and drop tables
    APP_DB_URL = "postgresql+asyncpg://postgres:awais%401212.@127.0.0.1:5432/teacher_assistant"
    engine_app = create_async_engine(APP_DB_URL, isolation_level="AUTOCOMMIT")
    async with engine_app.connect() as conn:
        print("Granting schema-level privileges in teacher_assistant...")
        try:
            await conn.execute(text("GRANT ALL ON SCHEMA public TO quiz_user;"))
            await conn.execute(text("GRANT ALL ON SCHEMA public TO public;"))
            print("Schema privileges granted.")
        except Exception as e:
            print(f"Error granting schema privileges: {e}")

        print("Dropping existing tables for 'fresh migration'...")
        try:
            result = await conn.execute(text("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public';"))
            tables = [row[0] for row in result]
            for table in tables:
                print(f"Dropping table {table}...")
                await conn.execute(text(f'DROP TABLE IF EXISTS "{table}" CASCADE;'))
        except Exception as e:
            print(f"Error resetting schema: {e}")
    
    print("Setup complete.")

if __name__ == "__main__":
    asyncio.run(setup())
