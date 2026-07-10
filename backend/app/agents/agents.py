import aiohttp
from dotenv import load_dotenv
import os
import json
import logging
from google.adk.agents import Agent
from google.adk.runners import InMemoryRunner
from google.genai import types

logger = logging.getLogger(__name__)
load_dotenv(override=True)

AI_PROVIDER = os.getenv("AI_PROVIDER", "gemini").lower()

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")


OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3-8b-instruct:free")

# ── Groq Config ───────────────────────────────────────────────────────────────
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama3-8b-8192")

APP_NAME = "AIPlacementMentor"

# ── API key check ──────────────────────────────────────────────────────────────
def is_api_key_valid():
    key = os.getenv("GEMINI_API_KEY", "")
    return len(key) > 10 and not key.startswith("YOUR_")


# ── Agent factory (cached per-process) ─────────────────────────────────────────
_agents_cache: dict | None = None


def get_agents() -> dict:
    """Return a dict of named agents.  Created once and cached."""
    global _agents_cache
    if _agents_cache is not None:
        return _agents_cache

    model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    # 1. Student Profile Agent
    profile_agent = Agent(
        name="profile_agent",
        model=model_name,
        description="Handles student profile collection and updates (degree, branch, semester, skills, languages, target company, dream role).",
        instruction=(
            "You are the Student Profile Agent. Your goal is to collect and update the student's profile information "
            "(degree, branch, semester, skills, languages, target company, dream role). "
            "Suggest profile updates and format them as JSON when appropriate."
        ),
    )

    # 2. Resume Review Agent
    resume_agent = Agent(
        name="resume_agent",
        model=model_name,
        description="Analyzes resumes, calculates ATS scores, and provides actionable improvement suggestions.",
        instruction=(
            "You are the Resume Review Agent. Analyze the provided resume text. Calculate an ATS score (out of 100). "
            "Identify missing skills, grammatical errors, and formatting flaws. Provide actionable improvements."
        ),
    )

    # 3. Placement Roadmap Agent
    roadmap_agent = Agent(
        name="roadmap_agent",
        model=model_name,
        description="Generates customized placement preparation roadmaps with daily tasks, weekly goals, and monthly milestones.",
        instruction=(
            "You are the Placement Roadmap Agent. Generate a highly customized study roadmap with daily tasks, "
            "weekly goals, and monthly milestones based on the student's profile, target company, and dream role."
        ),
    )

    # 4. DSA Mentor Agent
    dsa_agent = Agent(
        name="dsa_agent",
        model=model_name,
        description="Guides students on data structures and algorithms (Arrays, Trees, Graphs, DP) and recommends practice problems.",
        instruction=(
            "You are the DSA Mentor Agent. Guide the student on data structures and algorithms. "
            "Explain concepts (Arrays, Strings, Linked Lists, Trees, Graphs, DP) and recommend practice problems."
        ),
    )

    # 5. Project Recommendation Agent
    project_agent = Agent(
        name="project_agent",
        model=model_name,
        description="Suggests detailed GitHub-quality project ideas matching the student's skills and domain choice.",
        instruction=(
            "You are the Project Recommendation Agent. Suggest detailed GitHub-quality project ideas "
            "matching the student's skills, domain choice (web, ml, mobile), and market trends."
        ),
    )

    # 6. Mock Interview Agent
    mock_agent = Agent(
        name="mock_agent",
        model=model_name,
        description="Conducts technical mock interviews by asking questions one-by-one and evaluating answers.",
        instruction=(
            "You are the Mock Technical Interview Agent. Conduct a technical mock interview by asking questions "
            "one-by-one. Evaluate the user's answer, provide feedback, and transition to the next question."
        ),
    )

    # 7. HR Interview Agent
    hr_agent = Agent(
        name="hr_agent",
        model=model_name,
        description="Conducts HR behavioral mock interviews and evaluates communication, confidence, and answer structuring.",
        instruction=(
            "You are the HR Interview Agent. Conduct an HR mock interview. Evaluate communication skills, "
            "confidence, and answer structuring. Offer constructive suggestions for behavioral questions."
        ),
    )

    # 8. Progress Tracking Agent
    progress_agent = Agent(
        name="progress_agent",
        model=model_name,
        description="Analyzes the student's task completion history and interview scores to generate progress summaries.",
        instruction=(
            "You are the Progress Tracking Agent. Analyze the student's task completion history and "
            "interview scores. Generate weekly summaries and recommendations."
        ),
    )

    # 9. Learning Resource Agent
    resource_agent = Agent(
        name="resource_agent",
        model=model_name,
        description="Recommends online tutorials, YouTube videos, documentation, free courses, and books for technical topics.",
        instruction=(
            "You are the Learning Resource Agent. Recommend specific online tutorials, YouTube videos, "
            "official documentation, free courses, and books for technical topics."
        ),
    )

    # 10. Motivation Agent
    motivation_agent = Agent(
        name="motivation_agent",
        model=model_name,
        description="Provides daily motivation, encourages study streaks, and awards milestones or badges.",
        instruction=(
            "You are the Motivation Agent. Provide daily motivation, encourage the student's study streak, "
            "and award milestones or badges."
        ),
    )

    # 11. Coordinator Agent (Root) — delegates to sub_agents
    coordinator_agent = Agent(
        name="coordinator_agent",
        model=model_name,
        description="Root coordinator that routes student queries to the appropriate specialist sub-agent.",
        instruction=(
            "You are the Coordinator Agent for the AI Placement Mentor. Route student queries "
            "to the appropriate sub-agent (profile_agent, resume_agent, roadmap_agent, dsa_agent, "
            "project_agent, mock_agent, hr_agent, progress_agent, resource_agent, motivation_agent). "
            "If the request is general, answer it yourself. Delegate specialized tasks to sub-agents."
        ),
        sub_agents=[
            profile_agent,
            resume_agent,
            roadmap_agent,
            dsa_agent,
            project_agent,
            mock_agent,
            hr_agent,
            progress_agent,
            resource_agent,
            motivation_agent,
        ],
    )

    _agents_cache = {
        "coordinator": coordinator_agent,
        "profile": profile_agent,
        "resume": resume_agent,
        "roadmap": roadmap_agent,
        "dsa": dsa_agent,
        "project": project_agent,
        "mock": mock_agent,
        "hr": hr_agent,
        "progress": progress_agent,
        "resource": resource_agent,
        "motivation": motivation_agent,
    }
    return _agents_cache


# ── Runner cache (one runner per agent so sessions are preserved) ──────────────
_runners: dict[str, InMemoryRunner] = {}


def _get_runner(agent_name: str) -> InMemoryRunner:
    """Return (or create) an InMemoryRunner for the given agent name."""
    if agent_name not in _runners:
        all_agents = get_agents()
        target_agent = all_agents.get(agent_name, all_agents["coordinator"])
        _runners[agent_name] = InMemoryRunner(agent=target_agent, app_name=APP_NAME)
    return _runners[agent_name]


# ── Execute an ADK agent ───────────────────────────────────────────────────────
async def run_adk_agent(agent_name: str, message: str, user_id: str, session_id: str) -> str:
    runner = _get_runner(agent_name)

    # Ensure session exists on the runner's own session service
    existing = await runner.session_service.get_session(
        app_name=APP_NAME, user_id=user_id, session_id=session_id
    )
    if existing is None:
        await runner.session_service.create_session(
            app_name=APP_NAME, user_id=user_id, session_id=session_id
        )

    content = types.Content(
        role="user",
        parts=[types.Part.from_text(text=message)],
    )

    response_text = ""
    try:
        async for event in runner.run_async(
            user_id=user_id,
            session_id=session_id,
            new_message=content,
        ):
            # Collect text from the final model response events authored by the agent
            if (
                event.content
                and event.content.parts
                and not event.get_function_calls()
                and not event.get_function_responses()
            ):
                for part in event.content.parts:
                    if part.text:
                        response_text += part.text

        return response_text.strip() or "No response received from agent."
    except Exception as e:
        logger.error(f"Error running real ADK agent '{agent_name}': {e}", exc_info=True)
        return f"Agent Error: {str(e)}"
# ── Provider Manager Delegation ───────────────────────────────────────────────
from backend.app.agents import provider_manager


# ── Mock Response Engine (for when GEMINI_API_KEY is not configured) ───────────
def get_mock_agent_response(agent_name: str, message: str, profile_context: dict = None) -> str:
    msg = message.lower()
    profile = profile_context or {}
    name = profile.get("name", "Student")
    role = profile.get("dream_role", "Software Engineer")
    company = profile.get("target_company", "Dream Company")
    skills = profile.get("skills", "Python, SQL, HTML/CSS")

    if agent_name == "profile":
        return (
            f"### Student Profile Updated successfully!\n\n"
            f"Hello **{name}**, I have recorded your academic details:\n"
            f"- **Degree & Branch**: {profile.get('degree', 'B.Tech')} in {profile.get('branch', 'Computer Science')}\n"
            f"- **Semester**: {profile.get('semester', '7th Semester')}\n"
            f"- **Target Goal**: **{role}** at **{company}**\n"
            f"- **Key Skills**: {skills}\n\n"
            f"Is there anything specific you would like to work on first? You can ask me to review your resume, recommend DSA topics, or start a mock interview!"
        )

    elif agent_name == "resume":
        return (
            f"### Resume Analysis Report for {name}\n\n"
            f"**ATS Compatibility Score: 78/100**\n\n"
            f"#### 🔍 Key Findings:\n"
            f"- **Formatting**: Structure is clean, but avoid using double columns. ATS parsers read left-to-right.\n"
            f"- **Missing Skills for {role}**: System Design, Docker, FastAPI, unit testing.\n"
            f"- **Action Verb Usage**: Strong use of verbs like 'Developed' and 'Optimized', but could improve metrics.\n\n"
            f"#### 💡 Recommendations:\n"
            f"1. **Add Metrics**: Change *'Built a web app using FastAPI'* to *'Engineered a REST API using FastAPI that handled 10k+ requests/day and reduced latency by 15%'*.\n"
            f"2. **Inject Missing Keywords**: Add a section for 'DevOps/Tools' and list Docker, Git, CI/CD.\n"
            f"3. **Grammar & Tone**: Overall excellent, but verify tense consistency (use past tense for completed roles)."
        )

    elif agent_name == "roadmap":
        return (
            f"### Personalized Placement Roadmap: Cracking {company} ({role})\n\n"
            f"Here is your structured 12-week roadmap tailored for your profile:\n\n"
            f"#### 📅 Phase 1: Foundations (Weeks 1-4)\n"
            f"- **DSA Focus**: Arrays, Hashing, Two Pointers, and Binary Search (Target: 30 LeetCode Mediums).\n"
            f"- **Core Tech**: FastAPI backend fundamentals, SQL schema design, and Git basics.\n"
            f"- **Weekly Goal**: Complete profile setup and update resume structure.\n\n"
            f"#### 📅 Phase 2: Core Engineering & Projects (Weeks 5-8)\n"
            f"- **DSA Focus**: Trees, Graphs, BFS/DFS, and Recursion.\n"
            f"- **System Design**: REST API Design, Caching, and Database indexing.\n"
            f"- **Weekly Goal**: Build and deploy one advanced full-stack project (e.g. Real-time Task Board).\n\n"
            f"#### 📅 Phase 3: Interview Prep & Mock Runs (Weeks 9-12)\n"
            f"- **DSA Focus**: Dynamic Programming, Heap/Priority Queue, and interview hot-seats.\n"
            f"- **Mock Practice**: 2 Technical Mock Interviews + 2 HR Interviews.\n"
            f"- **Weekly Goal**: Refine behavioural STAR method answers and do active revision."
        )

    elif agent_name == "dsa":
        return (
            f"### 🧠 DSA Coaching Portal\n\n"
            f"Let's focus on **Dynamic Programming (DP)**, which is highly tested at **{company}**.\n\n"
            f"#### 1. Core Concept:\n"
            f"DP is an optimization over plain recursion. It involves breaking a problem into subproblems, solving them once, and storing their solutions (using memoization or tabulation).\n\n"
            f"#### 2. Key Problem Patterns:\n"
            f"- **0/1 Knapsack Pattern**: Partition Equal Subset Sum, Target Sum.\n"
            f"- **Fibonacci Numbers**: Climbing Stairs, House Robber.\n"
            f"- **Longest Common Subsequence (LCS)**: Edit Distance, Longest Palindromic Subsequence.\n\n"
            f"#### 🚀 Today's Challenge:\n"
            f"Try [LeetCode 70: Climbing Stairs](https://leetcode.com/problems/climbing-stairs/).\n"
            f"**Hint**: To reach the $n$-th step, you could either come from step $n-1$ or step $n-2$. So, $DP[n] = DP[n-1] + DP[n-2]$."
        )

    elif agent_name == "project":
        return (
            f"### 🛠️ GitHub-Quality Project Recommendations\n\n"
            f"Based on your stack (**Python, SQL**), here is a high-demand project idea:\n\n"
            f"#### 📋 Title: Real-time Multi-tenant Task Analytics Platform\n"
            f"- **Difficulty**: Intermediate\n"
            f"- **Core Tech Stack**: FastAPI (Python), PostgreSQL, Redis, React.js.\n"
            f"- **GitHub-Worthy Features**:\n"
            f"  1. **JWT-based Authentication**: Secure user login with role-based access control (Admin/Member).\n"
            f"  2. **WebSocket Live Sync**: Real-time project boards displaying active updates instantly.\n"
            f"  3. **Background Workers**: Redis Queue to generate weekly email summary reports asynchronously.\n"
            f"  4. **Performance Tuning**: Indexing database queries and caching popular dashboards to achieve sub-50ms API response time."
        )

    elif agent_name == "mock":
        if "start" in msg or "ready" in msg or "begin" in msg:
            return (
                f"Welcome to your **Technical Mock Interview** for the **{role}** position!\n\n"
                f"I will ask you 3 questions, evaluate your responses, and compile a scorecard.\n\n"
                f"**Question 1**: Can you explain the difference between a Process and a Thread in operating systems?"
            )
        elif "process" in msg and "thread" in msg:
            return (
                f"Good explanation! A process is an independent executing program with its own memory space, whereas a thread is a lightweight segment within a process that shares resources.\n\n"
                f"**Question 2**: Explain the difference between `JOIN` and `UNION` in SQL, and when you would use each."
            )
        elif "join" in msg or "union" in msg:
            return (
                f"Spot on! `JOIN` combines columns from different tables based on a related column, while `UNION` combines the result-set of two or more queries vertically.\n\n"
                f"**Question 3**: What is a deadlock, and what are the four necessary conditions (Coffman conditions) for a deadlock to occur?"
            )
        else:
            return (
                f"Thank you for your response! That concludes our Mock Technical Interview.\n\n"
                f"### 📊 Interview Feedback Report:\n"
                f"- **Correctness**: 8.5/10 - Strong grasp of OS and Database fundamentals.\n"
                f"- **Communication**: 8.0/10 - Clear explanations, but could be more structured.\n"
                f"- **Score**: **8.25/10 (Passed)**\n\n"
                f"**Improvement Tip**: When discussing process vs thread, mention memory overhead (context switching cost) for extra points!"
            )

    elif agent_name == "hr":
        if "start" in msg or "ready" in msg or "begin" in msg:
            return (
                f"Welcome to the **HR & Behavioral Mock Interview**.\n\n"
                f"I'll ask you 2 questions to evaluate your leadership, communication, and culture fit.\n\n"
                f"**Question 1**: Tell me about a time you faced a technical conflict in a group project. How did you resolve it?"
            )
        elif "conflict" in msg or "team" in msg or "project" in msg:
            return (
                f"Excellent. Resolving conflicts through open dialogue and technical prototyping is the right approach.\n\n"
                f"**Question 2**: Why do you want to work for **{company}**, and where do you see yourself in 5 years?"
            )
        else:
            return (
                f"Great answers! Let's wrap up your HR feedback.\n\n"
                f"### 🌟 HR Interview Evaluation:\n"
                f"- **Clarity**: 9.0/10 - Spoke clearly and focused on resolution (using STAR format).\n"
                f"- **Alignment**: 8.5/10 - Demonstrated research on {company}'s tech values.\n"
                f"- **Confidence Tip**: Smile more during introductions and try to keep your answers under 2 minutes to keep them punchy."
            )

    elif agent_name == "progress":
        return (
            f"### 📈 Placement Prep Analytics for {name}\n\n"
            f"- **Active Roadmap Completion**: **42%**\n"
            f"- **Daily Study Streak**: **5 Days** 🔥\n"
            f"- **Average Technical Interview Score**: **8.3/10** (Based on last 3 mock runs)\n"
            f"- **Completed Tasks**: 14 of 32 total roadmap items.\n\n"
            f"**Mentor Tip**: You are doing great! Focus on completing the Graph algorithms section this week to finish your roadmap Phase 2."
        )

    elif agent_name == "resource":
        return (
            f"### 📚 Recommended Learning Resources\n\n"
            f"Here are top-rated resources to help you study **System Design** and **FastAPI**:\n\n"
            f"1. **System Design Primer (GitHub)**: [donnemartin/system-design-primer](https://github.com/donnemartin/system-design-primer) - A must-read repository for building scalable apps.\n"
            f"2. **Official FastAPI Docs**: [fastapi.tiangolo.com](https://fastapi.tiangolo.com) - The absolute best place to learn FastAPI routing and dependency injection.\n"
            f"3. **YouTube Channel**: *NeetCode* - Excellent playlist explaining DSA concepts visually."
        )

    elif agent_name == "motivation":
        return (
            f"### 🌟 Daily Motivation boost!\n\n"
            f"**\"The secret of getting ahead is getting started.\"** — Mark Twain\n\n"
            f"Hey **{name}**, you've practiced for 5 days in a row! I've awarded you the **Coding Warrior Badge** 🛡️.\n"
            f"Consistency is what turns average developers into elite engineers. Keep pushing today!"
        )

    else:
        # Coordinator Agent fallback routing
        if "resume" in msg or "ats" in msg:
            return get_mock_agent_response("resume", message, profile)
        elif "roadmap" in msg or "plan" in msg:
            return get_mock_agent_response("roadmap", message, profile)
        elif "dsa" in msg or "leetcode" in msg or "algorithm" in msg:
            return get_mock_agent_response("dsa", message, profile)
        elif "project" in msg or "build" in msg:
            return get_mock_agent_response("project", message, profile)
        elif "technical interview" in msg or "mock interview" in msg or "technical mock" in msg:
            return get_mock_agent_response("mock", message, profile)
        elif "hr interview" in msg or "hr mock" in msg or "behavioral" in msg:
            return get_mock_agent_response("hr", message, profile)
        elif "progress" in msg or "streak" in msg or "score" in msg:
            return get_mock_agent_response("progress", message, profile)
        elif "resource" in msg or "learn" in msg or "book" in msg or "course" in msg:
            return get_mock_agent_response("resource", message, profile)
        elif "motivation" in msg or "quote" in msg or "badge" in msg:
            return get_mock_agent_response("motivation", message, profile)
        elif "profile" in msg or "onboard" in msg or "setup" in msg:
            return get_mock_agent_response("profile", message, profile)
        else:
            return (
                f"Hello **{name}**! I am your **AI Placement Mentor**. I coordinate a network of specialized agents "
                f"to help you succeed in your placements.\n\n"
                f"Here is what you can ask me to do:\n"
                f"1. 📝 **Profile**: Update your details (Type: *\"Update my profile: degree B.Tech, role Frontend Engineer\"*).\n"
                f"2. 📄 **Resume Review**: Analyze your resume (Type: *\"Review my resume\"*).\n"
                f"3. 🗺️ **Roadmap**: Generate week-by-week study milestones (Type: *\"Generate placement roadmap\"*).\n"
                f"4. 🧠 **DSA Mentor**: Request explanations and challenge codes (Type: *\"Explain DP sliding window\"*).\n"
                f"5. 🛠️ **Project Ideas**: Suggest market-relevant coding ideas (Type: *\"Suggest a web project\"*).\n"
                f"6. 💻 **Technical Mock**: Practice coding interview questions (Type: *\"Start technical interview\"*).\n"
                f"7. 🤝 **HR Interview**: Practice behavioral fits (Type: *\"Start HR interview\"*).\n"
                f"8. 📈 **Progress**: Track stats and streak (Type: *\"Show my progress\"*).\n\n"
                f"How can I assist your career prep journey today?"
            )


# ── Unified Dispatcher Function ───────────────────────────────

async def run_agent(
    agent_name: str,
    message: str,
    user_id: str = "default_user",
    session_id: str = "default_session",
    profile_context: dict = None,
) -> str:
    # All features now query the centralized AI Provider Manager
    return await provider_manager.call_provider(
        agent_name=agent_name,
        message=message,
        user_id=user_id,
        session_id=session_id,
        profile_context=profile_context
    )