import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  LayoutDashboard, MessageSquare, FileText, Map, Code, 
  Award, TrendingUp, Settings as SettingsIcon, LogOut, 
  ChevronRight, Send, CheckCircle2, Circle, Upload, 
  Play, ArrowRight, User, Sparkles, BookOpen, Heart, 
  Flame, BookOpenCheck, Check, AlertCircle, RefreshCw, Menu,
  Plus, Trash, Trash2, ThumbsUp, ThumbsDown, Copy, RotateCcw
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
  const textareaRef = useRef(null);

  // ChatGPT Redesign Conversations States
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState("");
  const [chatSidebarOpen, setChatSidebarOpen] = useState(false);

  const activeConversation = conversations.find(c => c.id === activeConversationId);
  const activeMessages = activeConversation ? activeConversation.messages : [];

  // Auto-grow textarea height
  const handleInputChange = (e) => {
    setChatInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  };

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

  // ChatGPT Sync Effects
  useEffect(() => {
    if (student && student.id) {
      const saved = localStorage.getItem(`mentor_conversations_${student.id}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setConversations(parsed);
          const savedId = localStorage.getItem(`mentor_active_conv_${student.id}`);
          if (savedId && parsed.find(c => c.id === savedId)) {
            setActiveConversationId(savedId);
          } else if (parsed.length > 0) {
            setActiveConversationId(parsed[0].id);
          }
        } catch (e) {
          console.error(e);
        }
      } else {
        fetchChatHistory();
      }
    } else {
      setConversations([]);
      setActiveConversationId("");
    }
  }, [student]);

  useEffect(() => {
    if (student && student.id && conversations.length > 0) {
      localStorage.setItem(`mentor_conversations_${student.id}`, JSON.stringify(conversations));
    }
  }, [conversations, student]);

  useEffect(() => {
    if (student && student.id && activeConversationId) {
      localStorage.setItem(`mentor_active_conv_${student.id}`, activeConversationId);
    }
  }, [activeConversationId, student]);

  // Fetch relevant tab data when activeTab or student changes
  useEffect(() => {
    if (!student || !student.id) return;

    if (activeTab === "dashboard") {
      fetchProgress();
      fetchMotivation();
      fetchLatestResume();
    } else if (activeTab === "chat") {
      if (conversations.length === 0) {
        fetchChatHistory();
      }
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
  }, [conversations, chatLoading, activeTab]);

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
    if (student) {
      localStorage.removeItem(`mentor_conversations_${student.id}`);
      localStorage.removeItem(`mentor_active_conv_${student.id}`);
    }
    setStudent(null);
    setChatMessages([]);
    setConversations([]);
    setActiveConversationId("");
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
    if (!student || !student.id) return;
    try {
      const res = await fetch(`${API_BASE}/api/mentor/history/${student.id}`);
      if (res.status === 404) {
        handleLogout();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const defaultConv = {
            id: "imported_history",
            title: "Imported History",
            messages: data,
            timestamp: Date.now()
          };
          setConversations([defaultConv]);
          setActiveConversationId("imported_history");
          localStorage.setItem(`mentor_conversations_${student.id}`, JSON.stringify([defaultConv]));
          localStorage.setItem(`mentor_active_conv_${student.id}`, "imported_history");
        }
      }
    } catch (e) {}
  };

  const sendChatMessage = async (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || !student || !student.id) return;

    let currentConvId = activeConversationId;
    let currentConvs = [...conversations];
    const userText = chatInput.trim();
    setChatInput("");
    
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    if (!currentConvId) {
      const newConv = {
        id: `conv_${Date.now()}`,
        title: userText.length > 25 ? `${userText.slice(0, 25)}...` : userText,
        messages: [],
        timestamp: Date.now()
      };
      currentConvs = [newConv, ...currentConvs];
      currentConvId = newConv.id;
      setConversations(currentConvs);
      setActiveConversationId(newConv.id);
    }

    const userMessage = { sender: "user", content: userText, timestamp: new Date().toISOString() };
    
    setConversations(prev => prev.map(c => {
      if (c.id === currentConvId) {
        const title = c.title === "New Chat" && c.messages.length === 0 
          ? (userText.length > 25 ? `${userText.slice(0, 25)}...` : userText)
          : c.title;
        return {
          ...c,
          title,
          messages: [...c.messages, userMessage],
          timestamp: Date.now()
        };
      }
      return c;
    }));

    setChatLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/mentor/chat/${student.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText })
      });

      if (res.ok) {
        const data = await res.json();
        const assistantMessage = { 
          sender: "assistant", 
          content: data.response, 
          timestamp: new Date().toISOString(),
          feedback: null
        };
        
        setConversations(prev => prev.map(c => {
          if (c.id === currentConvId) {
            return {
              ...c,
              messages: [...c.messages, assistantMessage],
              timestamp: Date.now()
            };
          }
          return c;
        }));
      } else {
        throw new Error();
      }
    } catch (e) {
      const errMessage = { 
        sender: "assistant", 
        content: "Sorry, I had trouble contacting the coordinator agent. Please check if backend is running.",
        timestamp: new Date().toISOString()
      };
      setConversations(prev => prev.map(c => {
        if (c.id === currentConvId) {
          return {
            ...c,
            messages: [...c.messages, errMessage]
          };
        }
        return c;
      }));
    } finally {
      setChatLoading(false);
    }
  };

  // ChatGPT Redesign Conversation Actions
  const handleLikeMessage = (convId, msgIdx) => {
    setConversations(prev => prev.map(c => {
      if (c.id === convId) {
        const updatedMsgs = [...c.messages];
        updatedMsgs[msgIdx] = {
          ...updatedMsgs[msgIdx],
          feedback: updatedMsgs[msgIdx].feedback === "like" ? null : "like"
        };
        return { ...c, messages: updatedMsgs };
      }
      return c;
    }));
  };

  const handleDislikeMessage = (convId, msgIdx) => {
    setConversations(prev => prev.map(c => {
      if (c.id === convId) {
        const updatedMsgs = [...c.messages];
        updatedMsgs[msgIdx] = {
          ...updatedMsgs[msgIdx],
          feedback: updatedMsgs[msgIdx].feedback === "dislike" ? null : "dislike"
        };
        return { ...c, messages: updatedMsgs };
      }
      return c;
    }));
  };

  const handleRegenerateResponse = async (convId, msgIdx) => {
    const conv = conversations.find(c => c.id === convId);
    if (!conv || msgIdx <= 0) return;
    
    const userPrompt = conv.messages[msgIdx - 1]?.content;
    if (!userPrompt) return;

    setChatLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/mentor/chat/${student.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userPrompt })
      });

      if (res.ok) {
        const data = await res.json();
        setConversations(prev => prev.map(c => {
          if (c.id === convId) {
            const updatedMsgs = [...c.messages];
            updatedMsgs[msgIdx] = {
              ...updatedMsgs[msgIdx],
              content: data.response,
              timestamp: new Date().toISOString(),
              feedback: null
            };
            return { ...c, messages: updatedMsgs };
          }
          return c;
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setChatLoading(false);
    }
  };

  const handleNewChat = () => {
    if (!student || !student.id) return;
    const newConv = {
      id: `conv_${Date.now()}`,
      title: "New Chat",
      messages: [],
      timestamp: Date.now()
    };
    const updatedConvs = [newConv, ...conversations];
    setConversations(updatedConvs);
    setActiveConversationId(newConv.id);
    localStorage.setItem(`mentor_conversations_${student.id}`, JSON.stringify(updatedConvs));
    localStorage.setItem(`mentor_active_conv_${student.id}`, newConv.id);
    setChatSidebarOpen(false);
  };

  const handleClearCurrentChat = () => {
    if (!activeConversationId) return;
    if (window.confirm("Are you sure you want to clear all messages in this conversation?")) {
      setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...c, messages: [] } : c));
    }
  };

  const handleDeleteConversation = (convId) => {
    if (!convId) return;
    if (window.confirm("Are you sure you want to delete this conversation?")) {
      const updated = conversations.filter(c => c.id !== convId);
      setConversations(updated);
      if (activeConversationId === convId) {
        if (updated.length > 0) {
          setActiveConversationId(updated[0].id);
        } else {
          setActiveConversationId("");
        }
      }
    }
  };

  const handleDeleteAllChats = () => {
    if (window.confirm("Are you sure you want to delete ALL conversations? This cannot be undone.")) {
      setConversations([]);
      setActiveConversationId("");
      localStorage.removeItem(`mentor_conversations_${student.id}`);
      localStorage.removeItem(`mentor_active_conv_${student.id}`);
    }
  };

  const getGroupedConversations = () => {
    const today = [];
    const yesterday = [];
    const older = [];
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

    conversations.forEach(conv => {
      const time = new Date(conv.timestamp).getTime();
      if (time >= startOfToday) {
        today.push(conv);
      } else if (time >= startOfYesterday) {
        yesterday.push(conv);
      } else {
        older.push(conv);
      }
    });

    return { today, yesterday, older };
  };

  const renderSidebarItem = (conv) => {
    const isActive = conv.id === activeConversationId;
    return (
      <div 
        key={conv.id}
        className={`group relative flex items-center justify-between rounded-lg p-2 cursor-pointer transition ${isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}
        onClick={() => {
          setActiveConversationId(conv.id);
          setChatSidebarOpen(false);
        }}
      >
        <div className="flex items-center gap-2 min-w-0 pr-6">
          <MessageSquare size={14} className="flex-shrink-0" />
          <span className="text-xs truncate font-medium">{conv.title}</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteConversation(conv.id);
          }}
          className="absolute right-2 opacity-0 group-hover:opacity-100 hover:text-red-400 p-0.5 rounded transition"
        >
          <Trash size={12} />
        </button>
      </div>
    );
  };

  const renderEmptyState = () => {
    const suggestions = [
      { text: "How do I prepare for DSA interviews?", icon: "💡" },
      { text: "Suggest an advanced full stack web dev project", icon: "🚀" },
      { text: "How can I improve my resume ATS score?", icon: "📄" },
      { text: "What is a deadlock in Operating Systems?", icon: "🖥️" }
    ];
    return (
      <div className="flex-1 overflow-y-auto flex flex-col justify-center items-center p-6 text-center animate-[fadeIn_0.3s_ease-out]">
        <div className="max-w-[500px] space-y-6">
          <div>
            <div className="inline-flex p-3 rounded-full bg-white/5 text-primary mb-3 text-2xl">👋</div>
            <h3 className="text-lg font-bold text-white mb-1">Welcome to Placement Mentor AI</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ask anything about DSA, Resumes, Mock Interviews, custom timelines, project designs, or career guidance.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                onClick={() => setChatInput(s.text)}
                className="p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-primary/30 hover:bg-white/[0.04] transition text-xs text-slate-300 flex items-start gap-2.5"
              >
                <span className="text-sm">{s.icon}</span>
                <span className="font-semibold leading-normal">{s.text}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderThinkingIndicator = () => {
    return (
      <div className="message-bubble assistant" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span>Placement Mentor is thinking</span>
        <div className="thinking-dots">
          <span className="thinking-dot"></span>
          <span className="thinking-dot"></span>
          <span className="thinking-dot"></span>
        </div>
      </div>
    );
  };

  const renderMessage = (msg, idx) => {
    const isAssistant = msg.sender === "assistant";
    return (
      <div key={idx} className={`message-bubble ${msg.sender} flex flex-col gap-2`}>
        <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }} className="text-sm leading-relaxed">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                const language = match ? match[1] : '';
                const codeString = String(children).replace(/\n$/, '');
                if (!inline && match) {
                  return (
                    <div className="code-block-container my-3 rounded-lg overflow-hidden border border-white/10 bg-slate-950 text-left font-sans">
                      <div className="flex justify-between items-center px-4 py-1.5 bg-slate-900/80 text-[10px] text-slate-400 font-semibold border-b border-white/5">
                        <span>{language.toUpperCase()}</span>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(codeString);
                            alert("Code copied to clipboard!");
                          }}
                          className="hover:text-white flex items-center gap-1 transition"
                        >
                          <Copy size={10} />
                          <span>Copy Code</span>
                        </button>
                      </div>
                      <pre className="p-3 overflow-auto max-h-[250px] text-xs text-slate-100 font-mono" style={{ whiteSpace: 'pre', margin: 0 }}>
                        <code {...props}>{children}</code>
                      </pre>
                    </div>
                  );
                }
                return (
                  <code className="bg-white/10 px-1 py-0.5 rounded text-xs font-mono" {...props}>
                    {children}
                  </code>
                );
              }
            }}
          >
            {msg.content}
          </ReactMarkdown>
        </div>

        {isAssistant && (
          <div className="flex items-center gap-2 mt-1 pt-1.5 border-t border-white/5 text-slate-400 text-xs">
            <button 
              onClick={() => {
                navigator.clipboard.writeText(msg.content);
                alert("Response copied to clipboard!");
              }}
              className="hover:text-white flex items-center gap-1 transition-colors p-1"
              title="Copy Response"
            >
              <Copy size={12} />
              <span className="hidden sm:inline">Copy</span>
            </button>

            {msg.content.includes("```") && (
              <button 
                onClick={() => {
                  const codeBlocks = [];
                  const regex = /```(?:\w+)?\n([\s\S]*?)```/g;
                  let match;
                  while ((match = regex.exec(msg.content)) !== null) {
                    codeBlocks.push(match[1]);
                  }
                  if (codeBlocks.length > 0) {
                    navigator.clipboard.writeText(codeBlocks.join("\n\n"));
                    alert("All code blocks copied!");
                  }
                }}
                className="hover:text-white flex items-center gap-1 transition-colors p-1"
                title="Copy All Code Blocks"
              >
                <Code size={12} />
                <span className="hidden sm:inline">Copy Code</span>
              </button>
            )}

            <button 
              onClick={() => handleRegenerateResponse(activeConversationId, idx)}
              className="hover:text-white flex items-center gap-1 transition-colors p-1"
              title="Regenerate Response"
              disabled={chatLoading}
            >
              <RotateCcw size={12} />
              <span className="hidden sm:inline">Regenerate</span>
            </button>

            <div className="ml-auto flex items-center gap-1">
              <button 
                onClick={() => handleLikeMessage(activeConversationId, idx)}
                className={`p-1 transition-colors rounded ${msg.feedback === 'like' ? 'text-green-400 bg-green-500/10' : 'hover:text-white'}`}
              >
                <ThumbsUp size={12} />
              </button>
              <button 
                onClick={() => handleDislikeMessage(activeConversationId, idx)}
                className={`p-1 transition-colors rounded ${msg.feedback === 'dislike' ? 'text-red-400 bg-red-500/10' : 'hover:text-white'}`}
              >
                <ThumbsDown size={12} />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderInputArea = () => {
    const handleTextareaKeyDown = (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
      }
    };

    return (
      <div className="p-3 border-t border-white/5 bg-slate-900/20">
        <div className="chat-input-container">
          <textarea
            ref={textareaRef}
            rows="1"
            className="chat-textarea"
            placeholder="Ask your placement mentor anything..."
            value={chatInput}
            onChange={handleInputChange}
            onKeyDown={handleTextareaKeyDown}
            disabled={chatLoading}
          />
          <button 
            onClick={() => sendChatMessage()} 
            className="p-2 bg-primary hover:bg-primary/80 disabled:bg-slate-700 disabled:opacity-50 text-white rounded-xl transition flex items-center justify-center flex-shrink-0"
            disabled={chatLoading || !chatInput.trim()}
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-[10px] text-slate-500 text-center mt-1.5 hidden sm:block">
          Placement Mentor can make mistakes. Consider checking important information.
        </p>
      </div>
    );
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
          <div className="flex flex-col h-[calc(100dvh-5.75rem)] md:h-auto overflow-hidden">
            {/* Header bar */}
            <header className="page-header flex-shrink-0 flex justify-between items-center px-2 md:px-0">
              <div>
                <h2>Chat with <span className="gradient-text">Placement Mentor</span></h2>
                <p className="hidden sm:block text-xs text-slate-400">Coordinator agent routing queries to specialized sub-agents.</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setChatSidebarOpen(true)} 
                  className="md:hidden p-2 text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg flex items-center gap-1.5 text-xs font-semibold"
                >
                  <MessageSquare size={16} />
                  <span>History</span>
                </button>
              </div>
            </header>

            {/* Main Chat Layout Area (Row container) */}
            <div className="glass-card flex-1 min-h-0 overflow-hidden flex flex-row p-0 relative" style={{ background: 'var(--surface)' }}>
              
              {/* SIDEBAR FOR CHAT HISTORY */}
              <div className={`chat-history-sidebar ${chatSidebarOpen ? 'open' : ''} md:flex flex-col flex-shrink-0`}>
                {/* New Chat Button */}
                <div className="p-3 border-b border-white/5 flex-shrink-0">
                  <button 
                    onClick={handleNewChat}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-semibold text-white transition-all"
                  >
                    <Plus size={16} />
                    <span>New Chat</span>
                  </button>
                </div>

                {/* Chat Lists grouped chronologically */}
                <div className="flex-1 overflow-y-auto p-2 space-y-4">
                  {/* Today */}
                  {getGroupedConversations().today.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1">Today</div>
                      {getGroupedConversations().today.map(conv => renderSidebarItem(conv))}
                    </div>
                  )}

                  {/* Yesterday */}
                  {getGroupedConversations().yesterday.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1">Yesterday</div>
                      {getGroupedConversations().yesterday.map(conv => renderSidebarItem(conv))}
                    </div>
                  )}

                  {/* Older */}
                  {getGroupedConversations().older.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1">Older</div>
                      {getGroupedConversations().older.map(conv => renderSidebarItem(conv))}
                    </div>
                  )}

                  {conversations.length === 0 && (
                    <div className="text-xs text-slate-500 text-center py-8">No chats yet</div>
                  )}
                </div>

                {/* Sidebar Operations Footer */}
                <div className="p-2 border-t border-white/5 space-y-1 bg-black/10 flex-shrink-0">
                  {activeConversationId && (
                    <>
                      <button 
                        onClick={handleClearCurrentChat}
                        className="w-full text-left text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 py-1.5 px-3 rounded flex items-center gap-2 transition"
                      >
                        <RefreshCw size={12} />
                        <span>Clear Current Chat</span>
                      </button>
                      <button 
                        onClick={() => handleDeleteConversation(activeConversationId)}
                        className="w-full text-left text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 py-1.5 px-3 rounded flex items-center gap-2 transition"
                      >
                        <Trash size={12} />
                        <span>Delete Conversation</span>
                      </button>
                    </>
                  )}
                  {conversations.length > 0 && (
                    <button 
                      onClick={handleDeleteAllChats}
                      className="w-full text-left text-xs font-semibold text-red-500 hover:text-red-400 hover:bg-red-500/15 py-1.5 px-3 rounded flex items-center gap-2 transition"
                    >
                      <Trash2 size={12} />
                      <span>Delete All Chats</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Backdrop Overlay for mobile sidebar */}
              {chatSidebarOpen && (
                <div 
                  className="fixed inset-0 bg-black/55 backdrop-blur-sm z-[140] md:hidden"
                  onClick={() => setChatSidebarOpen(false)}
                />
              )}

              {/* MAIN MESSAGES DISPLAY */}
              <div className="flex-1 flex flex-col min-w-0 bg-[#090d16]/30">
                {!activeConversationId || activeMessages.length === 0 ? (
                  renderEmptyState()
                ) : (
                  <div className="chat-messages flex-1 overflow-y-auto">
                    {activeMessages.map((msg, idx) => renderMessage(msg, idx))}
                    {chatLoading && renderThinkingIndicator()}
                    <div ref={chatEndRef} />
                  </div>
                )}

                {renderInputArea()}
              </div>

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
