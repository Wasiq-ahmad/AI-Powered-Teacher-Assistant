from __future__ import annotations

import os
from dotenv import load_dotenv
from openai import AsyncOpenAI, NOT_GIVEN

load_dotenv()

def _detect_base_url_and_model_from_key(api_key: str) -> tuple[str, str]:
    if api_key.startswith("sk-or-"):
        return "https://openrouter.ai/api/v1", "gpt-4o-mini"
    return "https://api.openai.com/v1", "gpt-4o-mini"

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY") or os.getenv("OpenAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("No OPENAI_API_KEY found in environment")

detected_base_url, detected_model = _detect_base_url_and_model_from_key(OPENAI_API_KEY)
BASE_URL = os.getenv("BASE_URL") or detected_base_url
MODEL_NAME = os.getenv("MODEL_NAME") or detected_model

# OpenRouter recommends these headers
extra_headers = {}
if "openrouter" in BASE_URL.lower():
    extra_headers = {
        "HTTP-Referer": "https://localhost:5173",
        "X-Title": "Teacher Assistant", 
    }

client = AsyncOpenAI(
    api_key=OPENAI_API_KEY, 
    base_url=BASE_URL,
    default_headers=extra_headers
)

import re
import json

async def get_agent_response(query: str) -> str:
    """
    Calls the AI model directly using a robust system prompt.
    This bypasses the 'Agent' framework to ensure stability with OpenRouter models.
    """
    try:
        response = await client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {
                    "role": "system", 
                    "content": (
                        "You are an expert Teacher Assistant. "
                        "You generate high-quality university-level course content and quizzes. "
                        "STAY CONCISE. Avoid fluff. Return ONLY the requested content."
                    )
                },
                {"role": "user", "content": query}
            ],
            max_tokens=3000,
            temperature=0.7
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"[AI ERROR] {e}")
        return f"Error: {e}"

def clean_json_response(text: str) -> str:
    """
    Extracts the JSON array or object from a string that might contain
    markdown backticks (```json ... ```) or other conversational noise.
    """
    # Try to find content between ```json and ```
    match = re.search(r"```json\s*([\s\S]*?)\s*```", text)
    if match:
        return match.group(1).strip()
    
    # Try to find content between ``` and ```
    match = re.search(r"```\s*([\s\S]*?)\s*```", text)
    if match:
        return match.group(1).strip()
    
    # If no backticks, find the first '[' or '{' and last ']' or '}'
    start_bracket = text.find('[')
    if start_bracket == -1:
        start_bracket = text.find('{')
        
    end_bracket = text.rfind(']')
    if end_bracket == -1:
        end_bracket = text.rfind('}')
        
    if start_bracket != -1 and end_bracket != -1:
        return text[start_bracket:end_bracket+1].strip()
        
    return text.strip()

# Utility prompt builders (previosuly tools)
def get_quiz_prompt(weeks: str, content: str) -> str:
    return f""" Generate **10 multiple-choice questions** from the following course content: 
    Weeks: {weeks}
    CONTENT:{content}
    RULES:
    1. Each question must have 3–5 realistic answer choices.
    2. The "correct" answer MUST be specified clearly.
    3. Return the results as a STRICT JSON array of objects:
        Example : [ "text": "Question?",
        "options": ["Opt1","Opt2","Opt3","Opt4"],
        "correct": "Opt2"]
    4. Do NOT include any explanations or conversational text.
    """.strip()

def get_course_plan_prompt(week: int, outline: str, credit_hours: str) -> str:
    try:
        theory, lab = map(int, credit_hours.split("-"))
    except Exception:
        theory, lab = 3, 0

    return f""" Generate content for **Week {week}** of a 16-week semester course.

    **Course Outline:** {outline}
    **Credit Hours:** {credit_hours} ({theory} theory, {lab} lab)

    Each lecture should be **≈150 words** long, concise and clear.
    Content should be concise, clear, and focused (no fluff or extra explanation).
    Weekly distribution must follow credit hours format:
        * Format: (Lecture Hours + Lab Hours)
        * Example: 3-1 → 3 lectures and 1 lab per week
        * Example: 2-0 → 2 lectures and no lab
        * Example: 2-1 → 2 lectures and 1 lab
    Formatting:
    - Use Markdown: ## Lecture Title, ### Learning Objectives, ### Concepts.
    - NO fluff. NO talk. Just the content.
    """.strip()

async def analyze_submission(content: str) -> dict:
    """
    Analyzes student submission for AI generation and quality.
    """
    prompt = f"""
Analyze the following student assignment for AI generation and quality.

Assignment Content:
\"\"\"
{content}
\"\"\"

Return a STRICT JSON object:
{{
  "ai_score": (Integer 0-100, where 100 means definitely AI),
  "label": ("AI" or "Human" or "Mixed"),
  "feedback": "A short 1-2 sentence explanation of why it was flagged or why it looks authentic."
}}
""".strip()
    
    try:
        raw = await get_agent_response(prompt)
        # Attempt to clean and parse the JSON
        from app.services.teacher_agent import clean_json_response
        json_str = clean_json_response(raw)
        return json.loads(json_str)
    except Exception as e:
        print(f"[ANALYSIS ERROR] {e}")
        return {
            "ai_score": 0,
            "label": "Unknown",
            "feedback": "Analysis failed due to technical error."
        }
