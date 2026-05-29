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
            readme = r.get("readme", "")
            repo_langs = r.get("repo_languages", {})
            file_tree = r.get("file_tree", [])
            dependencies = r.get("dependencies", [])
            
            source_code = r.get("source_code", [])
            
            repos_str += f"- Repository: {r.get('name')}\n"
            repos_str += f"  - Description: {r.get('description')}\n"
            repos_str += f"  - Stars: {r.get('stars', 0) or r.get('stargazers_count', 0)}\n"
            repos_str += f"  - Primary Language: {r.get('language') or 'Other'}\n"
            repos_str += f"  - Topics: {topics_str}\n"
            
            # Deep code context: language breakdown
            if repo_langs:
                lang_details = ", ".join([f"{lang} ({bytes_count} bytes)" for lang, bytes_count in sorted(repo_langs.items(), key=lambda x: x[1], reverse=True)])
                repos_str += f"  - Language Breakdown (by bytes): {lang_details}\n"
            
            # Deep code context: project structure
            if file_tree:
                repos_str += f"  - Project File Structure: {', '.join(file_tree)}\n"
            
            # Deep code context: actual installed dependencies
            if dependencies:
                repos_str += f"  - Installed Dependencies/Libraries: {', '.join(dependencies[:25])}\n"
            
            # Deep code context: README (project documentation)
            if readme:
                # Clean markdown headers for readability
                clean_readme = readme.replace('#', '').strip()
                repos_str += f"  - README Documentation:\n    {clean_readme[:1200]}\n"
                
            # Deep code context: Actual Source Code implementations
            if source_code:
                repos_str += "  - Key Source Code Files (Actual Implementation Details):\n"
                for src in source_code:
                    repos_str += f"    * File: {src['file']}\n"
                    repos_str += f"      ```\n{src['code']}\n      ```\n"
            
            # Commit evidence (recent code changes)
            if commits:
                repos_str += "  - Recent Commits and Code Diffs:\n"
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
            
            repos_str += f"  - CRITICAL RULE: Use ALL the above context (Source Code, README, dependencies, file structure, language breakdown, AND commits) to write project bullet points that accurately describe what the project does, what technologies it uses, and how the candidate built it. Analyze the actual Source Code provided to write highly technical, accurate bullet points that reflect the true system architecture and implementation details! The description should reflect the full scope of the codebase.\n"
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
2. MASTER-LEVEL CODE-CENTRIC PROJECT DESCRIPTIONS:
   You are an expert technical recruiter, senior software engineer, and professional resume writer. Your task is to convert raw GitHub repository data into ATS-optimized resume project entries.
   Identify:
   - What problem the project solves.
   - Major technical features and engineering challenges solved.
   - Architecture decisions, AI/ML functionality, backend/frontend systems, and database usage.
   - Security/authentication, performance optimizations, and cloud/DevOps integrations.
   - APIs and third-party services.
   
   Follow these absolute rules for bullet points:
   - Use strong action verbs. Sound like an experienced engineer.
   - Focus on achievements and implementation details.
   - NEVER MENTION: README files, folder structures, project organization, git workflows, repository layouts, filenames, documentation files, or roadmap files.
   - Structure each bullet following Google's formula: **"Accomplished [X], as measured/quantified by [Y], by executing [Z]"** (when quantifiable evidence is present), or soundly describe the deep technical implementation.
   - Sound like a senior engineer describing their systems to a tech lead, free of generic filler.

   BAD EXAMPLES TO AVOID:
   - [BAD] Architected modular project structure.
   - [BAD] Maintained repository architecture.
   - [BAD] Leveraged Python for application logic.

   GOOD EXAMPLES TO EMULATE:
   - [GOOD] Built an AI-powered document fraud detection pipeline using Gemini and OCR-based feature extraction.
   - [GOOD] Developed server-side API aggregation services to combine Codeforces, LeetCode, and GitHub activity into a unified analytics dashboard.
   - [GOOD] Implemented JWT-based authentication and role-based access control for secure user management.
   - [GOOD] Designed retrieval-augmented generation workflows to provide context-aware responses from uploaded documents.
   - [GOOD] Optimized database queries and caching strategies, reducing API response latency by 40%.

   When information is insufficient:
   - Infer likely functionality from source code.
   - Use conservative assumptions.
   - Never invent metrics.
   - Never fabricate scale or users.

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

FEW-SHOT STYLISTIC TEMPLATE EXAMPLES (Follow these styles with absolute fidelity):
You must dynamically analyze the candidate's raw repository names, metadata, and code patch changes to detect the specific languages, tools, libraries (e.g. NumPy, Scikit-learn, React, Tailwind CSS), and systems algorithms they used.
Formulate a highly polished, descriptive project title (e.g. "Real-Time Study Sync & RPG Dashboard (AEON)" instead of just "aeon-planner"), and write 3-4 recruiter-ready bullet points matching the exact caliber of these examples:

* Style Example 1 (Full-Stack Web / SaaS):
  - Name: "AEON: Real-Time RPG Study Sync Platform"
  - Tech: ["React", "TypeScript", "Convex", "Vite", "Tailwind CSS"]
  - Bullets:
    * "Architected real-time client-state synchronization across 15 interactive dashboards, eliminating data fetching race conditions by implementing Convex sync hooks and reactive Convex query schemas."
    * "Engineered an RPG-themed gamification engine utilizing normalized study streaks, flat-rate task completion XP formulas, and state managers, increasing user daily planner retention."
    * "Refactored calendar views by mapping Google Calendar API integrations to dynamic upcoming contest sidebar widgets, enabling seamless platform-agnostic schedule alignment."

* Style Example 2 (Signal Processing & Data Science):
  - Name: "ECG Signal Analysis & Arrhythmia Classification (AI-ECG)"
  - Tech: ["Python", "PyTorch", "Scikit-Learn", "NumPy", "Pandas", "Matplotlib"]
  - Bullets:
    * "Engineered high-accuracy arrhythmia classification neural networks by processing raw physiological waveforms using PyTorch and customized Scikit-Learn evaluation pipelines."
    * "Optimized raw waveform data-handling routines with vectorised NumPy and Pandas pipelines, reducing feature extraction latency during data prep."
    * "Formulated preprocessing and model evaluation models, achieving robust classification accuracy on multi-channel MIT-BIH dataset signal recordings."

* Style Example 3 (Custom Developer Tooling):
  - Name: "GitResume: Production-Ready ATS Resume Architect"
  - Tech: ["FastAPI", "Python", "React", "Docker", "Render", "Jinja2"]
  - Bullets:
    * "Designed custom Jinja2 template compiling layers to dynamically translate complex, nested JSON schemas into compilable LaTeX (.tex) source code for Overleaf integration."
    * "Orchestrated Docker container configurations for FastAPI backends and multi-stage Node/Vite frontends, securing seamless zero-configuration blueprints on Render free tiers."
    * "Decoupled Git commit history parsers to harvest code-centric patches and dependencies, upgrading generated bullet points with deep codebase intelligence."

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
            deps = p.get("dependencies", [])
            readme = p.get("readme", "")
            repo_langs = p.get("repo_languages", {})
            file_tree = p.get("file_tree", [])
            
            # Build tech list from multiple sources: topics, dependencies, repo languages
            if deps:
                techs = list(set(techs + deps[:10]))
            if not techs and p.get("language"):
                techs = [p.get("language")]
            if repo_langs:
                for lang in repo_langs.keys():
                    if lang not in techs:
                        techs.append(lang)
            if not techs:
                techs = ["Git", "GitHub"]

            p_name = p.get("name", "Project")
            desc = p.get("description", "")
            
            # Use README to build a better description if available
            readme_summary = ""
            if readme:
                # Extract first meaningful paragraph from README
                lines = [l.strip() for l in readme.split('\n') if l.strip() and not l.strip().startswith('#') and not l.strip().startswith('!') and not l.strip().startswith('---')]
                if lines:
                    readme_summary = ' '.join(lines[:3])[:200]

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

            # Fill remaining bullets safely without mentioning folders, filenames, readmes, or git workflows
            tech_str = ', '.join(techs[:5]) if techs else 'standard tooling'
            while len(bullets) < 3:
                if len(bullets) == 0:
                    if readme_summary:
                        bullets.append(f"Built and deployed {p_name} to optimize system logic and expand feature sets.")
                    elif desc and len(desc) > 10:
                        bullets.append(f"Developed {p_name} to handle system-critical operations using {tech_str}.")
                    else:
                        bullets.append(f"Built and maintained core functionalities for {p_name} using {tech_str}.")
                elif len(bullets) == 1:
                    if deps:
                        dep_str = ', '.join(deps[:4])
                        bullets.append(f"Integrated and configured {dep_str} libraries to implement reliable data structures and modular APIs.")
                    else:
                        bullets.append(f"Leveraged {tech_str} to implement robust system architectures and optimize data pipeline handling.")
                else:
                    bullets.append(f"Optimized application logic and refactored core interfaces to ensure clean separation of concerns and high runtime efficiency.")

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
