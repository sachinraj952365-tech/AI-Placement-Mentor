import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, JSON
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class StudentProfile(Base):
    __tablename__ = 'student_profiles'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    degree = Column(String(100), nullable=True)
    branch = Column(String(100), nullable=True)
    semester = Column(String(50), nullable=True)
    skills = Column(Text, nullable=True)  # Comma-separated list or JSON array
    languages = Column(Text, nullable=True)  # Comma-separated list
    target_company = Column(String(100), nullable=True)
    dream_role = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    resumes = relationship("Resume", back_populates="student", cascade="all, delete-orphan")
    roadmaps = relationship("Roadmap", back_populates="student", cascade="all, delete-orphan")
    interviews = relationship("InterviewSession", back_populates="student", cascade="all, delete-orphan")
    progress = relationship("ProgressLog", back_populates="student", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="student", cascade="all, delete-orphan")

    def to_profile_dict(self) -> dict:
        return {
            "name": self.name,
            "degree": self.degree,
            "branch": self.branch,
            "semester": self.semester,
            "skills": self.skills or "Python, SQL",
            "languages": self.languages,
            "target_company": self.target_company or "General Tech Company",
            "dream_role": self.dream_role or "Software Engineer"
        }

class Resume(Base):
    __tablename__ = 'resumes'

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey('student_profiles.id', ondelete='CASCADE'), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    ats_score = Column(Integer, nullable=True)
    raw_text = Column(Text, nullable=True)
    analysis_report = Column(JSON, nullable=True)  # Contains missing skills, grammar, formatting, suggestions
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    student = relationship("StudentProfile", back_populates="resumes")

class Roadmap(Base):
    __tablename__ = 'roadmaps'

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey('student_profiles.id', ondelete='CASCADE'), nullable=False)
    role = Column(String(100), nullable=False)
    company = Column(String(100), nullable=True)
    duration_weeks = Column(Integer, default=12)
    nodes = Column(JSON, nullable=False)  # JSON structure containing daily tasks, weekly goals, monthly milestones
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    student = relationship("StudentProfile", back_populates="roadmaps")

class InterviewSession(Base):
    __tablename__ = 'interview_sessions'

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey('student_profiles.id', ondelete='CASCADE'), nullable=False)
    type = Column(String(50), nullable=False)  # 'technical' or 'hr'
    role = Column(String(100), nullable=False)
    status = Column(String(50), default='in_progress')  # 'in_progress' or 'completed'
    score = Column(Float, nullable=True)
    transcript = Column(JSON, default=list)  # JSON array of conversation: [{"role": "interviewer", "text": "..."}, {"role": "candidate", "text": "..."}]
    feedback = Column(JSON, nullable=True)  # Detailed feedback on communication, correctness, tips
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    student = relationship("StudentProfile", back_populates="interviews")

class ProgressLog(Base):
    __tablename__ = 'progress_logs'

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey('student_profiles.id', ondelete='CASCADE'), nullable=False)
    streak_count = Column(Integer, default=0)
    last_active = Column(DateTime, default=datetime.datetime.utcnow)
    completed_tasks = Column(JSON, default=list)  # List of task IDs or names that are completed
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    student = relationship("StudentProfile", back_populates="progress")

class ChatMessage(Base):
    __tablename__ = 'chat_messages'

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey('student_profiles.id', ondelete='CASCADE'), nullable=False)
    sender = Column(String(50), nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    student = relationship("StudentProfile", back_populates="chat_messages")
