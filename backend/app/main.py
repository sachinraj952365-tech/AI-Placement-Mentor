import os
from dotenv import load_dotenv
load_dotenv(override=True)
import shutil
import json
import logging
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from backend.app.database import db, models, crud
from backend.app.agents import agents
from backend.app.mcp import mcp_server
from backend.app import schemas

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI App
app = FastAPI(title="AI Placement Mentor API", version="1.0.0")

import traceback

@app.exception_handler(Exception)
async def global_exception_handler(request, exc: Exception):
    tb = traceback.format_exc()
    logger.error(f"Unhandled Exception: {str(exc)}\n{tb}")
    return JSONResponse(
        status_code=500,
        content={"error": "Internal Server Error", "detail": str(exc), "traceback": tb},
    )

# Enable CORS for development and production
CORS_ORIGIN = os.getenv("CORS_ORIGIN", "").strip()
allowed_origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]
if CORS_ORIGIN:
    allowed_origins.extend([o.strip() for o in CORS_ORIGIN.split(",") if o.strip()])
else:
    allowed_origins.append("*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup validation check
@app.on_event("startup")
def startup_event():
    logger.info("Initializing backend server configuration checks...")
    from backend.app.agents.provider_manager import validate_env
    try:
        validate_env()
    except Exception as e:
        logger.critical(f"STARTUP CONFIGURATION VALIDATION FAILED: {e}")
        # Hard exit to prevent server from running in a broken state
        os._exit(1)

# Ensure uploads directory exists
UPLOAD_DIR = "./uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Database helper dependency
def get_db():
    yield from db.get_db()

# Initialize tables
db.init_db()

# --- SYSTEM HEALTH ENDPOINT ---
@app.get("/health")
async def health_check():
    """System health check and provider metadata endpoint."""
    provider = os.getenv("AI_PROVIDER", "gemini").lower()
    if provider == "groq":
        model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
    elif provider == "openrouter":
        model = os.getenv("OPENROUTER_MODEL", "nousresearch/hermes-3-llama-3.1-405b:free")
    elif provider == "ollama":
        model = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")
    else:
        model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

    return {
        "status": "ok",
        "provider": provider,
        "model": model,
        "version": "1.0",
        "pid": os.getpid()
    }

# --- AUTH ENDPOINTS ---
@app.post("/api/auth/login")
async def login(email: str = Form(...), name: str = Form(""), db_session: Session = Depends(get_db)):
    """Simple login/register with email. Creates profile if not exists."""
    email = email.strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
        
    student = crud.get_student_profile_by_email(db_session, email)
    if not student:
        if not name:
            name = email.split("@")[0].capitalize()
        student = crud.create_student_profile(db_session, email, name)
        logger.info(f"Created new student profile for: {email}")
        
    # Update active streak
    crud.update_progress(db_session, student.id, update_streak=True)
    
    return {
        "id": student.id,
        "email": student.email,
        "name": student.name,
        "degree": student.degree,
        "branch": student.branch,
        "semester": student.semester,
        "skills": student.skills,
        "languages": student.languages,
        "target_company": student.target_company,
        "dream_role": student.dream_role
    }

# --- PROFILE ENDPOINTS ---
@app.get("/api/profile/{student_id}", response_model=schemas.StudentProfileBase)
async def get_profile(student_id: int, db_session: Session = Depends(get_db)):
    student = crud.get_student_profile(db_session, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return student

@app.post("/api/profile/{student_id}", response_model=schemas.ProfileResponse)
async def update_profile(student_id: int, data: dict, db_session: Session = Depends(get_db)):
    student = crud.get_student_profile(db_session, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
        
    # Update database
    updated_student = crud.update_student_profile(db_session, student_id, data)
    
    # Trigger profile agent response to confirm changes
    profile_dict = updated_student.to_profile_dict()
    
    agent_message = f"Update confirmation request for {updated_student.name}"
    response_text = await agents.run_agent("profile", agent_message, profile_context=profile_dict)
    
    return {
        "profile": updated_student,
        "agent_message": response_text
    }

# --- RESUME UPLOAD & REVIEW ---
@app.post("/api/resume/upload/{student_id}", response_model=schemas.ResumeUploadResponse)
async def upload_resume(student_id: int, file: UploadFile = File(...), db_session: Session = Depends(get_db)):
    student = crud.get_student_profile(db_session, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
        
    # Save the file locally
    file_extension = file.filename.split(".")[-1].lower()
    if file_extension != "pdf":
        raise HTTPException(status_code=400, detail="Only PDF resumes are supported currently")
        
    safe_filename = f"resume_{student_id}_{int(os.path.getmtime(UPLOAD_DIR))}.pdf"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Read PDF text using MCP tool logic
    pdf_text = mcp_server.read_pdf(file_path)
    if pdf_text.startswith("Error"):
        raise HTTPException(status_code=500, detail=pdf_text)
        
    # Query Resume Agent to evaluate PDF contents
    profile_dict = student.to_profile_dict()
    
    analysis_text = await agents.run_agent("resume", f"Evaluate this resume text:\n{pdf_text}", profile_context=profile_dict)
    
    # Simple heuristic to extract ATS score from response text, defaulting to 75
    ats_score = 75
    for word in analysis_text.split():
        if "/" in word and "100" in word:
            try:
                score = int(word.split("/")[0].replace("*", "").replace(":", ""))
                if 0 <= score <= 100:
                    ats_score = score
                    break
            except Exception:
                pass
                
    # Save Resume metadata and report to DB
    resume_db = crud.save_resume(
        db_session,
        student_id=student_id,
        file_name=file.filename,
        file_path=file_path,
        raw_text=pdf_text,
        ats_score=ats_score,
        analysis_report={"report_text": analysis_text}
    )
    
    return {
        "has_resume": True,
        "file_name": resume_db.file_name,
        "ats_score": resume_db.ats_score,
        "analysis_report": analysis_text
    }

@app.get("/api/resume/latest/{student_id}", response_model=schemas.ResumeLatestResponse)
async def get_latest_resume(student_id: int, db_session: Session = Depends(get_db)):
    resume = crud.get_latest_resume(db_session, student_id)
    if not resume:
        return {"has_resume": False}
    return {
        "has_resume": True,
        "id": resume.id,
        "file_name": resume.file_name,
        "ats_score": resume.ats_score,
        "analysis_report": resume.analysis_report.get("report_text") if resume.analysis_report else "",
        "created_at": resume.created_at
    }

# --- PLACEMENT ROADMAP ENDPOINTS ---
@app.post("/api/roadmap/generate/{student_id}", response_model=schemas.RoadmapResponse)
async def generate_roadmap(student_id: int, db_session: Session = Depends(get_db)):
    student = crud.get_student_profile(db_session, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
        
    role = student.dream_role or "Software Developer"
    company = student.target_company or "General Tech Company"
    
    profile_dict = student.to_profile_dict()
    
    # Generate roadmap markdown using Roadmap Agent
    roadmap_text = await agents.run_agent(
        "roadmap",
        f"Generate a customized placement preparation roadmap for role: {role} at target company: {company}.",
        profile_context=profile_dict
    )
    
    # Parse roadmap_text to construct structured task nodes for checklist tracking
    # Here we mock structured node parsing by dividing weeks or milestones
    nodes_data = {
        "text": roadmap_text,
        "tasks": [
            {"id": "t1", "title": "Complete student profile and upload resume", "status": "pending", "week": 1},
            {"id": "t2", "title": "Solve 10 Easy array questions on LeetCode", "status": "pending", "week": 1},
            {"id": "t3", "title": "Learn basic SQL operations (Joins, Aggregations)", "status": "pending", "week": 2},
            {"id": "t4", "title": "Review OS: Process vs Thread concept", "status": "pending", "week": 2},
            {"id": "t5", "title": "Complete 15 Medium LeetCode array questions", "status": "pending", "week": 3},
            {"id": "t6", "title": "Complete GitHub repository setup for project", "status": "pending", "week": 4},
            {"id": "t7", "title": "Finish Technical Mock Interview 1", "status": "pending", "week": 6},
            {"id": "t8", "title": "Finish HR Mock Interview 1", "status": "pending", "week": 8}
        ]
    }
    
    roadmap_db = crud.create_roadmap(db_session, student_id, role, company, 12, nodes_data)
    
    return {
        "id": roadmap_db.id,
        "role": roadmap_db.role,
        "company": roadmap_db.company,
        "roadmap_text": roadmap_text,
        "tasks": nodes_data["tasks"]
    }

@app.get("/api/roadmap/{student_id}")
async def get_roadmap(student_id: int, db_session: Session = Depends(get_db)):
    roadmap = crud.get_roadmap(db_session, student_id)
    if not roadmap:
        return {"has_roadmap": False}
    return {
        "has_roadmap": True,
        "role": roadmap.role,
        "company": roadmap.company,
        "roadmap_text": roadmap.nodes.get("text"),
        "tasks": roadmap.nodes.get("tasks", [])
    }

# --- CHAT / COORDINATOR ENDPOINT ---
@app.post("/api/mentor/chat/{student_id}", response_model=schemas.ChatResponse)
async def chat_coordinator(student_id: int, request: schemas.ChatRequest, db_session: Session = Depends(get_db)):
    student = crud.get_student_profile(db_session, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
        
    user_message = request.message.strip()
    if not user_message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
        
    # Save user message to history
    crud.save_chat_message(db_session, student_id, "user", user_message)
    
    profile_dict = student.to_profile_dict()
    
    # Run Coordinator Agent
    agent_response = await agents.run_agent(
        "coordinator",
        user_message,
        user_id=str(student_id),
        session_id=f"session_{student_id}",
        profile_context=profile_dict
    )
    
    # Save assistant response to history
    crud.save_chat_message(db_session, student_id, "assistant", agent_response)
    
    # Update active streak
    crud.update_progress(db_session, student_id, update_streak=True)
    
    return {"response": agent_response}

@app.get("/api/mentor/history/{student_id}", response_model=List[schemas.ChatHistoryMessage])
async def get_chat_history(student_id: int, db_session: Session = Depends(get_db)):
    history = crud.get_chat_history(db_session, student_id)
    return [{"sender": msg.sender, "content": msg.content, "timestamp": msg.timestamp} for msg in history]

# --- MOCK INTERVIEW PORTAL ---
@app.post("/api/interview/start/{student_id}", response_model=schemas.InterviewStartResponse)
async def start_interview(student_id: int, request: schemas.InterviewStartRequest, db_session: Session = Depends(get_db)):
    student = crud.get_student_profile(db_session, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
        
    interview_type = request.type  # 'technical' or 'hr'
    role = student.dream_role or "Software Engineer"
    
    session = crud.create_interview_session(db_session, student_id, interview_type, role)
    
    # Query agent for first question
    agent_name = "mock" if interview_type == "technical" else "hr"
    profile_dict = student.to_profile_dict()
    
    first_question = await agents.run_agent(
        agent_name,
        "start mock interview",
        user_id=str(student_id),
        session_id=f"interview_{session.id}",
        profile_context=profile_dict
    )
    
    # Save first question in transcript
    transcript = [{"role": "interviewer", "text": first_question}]
    crud.update_interview_session(db_session, session.id, transcript=transcript)
    
    return {
        "session_id": session.id,
        "type": session.type,
        "role": session.role,
        "question": first_question
    }

@app.post("/api/interview/answer/{session_id}", response_model=schemas.InterviewAnswerResponse)
async def submit_answer(session_id: int, request: schemas.InterviewAnswerRequest, db_session: Session = Depends(get_db)):
    session = crud.get_interview_session(db_session, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")
        
    student = crud.get_student_profile(db_session, session.student_id)
    user_answer = request.answer.strip()
    
    if not user_answer:
        raise HTTPException(status_code=400, detail="Answer cannot be empty")
        
    transcript = list(session.transcript)
    transcript.append({"role": "candidate", "text": user_answer})
    
    agent_name = "mock" if session.type == "technical" else "hr"
    profile_dict = student.to_profile_dict()
    
    # Send user answer to interview agent to get next question or evaluation
    agent_msg = f"Candidate Answer: {user_answer}\nContext Transcript so far: {json.dumps(transcript)}"
    next_response = await agents.run_agent(
        agent_name,
        agent_msg,
        user_id=str(session.student_id),
        session_id=f"interview_{session.id}",
        profile_context=profile_dict
    )
    
    transcript.append({"role": "interviewer", "text": next_response})
    
    # Check if agent ended the interview by delivering feedback
    is_finished = "interview feedback report" in next_response.lower() or "interview evaluation" in next_response.lower() or len(transcript) >= 8
    
    if is_finished:
        # Finalize Session
        score = 8.0  # default mock score
        for word in next_response.split():
            if "/10" in word:
                try:
                    raw_score = float(word.split("/10")[0].replace("*", "").replace(":", ""))
                    if 0 <= raw_score <= 10:
                        score = raw_score
                        break
                except Exception:
                    pass
                    
        crud.update_interview_session(
            db_session, 
            session.id, 
            status="completed", 
            score=score, 
            feedback={"report": next_response},
            transcript=transcript
        )
        
        # Log progress and streak
        crud.update_progress(db_session, session.student_id, update_streak=True)
        
        return {
            "session_id": session.id,
            "is_finished": True,
            "feedback": next_response,
            "score": score
        }
    else:
        # Continue session
        crud.update_interview_session(db_session, session.id, transcript=transcript)
        return {
            "session_id": session.id,
            "is_finished": False,
            "question": next_response
        }

@app.get("/api/interview/sessions/{student_id}", response_model=List[schemas.InterviewSessionDetail])
async def get_interview_history(student_id: int, db_session: Session = Depends(get_db)):
    sessions = crud.get_interview_sessions(db_session, student_id)
    return [
        {
            "id": s.id,
            "type": s.type,
            "role": s.role,
            "status": s.status,
            "score": s.score,
            "created_at": s.created_at
        } for s in sessions
    ]

@app.get("/api/interview/session/{session_id}", response_model=schemas.InterviewSessionHistoryDetail)
async def get_interview_details(session_id: int, db_session: Session = Depends(get_db)):
    session = crud.get_interview_session(db_session, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "id": session.id,
        "type": session.type,
        "role": session.role,
        "status": session.status,
        "score": session.score,
        "transcript": session.transcript,
        "feedback": session.feedback.get("report") if session.feedback else "",
        "created_at": session.created_at
    }

# --- PROGRESS & ANALYTICS ---
@app.get("/api/progress/{student_id}", response_model=schemas.ProgressResponse)
async def get_student_progress(student_id: int, db_session: Session = Depends(get_db)):
    student = crud.get_student_profile(db_session, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
        
    progress = crud.get_progress(db_session, student_id)
    roadmap = crud.get_roadmap(db_session, student_id)
    interviews = crud.get_interview_sessions(db_session, student_id)
    
    completed_task_ids = progress.completed_tasks if progress else []
    streak = progress.streak_count if progress else 0
    
    # Calculate roadmap completion percentage
    completion_rate = 0
    if roadmap:
        tasks = roadmap.nodes.get("tasks", [])
        total_tasks = len(tasks)
        if total_tasks > 0:
            completed_count = len([t for t in tasks if t["id"] in completed_task_ids])
            completion_rate = round((completed_count / total_tasks) * 100)
            
    # Calculate mock interview average score
    completed_interviews = [i for i in interviews if i.status == "completed" and i.score is not None]
    avg_score = 0
    if completed_interviews:
        avg_score = round(sum([i.score for i in completed_interviews]) / len(completed_interviews), 2)
        
    # Query progress agent for feedback summary
    profile_dict = student.to_profile_dict()
    progress_summary = await agents.run_agent(
        "progress",
        f"Generate progress feedback report. Streak: {streak} days. Completion rate: {completion_rate}%. Avg mock score: {avg_score}/10.",
        profile_context=profile_dict
    )
    
    return {
        "streak": streak,
        "completion_rate": completion_rate,
        "avg_score": avg_score,
        "completed_tasks": completed_task_ids,
        "feedback_summary": progress_summary
    }

@app.post("/api/progress/complete-task/{student_id}", response_model=schemas.CompleteTaskResponse)
async def complete_task(student_id: int, request: schemas.CompleteTaskRequest, db_session: Session = Depends(get_db)):
    task_id = request.task_id
    if not task_id:
        raise HTTPException(status_code=400, detail="task_id is required")
        
    progress = crud.get_progress(db_session, student_id)
    completed = list(progress.completed_tasks) if progress and progress.completed_tasks else []
    
    if task_id in completed:
        completed.remove(task_id)
    else:
        completed.append(task_id)
        
    crud.update_progress(db_session, student_id, completed_tasks=completed, update_streak=True)
    
    # Update status inside roadmap task list too
    roadmap = crud.get_roadmap(db_session, student_id)
    if roadmap:
        tasks = list(roadmap.nodes.get("tasks", []))
        for t in tasks:
            if t["id"] == task_id:
                t["status"] = "completed" if task_id in completed else "pending"
        # Save back
        nodes = dict(roadmap.nodes)
        nodes["tasks"] = tasks
        roadmap.nodes = nodes
        db_session.commit()
        
    return {"status": "success", "completed_tasks": completed}

# --- MOTIVATION BOOSTER ---
@app.get("/api/motivation/{student_id}", response_model=schemas.MotivationResponse)
async def get_motivation(student_id: int, db_session: Session = Depends(get_db)):
    student = crud.get_student_profile(db_session, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
        
    progress = crud.get_progress(db_session, student_id)
    streak = progress.streak_count if progress else 0
    
    profile_dict = student.to_profile_dict()
    
    motivation_text = await agents.run_agent(
        "motivation",
        f"Create study motivation with current streak {streak} days.",
        profile_context=profile_dict
    )
    
    # Mock Badges based on streak
    badges = []
    if streak >= 1:
        badges.append({"id": "b1", "name": "First Step", "description": "Activated account and started roadmap", "icon": "🚀"})
    if streak >= 3:
        badges.append({"id": "b2", "name": "Consistent Coder", "description": "Completed study goals 3 days in a row", "icon": "🔥"})
    if streak >= 5:
        badges.append({"id": "b3", "name": "Placement Warrior", "description": "Engaged with mentor for 5 consecutive days", "icon": "🛡️"})
        
    return {
        "motivation_text": motivation_text,
        "badges": badges
    }

# Serve React static production build folder if exists
if os.path.exists("frontend/dist"):
    app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="frontend")
