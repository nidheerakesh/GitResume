from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os

from .github import GitHubAnalyzer
from .resume import generate_resume_latex
from .ai import ResumeTailor

app = FastAPI(title="GitResume API", version="1.0.0")

# Enable CORS for frontend communications
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In development, allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

class CompileResumeRequest(BaseModel):
    resume_data: Dict[str, Any]

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "GitResume API"}

@app.get("/api/github/profile/{username}")
def get_github_profile(username: str, token: Optional[str] = None):
    """
    Fetches the public profile, top repos, languages, and skills of a GitHub user.
    """
    if not username or username.strip() == "":
        raise HTTPException(status_code=400, detail="Username is required")
        
    try:
        analyzer = GitHubAnalyzer(token=token)
        analysis = analyzer.analyze_profile(username)
        return analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/resume/tailor")
def tailor_resume_data(req: TailorResumeRequest):
    """
    Takes structural resume data and tailors it based on a job description.
    """
    try:
        tailor = ResumeTailor()
        tailored_data = tailor.tailor_resume(req.resume_data, req.job_description)
        return tailored_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
        raise HTTPException(status_code=500, detail=str(e))
