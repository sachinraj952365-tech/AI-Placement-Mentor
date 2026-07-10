import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  LayoutDashboard, MessageSquare, FileText, Map, Code, 
  Award, TrendingUp, Settings as SettingsIcon, LogOut, 
  ChevronRight, Send, CheckCircle2, Circle, Upload, 
  Play, ArrowRight, User, Sparkles, BookOpen, Heart, 
  Flame, BookOpenCheck, Check, AlertCircle, RefreshCw, Menu
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || ""; // Relative proxy works in dev, dynamic URL for production
console.log("Resolved API_BASE:", API_BASE);

export default function App() {
  // Auth & Student Profile State
  const [student, setStudent] = useState(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authName, setAuthName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // Navigation State
  const [activeTab, setActiveTab] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Resume State
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeData, setResumeData] = useState(null);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeError, setResumeError] = useState("");

  // Roadmap State
  const [roadmap, setRoadmap] = useState(null);
  const [roadmapLoading, setRoadmapLoading] = useState(false);

  // Projects State
  const [projectDomain, setProjectDomain] = useState("web");
  const [projectLevel, setProjectLevel] = useState("intermediate");
  const [projectsList, setProjectsList] = useState("");
  const [projectsLoading, setProjectsLoading] = useState(false);

  // Mock Interview State
  const [interviewSession, setInterviewSession] = useState(null);
  const [interviewType, setInterviewType] = useState("technical"); // 'technical' or 'hr'
  const [interviewRole, setInterviewRole] = useState("Software Engineer");
  const [interviewInput, setInterviewInput] = useState("");
  const [interviewLoading, setInterviewLoading] = useState(false);
  const [interviewTranscript, setInterviewTranscript] = useState([]);
  const [interviewFinishedData, setInterviewFinishedData] = useState(null);
  const interviewChatEndRef = useRef(null);

  // Progress State
  const [progressMetrics, setProgressMetrics] = useState({
    streak: 0,
    completion_rate: 0,
    avg_score: 0,
    completed_tasks: [],
    feedback_summary: "Loading feedback..."
  });
  const [progressLoading, setProgressLoading] = useState(false);

  // Motivation State
  const [motivationText, setMotivationText] = useState("");
  const [badges, setBadges] = useState([]);

  // Settings State
  const [profileForm, setProfileForm] = useState({
    name: "",
    degree: "",
    branch: "",
    semester: "",
    skills: "",
    languages: "",
    target_company: "",
    dream_role: ""
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");

  // Load student session from localStorage on mount
  useEffect(() => {
    const savedStudent = localStorage.getItem("placement_student");
    if (savedStudent) {
      try {
        const parsed = JSON.parse(savedStudent);
        setStudent(parsed);
        setProfileForm(parsed);
      } catch (e) {
        localStorage.removeItem("placement_student");
      }
    }
  }, []);

  // Fetch relevant tab data when activeTab or student changes
  useEffect(() => {
    if (!student || !student.id) return;

    if (activeTab === "dashboard") {
      fetchProgress();
      fetchMotivation();
      fetchLatestResume();
    } else if (activeTab === "chat") {
      fetchChatHistory();
    } else if (activeTab === "resume") {
      fetchLatestResume();
    } else if (activeTab === "roadmap") {
      fetchRoadmap();
    } else if (activeTab === "projects") {
      fetchProjectRecommendations();
    } else if (activeTab === "analytics") {
      fetchProgress();
    }
  }, [activeTab, student]);

  // Scroll chat boxes to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  useEffect(() => {
    interviewChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [interviewTranscript, interviewLoading]);

  // --- API CALLS ---
  
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!authEmail.trim()) return;
    setAuthLoading(true);
    setAuthError("");

    try {
      const formData = new FormData();
      formData.append("email", authEmail.trim());
      formData.append("name", authName.trim());

      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(await res.text() || "Failed to log in");
      }

      const data = await res.json();
      setStudent(data);
      setProfileForm(data);
      localStorage.setItem("placement_student", JSON.stringify(data));
      setActiveTab("dashboard");
    } catch (err) {
      setAuthError(err.message || "Something went wrong. Is backend running?");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("placement_student");
    setStudent(null);
    setChatMessages([]);
    setResumeData(null);
    setRoadmap(null);
    setInterviewSession(null);
  };

  const fetchProgress = async () => {
    if (!student || !student.id) return;
    setProgressLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/progress/${student.id}`);
      if (res.status === 404) {
        handleLogout();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setProgressMetrics(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setProgressLoading(false);
    }
  };

  const fetchMotivation = async () => {
    if (!student || !student.id) return;
    try {
      const res = await fetch(`${API_BASE}/api/motivation/${student.id}`);
      if (res.status === 404) {
        handleLogout();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setMotivationText(data.motivation_text);
        setBadges(data.badges);
      }
    } catch (e) {}
  };

  const fetchLatestResume = async () => {
    if (!student || !student.id) return;
    try {
      const res = await fetch(`${API_BASE}/api/resume/latest/${student.id}`);
      if (res.status === 404) {
        handleLogout();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        if (data.has_resume) {
          setResumeData(data);
        } else {
          setResumeData(null);
        }
      }
    } catch (e) {}
  };

  const handleResumeUpload = async (e) => {
    e.preventDefault();
    if (!resumeFile) return;
    setResumeLoading(true);
    setResumeError("");

    try {
      const formData = new FormData();
      formData.append("file", resumeFile);

      const res = await fetch(`${API_BASE}/api/resume/upload/${student.id}`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to analyze resume");
      }

      const data = await res.json();
      setResumeData({
        has_resume: true,
        ats_score: data.ats_score,
        analysis_report: data.analysis_report,
        file_name: data.file_name
      });
    } catch (err) {
      setResumeError(err.message);
    } finally {
      setResumeLoading(false);
    }
  };

  const fetchRoadmap = async () => {
    if (!student || !student.id) return;
    setRoadmapLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/roadmap/${student.id}`);
      if (res.status === 404) {
        handleLogout();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        if (data.has_roadmap) {
          setRoadmap(data);
        } else {
          setRoadmap(null);
        }
      }
    } catch (e) {}
    finally {
      setRoadmapLoading(false);
    }
  };

  const generateRoadmap = async () => {
    if (!student || !student.id) return;
    setRoadmapLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/roadmap/generate/${student.id}`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setRoadmap({
          has_roadmap: true,
          role: data.role,
          company: data.company,
          roadmap_text: data.roadmap_text,
          tasks: data.tasks
        });
        fetchProgress();
      }
    } catch (e) {}
    finally {
      setRoadmapLoading(false);
    }
  };

  const toggleTaskCompletion = async (taskId) => {
    const isCompleted = progressMetrics.completed_tasks.includes(taskId);
    // Optimistic UI update
    let newCompleted = [...progressMetrics.completed_tasks];
    if (isCompleted) {
      newCompleted = newCompleted.filter(id => id !== taskId);
    } else {
      newCompleted.push(taskId);
    }
    
    setProgressMetrics(prev => ({
      ...prev,
      completed_tasks: newCompleted
    }));

    try {
      // Toggle backend
      await fetch(`${API_BASE}/api/progress/complete-task/${student.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId }),
      });
      fetchProgress();
      fetchRoadmap();
    } catch (e) {}
  };

  const fetchChatHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/mentor/history/${student.id}`);
      if (res.status === 404) {
        handleLogout();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data);
      }
    } catch (e) {}
  };

  const sendChatMessage = async (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { sender: "user", content: userText }]);
    setChatLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/mentor/chat/${student.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText })
      });

      if (res.ok) {
        const data = await res.json();
        setChatMessages(prev => [...prev, { sender: "assistant", content: data.response }]);
      } else {
        throw new Error();
      }
    } catch (e) {
      setChatMessages(prev => [...prev, { sender: "assistant", content: "Sorry, I had trouble contacting the coordinator agent. Please check if backend is running." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const fetchProjectRecommendations = async () => {
    if (!student || !student.id) return;
    setProjectsLoading(true);
    try {
      // We will make a POST to /api/chat or simulate via coordinator
      // In this demo, we lookup directly via the coordinator agent by sending structured request
      const prompt = `Recommend projects for domain: ${projectDomain} and level: ${projectLevel}`;
      const res = await fetch(`${API_BASE}/api/mentor/chat/${student.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt })
      });
      if (res.ok) {
        const data = await res.json();
        setProjectsList(data.response);
      }
    } catch (e) {
      setProjectsList("Failed to load recommendations. Please verify the backend connection.");
    } finally {
      setProjectsLoading(false);
    }
  };

  const startInterviewSession = async () => {
    setInterviewLoading(true);
    setInterviewFinishedData(null);
    setInterviewTranscript([]);
    try {
      const res = await fetch(`${API_BASE}/api/interview/start/${student.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: interviewType })
      });
      if (res.ok) {
        const data = await res.json();
        setInterviewSession(data);
        setInterviewTranscript([{ role: "interviewer", text: data.question }]);
      }
    } catch (e) {}
    finally {
      setInterviewLoading(false);
    }
  };

  const submitInterviewAnswer = async (e) => {
    e.preventDefault();
    if (!interviewInput.trim() || !interviewSession) return;

    const answerText = interviewInput.trim();
    setInterviewInput("");
    setInterviewTranscript(prev => [...prev, { role: "candidate", text: answerText }]);
    setInterviewLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/interview/answer/${interviewSession.session_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: answerText })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.is_finished) {
          setInterviewFinishedData(data);
          setInterviewSession(null);
        } else {
          setInterviewTranscript(prev => [...prev, { role: "interviewer", text: data.question }]);
        }
      }
    } catch (e) {}
    finally {
      setInterviewLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSettingsLoading(true);
    setSettingsMessage("");

    try {
      const res = await fetch(`${API_BASE}/api/profile/${student.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm)
      });

      if (res.ok) {
        const data = await res.json();
        setStudent(data.profile);
        localStorage.setItem("placement_student", JSON.stringify(data.profile));
        setSettingsMessage(data.agent_message || "Profile updated successfully!");
      } else {
        throw new Error();
      }
    } catch (e) {
      setSettingsMessage("Error saving profile details.");
    } finally {
      setSettingsLoading(false);
    }
  };

  // --- RENDERS ---

  if (!student || !student.id) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="glass-card w-full max-w-[440px] p-6 md:p-10 animate-[fadeIn_0.5s_ease-out]">
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'inline-flex', padding: '1rem', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', marginBottom: '1rem' }}>
              <Sparkles size={32} />
            </div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>AI Placement Mentor</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.95rem' }}>College Career Coaching, Elevated by Agents</p>
          </div>

          {authError && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', borderRadius: 'var(--border-radius-sm)', padding: '0.75rem', marginBottom: '1.25rem', display: 'flex', gap: '0.5rem', alignItems: 'center', color: '#f87171', fontSize: '0.85rem' }}>
              <AlertCircle size={16} />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Your Name (Optional)</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. Sachin" 
                value={authName}
                onChange={e => setAuthName(e.target.value)}
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: '1.75rem' }}>
              <label>Your Email Address</label>
              <input 
                type="email" 
                required 
                className="form-control" 
                placeholder="e.g. sachin@university.edu" 
                value={authEmail}
                onChange={e => setAuthEmail(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={authLoading}>
              {authLoading ? <RefreshCw className="animate-spin" size={18} /> : (
                <>
                  <span>Enter Dashboard</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container overflow-x-hidden">
      {/* MOBILE HEADER */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#090d16]/95 backdrop-blur-md border-b border-white/10 z-[90] flex items-center justify-between px-4">
        <button onClick={() => setMobileMenuOpen(true)} className="p-2 text-slate-300 hover:text-white focus:outline-none">
          <Menu size={24} />
        </button>
        <div className="flex items-center gap-2">
          <Sparkles color="#8b5cf6" size={20} />
          <span className="font-extrabold text-sm tracking-tight">Placement Mentor</span>
        </div>
        <div className="w-10" />
      </header>

      {/* MOBILE BACKDROP OVERLAY */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[95] md:hidden" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR NAVIGATION */}
      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
          <Sparkles color="#8b5cf6" size={24} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Placement Mentor</h3>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          {[
            { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
            { id: "chat", label: "Mentor Chat", icon: <MessageSquare size={18} /> },
            { id: "resume", label: "Resume ATS Review", icon: <FileText size={18} /> },
            { id: "roadmap", label: "Custom Roadmap", icon: <Map size={18} /> },
            { id: "projects", label: "Project Sandbox", icon: <Code size={18} /> },
            { id: "interview", label: "Mock Interviews", icon: <Award size={18} /> },
            { id: "analytics", label: "Progress Analytics", icon: <TrendingUp size={18} /> },
            { id: "settings", label: "Settings", icon: <SettingsIcon size={18} /> },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setMobileMenuOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                border: 'none',
                background: activeTab === item.id ? 'var(--primary-gradient)' : 'transparent',
                borderRadius: 'var(--border-radius-sm)',
                cursor: 'pointer',
                textAlign: 'left',
                fontWeight: activeTab === item.id ? '600' : '500',
                color: activeTab === item.id ? '#ffffff' : 'var(--text-secondary)',
                transition: 'var(--transition-smooth)'
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <button 
          onClick={() => {
            handleLogout();
            setMobileMenuOpen(false);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            border: 'none',
            background: 'transparent',
            borderRadius: 'var(--border-radius-sm)',
            cursor: 'pointer',
            textAlign: 'left',
            color: 'var(--danger)',
            fontWeight: '600',
            marginTop: 'auto'
          }}
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </aside>

      {/* MAIN VIEWPORT */}
      <main className="main-content">
        
        {/* TAB 1: DASHBOARD */}
        {activeTab === "dashboard" && (
          <div>
            <header className="page-header flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2>Hello, <span className="gradient-text">{student.name}</span>!</h2>
                <p>Welcome back to your placement roadmap cockpit.</p>
              </div>
              <div className="flex gap-2 bg-white/[0.03] border border-white/10 px-4 py-2 rounded-full items-center">
                <Flame color="#ef4444" size={18} />
                <span style={{ fontWeight: 700 }}>{progressMetrics.streak} Day Streak</span>
              </div>
            </header>

            {motivationText && (
              <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%)', border: '1px solid rgba(139, 92, 246, 0.25)', marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem', color: '#c084fc' }}>
                  <Sparkles size={18} />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Daily Guidance</span>
                </div>
                <div style={{ fontStyle: 'italic', fontSize: '1.05rem', lineHeight: '1.6' }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{motivationText.replace(/###.*?\n/, "")}</ReactMarkdown>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
              <div className="glass-card stats-card">
                <div className="stats-icon">
                  <Flame size={24} />
                </div>
                <div className="stats-info">
                  <h4>{progressMetrics.streak} Days</h4>
                  <p>Current Prep Streak</p>
                </div>
              </div>

              <div className="glass-card stats-card">
                <div className="stats-icon" style={{ background: 'rgba(6, 182, 212, 0.15)', borderColor: 'rgba(6, 182, 212, 0.3)', color: '#06b6d4' }}>
                  <BookOpenCheck size={24} />
                </div>
                <div className="stats-info">
                  <h4>{progressMetrics.completion_rate}%</h4>
                  <p>Roadmap Completion</p>
                </div>
              </div>

              <div className="glass-card stats-card">
                <div className="stats-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)', color: '#10b981' }}>
                  <TrendingUp size={24} />
                </div>
                <div className="stats-info">
                  <h4>{progressMetrics.avg_score > 0 ? `${progressMetrics.avg_score}/10` : 'N/A'}</h4>
                  <p>Avg. Technical Score</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
              <div className="lg:col-span-2 glass-card flex flex-col gap-4">
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Active Resume ATS Status</h3>
                {resumeData ? (
                  <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                    <div style={{ width: '100px', height: '100px', borderRadius: '50%', border: '8px solid rgba(139, 92, 246, 0.15)', borderTopColor: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>{resumeData.ats_score}</span>
                      <span style={{ fontSize: '0.7rem', position: 'absolute', bottom: '15px', color: 'var(--text-secondary)' }}>ATS</span>
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1.1rem' }}>{resumeData.file_name}</h4>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>Last checked ATS score. Read review suggestions to increase score.</p>
                      <button onClick={() => setActiveTab("resume")} className="btn-secondary" style={{ marginTop: '1rem', padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                        View Detailed Report
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>You haven't uploaded a resume yet.</p>
                    <button onClick={() => setActiveTab("resume")} className="btn-primary">
                      <Upload size={18} />
                      <span>Upload Resume</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="glass-card">
                <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Earned Badges</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {badges.length > 0 ? badges.map(badge => (
                    <div key={badge.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--surface-border)' }}>
                      <span style={{ fontSize: '1.5rem' }}>{badge.icon}</span>
                      <div>
                        <h5 style={{ fontSize: '0.9rem', fontWeight: 600 }}>{badge.name}</h5>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{badge.description}</p>
                      </div>
                    </div>
                  )) : (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Start your learning streak to unlock achievement badges.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CHAT PORTAL */}
        {activeTab === "chat" && (
          <div>
            <header className="page-header">
              <h2>Chat with <span className="gradient-text">Placement Mentor</span></h2>
              <p>Your Coordinator agent routing queries to Resume, Roadmap, DSA and Interview specialist agents.</p>
            </header>

            <div className="glass-card" style={{ padding: '0', display: 'flex', flexDirection: 'column' }}>
              <div className="chat-messages">
                {chatMessages.length === 0 && (
                  <div style={{ margin: 'auto', textAlign: 'center', padding: '2rem', maxWidth: '400px' }}>
                    <Sparkles color="#8b5cf6" size={32} style={{ marginBottom: '1rem' }} />
                    <h4 style={{ marginBottom: '0.5rem' }}>No conversations yet</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Ask general queries or click suggestions to test sub-agents:</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1.5rem' }}>
                      {[
                        "How do I prepare for DSA interviews?",
                        "Suggest a web development project idea",
                        "How can I improve my resume ATS score?",
                        "What is a deadlock in OS?"
                      ].map((prompt, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setChatInput(prompt);
                          }}
                          style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid var(--surface-border)',
                            padding: '0.5rem 1rem',
                            borderRadius: '50px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            color: 'var(--text-secondary)',
                            textAlign: 'left'
                          }}
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`message-bubble ${msg.sender} max-w-[85%] md:max-w-[70%]`}>
                    <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="message-bubble assistant" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Mentor Agent is reasoning...</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={sendChatMessage} style={{ display: 'flex', borderTop: '1px solid var(--surface-border)', padding: '1rem', background: 'rgba(9, 13, 22, 0.4)' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ask your placement mentor anything..."
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  style={{ borderTopRightRadius: '0', borderBottomRightRadius: '0', borderRight: 'none' }}
                  disabled={chatLoading}
                />
                <button type="submit" className="btn-primary" style={{ borderTopLeftRadius: '0', borderBottomLeftRadius: '0' }} disabled={chatLoading}>
                  <Send size={16} />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 3: RESUME REVIEW */}
        {activeTab === "resume" && (
          <div>
            <header className="page-header">
              <h2>Resume <span className="gradient-text">ATS Scorer & Reviewer</span></h2>
              <p>Upload your PDF resume to check ATS compatibility, extract skills, and fetch recommendations.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="glass-card h-fit lg:col-span-1">
                <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>Upload Document</h3>
                
                <form onSubmit={handleResumeUpload}>
                  <div style={{ border: '2px dashed var(--surface-border)', padding: '2rem 1.5rem', borderRadius: 'var(--border-radius-md)', textAlign: 'center', cursor: 'pointer', marginBottom: '1.5rem', background: 'rgba(255, 255, 255, 0.01)' }} onClick={() => document.getElementById("resume-input").click()}>
                    <Upload size={32} color="#8b5cf6" style={{ marginBottom: '0.75rem' }} />
                    <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>{resumeFile ? resumeFile.name : 'Select PDF Resume'}</p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Max size 5MB (PDF only)</p>
                    <input 
                      id="resume-input"
                      type="file" 
                      accept=".pdf" 
                      style={{ display: 'none' }} 
                      onChange={e => setResumeFile(e.target.files[0])}
                    />
                  </div>

                  {resumeError && (
                    <p style={{ color: 'var(--danger)', fontSize: '0.8rem', marginBottom: '1rem' }}>{resumeError}</p>
                  )}

                  <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={resumeLoading || !resumeFile}>
                    {resumeLoading ? <RefreshCw className="animate-spin" size={18} /> : (
                      <>
                        <span>Start ATS Scan</span>
                        <ChevronRight size={18} />
                      </>
                    )}
                  </button>
                </form>
              </div>

              <div className="glass-card lg:col-span-2 min-h-[300px]">
                <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>ATS Analysis & Suggestions</h3>

                {resumeData ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', padding: '1rem', background: 'var(--primary-gradient)', borderRadius: '50px', fontWeight: 800, fontSize: '1.5rem', width: '65px', height: '65px', alignItems: 'center', justifyContent: 'center' }}>
                        {resumeData.ats_score}
                      </div>
                      <div>
                        <h4>ATS Score: {resumeData.ats_score}/100</h4>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Your resume shows moderate compatibility with {student.dream_role || 'target roles'}.</p>
                      </div>
                    </div>

                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', color: '#e2e8f0', fontSize: '0.95rem' }}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{resumeData.analysis_report}</ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)', padding: '3rem 0' }}>
                    <FileText size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                    <p>No resume analysis active. Upload your resume to start review.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ROADMAP TIMELINE */}
        {activeTab === "roadmap" && (
          <div>
            <header className="page-header flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2>Placement Prep <span className="gradient-text">Roadmap Checklist</span></h2>
                <p>Track your goals and mark completed tasks from your personalized roadmaps.</p>
              </div>
              {!roadmap && (
                <button onClick={generateRoadmap} className="btn-primary" disabled={roadmapLoading}>
                  {roadmapLoading ? <RefreshCw className="animate-spin" size={18} /> : (
                    <>
                      <Sparkles size={18} />
                      <span>Generate Roadmap</span>
                    </>
                  )}
                </button>
              )}
            </header>

            {roadmap ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* TIMELINE VISUAL */}
                <div className="glass-card">
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Roadmap Guide</h3>
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '0.95rem' }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{roadmap.roadmap_text}</ReactMarkdown>
                  </div>
                </div>

                {/* TASK CHECKLIST */}
                <div className="glass-card">
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Study Checklist</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {roadmap.tasks && roadmap.tasks.map(task => {
                      const isDone = progressMetrics.completed_tasks.includes(task.id);
                      return (
                        <div 
                          key={task.id} 
                          onClick={() => toggleTaskCompletion(task.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            padding: '1rem',
                            borderRadius: 'var(--border-radius-sm)',
                            border: '1px solid var(--surface-border)',
                            background: isDone ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255, 255, 255, 0.01)',
                            cursor: 'pointer',
                            transition: 'var(--transition-smooth)'
                          }}
                        >
                          {isDone ? (
                            <CheckCircle2 color="#10b981" size={20} />
                          ) : (
                            <Circle color="var(--text-secondary)" size={20} />
                          )}
                          <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: 600, fontSize: '0.95rem', textDecoration: isDone ? 'line-through' : 'none', color: isDone ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                              {task.title}
                            </p>
                            <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 500 }}>Week {task.week}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-card" style={{ textAlign: 'center', padding: '5rem 0' }}>
                <Map size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                <h4 style={{ marginBottom: '0.5rem' }}>No active roadmap found</h4>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Click the button below to analyze your profile and target role to generate a custom timeline.</p>
                <button onClick={generateRoadmap} className="btn-primary" disabled={roadmapLoading}>
                  {roadmapLoading ? <RefreshCw className="animate-spin" size={18} /> : (
                    <>
                      <Sparkles size={18} />
                      <span>Generate My Placement Roadmap</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: PROJECT SANDBOX */}
        {activeTab === "projects" && (
          <div>
            <header className="page-header">
              <h2>Project <span className="gradient-text">Sandbox Ideas</span></h2>
              <p>Query the Project Recommendation agent for production-ready, GitHub-worthy project specs.</p>
            </header>

            <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
              <div className="flex flex-col sm:flex-row gap-5 items-stretch sm:items-end">
                <div className="form-group flex-1 m-0">
                  <label>Domain Choice</label>
                  <select className="form-control" value={projectDomain} onChange={e => setProjectDomain(e.target.value)}>
                    <option value="web">Web Development (React, FastAPI, Node)</option>
                    <option value="ml">Machine Learning & Data Science</option>
                  </select>
                </div>

                <div className="form-group flex-1 m-0">
                  <label>Difficulty Level</label>
                  <select className="form-control" value={projectLevel} onChange={e => setProjectLevel(e.target.value)}>
                    <option value="beginner">Beginner (Foundations)</option>
                    <option value="intermediate">Intermediate (Full Stack / Custom Models)</option>
                    <option value="advanced">Advanced (WS, Vector DBs, System Design)</option>
                  </select>
                </div>

                <button onClick={fetchProjectRecommendations} className="btn-primary w-full sm:w-auto h-[42px] justify-center" disabled={projectsLoading}>
                  {projectsLoading ? <RefreshCw className="animate-spin" size={18} /> : (
                    <>
                      <span>Query Recommendation Agent</span>
                      <ChevronRight size={18} />
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="glass-card" style={{ minHeight: '300px' }}>
              {projectsLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '5rem 0' }}>
                  <RefreshCw className="animate-spin" size={32} color="#8b5cf6" style={{ marginBottom: '1rem' }} />
                  <p>Agent is scanning market trends and parsing suggestions...</p>
                </div>
              ) : projectsList && projectsList.length > 0 ? (
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '0.95rem' }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{projectsList}</ReactMarkdown>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)', padding: '5rem 0' }}>
                  <Code size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                  <p>Select filter criteria and click the recommendation button to see GitHub specs.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: MOCK INTERVIEWS */}
        {activeTab === "interview" && (
          <div>
            <header className="page-header">
              <h2>Mock <span className="gradient-text">Interview Practice Room</span></h2>
              <p>Practice OS, DB, Systems, and behavioral HR questions in a simulated real-time conversation.</p>
            </header>

            {!interviewSession && !interviewFinishedData && (
              <div className="glass-card max-w-[600px] mx-auto p-6 md:p-10">
                <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>Configure Interview Session</h3>

                <div className="form-group">
                  <label>Choose Interview Domain</label>
                  <select className="form-control" value={interviewType} onChange={e => setInterviewType(e.target.value)}>
                    <option value="technical">Technical Mock (FastAPI, DSA, OS, Databases)</option>
                    <option value="hr">HR Behavioral Mock (Communication, Conflict, Alignment)</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: '2rem' }}>
                  <label>Target Role Designation</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Software Engineer, Frontend Architect"
                    value={interviewRole}
                    onChange={e => setInterviewRole(e.target.value)}
                  />
                </div>

                <button onClick={startInterviewSession} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={interviewLoading}>
                  {interviewLoading ? <RefreshCw className="animate-spin" size={18} /> : (
                    <>
                      <Play size={18} />
                      <span>Start Simulated Interview Session</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {interviewSession && (
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 250px)', padding: '0' }}>
                <div className="flex justify-between border-b border-white/10 p-4 bg-white/[0.02]">
                  <span style={{ fontWeight: 700 }} className="text-sm sm:text-base">Active session: {interviewSession.role} ({interviewSession.type.toUpperCase()})</span>
                  <span style={{ color: 'var(--primary)', fontWeight: 600 }} className="text-sm">Active Loop</span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-4">
                  {interviewTranscript.map((turn, idx) => (
                    <div 
                      key={idx} 
                      className={`message-bubble ${turn.role === 'interviewer' ? 'assistant' : 'user'} max-w-[85%] md:max-w-[75%]`}
                    >
                      <p style={{ fontWeight: turn.role === 'interviewer' ? 700 : 500, fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                        {turn.role === 'interviewer' ? 'Interviewer Agent' : 'You (Candidate)'}
                      </p>
                      <div style={{ whiteSpace: 'pre-wrap' }}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{turn.text}</ReactMarkdown>
                      </div>
                    </div>
                  ))}
                  {interviewLoading && (
                    <div className="message-bubble assistant" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Interviewer is analyzing response...</span>
                    </div>
                  )}
                  <div ref={interviewChatEndRef} />
                </div>

                <form onSubmit={submitInterviewAnswer} style={{ display: 'flex', borderTop: '1px solid var(--surface-border)', padding: '1rem', background: 'rgba(9, 13, 22, 0.4)' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Provide your detailed answer..."
                    value={interviewInput}
                    onChange={e => setInterviewInput(e.target.value)}
                    style={{ borderTopRightRadius: '0', borderBottomRightRadius: '0', borderRight: 'none' }}
                    disabled={interviewLoading}
                  />
                  <button type="submit" className="btn-primary" style={{ borderTopLeftRadius: '0', borderBottomLeftRadius: '0' }} disabled={interviewLoading}>
                    <Send size={16} />
                  </button>
                </form>
              </div>
            )}

            {interviewFinishedData && (
              <div className="glass-card max-w-[750px] mx-auto p-6 md:p-8">
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                  <div style={{ display: 'inline-flex', padding: '1.25rem', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '50%', color: '#10b981', marginBottom: '1rem' }}>
                    <Award size={36} />
                  </div>
                  <h2>Interview Completed!</h2>
                  <p style={{ color: 'var(--text-secondary)' }}>Read your performance scorecard below.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-6 bg-white/[0.02] p-6 rounded-2xl border border-white/[0.08] mb-8 items-center text-center sm:text-left">
                  <div style={{ display: 'flex', width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary-gradient)', fontSize: '1.75rem', fontWeight: 800, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {interviewFinishedData.score}
                  </div>
                  <div>
                    <h4>Overall Score: {interviewFinishedData.score}/10</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>Based on correctness, technical metrics, and behavioral alignment.</p>
                  </div>
                </div>

                <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '0.95rem', color: '#e2e8f0' }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{interviewFinishedData.feedback}</ReactMarkdown>
                </div>

                <button onClick={() => setInterviewFinishedData(null)} className="btn-primary" style={{ marginTop: '2rem' }}>
                  <span>Configure New Interview</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 7: PROGRESS ANALYTICS */}
        {activeTab === "analytics" && (
          <div>
            <header className="page-header">
              <h2>Progress <span className="gradient-text">Analytics Cabin</span></h2>
              <p>Analyze roadmap metrics, complete goals, and review recommendations.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 flex flex-col gap-6">
                <div className="glass-card stats-card">
                  <div className="stats-icon">
                    <Flame size={24} />
                  </div>
                  <div className="stats-info">
                    <h4>{progressMetrics.streak} Days</h4>
                    <p>Current Prep Streak</p>
                  </div>
                </div>

                <div className="glass-card stats-card">
                  <div className="stats-icon" style={{ background: 'rgba(6, 182, 212, 0.15)', borderColor: 'rgba(6, 182, 212, 0.3)', color: '#06b6d4' }}>
                    <BookOpenCheck size={24} />
                  </div>
                  <div className="stats-info">
                    <h4>{progressMetrics.completion_rate}%</h4>
                    <p>Roadmap Milestones</p>
                  </div>
                </div>

                {/* Animated SVG Completion Gauge */}
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem' }}>
                  <svg width="150" height="150" viewBox="0 0 150 150">
                    <circle cx="75" cy="75" r="60" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                    <circle 
                      cx="75" 
                      cy="75" 
                      r="60" 
                      fill="none" 
                      stroke="url(#purpleGrad)" 
                      strokeWidth="12" 
                      strokeDasharray={2 * Math.PI * 60}
                      strokeDashoffset={2 * Math.PI * 60 * (1 - progressMetrics.completion_rate / 100)}
                      strokeLinecap="round"
                      transform="rotate(-90 75 75)"
                      style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                    />
                    <defs>
                      <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#06b6d4" />
                      </linearGradient>
                    </defs>
                    <text x="75" y="80" textAnchor="middle" fill="#f8fafc" fontSize="22" fontWeight="800" fontFamily="var(--font-display)">
                      {progressMetrics.completion_rate}%
                    </text>
                  </svg>
                  <p style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Overall Prep Coverage</p>
                </div>
              </div>

              <div className="glass-card lg:col-span-2">
                <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>AI Progress Evaluation Summary</h3>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '0.95rem', color: '#e2e8f0' }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{progressMetrics.feedback_summary}</ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: SETTINGS */}
        {activeTab === "settings" && (
          <div>
            <header className="page-header">
              <h2>Onboarding <span className="gradient-text">Profile Settings</span></h2>
              <p>Configure details parsed by Student Profile Agent to direct customized roadmaps.</p>
            </header>

            <div className="glass-card max-w-[800px]">
              {settingsMessage && (
                <div className="glass-card" style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.3)', padding: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: '#a78bfa', marginBottom: '0.5rem', fontWeight: 600 }}>
                    <Sparkles size={16} />
                    <span>Profile Agent Response</span>
                  </div>
                  <p style={{ fontSize: '0.9rem', fontStyle: 'italic', lineHeight: '1.5' }}>"{settingsMessage.replace(/###.*?\n/, "")}"</p>
                </div>
              )}

              <form onSubmit={handleUpdateProfile}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="form-group">
                    <label>Full Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={profileForm.name}
                      onChange={e => setProfileForm({...profileForm, name: e.target.value})}
                    />
                  </div>

                  <div className="form-group">
                    <label>Degree / Course</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. B.Tech, Diploma"
                      value={profileForm.degree}
                      onChange={e => setProfileForm({...profileForm, degree: e.target.value})}
                    />
                  </div>

                  <div className="form-group">
                    <label>Branch / Specialization</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. Computer Science, Information Tech"
                      value={profileForm.branch}
                      onChange={e => setProfileForm({...profileForm, branch: e.target.value})}
                    />
                  </div>

                  <div className="form-group">
                    <label>Semester / Year</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. 7th Semester, 4th Year"
                      value={profileForm.semester}
                      onChange={e => setProfileForm({...profileForm, semester: e.target.value})}
                    />
                  </div>

                  <div className="form-group">
                    <label>Target Dream Company</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. Google, Microsoft"
                      value={profileForm.target_company}
                      onChange={e => setProfileForm({...profileForm, target_company: e.target.value})}
                    />
                  </div>

                  <div className="form-group">
                    <label>Target Job Designation</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. Full Stack Developer"
                      value={profileForm.dream_role}
                      onChange={e => setProfileForm({...profileForm, dream_role: e.target.value})}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '1.25rem' }}>
                  <label>Skills (Comma-separated)</label>
                  <textarea 
                    className="form-control" 
                    rows="3" 
                    placeholder="e.g. Python, SQL, React.js, FastAPI, Git"
                    value={profileForm.skills}
                    onChange={e => setProfileForm({...profileForm, skills: e.target.value})}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '2rem' }}>
                  <label>Preferred Languages</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. C++, Java, Python"
                    value={profileForm.languages}
                    onChange={e => setProfileForm({...profileForm, languages: e.target.value})}
                  />
                </div>

                <button type="submit" className="btn-primary w-full sm:w-auto justify-center" disabled={settingsLoading}>
                  {settingsLoading ? <RefreshCw className="animate-spin" size={18} /> : (
                    <>
                      <span>Save and Update Profile</span>
                      <ChevronRight size={18} />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
