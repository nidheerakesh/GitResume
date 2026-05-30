import sys
import re
from pathlib import Path

# Add backend directory to path to ensure absolute import compatibility in serverless sandboxes
backend_dir = str(Path(__file__).resolve().parent.parent)
if backend_dir not in sys.path:
    sys.path.append(backend_dir)

from app.github import GitHubAnalyzer
from app.resume import generate_resume_latex
from app.ai import ResumeTailor

from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os

app = FastAPI(title="GitResume API", version="1.0.0")

# Enable CORS for frontend communications
# SECURITY NOTE: In production, replace "*" with your actual frontend domain
# e.g., allow_origins=["https://your-frontend.vercel.app"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def sanitize_error(error_msg: str) -> str:
    """
    Strips any API keys, tokens, or Bearer credentials from error messages
    before they are returned to clients, preventing accidental secret leakage.
    """
    # Redact Bearer tokens (Groq/OpenAI keys in Authorization headers)
    sanitized = re.sub(r'Bearer\s+[A-Za-z0-9\-_\.]+', 'Bearer [REDACTED]', error_msg)
    # Redact common API key patterns (gsk_, sk-, ghp_, github_pat_, etc.)
    sanitized = re.sub(r'(gsk_|sk-|ghp_|github_pat_)[A-Za-z0-9\-_]+', '[REDACTED_KEY]', sanitized)
    # Redact any token= query params that might appear in URLs
    sanitized = re.sub(r'token=[A-Za-z0-9\-_\.]+', 'token=[REDACTED]', sanitized)
    return sanitized

# Pydantic Schemas for validation
class GenerateResumeRequest(BaseModel):
    name: str
    email: str
    phone: str
    linkedin: str
    github: str
    bio: Optional[str] = ""
    skills: Dict[str, List[str]]
    top_projects: List[Dict[str, Any]]
    groq_api_key: Optional[str] = None

class TailorResumeRequest(BaseModel):
    resume_data: Dict[str, Any]
    job_description: str
    groq_api_key: Optional[str] = None

class CompileResumeRequest(BaseModel):
    resume_data: Dict[str, Any]

class ParseResumeRequest(BaseModel):
    text: str
    groq_api_key: Optional[str] = None

class LinkedInScrapeRequest(BaseModel):
    url: str
    groq_api_key: Optional[str] = None

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatResumeRequest(BaseModel):
    resume_data: Dict[str, Any]
    messages: List[ChatMessage]
    groq_api_key: Optional[str] = None

class SynthesizeResumeRequest(BaseModel):
    github_data: Optional[Dict[str, Any]] = None
    pdf_text: Optional[str] = ""
    linkedin_text: Optional[str] = ""
    groq_api_key: Optional[str] = None

class GitHubProfileRequest(BaseModel):
    token: Optional[str] = None

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "GitResume API"}

@app.get("/api/github/profile/{username}")
def get_github_profile(username: str, token: Optional[str] = None):
    """
    Fetches the public profile, top repos, languages, and skills of a GitHub user.
    (Legacy GET endpoint — token via query param, kept for backward compatibility.)
    """
    if not username or username.strip() == "":
        raise HTTPException(status_code=400, detail="Username is required")
        
    try:
        analyzer = GitHubAnalyzer(token=token)
        analysis = analyzer.analyze_profile(username)
        return analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=sanitize_error(str(e)))

@app.post("/api/github/profile/{username}")
def post_github_profile(username: str, req: GitHubProfileRequest):
    """
    Fetches the public profile, top repos, languages, and skills of a GitHub user.
    Token is accepted securely in the request body instead of as a query parameter.
    """
    if not username or username.strip() == "":
        raise HTTPException(status_code=400, detail="Username is required")
        
    try:
        analyzer = GitHubAnalyzer(token=req.token)
        analysis = analyzer.analyze_profile(username)
        return analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=sanitize_error(str(e)))

@app.post("/api/resume/generate")
def generate_resume_data(req: GenerateResumeRequest):
    """
    Converts raw GitHub analysis data into a structured editable resume object.
    """
    try:
        # Build raw dict to send to AI prompt analyzer
        langs = req.skills.get("languages", [])
        lang_len = len(langs)
        
        analysis_data = {
            "username": req.github.split('/')[-1] if '/' in req.github else req.github,
            "public_repos": len(req.top_projects),
            "followers": 0,
            "total_stars": sum(p.get("stars", 0) or p.get("stargazers_count", 0) for p in req.top_projects),
            "total_forks": sum(p.get("forks", 0) or p.get("forks_count", 0) for p in req.top_projects),
            "top_projects": req.top_projects,
            "languages": [{"name": l, "percentage": 100 // lang_len if lang_len > 0 else 100} for l in langs],
            "detected_skills": req.skills,
            "name": req.name,
            "bio": req.bio,
            "email": req.email
        }
        
        tailor = ResumeTailor(groq_api_key=req.groq_api_key)
        ai_res = tailor.generate_resume_from_github(analysis_data)
        
        # Merge scraped GitHub skills with AI-detected skills to ensure absolute completeness
        def merge_skill_lists(scraped, ai):
            merged = list(scraped)
            for skill in ai:
                if skill not in merged:
                    merged.append(skill)
            return merged

        scraped_skills = req.skills or {}
        ai_skills = ai_res.get("skills", {})
        
        merged_skills = {
            "languages": merge_skill_lists(scraped_skills.get("languages", []), ai_skills.get("languages", [])),
            "frameworks": merge_skill_lists(scraped_skills.get("frameworks", []), ai_skills.get("frameworks", [])),
            "tools": merge_skill_lists(scraped_skills.get("tools", []), ai_skills.get("tools", []))
        }
        
        # Merge AI outputs with input coordinates
        return {
            "name": req.name,
            "email": req.email,
            "phone": req.phone or "",
            "linkedin": req.linkedin or "",
            "github": req.github if req.github.startswith("https://") else f"https://github.com/{req.github}",
            "course": "",
            "roll": "",
            "website": "",
            "summary": ai_res.get("summary", ""),
            "skills": merged_skills,
            "experience": ai_res.get("experience", []),
            "projects": ai_res.get("projects", []),
            "education": [],
            "achievements": ai_res.get("achievements", []),
            "coursework": {
                "cs": "",
                "math": ""
            },
            "positions": []
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=sanitize_error(str(e)))

@app.post("/api/resume/tailor")
def tailor_resume_data(req: TailorResumeRequest):
    """
    Takes structural resume data and tailors it based on a job description.
    """
    try:
        tailor = ResumeTailor(groq_api_key=req.groq_api_key)
        tailored_data = tailor.tailor_resume(req.resume_data, req.job_description)
        return tailored_data
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=sanitize_error(str(e)))

@app.post("/api/resume/compile")
def compile_resume(req: CompileResumeRequest):
    """
    Compiles the structural resume data into clean, downloadable LaTeX source code.
    """
    try:
        latex_code = generate_resume_latex(req.resume_data)
        return {
            "latex": latex_code,
            "filename": f"resume_{req.resume_data.get('name', 'candidate').lower().replace(' ', '_')}.tex"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=sanitize_error(str(e)))

@app.post("/api/resume/chat")
def chat_resume(req: ChatResumeRequest):
    """
    Answers user questions contextually based on their current resume state.
    """
    try:
        tailor = ResumeTailor(groq_api_key=req.groq_api_key)
        
        # Build prompt context with resume JSON
        import json
        system_prompt = f"""
        You are a highly professional, helpful, and precise Career Coach and ATS expert AI assistant inside the GitResume application.
        The candidate is currently building and optimizing their resume. Here is their current resume JSON data:
        {json.dumps(req.resume_data, indent=2)}

        Answer the user's questions about their resume (such as "Why did you put Jinja2 in my skills?", "How can I improve my project description?", etc.) accurately and concisely based on their resume data, their GitHub history, and general ATS matching best practices.
        Keep your answers strictly professional, friendly, and structured. Do not use any emojis in your response.
        """
        
        # Build payload messages
        payload_messages = [{"role": "system", "content": system_prompt}]
        for m in req.messages:
            payload_messages.append({"role": m.role, "content": m.content})
            
        payload = {
            "model": tailor.model,
            "messages": payload_messages,
            "temperature": 0.5
        }
        
        import requests
        res = requests.post(tailor.url, headers=tailor.headers, json=payload, timeout=30)
        if res.status_code == 200:
            content = res.json()["choices"][0]["message"]["content"]
            return {"response": content}
        else:
            raise HTTPException(status_code=res.status_code, detail=f"Groq API call failed: {res.text}")
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=sanitize_error(str(e)))

@app.post("/api/resume/parse")
def parse_existing_resume(req: ParseResumeRequest):
    """
    Parses a raw text resume or LinkedIn profile copy into structured resume JSON data.
    """
    try:
        tailor = ResumeTailor(groq_api_key=req.groq_api_key)
        parsed_data = tailor.parse_resume_text(req.text)
        return parsed_data
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=sanitize_error(str(e)))

@app.post("/api/resume/upload-pdf")
async def upload_pdf_resume(file: UploadFile = File(...), groq_api_key: str = Form(default="")):
    """
    Accepts a PDF resume file, extracts text via pdfplumber, then AI-parses it into structured resume JSON.
    """
    try:
        import pdfplumber
        import io
        
        contents = await file.read()
        pdf_text = ""
        with pdfplumber.open(io.BytesIO(contents)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    pdf_text += page_text + "\n"
        
        if not pdf_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract any text from the uploaded PDF. Please try a different file.")
        
        tailor = ResumeTailor(groq_api_key=groq_api_key if groq_api_key else None)
        parsed_data = tailor.parse_resume_text(pdf_text)
        return {
            "parsed_data": parsed_data,
            "raw_text": pdf_text
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=sanitize_error(str(e)))

@app.post("/api/resume/linkedin")
def scrape_linkedin_profile(req: LinkedInScrapeRequest):
    """
    Fetches a public LinkedIn profile page and AI-parses the content into structured resume JSON.
    """
    try:
        import requests
        from bs4 import BeautifulSoup
        
        url = req.url.strip()
        if "linkedin.com" not in url:
            raise HTTPException(status_code=400, detail="Please provide a valid LinkedIn profile URL.")
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
        }
        
        res = requests.get(url, headers=headers, timeout=15)
        if res.status_code != 200:
            raise HTTPException(
                status_code=400,
                detail=f"Could not access the LinkedIn profile (status {res.status_code}). LinkedIn may be blocking automated access. Try using the PDF upload option instead -- go to your LinkedIn profile, click More > Save to PDF, then upload that file here."
            )
        
        soup = BeautifulSoup(res.text, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()
        
        profile_text = soup.get_text(separator="\n", strip=True)
        
        if len(profile_text) < 100:
            raise HTTPException(
                status_code=400,
                detail="LinkedIn returned very limited public data. The profile may be private or require login. Try the PDF upload option instead -- go to your LinkedIn profile, click More > Save to PDF."
            )
        
        tailor = ResumeTailor(groq_api_key=req.groq_api_key)
        parsed_data = tailor.parse_resume_text(profile_text[:8000])
        return {
            "parsed_data": parsed_data,
            "raw_text": profile_text
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=sanitize_error(str(e)))

@app.post("/api/resume/synthesize")
def synthesize_resume_data(req: SynthesizeResumeRequest):
    """
    Combines GitHub parsed data, PDF parsed text, and LinkedIn parsed text
    into a single ultimate, synthesized AI resume.
    """
    try:
        tailor = ResumeTailor(groq_api_key=req.groq_api_key)
        synthesized_data = tailor.synthesize_resume(
            github_data=req.github_data,
            pdf_text=req.pdf_text,
            linkedin_text=req.linkedin_text
        )
        return synthesized_data
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=sanitize_error(str(e)))
