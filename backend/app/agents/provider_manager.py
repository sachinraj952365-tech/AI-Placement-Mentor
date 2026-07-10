import os
import logging
import asyncio
import aiohttp
from dotenv import load_dotenv, dotenv_values

logger = logging.getLogger(__name__)
load_dotenv(override=True)

# Centralized default configurations
DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant"
DEFAULT_OPENROUTER_MODEL = "nousresearch/hermes-3-llama-3.1-405b:free"
DEFAULT_OLLAMA_MODEL = "qwen2.5:7b"
DEFAULT_GEMINI_MODEL = "gemini-2.0-flash"

# Agent-specific system prompts (mirrors Google ADK instructions)
SYSTEM_PROMPTS = {
    "resume": (
        "You are the Resume Review Agent of an AI Placement Mentor. "
        "Analyze the provided resume text. Calculate an ATS score (out of 100). "
        "Identify missing skills, grammatical errors, and formatting flaws. "
        "Provide actionable, numbered improvement suggestions."
    ),
    "roadmap": (
        "You are the Placement Roadmap Agent of an AI Placement Mentor. "
        "Generate a highly customized study roadmap with daily tasks, "
        "weekly goals, and monthly milestones based on the student's profile, "
        "target company, and dream role."
    ),
    "dsa": (
        "You are the DSA Mentor Agent of an AI Placement Mentor. "
        "Guide the student on data structures and algorithms — Arrays, Strings, "
        "Linked Lists, Trees, Graphs, and Dynamic Programming. "
        "Explain concepts clearly and recommend practice problems."
    ),
    "mock": (
        "You are the Mock Interview Agent of an AI Placement Mentor. "
        "Conduct a technical mock interview by asking one question at a time "
        "and evaluating answers with detailed feedback and a score."
    ),
    "hr": (
        "You are the HR Interview Agent of an AI Placement Mentor. "
        "Conduct an HR and behavioral mock interview using the STAR framework."
    ),
    "progress": (
        "You are the Progress Analytics Agent of an AI Placement Mentor. "
        "Evaluate the student's current progress metrics (streak, task completion, "
        "mock interview scores) and provide an encouraging, data-driven analysis."
    ),
    "motivation": (
        "You are the Motivation Agent of an AI Placement Mentor. "
        "Generate an encouraging, powerful short quote or pep talk for the student "
        "to keep them motivated in their placement journey."
    ),
    "resource": (
        "You are the Resource Recommendation Agent of an AI Placement Mentor. "
        "Suggest top-rated books, YouTube channels, GitHub repos, and websites "
        "for the student's target domain and skill gaps."
    ),
    "project": (
        "You are the Project Recommendation Agent of an AI Placement Mentor. "
        "Suggest detailed GitHub-quality project ideas matching the student's "
        "skills, domain choice (web, ML, mobile), and market trends."
    ),
    "coordinator": (
        "You are the AI Placement Mentor, an expert career coach and coordinator. "
        "Help students prepare for campus and off-campus placements by answering "
        "questions on DSA, system design, resume, mock interviews, roadmaps, "
        "and career guidance. Be professional, concise, and encouraging."
    ),
}

def validate_env():
    """Validate that environment variables for the selected AI Provider are loaded correctly."""
    load_dotenv(override=True)
    provider = os.getenv("AI_PROVIDER", "gemini").lower()
    
    # Clean output formatting
    logger.info("========================================")
    logger.info("  AI PLACEMENT MENTOR STARTUP CHECK     ")
    logger.info("========================================")
    logger.info(f"Active AI Provider: {provider.upper()}")
    
    if provider == "groq":
        key = os.getenv("GROQ_API_KEY", "")
        model = os.getenv("GROQ_MODEL", DEFAULT_GROQ_MODEL)
        logger.info(f"Active Model      : {model}")
        if not key or key.startswith("YOUR_"):
            raise ValueError(
                "\n[CONFIG ERROR]: 'GROQ_API_KEY' is missing or not set in your .env file.\n"
                "Please get an API key from https://console.groq.com and paste it in .env."
            )
    elif provider == "gemini":
        key = os.getenv("GEMINI_API_KEY", "")
        model = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL)
        logger.info(f"Active Model      : {model}")
        if not key or key.startswith("YOUR_"):
            raise ValueError(
                "\n[CONFIG ERROR]: 'GEMINI_API_KEY' is missing or not set in your .env file.\n"
                "Please get an API key from https://aistudio.google.com and paste it in .env."
            )
    elif provider == "openrouter":
        key = os.getenv("OPENROUTER_API_KEY", "")
        model = os.getenv("OPENROUTER_MODEL", DEFAULT_OPENROUTER_MODEL)
        logger.info(f"Active Model      : {model}")
        if not key or key.startswith("YOUR_"):
            raise ValueError(
                "\n[CONFIG ERROR]: 'OPENROUTER_API_KEY' is missing or not set in your .env file.\n"
                "Please get an API key from https://openrouter.ai and paste it in .env."
            )
    elif provider == "ollama":
        url = os.getenv("OLLAMA_BASE_URL", "")
        model = os.getenv("OLLAMA_MODEL", DEFAULT_OLLAMA_MODEL)
        logger.info(f"Active Model      : {model}")
        if not url:
            raise ValueError(
                "\n[CONFIG ERROR]: 'OLLAMA_BASE_URL' is missing in your .env file.\n"
                "Please set OLLAMA_BASE_URL=http://localhost:11434 in .env."
            )
    else:
        logger.warning(f"Unknown AI_PROVIDER '{provider}'. Defaulting to Mock response mode.")
    logger.info("========================================\n")


async def make_post_request(url: str, headers: dict, payload: dict, provider_name: str) -> dict:
    """Perform a POST request with timeout and transient retry logic (429, 502, 503, 504)."""
    timeout = aiohttp.ClientTimeout(total=15)
    retries = 3
    delay = 1.0

    for attempt in range(retries):
        try:
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(url, headers=headers, json=payload) as response:
                    status = response.status
                    if status == 200:
                        return {"status": "success", "data": await response.json()}
                    
                    err_text = await response.text()
                    logger.warning(f"{provider_name} returned status {status} (Attempt {attempt+1}/{retries}): {err_text}")

                    # Fail fast on client / auth errors
                    if status in (401, 403):
                        return {"status": "auth_error", "message": f"{provider_name} Authentication Error. Please verify your API Key."}
                    if status == 404:
                        return {"status": "model_error", "message": f"Model or Endpoint not found on {provider_name}."}

                    # Retry only on transient network / rate limit errors
                    if status in (429, 502, 503, 504):
                        if attempt < retries - 1:
                            sleep_time = delay * (2 ** attempt)
                            logger.info(f"Retrying request to {provider_name} in {sleep_time}s due to status {status}...")
                            await asyncio.sleep(sleep_time)
                            continue
                        return {"status": "rate_limit_error" if status == 429 else "server_error", "message": f"{provider_name} is currently busy (HTTP {status})."}
                    
                    return {"status": "error", "message": f"{provider_name} responded with status code {status}."}
        
        except asyncio.TimeoutError:
            logger.warning(f"{provider_name} request timed out (Attempt {attempt+1}/{retries})")
            if attempt < retries - 1:
                await asyncio.sleep(delay * (2 ** attempt))
                continue
            return {"status": "timeout_error", "message": f"Connection to {provider_name} timed out after 15 seconds."}
        
        except aiohttp.ClientConnectorError as e:
            logger.warning(f"{provider_name} connection error (Attempt {attempt+1}/{retries}): {e}")
            if attempt < retries - 1:
                await asyncio.sleep(delay * (2 ** attempt))
                continue
            return {"status": "connection_error", "message": f"Could not connect to {provider_name}. Please check if the service is online."}
        
        except Exception as e:
            logger.error(f"{provider_name} unexpected exception: {e}", exc_info=True)
            return {"status": "unexpected_error", "message": f"An unexpected error occurred: {str(e)}"}

    return {"status": "error", "message": "Failed after maximum retry attempts."}


async def ask_groq(agent_name: str, message: str, system_prompt: str) -> str:
    """Route queries to Groq Chat Completions endpoint."""
    env_dict = dotenv_values(".env")
    api_key = env_dict.get("GROQ_API_KEY", "").strip() or os.getenv("GROQ_API_KEY", "").strip()
    active_model = env_dict.get("GROQ_MODEL", "").strip() or os.getenv("GROQ_MODEL", DEFAULT_GROQ_MODEL)

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": active_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": message},
        ],
        "temperature": 0.7,
        "max_tokens": 2048,
    }

    res = await make_post_request("https://api.groq.com/openai/v1/chat/completions", headers, payload, "Groq")
    if res["status"] == "success":
        try:
            return res["data"]["choices"][0]["message"]["content"]
        except Exception:
            return "Groq Error: Failed to parse model output."
    return f"AI Placement Mentor: We are temporarily unable to process this request via Groq. (Details: {res['message']})"


async def ask_openrouter(agent_name: str, message: str, system_prompt: str) -> str:
    """Route queries to OpenRouter Chat Completions endpoint with model fallback cascade."""
    env_dict = dotenv_values(".env")
    api_key = env_dict.get("OPENROUTER_API_KEY", "").strip() or os.getenv("OPENROUTER_API_KEY", "").strip()
    active_model = env_dict.get("OPENROUTER_MODEL", "").strip() or os.getenv("OPENROUTER_MODEL", DEFAULT_OPENROUTER_MODEL)

    headers = {
        "Authorization": f"Bearer {api_key}",
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "AI Placement Mentor",
        "Content-Type": "application/json"
    }

    fallback_models = [
        active_model,
        "nousresearch/hermes-3-llama-3.1-405b:free",
        "mistralai/mistral-7b-instruct:free",
        "microsoft/phi-3-mini-128k-instruct:free",
        "openchat/openchat-7b:free",
        "gryphe/mythomist-7b:free"
    ]
    
    seen = set()
    models_to_try = [m for m in fallback_models if m and not (m in seen or seen.add(m))]

    last_error = "No active models found."
    for model in models_to_try:
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message}
            ]
        }
        res = await make_post_request("https://openrouter.ai/api/v1/chat/completions", headers, payload, f"OpenRouter ({model})")
        if res["status"] == "success":
            try:
                return res["data"]["choices"][0]["message"]["content"]
            except Exception:
                continue
        
        last_error = res["message"]
        if res["status"] == "auth_error":
            break

    return f"AI Placement Mentor: All OpenRouter routes are currently busy. (Details: {last_error})"


async def ask_ollama(agent_name: str, message: str, system_prompt: str) -> str:
    """Route queries to locally running Ollama instance."""
    env_dict = dotenv_values(".env")
    ollama_url = env_dict.get("OLLAMA_BASE_URL", "").strip() or os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    ollama_model = env_dict.get("OLLAMA_MODEL", "").strip() or os.getenv("OLLAMA_MODEL", DEFAULT_OLLAMA_MODEL)

    url = f"{ollama_url.rstrip('/')}/api/generate"
    headers = {"Content-Type": "application/json"}
    payload = {
        "model": ollama_model,
        "prompt": f"[System Instructions: {system_prompt}]\n\nUser Question: {message}",
        "stream": False
    }

    res = await make_post_request(url, headers, payload, "Ollama")
    if res["status"] == "success":
        try:
            return res["data"]["response"]
        except Exception:
            return "Ollama Error: Failed to parse model output."
    return f"AI Placement Mentor: Ollama is offline or loading. Please ensure the Ollama app is running locally. (Details: {res['message']})"


async def call_provider(
    agent_name: str,
    message: str,
    user_id: str = "default_user",
    session_id: str = "default_session",
    profile_context: dict = None,
) -> str:
    """Unified entrypoint for all AI providers. Translates requests dynamically."""
    env_dict = dotenv_values(".env")
    provider = env_dict.get("AI_PROVIDER", "").strip().lower() or os.getenv("AI_PROVIDER", "gemini").lower()
    
    system_prompt = SYSTEM_PROMPTS.get(
        agent_name,
        f"You are the {agent_name} agent of an AI Placement Mentor. Answer professionally."
    )

    if provider == "groq":
        return await ask_groq(agent_name, message, system_prompt)

    elif provider == "openrouter":
        return await ask_openrouter(agent_name, message, system_prompt)

    elif provider == "ollama":
        return await ask_ollama(agent_name, message, system_prompt)

    elif provider == "gemini":
        from backend.app.agents.agents import is_api_key_valid, run_adk_agent, get_mock_agent_response
        if is_api_key_valid():
            try:
                # Wrap ADK execution with timeout protection
                return await asyncio.wait_for(
                    run_adk_agent(agent_name, message, user_id, session_id),
                    timeout=25.0
                )
            except asyncio.TimeoutError:
                logger.error("Gemini API ADK request timed out after 25 seconds.")
                return "AI Placement Mentor: Gemini response timed out. Please try again."
            except Exception as e:
                logger.error(f"Gemini API ADK Error: {e}", exc_info=True)
                return f"AI Placement Mentor: Gemini API returned an error. (Details: {str(e)})"
        else:
            logger.info(f"GEMINI_API_KEY not configured. Falling back to Mock Engine for agent '{agent_name}'.")
            return get_mock_agent_response(agent_name, message, profile_context)
            
    else:
        logger.warning(f"Unknown AI_PROVIDER '{provider}' configured. Defaulting to Mock responses.")
        from backend.app.agents.agents import get_mock_agent_response
        return get_mock_agent_response(agent_name, message, profile_context)
