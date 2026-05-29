import os
import json
import requests
from typing import Dict, List, Any

class ResumeTailor:
    def __init__(self, api_key: str = None, groq_api_key: str = None):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.groq_api_key = groq_api_key or os.getenv("GROQ_API_KEY")
        
        self.url = None
        self.headers = None
        self.model = None
        
        # Prioritize Groq if key is available!
        if self.groq_api_key:
            self.url = "https://api.groq.com/openai/v1/chat/completions"
            self.headers = {
                "Authorization": f"Bearer {self.groq_api_key}",
                "Content-Type": "application/json"
            }
            self.model = "llama-3.3-70b-versatile"
        elif self.api_key:
            self.url = "https://api.openai.com/v1/chat/completions"
            self.headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            self.model = "gpt-3.5-turbo"

    def generate_resume_from_github(self, analysis: dict) -> dict:
        """
        Uses the master prompt to generate complete professional resume sections
        from a raw GitHub analysis.
        """
        # Domain-based auto-enrichment of skills (both AI and fallback inherit this)
        skills = analysis.get("detected_skills") or {}
        if not isinstance(skills, dict):
            skills = {}
        
        langs = list(skills.get("languages") or [])
        fworks = list(skills.get("frameworks") or [])
        tools = list(skills.get("tools") or [])

        # Detect domains by scanning projects, descriptions, and topics
        is_ml_engineer = False
        is_web_dev = False

        search_corpus = []
        for r in analysis.get("top_projects", []):
            search_corpus.append(r.get("name", "").lower())
            search_corpus.append(r.get("description", "").lower())
            search_corpus.extend([t.lower() for t in r.get("topics", [])])
        bio_str = analysis.get("bio", "")
        if bio_str:
            search_corpus.append(bio_str.lower())

        ml_keywords = ["ecg", "arrhythmia", "healthcare", "ai", "ml", "signal", "predict", "model", "dataset", "learning", "classifier", "neural", "classification", "heart", "science", "regression", "svm", "random forest", "hailo", "hailo8", "hailo-8"]
        web_keywords = ["aeon", "planner", "resume", "react", "next", "web", "app", "frontend", "backend", "ts", "js", "api", "generator", "dashboard", "css", "html", "express", "postgres", "mongodb", "convex", "auth", "oauth"]

        if any(any(kw in item for kw in ml_keywords) for item in search_corpus):
            is_ml_engineer = True
        if any(any(kw in item for kw in web_keywords) for item in search_corpus):
            is_web_dev = True

        # Enrich lists with industry-standard stacks for the detected domains
        if is_ml_engineer:
            for l in ["Python", "SQL", "C++"]:
                if l not in langs: langs.append(l)
            for f in ["PyTorch", "Scikit-learn", "TensorFlow", "NumPy", "Pandas", "Matplotlib", "SciPy", "Seaborn", "Keras"]:
                if f not in fworks: fworks.append(f)
            for t in ["Jupyter", "Docker", "Git", "GitHub Actions", "Weights & Biases"]:
                if t not in tools: tools.append(t)

        if is_web_dev:
            for l in ["TypeScript", "JavaScript", "HTML5", "CSS3"]:
                if l not in langs: langs.append(l)
            for f in ["React", "Next.js", "Vite", "Tailwind CSS", "Node.js", "FastAPI", "Express.js"]:
                if f not in fworks: fworks.append(f)
            for t in ["PostgreSQL", "MongoDB", "Convex", "Redis", "Git", "GitHub Actions", "Postman", "Nginx"]:
                if t not in tools: tools.append(t)

        skills["languages"] = langs
        skills["frameworks"] = fworks
        skills["tools"] = tools
        analysis["detected_skills"] = skills

        # Format the repository data for the prompt
        repos_str = ""
        for r in analysis.get("top_projects", []):
            topics_str = ", ".join(r.get("topics", []))
            commits = r.get("commits", [])
            
            repos_str += f"- Repository: {r.get('name')}\n"
            repos_str += f"  - Description: {r.get('description')}\n"
            repos_str += f"  - Stars: {r.get('stars', 0) or r.get('stargazers_count', 0)}\n"
            repos_str += f"  - Language: {r.get('language') or 'Other'}\n"
            repos_str += f"  - Topics: {topics_str}\n"
            
            # Robust commit and code diff formatting safeguard
            if commits:
                repos_str += "  - Candidate's Real Commits and Code Diffs (Actual lines of code changes):\n"
                for idx, c_data in enumerate(commits[:3], 1):
                    if isinstance(c_data, dict):
                        msg = c_data.get("message", "")
                        diffs = c_data.get("code_diffs", [])
                        repos_str += f"    * Commit {idx}: \"{msg}\"\n"
                        if diffs:
                            repos_str += "      Actual Code Patches:\n"
                            for d in diffs:
                                repos_str += f"        {d}\n"
                    else:
                        repos_str += f"    * Commit {idx}: \"{c_data}\"\n"
                
                repos_str += f"  - CRITICAL RULE: Since this project has actual code diffs and commit messages, you MUST write project bullet points that reflect ONLY their actual code modifications and systems design decisions seen in these diffs. Analyze the syntax, libraries, and engineering actions in the diffs to draft highly specific, authentic recruiter bullet points. Do not write generic summaries!\n"
            repos_str += "\n"

        lang_str = ", ".join([f"{l['name']} ({l['percentage']}%)" for l in analysis.get("languages", [])])
        skills_languages = ", ".join(skills.get("languages", []))
        skills_frameworks = ", ".join(skills.get("frameworks", []))
        skills_tools = ", ".join(skills.get("tools", []))

        prompt = f"""
# MASTER SYSTEM PROMPT FOR AI RESUME + PORTFOLIO GENERATION ENGINE

You are an elite AI-powered resume architect, technical recruiter, developer portfolio strategist, and engineering career analyst.

Your job is to transform structured GitHub intelligence into:
* premium resumes
* recruiter-optimized profiles
* portfolio content
* GitHub README sections
* personal branding copy
* technical summaries
* project descriptions
* ATS-friendly engineering resumes

The generated output must feel:
* authentic
* technically credible
* modern
* ambitious
* polished
* human-written
* recruiter-ready

---

# SPECIAL SKILLS & PROJECTS DIRECTION:
1. DOMAIN SKILLS ENRICHMENT: The candidate's domain is detected as either Machine Learning (ML) or Web/Full-stack Development. Even if they haven't explicitly listed every framework in their repository breakdown, you MUST include standard toolsets of that domain in the final JSON "skills" block (e.g. PyTorch, Scikit-learn, Scipy, NumPy, Pandas for ML; React, Next.js, Vite, Tailwind CSS for Web Dev).
2. CLEAR & CODE-BASED PROJECT DESCRIPTIONS: For each project, the bullet points must be extremely clear and technically descriptive of the systems engineering. Every bullet point MUST be explicitly based on their commit evidence and code diffs. Avoid generic sentences; instead, explain the actual systems architecture and design patterns (e.g., "Implemented Convex queries/mutations to synchronize task progress", "Created FastAPI proxy endpoints to scraper contestant schedules directly", "Designed custom Jinja2 template mapping layers to synthesize downloadable LaTeX formats"). Avoid marketing filler; write like a senior developer explaining their code.

---

# INPUT DATA STRUCTURE

The following structured GitHub intelligence data is provided dynamically.

---

## 1. PROFILE INFORMATION

### Basic Identity
* Full Name: {analysis.get('name') or analysis.get('username')}
* Username: {analysis.get('username')}
* Public Email: {analysis.get('email') or f"{analysis.get('username')}@github.com"}
* GitHub URL: https://github.com/{analysis.get('username')}
* Bio: {analysis.get('bio') or 'Active Software Developer'}

### GitHub Metrics
* Public Repository Count: {analysis.get('public_repos', 0)}
* Followers Count: {analysis.get('followers', 0)}
* Total Stars Across Repositories: {analysis.get('total_stars', 0)}
* Total Forks Across Repositories: {analysis.get('total_forks', 0)}

---

## 2. REPOSITORY DATA & COMMIT INTELLIGENCE
For every original, non-fork repository, here is the detailed metadata, tech stack detected, and the developer's real, author-specific commit logs:

{repos_str}

---

## 3. SKILL MATRIX EXTRACTION
Aggregate of all repositories:
* Programming Languages Breakdown: {lang_str}
* Frameworks & Libraries: {skills_frameworks}
* Tools & Platforms: {skills_tools}

---

# ANALYSIS & OUTPUT REQUIREMENTS

Perform elite archetype detection, trait analysis, and technical evaluation based on this evidence. 

FEW-SHOT STYLISTIC TEMPLATE EXAMPLES:
You must dynamically analyze the candidate's raw repository names, metadata, and code patch changes to detect the specific languages, tools, libraries (e.g. NumPy, Scikit-learn, React, Tailwind CSS), and systems algorithms they used.
Formulate a highly polished, descriptive project title (e.g. "ECG Signal Analysis (MIT-BIH Arrhythmia Dataset)" instead of just "ai-ecg"), and write 3-4 recruiter-ready bullet points matching the exact caliber of these examples:

* Style Example 1 (AI Chatbot):
  - Name: "Explain-It AI Chatbot"
  - Tech: ["React", "Tailwind CSS", "Gemini API", "Flask"]
  - Bullets:
    * "Built an AI-powered learning assistant using React, Tailwind CSS, and structured prompting techniques."
    * "Integrated and experimented with LLM workflows inspired by OpenAI and Gemini style APIs for adaptive response generation."
    * "Designed multiple explanation-level pipelines to improve accessibility and personalized learning experiences."
    * "Working toward Flask-based backend integration and scalable AI response handling."

* Style Example 2 (Signal Processing & Data Science):
  - Name: "ECG Signal Analysis (MIT-BIH Arrhythmia Dataset)"
  - Tech: ["Python", "NumPy", "Pandas", "Scikit-learn"]
  - Bullets:
    * "Processed and analyzed ECG signal data using Python libraries including NumPy, Pandas, and Scikit-learn."
    * "Applied preprocessing, feature extraction, and model evaluation techniques on real-world healthcare datasets."
    * "Experimented with machine learning models for arrhythmia classification and performance optimization."
    * "Worked with structured datasets and analytical workflows for healthcare AI applications."

* Style Example 3 (Productivity Systems):
  - Name: "Smart Planner for Student Productivity"
  - Tech: ["React", "Tailwind CSS", "TypeScript"]
  - Bullets:
    * "Developed a structured productivity planner for task scheduling and exam tracking using React."
    * "Designed modular UI components and dashboard-style interfaces for tracking productivity and workflow efficiency."
    * "Exploring AI-based intelligent scheduling and adaptive task prioritization features."

Use these style examples strictly as standard guidelines. For each repository, dynamically analyze the candidate's actual files, topics, and code patches to synthesize a professional name, compile all utilized libraries, and write highly specific, authentic engineering highlights. Avoid robotic prefixes or plain commit copies (like "Initial commit" or "Contributed code: feat").

Synthesize this comprehensive recruiter-optimized engineering narrative and output it in **ONLY a raw JSON string** (no markdown fences, no wrapping, just pure parseable JSON).

The JSON output MUST follow this exact structure to match the frontend editor fields:

{{
  "summary": "Elite professional summary. Generate a unified recruiter-ready, highly modern, technically specific, and ambitious professional summary (2-3 sentences max) tailored specifically to the developer's archetype, core languages, and achievements. Avoid corporate cringe.",
  "skills": {{
    "languages": ["Complete list of programming languages used, sorted by confidence/demonstrated expertise"],
    "frameworks": ["Complete list of frameworks and libraries detected from topics and descriptions, sorted by proficiency"],
    "tools": ["Complete list of databases, devops tools, cloud platforms, and engineering tools detected, sorted by proficiency"]
  }},
  "projects": [
    {{
      "name": "Project Name",
      "tech": ["Main technologies utilized in this project"],
      "start_date": "Jul 2025",
      "end_date": "Nov 2025",
      "url": "Repository URL",
      "bullets": [
        "Quantifiable action-oriented highlight of feature addition, system design, or engineering complexity based strictly on their commit evidence",
        "Technical challenge solved, performance optimization, or scalability indicator implemented",
        "Measurable engineering outcome, automated deployment, or code quality standards applied"
      ]
    }}
  ],
  "experience": [
    {{
      "title": "Software Engineering Intern",
      "company": "Open Source Contributor / Organization",
      "start_date": "Jan 2025",
      "end_date": "Present",
      "location": "Remote",
      "bullets": [
        "Spearheaded technical development for key components and open-source subsystems, demonstrating high-velocity contributions.",
        "Collaborated with project maintainers on version control, pull requests, automated testing, and standard engineering reviews.",
        "Refactored legacy code blocks and built robust pipeline operations, improving build parameters and latency metrics."
      ]
    }}
  ],
  "achievements": [
    {{
      "title": "Elite Open Source Contributor",
      "description": "Successfully maintained {analysis.get('public_repos', 0)} repositories on GitHub with {analysis.get('total_stars', 0)} stars",
      "year": "2026"
    }},
    {{
      "title": "Technical Innovation Award",
      "description": "Engineered custom automation pipelines and edge systems, optimizing developer workflows and build outcomes",
      "year": "2025"
    }}
  ]
}}

Ensure all fields are fully synthesized, human-sounding, technically authentic to the evidence, and extremely premium!
"""
        if self.url:
            try:
                payload = {
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": "You are a professional resume optimization engine that outputs structured JSON."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.4
                }
                res = requests.post(self.url, headers=self.headers, json=payload, timeout=30)
                if res.status_code == 200:
                    response_json = res.json()
                    content = response_json["choices"][0]["message"]["content"].strip()
                    # Clean up markdown format if needed
                    if content.startswith("```"):
                        lines = content.split("\n")
                        if lines[0].startswith("```"):
                            lines = lines[1:]
                        if lines[-1].startswith("```"):
                            lines = lines[:-1]
                        content = "\n".join(lines).strip()
                        
                    res_data = json.loads(content)
                    
                    # Validation / Safeguards
                    if "summary" in res_data and "projects" in res_data:
                        return res_data
                else:
                    print(f"API completion failed with status {res.status_code}: {res.text}")
            except Exception as e:
                print(f"Master prompt generation failed: {e}. Using smart fallbacks.")

        # Local heuristic fallback matching premium prompt requirements
        mock_projects = []
        
        def clean_commit_msg(msg):
            if not msg:
                return None
            # Keep only the first line (commit header)
            first_line = msg.split('\n')[0].strip()
            msg_lower = first_line.lower()
            
            # Ignore generic Git boilerplate noise completely
            if any(term in msg_lower for term in ["initial commit", "add files via upload", "update readme", "merge branch", "rename files", "cleanup", "fix typo", "delete", "remove unused", "rename ", "wip", "temp", "todo", "minor"]):
                return None
            
            # Strip standard prefix tags
            prefixes = ["feat:", "fix:", "refactor:", "chore:", "docs:", "style:", "test:", "feat(api):", "feat(ui):", "fix(api):", "fix(ui):"]
            cleaned = first_line.strip()
            for p in prefixes:
                if cleaned.lower().startswith(p):
                    cleaned = cleaned[len(p):].strip()
            
            if cleaned:
                cleaned = cleaned[0].upper() + cleaned[1:]
                if not cleaned.endswith("."):
                    cleaned += "."
                return cleaned
            return None

        for p in analysis.get("top_projects", [])[:3]:
            techs = p.get("topics", [])
            if not techs and p.get("language"):
                techs = [p.get("language")]
            if not techs:
                techs = ["Git", "GitHub"]

            p_name = p.get("name", "Project")
            desc = p.get("description", "")

            # Dynamic rephraser for ALL repositories
            commits = p.get("commits", [])
            valid_commits = []
            for c in commits:
                if isinstance(c, dict):
                    msg = c.get("message")
                else:
                    msg = str(c)
                if msg:
                    cleaned = clean_commit_msg(msg)
                    if cleaned:
                        valid_commits.append(cleaned)

            bullets = []
            action_verbs = ["Implemented", "Developed", "Designed"]
            if valid_commits:
                for i, c_msg in enumerate(valid_commits[:3]):
                    # Strip leading verbs to avoid "Implemented implement..." doubling
                    leading_verbs = ["implement ", "add ", "fix ", "update ", "create ", "refactor ", "move ", "set ", "change ", "integrate ", "apply ", "migrate "]
                    msg_body = c_msg
                    for lv in leading_verbs:
                        if msg_body.lower().startswith(lv):
                            msg_body = msg_body[len(lv):]
                            msg_body = msg_body[0].upper() + msg_body[1:] if msg_body else msg_body
                            break
                    if msg_body and len(msg_body) > 8:
                        verb = action_verbs[i % len(action_verbs)]
                        bullets.append(f"{verb} {msg_body[0].lower() + msg_body[1:]}")

            # Fill remaining bullets from repo description and tech stack
            tech_str = ', '.join(techs[:3]) if techs else 'standard tooling'
            while len(bullets) < 3:
                if len(bullets) == 0:
                    if desc and len(desc) > 10:
                        bullets.append(f"Developed {p_name}: {desc[:120]}.")
                    else:
                        bullets.append(f"Built and maintained {p_name} using {tech_str}.")
                elif len(bullets) == 1:
                    bullets.append(f"Leveraged {tech_str} for core application logic, data handling, and module design.")
                else:
                    bullets.append(f"Managed version control workflows with Git, including branching strategies and code reviews.")

            mock_projects.append({
                "name": p_name,
                "tech": techs[:4],
                "start_date": "2025",
                "end_date": "Present",
                "url": p.get("url") or f"https://github.com/{analysis.get('username')}/{p.get('name')}",
                "bullets": bullets[:3]
            })

        while len(mock_projects) < 3:
            idx = len(mock_projects) + 1
            mock_projects.append({
                "name": f"Core System Project {idx}",
                "tech": ["Python", "FastAPI", "React"],
                "start_date": "Jul 2024",
                "end_date": "Nov 2024",
                "url": f"https://github.com/{analysis.get('username')}/project-{idx}",
                "bullets": [
                    "Designed and built high performance communication gateways with robust auth models.",
                    "Optimized data querying layers, reducing latency by 35%."
                ]
            })

        lang_list = skills.get('languages', [])
        lang_display = ', '.join(lang_list[:3]) if lang_list else 'multiple technologies'
        proj_names = [p['name'] for p in analysis.get('top_projects', [])[:2]]
        proj_display = ' and '.join(proj_names) if proj_names else 'various projects'

        fallback_summary = f"Software developer with hands-on experience in {lang_display}. Active open-source contributor maintaining {analysis.get('public_repos', 0)} repositories on GitHub, including {proj_display}."

        # Only include verifiable achievements based on real GitHub data
        real_achievements = []
        repo_count = analysis.get('public_repos', 0)
        star_count = analysis.get('total_stars', 0)
        if repo_count > 0:
            real_achievements.append({
                "title": "Open Source Contributor",
                "description": f"Maintained {repo_count} public repositories on GitHub with {star_count} stars",
                "year": "2025"
            })

        return {
            "summary": fallback_summary,
            "skills": skills,
            "projects": mock_projects,
            "achievements": real_achievements,
            "experience": []
        }

    def generate_professional_summary(self, name: str, skills: List[str], role: str = None) -> str:
        """
        Generates a sleek, ATS-optimized professional summary.
        """
        role_str = role if role else "Software Engineer"
        skills_str = ", ".join(skills[:5])
        
        if self.url:
            try:
                payload = {
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": "You are a professional resume writer specializing in ATS-optimized resumes for software engineering."},
                        {"role": "user", "content": f"Write a 1-sentence professional summary for a software developer named {name} who is skilled in {skills_str} and targeting the role of '{role_str}'."}
                    ],
                    "max_tokens": 100,
                    "temperature": 0.7
                }
                res = requests.post(self.url, headers=self.headers, json=payload, timeout=15)
                if res.status_code == 200:
                    response_json = res.json()
                    return response_json["choices"][0]["message"]["content"].strip()
                else:
                    print(f"Summary generation failed with status {res.status_code}: {res.text}")
            except Exception as e:
                print(f"AI API failed: {e}. Using local generator.")
                
        # High quality local fallback summary
        return f"Results-driven {role_str} with extensive hands-on experience designing, building, and optimizing scalable systems using {skills_str}."

    def tailor_resume(self, original_data: dict, job_description: str) -> dict:
        """
        Analyzes a job description and tailors resume highlights/bullets to optimize for keywords and match rates.
        """
        # 1. Extract target role and keywords from job description
        job_lower = job_description.lower()
        
        # Detect standard roles
        roles = ["Backend Engineer", "Frontend Engineer", "Fullstack Engineer", "DevOps Engineer", "Data Scientist", "Mobile Developer"]
        detected_role = "Software Engineer"
        for r in roles:
            if r.lower() in job_lower:
                detected_role = r
                break
                
        # Detect matching skills/technologies mentioned in job description
        tech_vocab = [
            "python", "javascript", "typescript", "java", "c++", "react", "next.js", "vue", "fastapi", "express",
            "django", "docker", "kubernetes", "aws", "postgresql", "mongodb", "redis", "convex", "graphql", "rest api"
        ]
        job_keywords = []
        for t in tech_vocab:
            if t in job_lower:
                # Add proper title capitalized name
                capitalized = t.capitalize() if t not in ["next.js", "c++", "graphql"] else t
                if t == "next.js": capitalized = "Next.js"
                if t == "c++": capitalized = "C++"
                if t == "graphql": capitalized = "GraphQL"
                job_keywords.append(capitalized)

        # 2. Trigger LLM if API Key is available
        # 2. Trigger LLM if API Key is available
        if self.url:
            try:
                prompt = f"""
                You are an expert ATS optimizer.
                Given the following candidate resume JSON data:
                {json.dumps(original_data, indent=2)}

                And the following target Job Description:
                "{job_description}"

                Rewrite the "summary", and the bullet points inside "projects" and "experience" to strongly align with the job description keywords and technical demands.
                Return ONLY a JSON object with matching structure:
                {{
                  "summary": "new tailored summary",
                  "experience": [
                     {{ "title": "job title", "company": "company", "start_date": "...", "end_date": "...", "bullets": ["tailored bullet 1", "tailored bullet 2"] }}
                  ],
                  "projects": [
                     {{ "name": "project name", "tech": [...], "url": "...", "bullets": ["tailored bullet 1", "tailored bullet 2"] }}
                  ]
                }}
                Do not wrap in markdown ```json, return raw JSON string.
                """
                
                payload = {
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": "You are a professional resume optimization engine that outputs structured JSON."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.4
                }
                res = requests.post(self.url, headers=self.headers, json=payload, timeout=30)
                if res.status_code == 200:
                    response_json = res.json()
                    content = response_json["choices"][0]["message"]["content"].strip()
                    # Clean up any potential markdown fences
                    if content.startswith("```"):
                        lines = content.split("\n")
                        if lines[0].startswith("```"):
                            lines = lines[1:]
                        if lines[-1].startswith("```"):
                            lines = lines[:-1]
                        content = "\n".join(lines).strip()
                        
                    tailored_res = json.loads(content)
                    
                    # Merge tailored sections back into original structure
                    merged_data = original_data.copy()
                    merged_data["summary"] = tailored_res.get("summary", original_data.get("summary"))
                    
                    if "experience" in tailored_res and len(tailored_res["experience"]) == len(original_data.get("experience", [])):
                        merged_data["experience"] = tailored_res["experience"]
                    if "projects" in tailored_res and len(tailored_res["projects"]) == len(original_data.get("projects", [])):
                        merged_data["projects"] = tailored_res["projects"]
                        
                    return merged_data
                else:
                    print(f"Resume tailoring failed with status {res.status_code}: {res.text}")
            except Exception as e:
                print(f"AI Tailoring failed: {e}. Falling back to smart keyword heuristics.")

        # 3. Smart local heuristic fallbacks
        tailored_data = original_data.copy()
        
        # Rewrite summary
        all_skills = (
            original_data.get("skills", {}).get("languages", []) + 
            original_data.get("skills", {}).get("frameworks", []) + 
            original_data.get("skills", {}).get("tools", [])
        )
        tailored_data["summary"] = self.generate_professional_summary(
            original_data.get("name", "Software Engineer"),
            all_skills,
            detected_role
        )

        # Highlight matching keywords in project bullets
        if "projects" in tailored_data:
            new_projects = []
            for project in tailored_data["projects"]:
                p_copy = project.copy()
                p_techs = [t.lower() for t in p_copy.get("tech", [])]
                matched_in_project = [kw for kw in job_keywords if kw.lower() in p_techs]
                
                # Create tailored highlights
                bullets = []
                if matched_in_project:
                    bullets.append(f"Architected and deployed full-lifecycle solutions highlighting robust engineering integrations with {', '.join(matched_in_project)}.")
                else:
                    bullets.append(f"Developed high performance modular components optimizing local deployment workflows and latency.")
                
                bullets.append(f"Implemented core backend logic and database structures, resulting in optimized data flows, higher test coverage, and faster response times.")
                bullets.append(f"Managed version control, release lifecycles, and open-source contributions with robust Git guidelines.")
                
                p_copy["bullets"] = bullets
                new_projects.append(p_copy)
            tailored_data["projects"] = new_projects

        # Highlight matching keywords in experience bullets
        if "experience" in tailored_data:
            new_exp = []
            for job in tailored_data["experience"]:
                j_copy = job.copy()
                bullets = [
                    f"Spearheaded technical development for scalable applications as a lead contributor, driving feature development from definition to production.",
                    f"Collaborated on agile cross-functional engineering squads prioritizing robust systems performance, code reviews, and comprehensive automated testing.",
                    f"Refactored legacy modules to leverage modern design principles, reducing maintenance overhead and boosting overall performance."
                ]
                j_copy["bullets"] = bullets
                new_exp.append(j_copy)
            tailored_data["experience"] = new_exp

        return tailored_data
