from pydantic import BaseModel
from typing import List, Optional, Any, Dict
from datetime import datetime

class StudentProfileBase(BaseModel):
    id: Optional[int] = None
    name: str
    email: str
    degree: Optional[str] = None
    branch: Optional[str] = None
    semester: Optional[str] = None
    skills: Optional[str] = None
    languages: Optional[str] = None
    target_company: Optional[str] = None
    dream_role: Optional[str] = None

class ProfileResponse(BaseModel):
    profile: StudentProfileBase
    agent_message: str

class ResumeUploadResponse(BaseModel):
    has_resume: bool
    ats_score: Optional[int]
    analysis_report: Optional[str]
    file_name: str

class ResumeLatestResponse(BaseModel):
    has_resume: bool
    ats_score: Optional[int] = None
    analysis_report: Optional[str] = None
    file_name: Optional[str] = None

class TaskNode(BaseModel):
    id: str
    title: str
    status: str
    week: int

class RoadmapResponse(BaseModel):
    id: Optional[int] = None
    has_roadmap: bool = True
    role: Optional[str] = None
    company: Optional[str] = None
    roadmap_text: Optional[str] = None
    tasks: Optional[List[TaskNode]] = None

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str

class ChatHistoryMessage(BaseModel):
    sender: str
    content: str
    timestamp: datetime

class InterviewStartRequest(BaseModel):
    type: str

class InterviewStartResponse(BaseModel):
    session_id: int
    type: str
    role: str
    question: str

class InterviewAnswerRequest(BaseModel):
    answer: str

class InterviewAnswerResponse(BaseModel):
    session_id: int
    is_finished: bool
    question: Optional[str] = None
    feedback: Optional[str] = None
    score: Optional[float] = None

class InterviewSessionDetail(BaseModel):
    id: int
    type: str
    role: str
    status: str
    score: Optional[float] = None
    created_at: datetime

class InterviewSessionHistoryDetail(InterviewSessionDetail):
    transcript: List[Dict[str, str]]
    feedback: Optional[str] = None

class ProgressResponse(BaseModel):
    streak: int
    completion_rate: int
    avg_score: float
    completed_tasks: List[str]
    feedback_summary: str

class CompleteTaskRequest(BaseModel):
    task_id: str

class CompleteTaskResponse(BaseModel):
    status: str
    completed_tasks: List[str]

class Badge(BaseModel):
    id: str
    name: str
    description: str
    icon: str

class MotivationResponse(BaseModel):
    motivation_text: str
    badges: List[Badge]
