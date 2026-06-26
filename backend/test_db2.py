import asyncio, os
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv
load_dotenv()
async def test():
    eng = create_async_engine(os.environ["DATABASE_URL"])
    async with eng.begin() as conn:
        import sqlalchemy
        await conn.run_sync(lambda sync_conn: print(sqlalchemy.inspect(sync_conn).get_columns('sections')))
asyncio.run(test())
