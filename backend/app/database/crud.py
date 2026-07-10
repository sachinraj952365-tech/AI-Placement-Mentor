import datetime
from sqlalchemy.orm import Session
from backend.app.database.models import StudentProfile, Resume, Roadmap, InterviewSession, ProgressLog, ChatMessage

# --- Student Profile CRUD ---
def get_student_profile(db: Session, student_id: int):
    return db.query(StudentProfile).filter(StudentProfile.id == student_id).first()

def get_student_profile_by_email(db: Session, email: str):
    return db.query(StudentProfile).filter(StudentProfile.email == email).first()

def create_student_profile(db: Session, email: str, name: str):
    db_profile = StudentProfile(email=email, name=name)
    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)
    
    # Initialize progress log too
    db_progress = ProgressLog(student_id=db_profile.id, streak_count=0)
    db.add(db_progress)
    db.commit()
    
    return db_profile

def update_student_profile(db: Session, student_id: int, data: dict):
    profile = get_student_profile(db, student_id)
    if not profile:
        return None
    # Exclude system/read-only fields to prevent database integrity and TypeErrors
    exclude_fields = {"id", "email", "created_at", "updated_at"}
    for key, value in data.items():
        if key in exclude_fields:
            continue
        if hasattr(profile, key):
            setattr(profile, key, value)
    db.commit()
    db.refresh(profile)
    return profile

# --- Resume CRUD ---
def save_resume(db: Session, student_id: int, file_name: str, file_path: str, raw_text: str = None, ats_score: int = None, analysis_report: dict = None):
    db_resume = Resume(
        student_id=student_id,
        file_name=file_name,
        file_path=file_path,
        raw_text=raw_text,
        ats_score=ats_score,
        analysis_report=analysis_report
    )
    db.add(db_resume)
    db.commit()
    db.refresh(db_resume)
    return db_resume

def get_latest_resume(db: Session, student_id: int):
    return db.query(Resume).filter(Resume.student_id == student_id).order_by(Resume.created_at.desc()).first()

# --- Roadmap CRUD ---
def create_roadmap(db: Session, student_id: int, role: str, company: str, duration_weeks: int, nodes: dict):
    # Remove older roadmaps for simplicity, keeping the latest active
    db.query(Roadmap).filter(Roadmap.student_id == student_id).delete()
    
    db_roadmap = Roadmap(
        student_id=student_id,
        role=role,
        company=company,
        duration_weeks=duration_weeks,
        nodes=nodes
    )
    db.add(db_roadmap)
    db.commit()
    db.refresh(db_roadmap)
    return db_roadmap

def get_roadmap(db: Session, student_id: int):
    return db.query(Roadmap).filter(Roadmap.student_id == student_id).first()

# --- Interview Session CRUD ---
def create_interview_session(db: Session, student_id: int, type: str, role: str):
    db_session = InterviewSession(
        student_id=student_id,
        type=type,
        role=role,
        status='in_progress',
        transcript=[]
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

def get_interview_session(db: Session, session_id: int):
    return db.query(InterviewSession).filter(InterviewSession.id == session_id).first()

def get_interview_sessions(db: Session, student_id: int):
    return db.query(InterviewSession).filter(InterviewSession.student_id == student_id).order_by(InterviewSession.created_at.desc()).all()

def update_interview_session(db: Session, session_id: int, status: str = None, score: float = None, feedback: dict = None, transcript: list = None):
    session = get_interview_session(db, session_id)
    if not session:
        return None
    if status is not None:
        session.status = status
    if score is not None:
        session.score = score
    if feedback is not None:
        session.feedback = feedback
    if transcript is not None:
        session.transcript = transcript
    db.commit()
    db.refresh(session)
    return session

# --- Progress Log CRUD ---
def get_progress(db: Session, student_id: int):
    return db.query(ProgressLog).filter(ProgressLog.student_id == student_id).first()

def update_progress(db: Session, student_id: int, completed_tasks: list = None, update_streak: bool = False):
    progress = get_progress(db, student_id)
    if not progress:
        progress = ProgressLog(student_id=student_id, streak_count=0)
        db.add(progress)
        db.commit()
        db.refresh(progress)
        
    if completed_tasks is not None:
        progress.completed_tasks = completed_tasks
        
    if update_streak:
        today = datetime.date.today()
        if progress.streak_count == 0:
            progress.streak_count = 1
        elif progress.last_active is not None:
            last_active_date = progress.last_active.date()
            if last_active_date == today:
                pass # Streak already updated for today
            elif last_active_date == today - datetime.timedelta(days=1):
                progress.streak_count += 1
            else:
                progress.streak_count = 1  # Reset streak
        else:
            progress.streak_count = 1
            
        progress.last_active = datetime.datetime.utcnow()
        
    db.commit()
    db.refresh(progress)
    return progress

# --- Chat Message CRUD ---
def save_chat_message(db: Session, student_id: int, sender: str, content: str):
    msg = ChatMessage(student_id=student_id, sender=sender, content=content)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg

def get_chat_history(db: Session, student_id: int, limit: int = 50):
    return db.query(ChatMessage).filter(ChatMessage.student_id == student_id).order_by(ChatMessage.timestamp.asc()).limit(limit).all()
