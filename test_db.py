import asyncio
from sqlalchemy import create_engine, inspect

engine = create_engine("sqlite:///backend/app/db/profease.db")
inspector = inspect(engine)
print(inspector.get_table_names())
