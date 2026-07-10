import os
import json
from fastmcp import FastMCP
from pypdf import PdfReader

# Initialize FastMCP Server
mcp = FastMCP("Placement Mentor MCP")

@mcp.tool()
def read_pdf(file_path: str) -> str:
    """
    Reads a PDF file from a local path and returns the extracted text.
    Useful for reading resumes.
    """
    if not os.path.exists(file_path):
        return f"Error: File not found at path '{file_path}'"
    
    try:
        reader = PdfReader(file_path)
        text = ""
        for i, page in enumerate(reader.pages):
            page_text = page.extract_text()
            if page_text:
                text += f"\n--- Page {i+1} ---\n" + page_text
        return text.strip() or "No text could be extracted from the PDF."
    except Exception as e:
        return f"Error reading PDF: {str(e)}"

@mcp.tool()
def lookup_resources(tech_stack: str) -> str:
    """
    Retrieves curated learning resources (docs, courses, videos, books) for a given technology stack (e.g. 'React', 'FastAPI', 'DSA', 'System Design').
    """
    tech_stack_lower = tech_stack.lower()
    
    resources = {
        "dsa": [
            {"title": "LeetCode", "url": "https://leetcode.com", "type": "Practice Website"},
            {"title": "GeeksforGeeks DSA Self Paced", "url": "https://www.geeksforgeeks.org/data-structures/", "type": "Course & Docs"},
            {"title": "NeetCode.io", "url": "https://neetcode.io", "type": "Practice & Videos"},
            {"title": "Introduction to Algorithms (CLRS)", "url": "https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/", "type": "Book"}
        ],
        "react": [
            {"title": "React Official Documentation", "url": "https://react.dev", "type": "Documentation"},
            {"title": "FreeCodeCamp React Course", "url": "https://www.youtube.com/watch?v=bMknfKXIFA8", "type": "YouTube Video"},
            {"title": "Full Stack Open", "url": "https://fullstackopen.com/en/", "type": "Free Course"},
            {"title": "Kent C. Dodds Epic React", "url": "https://epicreact.dev", "type": "Course"}
        ],
        "fastapi": [
            {"title": "FastAPI Official Documentation", "url": "https://fastapi.tiangolo.com", "type": "Documentation"},
            {"title": "TestDriven.io FastAPI Tutorials", "url": "https://testdriven.io/blog/topics/fastapi/", "type": "Tutorials"},
            {"title": "Real Python FastAPI Intro", "url": "https://realpython.com/fastapi-python-web-api/", "type": "Free Tutorial"},
            {"title": "Tiangolo's FastAPI Templates", "url": "https://github.com/tiangolo/full-stack-fastapi-template", "type": "GitHub Repo"}
        ],
        "system design": [
            {"title": "System Design Primer", "url": "https://github.com/donnemartin/system-design-primer", "type": "GitHub Repo"},
            {"title": "ByteByteGo (Alex Xu)", "url": "https://bytebytego.com", "type": "Course & Book"},
            {"title": "Grokking Modern System Design Interview", "url": "https://www.educative.io/courses/grokking-modern-system-design-interview", "type": "Course"},
            {"title": "Designing Data-Intensive Applications", "url": "https://www.oreilly.com/library/view/designing-data-intensive-applications/9781491903063/", "type": "Book"}
        ]
    }
    
    # Check for direct match
    match_key = None
    for key in resources:
        if key in tech_stack_lower:
            match_key = key
            break
            
    if match_key:
        matched_res = resources[match_key]
        return json.dumps(matched_res, indent=2)
    else:
        # Default resources if no technology matches exactly
        default_res = [
            {"title": "Roadmap.sh - Developer Roadmaps", "url": "https://roadmap.sh", "type": "Guides"},
            {"title": "MDN Web Docs", "url": "https://developer.mozilla.org", "type": "Documentation"},
            {"title": "Kaggle Learn", "url": "https://www.kaggle.com/learn", "type": "Courses"}
        ]
        return json.dumps(default_res, indent=2)

@mcp.tool()
def recommend_projects(domain: str, level: str) -> str:
    """
    Suggests GitHub-quality project recommendations according to domain (e.g. 'web', 'ml', 'mobile') and skill level ('beginner', 'intermediate', 'advanced').
    """
    domain = domain.lower()
    level = level.lower()
    
    projects = {
        "web": {
            "beginner": [
                {
                    "title": "Personal Portfolio Website",
                    "description": "A single-page, fully responsive developer portfolio using clean Vanilla HTML, CSS, and JS.",
                    "features": ["Semantic HTML", "CSS Grid/Flexbox Layouts", "Dark/Light Mode toggle", "Interactive contact form"],
                    "skills_gained": ["HTML5", "CSS3", "DOM Manipulation", "Responsive Design"]
                }
            ],
            "intermediate": [
                {
                    "title": "E-Commerce Frontend & Dashboard",
                    "description": "An interactive e-commerce catalog featuring cart management, filters, and a merchant analytics panel.",
                    "features": ["State management (Context/Redux)", "Complex routing", "Dynamic charts for sales data", "Local storage integration"],
                    "skills_gained": ["React/Vue", "CSS Modules", "ChartJS/Recharts", "Client-side Routing"]
                }
            ],
            "advanced": [
                {
                    "title": "Real-time Collaborative Task Manager",
                    "description": "A full-stack project dashboard (like Trello) featuring drag-and-drop tasks, multi-user sync, and notifications.",
                    "features": ["WebSocket-based live synchronization", "FastAPI backend with SQLite database", "JWT session authentication", "Drag-and-Drop kanban board UI"],
                    "skills_gained": ["React", "FastAPI", "WebSockets", "SQLAlchemy", "JWT Auth", "Concurrent DB Access"]
                }
            ]
        },
        "ml": {
            "beginner": [
                {
                    "title": "Student Placement Predictor",
                    "description": "A regression/classification model predicting placement probability based on academic grades and skills.",
                    "features": ["Simple Jupyter notebook", "Data cleaning & scaling", "Scikit-learn logistic regression", "Basic Streamlit UI for user inputs"],
                    "skills_gained": ["Python", "Pandas", "Scikit-Learn", "Streamlit"]
                }
            ],
            "intermediate": [
                {
                    "title": "AI Resume ATS Parser & Scorer",
                    "description": "An application analyzing uploaded resumes against job descriptions, grading ATS scores, and suggesting missing skills.",
                    "features": ["PDF text extraction", "NLTK/SpaCy keyword extraction", "TF-IDF similarity analysis", "Interactive report generator"],
                    "skills_gained": ["NLP", "Python", "NLTK", "TF-IDF", "FastAPI"]
                }
            ],
            "advanced": [
                {
                    "title": "Intelligent Placement Prep Chatbot",
                    "description": "A retrieval-augmented generation (RAG) agent that parses placement guides and answers queries using LLM integration.",
                    "features": ["Vector Database index (Chroma/FAISS)", "PDF document parsing & chunking", "Gemini API embeddings & chat completion", "FastAPI server with WebSocket streaming"],
                    "skills_gained": ["RAG", "Vector DBs", "Gemini API", "FastAPI", "LangChain/ADK Concepts"]
                }
            ]
        }
    }
    
    # Determine domain match
    matched_domain = "web"
    if "ml" in domain or "ai" in domain or "data" in domain:
        matched_domain = "ml"
        
    # Determine level match
    matched_level = "intermediate"
    if "begin" in level:
        matched_level = "beginner"
    elif "adv" in level:
        matched_level = "advanced"
        
    result_projects = projects.get(matched_domain, {}).get(matched_level, [])
    return json.dumps(result_projects, indent=2)

@mcp.tool()
def web_search(query: str) -> str:
    """
    Performs a web search to retrieve placement-related articles, coding test patterns, and current tech trends.
    """
    # Simple simulated response for tech web searches
    query_lower = query.lower()
    
    results = [
        {
            "title": "Cracking the Coding Interview - Arrays & Strings Prep",
            "snippet": "Arrays and strings form 40% of first-round technical interviews at tier-1 companies. Focus on two-pointer, sliding window, and hashmap techniques.",
            "link": "https://leetcode.com/discuss/general-discussion"
        },
        {
            "title": "Current Hiring Trends for Freshers (2026)",
            "snippet": "Companies are looking for freshers with full-stack capabilities, particularly React+FastAPI or Node.js. AI agent integration is a highly sought-after resume differentiator.",
            "link": "https://roadmap.sh/guides/how-to-become-a-software-developer"
        },
        {
            "title": "Google Cloud Run Deployment Best Practices",
            "snippet": "Cloud Run is ideal for serverless containers. Use standard Docker files, keep your state in databases like SQLite or Cloud SQL, and use environment secrets.",
            "link": "https://cloud.google.com/run/docs/deploying"
        }
    ]
    
    return json.dumps(results, indent=2)

if __name__ == "__main__":
    mcp.run()
