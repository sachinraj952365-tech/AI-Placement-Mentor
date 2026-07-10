# 🚀 AI Placement Mentor
### Kaggle + Google "AI Agents: Intensive Vibe Coding Capstone Project"

**AI Placement Mentor** is an intelligent, concierge-style career mentor application designed for B.Tech students, freshers, and job seekers. The system utilizes a **Multi-Agent Architecture** powered by the **Google Agent Development Kit (ADK)**, **Gemini / Groq / OpenRouter Models**, and a dedicated **MCP Server** to deliver highly tailored career coaching. 

It provides resume evaluations, personalized study roadmaps, DSA preparation guidance, project recommendations, mock interviews, and progress tracking—all integrated into a single cohesive platform.

---

# ✨ Features

*   🤖 **AI Mentor Chat**: Dynamic placement guidance powered by a central Coordinator Agent.
*   📄 **Resume ATS Review**: In-depth analysis of uploaded resumes with detailed feedback and an estimated ATS score.
*   🛣️ **Personalized Placement Roadmap**: Customized weekly preparation roadmaps tailored to your dream role and target company.
*   💻 **DSA Preparation Guidance**: Step-by-step DSA guidelines and learning tracks.
*   💼 **Project Recommendations**: Starter project ideas and GitHub-ready specifications aligned with your skills and domain.
*   🎤 **Technical Mock Interview**: Conversational, multi-turn technical interview practice with automated score and feedback.
*   🗣️ **HR Mock Interview**: Conversational HR interview practice addressing behavioral questions.
*   📊 **Progress Analytics Dashboard**: Interactive statistics showing roadmap task completion rate, average interview scores, and performance feedback.
*   💡 **Daily Motivation & Badges**: Earn gamified badges (e.g., *Consistent Coder*, *Placement Warrior*) based on your learning streak.
*   👤 **Student Profile Management**: Manage skills, target companies, dream roles, degree details, and target semester.
*   🌙 **Modern Responsive UI**: Custom glassmorphism dark-themed design system optimized for all device screens.

---

# 🛠️ Tech Stack

### Frontend
*   **React.js** & **Vite** (Single Page App)
*   **Vanilla CSS3** (Custom CSS variables supporting modern glassmorphism design system)
*   **Lucide React Icons** (Modern iconography)

### Backend
*   **FastAPI** & **Uvicorn** (Python 3.10+)
*   **SQLAlchemy ORM** (Database interaction)
*   **SQLite** (Development database) / **PostgreSQL** (Production ready)

### AI Providers & ADK
*   **Google Agent Development Kit (ADK)** (Agent orchestration)
*   **Google Gemini** (Primary model support - `gemini-2.0-flash`)
*   **Groq API** (`llama-3.1-8b-instant`)
*   **OpenRouter** & **Ollama** (Fallback and local LLM integrations)

### MCP Server & Tools
*   **FastMCP** (Python library for Model Context Protocol)
*   **pypdf** (PDF parsing and extraction)
*   **DuckDuckGo Search Integration** (Live web searches)

---

# 📸 Screenshots

> Add screenshots of the following pages here.

*   **Dashboard**: `![Dashboard](https://placehold.co/800x450/1e1e24/fff?text=Dashboard)`
*   **AI Mentor Chat**: `![AI Mentor Chat](https://placehold.co/800x450/1e1e24/fff?text=AI+Mentor+Chat)`
*   **Resume Review**: `![Resume Review](https://placehold.co/800x450/1e1e24/fff?text=Resume+Review)`
*   **Roadmap**: `![Roadmap](https://placehold.co/800x450/1e1e24/fff?text=Roadmap)`
*   **Mock Interview**: `![Mock Interview](https://placehold.co/800x450/1e1e24/fff?text=Mock+Interview)`
*   **Progress Dashboard**: `![Progress Dashboard](https://placehold.co/800x450/1e1e24/fff?text=Progress+Dashboard)`

---

# 🧠 Project Architecture

The application implements a hierarchical multi-agent structure built using the **Google ADK Agent** abstractions:

```
Student (User)
    │
    ▼
Coordinator Agent ◄──────────► MCP Server (FastMCP)
    │                             ├── read_pdf (pypdf reader)
    │                             ├── web_search (DuckDuckGo search)
    │                             ├── recommend_projects (GitHub starter specs)
    │                             └── lookup_resources (Resource DB)
    │
    ├──────── Student Profile Agent
    ├──────── Resume Agent
    ├──────── Placement Roadmap Agent
    ├──────── DSA Agent
    ├──────── Resume Review Agent
    ├──────── Project Recommendation Agent
    ├──────── Technical Interview Agent
    ├──────── HR Interview Agent
    ├──────── Progress Agent
    ├──────── Resource Agent
    └──────── Motivation Agent
             │
             ▼
      AI Provider Manager
             │
     ┌───────┼────────┐
     │       │        │
   Groq   Gemini   OpenRouter / Ollama
```

### Flow Diagram

```mermaid
graph TD
    User[Student User] -->|Queries / Requests| Coordinator[Coordinator Agent]
    Coordinator -->|Delegates Context| SubAgents[Specialist Agents]
    
    subgraph Specialist Agents
        SubAgents --> Profile[Student Profile Agent]
        SubAgents --> Resume[Resume Review Agent]
        SubAgents --> Roadmap[Placement Roadmap Agent]
        SubAgents --> DSA[DSA Mentor Agent]
        SubAgents --> Project[Project Recommender Agent]
        SubAgents --> TechMock[Technical Mock Interview Agent]
        SubAgents --> HrMock[HR Interview Agent]
        SubAgents --> Progress[Progress Agent]
        SubAgents --> Resource[Resource Agent]
        SubAgents --> Motivation[Motivation Agent]
    end

    Coordinator -->|Uses Tools| McpServer[MCP FastMCP Server]
    McpServer --> read_pdf[pypdf PDF Reader]
    McpServer --> web_search[Internet Search]
    McpServer --> recommend_projects[Project Recommendation Tools]
    McpServer --> lookup_resources[Curated Resources Search]
```

---

# 📂 Folder Structure

```text
AI-placement-mentor/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI application server & routes
│   │   ├── schemas.py           # Pydantic validation schemas
│   │   ├── agents/
│   │   │   ├── __init__.py
│   │   │   ├── agents.py        # 11 Google ADK agent configurations & fallback systems
│   │   │   └── provider_manager.py # Multi-LLM provider adapter (Gemini, Groq, OpenRouter)
│   │   ├── database/
│   │   │   ├── __init__.py
│   │   │   ├── db.py            # SQLite session and connection configuration
│   │   │   ├── models.py        # SQLAlchemy database schemas
│   │   │   ├── crud.py          # CRUD query transactions
│   │   │   └── init_db.py       # Helper script to initialize database tables
│   │   └── mcp/
│   │       ├── __init__.py
│   │       └── mcp_server.py    # FastMCP server with custom tools & PDF extraction
│   └── requirements.txt         # Backend Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # React main application layout, state, and dashboard views
│   │   ├── index.css            # Custom CSS variables, transitions, and glassmorphism styling
│   │   └── main.jsx             # React DOM entry point
│   ├── index.html               # Main HTML entry point
│   ├── vite.config.js           # Vite build configuration and proxy routing
│   └── package.json             # Frontend Node dependencies
├── Dockerfile                   # Multi-stage container for cloud deployment (e.g. Cloud Run)
└── README.md                    # Main project documentation
```

---

# ⚡ MCP Server & Tools

The agents dynamically interface with the Model Context Protocol (MCP) server using the following tools:
1.  **`read_pdf(file_path)`**: Reads and extracts text from resume PDF uploads using `pypdf`.
2.  **`web_search(query)`**: Performs live queries to fetch hiring trends and interview patterns.
3.  **`lookup_resources(tech_stack)`**: Searches a database of links (official docs, courses, videos).
4.  **`recommend_projects(domain, level)`**: Returns high-quality GitHub starter specifications.

---

# 🛡️ Security & Best Practices

*   **API Key Isolation**: Secrets are loaded strictly from environment variables.
*   **File Upload Validation**: Restricts uploads strictly to `.pdf` format. Files are sanitized and stored locally using unique IDs to prevent path-traversal attacks.
*   **Prompt Injection Safeguards**: System instructions strictly enforce behavioral boundaries on Mock Interview and HR agents.
*   **Structured Errors**: Proper exception wrapping in FastAPI ensures stack traces are never exposed in REST payloads.

---

# ⚙️ Getting Started

### 1. Prerequisites
Ensure you have the following installed:
*   Python 3.10+
*   Node.js 18+

### 2. Clone Repository
```bash
git clone https://github.com/yourusername/AI-placement-mentor.git
cd AI-placement-mentor
```

### 3. Backend Setup
1. **Create and Activate Virtual Environment**:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
2. **Install Dependencies**:
   ```bash
   pip install -r backend/requirements.txt
   ```
3. **Initialize Database Tables**:
   ```bash
   python backend/app/database/init_db.py
   ```
4. **Run FastAPI Development Server**:
   ```bash
   uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
   ```

### 4. Frontend Setup
In a separate terminal window:
1. **Navigate to Frontend Directory**:
   ```bash
   cd frontend
   ```
2. **Install Node Packages**:
   ```bash
   npm install
   ```
3. **Launch Vite Development Server**:
   ```bash
   npm run dev
   ```
   Open **http://localhost:5173** in your web browser. (Vite is preconfigured to proxy `/api` calls to port 8000 automatically).

---

# ⚙️ Environment Variables

Create a `.env` file in the root directory:

```env
AI_PROVIDER=groq

# Groq Configuration
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.1-8b-instant

# Gemini Configuration
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.0-flash

# Database Configuration
DATABASE_URL=sqlite:///./placement_mentor.db

# CORS Configuration
CORS_ORIGIN=http://localhost:5173
```

### Reference

| Variable | Description | Example / Default | Required For |
| :--- | :--- | :--- | :--- |
| `AI_PROVIDER` | The active LLM engine provider | `groq` (or `gemini`, `openrouter`, `ollama`) | **All** |
| `GROQ_API_KEY` | Your Groq Cloud Console API Key | `gsk_...` | Groq Provider |
| `GROQ_MODEL` | The LLM model to query on Groq | `llama-3.1-8b-instant` | Groq Provider |
| `GEMINI_API_KEY` | Google Gemini AI Studio API Key | `AIzaSy...` | Gemini Provider |
| `GEMINI_MODEL` | Gemini LLM model name | `gemini-2.0-flash` | Gemini Provider |
| `OPENROUTER_API_KEY` | OpenRouter API Key | `sk-or-...` | OpenRouter Provider |
| `OLLAMA_BASE_URL` | Base endpoint of local Ollama API | `http://localhost:11434` | Ollama Provider |
| `DATABASE_URL` | SQLAlchemy connection string | `sqlite:///./placement_mentor.db` | Backend database |
| `CORS_ORIGIN` | Allowed production frontend origin | `https://your-app.vercel.app` | Production CORS Security |

---

# 📡 Main API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Login or register with email & name |
| `GET` | `/api/profile/{student_id}` | Retrieve profile details of a student |
| `POST` | `/api/profile/{student_id}` | Update student profile and trigger Profile Agent |
| `POST` | `/api/resume/upload/{student_id}` | Upload PDF resume, extract text, and run Resume ATS Agent |
| `GET` | `/api/resume/latest/{student_id}` | Retrieve latest uploaded resume analysis report & score |
| `POST` | `/api/roadmap/generate/{student_id}` | Generate a personalized placement prep roadmap |
| `GET` | `/api/roadmap/{student_id}` | Get active roadmap tasks and checklist status |
| `POST` | `/api/mentor/chat/{student_id}` | Chat with the Coordinator Agent for career guidance |
| `GET` | `/api/mentor/history/{student_id}` | Get history of chat messages for the student |
| `POST` | `/api/interview/start/{student_id}` | Start a mock interview session (type: `technical` / `hr`) |
| `POST` | `/api/interview/answer/{session_id}` | Submit candidate's answer and get the next question or feedback |
| `GET` | `/api/interview/sessions/{student_id}` | Get history of mock interview sessions |
| `GET` | `/api/interview/session/{session_id}` | Get detailed transcript and feedback of a mock interview session |
| `GET` | `/api/progress/{student_id}` | Get progress completion rate, streak, and Agent feedback |
| `POST` | `/api/progress/complete-task/{student_id}` | Toggle a roadmap task checklist item (completed/pending) |
| `GET` | `/api/motivation/{student_id}` | Get motivational booster text and active streak badges |
| `GET` | `/health` | System health check and active AI provider information |

---

# 🐳 Containerization & Local Run

Build and run the entire application locally using Docker:
```bash
# Build Docker image
docker build -t placement-mentor .

# Run Docker container
docker run -p 8000:8000 \
  -e AI_PROVIDER="groq" \
  -e GROQ_API_KEY="your-groq-key" \
  placement-mentor
```
The application will be accessible at [http://localhost:8000](http://localhost:8000).

---

# 🚀 Deployment

### Frontend (Vercel)
1. Import the repository in Vercel.
2. Select `frontend` as the **Root Directory**.
3. Set the framework preset to **Vite**.
4. Configure the environment variable:
   *   `VITE_API_BASE=https://your-backend-url.onrender.com` (Your deployed backend URL, without trailing slash).
5. Click **Deploy**.

### Backend (Render)
1. Create a new **Web Service** on Render.
2. Set the Environment/Language to `Docker`.
3. In the environment variables configuration, add:
   *   `AI_PROVIDER=groq` (or `gemini`)
   *   `GROQ_API_KEY=your-api-key`
   *   `DATABASE_URL=postgresql://user:password@host:port/dbname` (Switching to PostgreSQL preserves student progress, as Render containers have ephemeral disks).
   *   `CORS_ORIGIN=https://your-app.vercel.app` (Your Vercel frontend URL).
4. Click **Deploy**.

---

# 💡 Future Improvements

*   🔐 **Authentication with Google**: Secure OAuth2 sign-in.
*   🏢 **Company-wise Interview Experiences**: Curated list of mock interviews mimicking specific companies (e.g., Google, Amazon, TCS).
*   📈 **Resume Score History**: Tracking improvements in resume scores over time.
*   ✉️ **Email Notifications**: Weekly reports sent to students about their placement milestones.
*   🎙️ **AI Voice Interview**: Real-time voice interaction during mock technical and HR interviews.
*   👔 **Admin Dashboard**: Analytics for college placements coordinators to track batch progress.
*   🌐 **Multi-language Support**: Guidance in regional languages.
*   🏆 **Leaderboard**: Gamified leaderboards to encourage coding consistency.

---

# 📚 What I Learned

While building this project, I gained hands-on experience with:
*   **API Design**: Creating scalable REST APIs using FastAPI, query dependencies, and structured exception handling.
*   **React Frontend Architecture**: Managing states, component rendering, handling file uploads, and creating smooth CSS-based glassmorphism transitions.
*   **Multi-Agent System Orchestration**: Building hierarchical agent execution models utilizing the Google ADK frameworks.
*   **Prompt Engineering**: Structuring detailed system prompts for Mock Interviewers, Career Mentors, and Progress Evaluators.
*   **Model Context Protocol (MCP)**: Connecting agents directly to local tools for file extraction (PDF) and live internet searches.
*   **Containerization**: Bundling React and FastAPI applications together in a multi-stage Docker container for production deployment.

---

# 👨‍💻 Author

**Sachin**
*B.Tech – Information Technology*

*   **GitHub**: [github.com/yourusername](https://github.com/sachinraj952365-tech)
*   **LinkedIn**: [linkedin.com/in/yourusername](https://www.linkedin.com/in/sachin-kumar-sah-a480b6310/)
*   **Email**: [your-email@example.com](sachinraj952365@gmail.com)

---

# ⭐ About This Project

This project was built as a personal learning project to explore modern AI application development using FastAPI, React, and a multi-agent architecture. The primary goal was to create a practical platform that helps students prepare for placements while improving skills in full-stack development, API integration, and AI-powered workflows.
