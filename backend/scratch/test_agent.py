import asyncio
from app.services.teacher_agent import get_agent_response

async def test():
    try:
        print("Testing agent...")
        resp = await get_agent_response("Hello, are you there?")
        print(f"Response: {resp}")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
