import os
import json
import requests
from typing import Dict, List, Any

class ResumeTailor:
    def __init__(self, api_key: str = None, groq_api_key: str = None, openrouter_api_key: str = None):
        # Gather all possible keys (from parameters or environment variables)
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.groq_api_key = groq_api_key or os.getenv("GROQ_API_KEY")
        self.openrouter_api_key = openrouter_api_key or os.getenv("OPENROUTER_API_KEY")
        
        # Compile keys into a prioritized list
        raw_keys = [
            openrouter_api_key, self.openrouter_api_key,
            groq_api_key, self.groq_api_key,
            api_key, self.api_key
        ]
        # Get the first valid non-empty key
        active_key = None
        for k in raw_keys:
            if k and isinstance(k, str) and k.strip() != "":
                active_key = k.strip()
                break
                
        self.url = None
        self.headers = None
        self.model = None
        
        # Universal Key Router: Automatically detect the provider from key signatures
        if active_key:
            if active_key.startswith("sk-or-") or "openrouter" in active_key.lower():
                # 1. OpenRouter Key (starts with sk-or-)
                self.url = "https://openrouter.ai/api/v1/chat/completions"
                self.headers = {
                    "Authorization": f"Bearer {active_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://github.com/nidheerakesh/GitResume",
                    "X-Title": "GitResume Portal"
                }
                self.model = os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct")
                print(f"Universal AI: Configured OpenRouter endpoint using model '{self.model}'")
                
            elif active_key.startswith("gsk_"):
                # 2. Groq Key (starts with gsk_)
                self.url = "https://api.groq.com/openai/v1/chat/completions"
                self.headers = {
                    "Authorization": f"Bearer {active_key}",
                    "Content-Type": "application/json"
                }
                self.model = "llama-3.3-70b-versatile"
                print("Universal AI: Configured Groq endpoint using model 'llama-3.3-70b-versatile'")
                
            elif active_key.startswith("sk-ant-"):
                # 3. Anthropic Claude Key (routed safely through Anthropic-to-OpenAI proxies or OpenRouter if preferred)
                # For direct Anthropic API, payload format differs, so we route it through Claude proxy or notify user.
                # To maintain OpenAI compatibility seamlessly, we configure it.
                self.url = "https://api.anthropic.com/v1/messages"
                self.headers = {
                    "x-api-key": active_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                }
                self.model = "claude-3-5-sonnet-20241022"
                print("Universal AI: Configured direct Anthropic Claude API")
                
            elif active_key.startswith("sk-") and len(active_key) > 40:
                # 4. OpenAI Key or DeepSeek Key (starts with sk-)
                # Check if it's explicitly configured for DeepSeek in env, otherwise default to OpenAI
                if os.getenv("DEEPSEEK_API_KEY") == active_key or "deepseek" in active_key.lower():
                    self.url = "https://api.deepseek.com/chat/completions"
                    self.model = "deepseek-chat"
                    print("Universal AI: Configured DeepSeek endpoint")
                else:
                    self.url = "https://api.openai.com/v1/chat/completions"
                    self.model = "gpt-3.5-turbo"
                    print("Universal AI: Configured OpenAI endpoint")
                self.headers = {
                    "Authorization": f"Bearer {active_key}",
                    "Content-Type": "application/json"
                }
                
            else:
                # 5. Generic OpenAI-compatible API Key fallback (e.g. Together, Perplexity, local Ollama, etc.)
                self.url = os.getenv("CUSTOM_API_BASE", "https://api.openai.com/v1/chat/completions")
                self.headers = {
                    "Authorization": f"Bearer {active_key}",
                    "Content-Type": "application/json"
                }
                self.model = os.getenv("CUSTOM_API_MODEL", "gpt-3.5-turbo")
                print(f"Universal AI: Configured Custom/Fallback endpoint '{self.url}' with model '{self.model}'")



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
                repos_str += f"  - README Documentation:\n    {clean_readme[:400]}\n"
                
            # Commit evidence (recent code changes - only commit messages, no raw diffs to stay under Groq TPM limits)
            if commits:
                repos_str += "  - Recent Commits:\n"
                for idx, c_data in enumerate(commits[:5], 1):
                    if isinstance(c_data, dict):
                        msg = c_data.get("message", "")
                        repos_str += f"    * Commit {idx}: \"{msg}\"\n"
                    else:
                        repos_str += f"    * Commit {idx}: \"{c_data}\"\n"
            
            repos_str += f"  - CRITICAL RULE: Use the above context (README, dependencies, file structure, language breakdown, and commits) to write project bullet points that accurately describe what the project does, what technologies it uses, and how the candidate built it. Write highly technical, accurate bullet points that reflect the true system architecture and implementation details!\n"
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
    - Focus on achievements, architecture, and exact implementation details.
    - NEVER MENTION OR COPY: git workflows, pull request merges, git log boilerplate, commit messages, branch syncs, folder structures, project organization, repository layouts, filenames, documentation files, or roadmap files (e.g. NEVER output bullet points like "Implemented merge pull request #2" or "Merged branch 'main'").
    - Focus entirely on high-fidelity, descriptive technical implementations. Describe system design decisions, data flow structure, and utilized technologies.
    - Sound like a senior engineer describing their systems to a tech lead, free of generic filler.
    - Absolutely NO fabricated metrics, percentages, or high-scale numbers (e.g. NEVER invent statistics like 'reduced latency by 40%', 'optimized query speeds by 30%', or 'supported 10k+ concurrent requests') unless they are explicitly present in the input repository or commit descriptions.

    BAD EXAMPLES TO AVOID:
    - [BAD] Architected modular project structure.
    - [BAD] Maintained repository architecture.
    - [BAD] Leveraged Python for application logic.

    GOOD EXAMPLES TO EMULATE:
    - [GOOD] Built an AI-powered document fraud detection pipeline using Gemini and OCR-based feature extraction.
    - [GOOD] Developed server-side API aggregation services to combine Codeforces, LeetCode, and GitHub activity into a unified analytics dashboard.
    - [GOOD] Implemented JWT-based authentication and role-based access control for secure user management.
    - [GOOD] Designed retrieval-augmented generation workflows to provide context-aware responses from uploaded documents.
    - [GOOD] Optimized database queries and caching strategies to improve API response latency.

    When information is insufficient:
    - Infer likely functionality from source code.
    - Use conservative assumptions.
    - Strictly never invent metrics or percentages.
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
                        raise ValueError("AI returned an invalid JSON response structure (missing summary or projects).")
                else:
                    error_detail = f"AI API completion failed with status {res.status_code}: {res.text}"
                    print(error_detail)
                    if self.groq_api_key or self.api_key:
                        raise ValueError(error_detail)
            except Exception as e:
                error_detail = f"AI Generation Error: {str(e)}"
                print(error_detail)
                if self.groq_api_key or self.api_key:
                    raise ValueError(error_detail)

        # Local heuristic fallback matching premium prompt requirements
        mock_projects = []
        
        def clean_commit_msg(msg):
            if not msg:
                return None
            # Keep only the first line (commit header)
            first_line = msg.split('\n')[0].strip()
            msg_lower = first_line.lower()
            
            # Ignore generic Git boilerplate noise completely
            if any(term in msg_lower for term in ["initial commit", "add files via upload", "update readme", "merge branch", "merge pull request", "pull request", "merge ", " branch", "rename files", "cleanup", "fix typo", "delete", "remove unused", "rename ", "wip", "temp", "todo", "minor", "dependencies", "copilot"]):
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

        def clean_tech_name(name: str) -> str:
            name_lower = name.lower()
            # Skip standard developer tool/type definition noise completely
            ignore_list = [
                "types/", "eslint", "prettier", "tsconfig", "vite", "typescript", 
                "jest", "testing-library", "nodemon", "webpack", "babel", "postcss", 
                "autoprefixer", "rimraf", "concurrently", "cross-env", "dotenv"
            ]
            if any(ignore in name_lower for ignore in ignore_list):
                return None
                
            # Clean common scoped packages (e.g. @google/genai -> Google GenAI)
            mappings = {
                "fastapi": "FastAPI",
                "pydantic": "Pydantic",
                "openai": "OpenAI API",
                "jinja2": "Jinja2",
                "requests": "Requests",
                "react": "React",
                "react-dom": "React DOM",
                "google/genai": "Google GenAI",
                "next": "Next.js",
                "tailwindcss": "Tailwind CSS",
                "convex": "Convex",
                "python": "Python",
                "shell": "Shell Scripting",
                "bash": "Bash Scripting",
                "uvicorn": "Uvicorn"
            }
            
            clean = name
            if clean.startswith("@"):
                clean = clean[1:]
                
            if clean.lower() in mappings:
                return mappings[clean.lower()]
                
            # Clean up hyphenated package names
            clean = clean.replace('-', ' ').replace('_', ' ')
            return ' '.join(word.capitalize() for word in clean.split())

        for pIdx, p in enumerate(analysis.get("top_projects", [])[:3]):
            raw_techs = p.get("topics", [])
            raw_deps = p.get("dependencies", [])
            readme = p.get("readme", "")
            repo_langs = p.get("repo_languages", {})
            file_tree = p.get("file_tree", [])
            
            # Combine topics and dependencies
            if raw_deps:
                raw_techs = list(set(raw_techs + raw_deps[:10]))
            if not raw_techs and p.get("language"):
                raw_techs = [p.get("language")]
            if repo_langs:
                for lang in repo_langs.keys():
                    if lang not in raw_techs:
                        raw_techs.append(lang)
            if not raw_techs:
                raw_techs = ["Git", "GitHub"]

            # Filter and clean package names
            techs = []
            for t in raw_techs:
                cleaned = clean_tech_name(t)
                if cleaned and cleaned not in techs:
                    techs.append(cleaned)
            if not techs:
                techs = ["Git", "GitHub"]

            # Filter and clean dependencies specifically
            deps = []
            for d in raw_deps:
                cleaned = clean_tech_name(d)
                if cleaned and cleaned not in deps:
                    deps.append(cleaned)

            p_name = p.get("name", "Project")
            desc = p.get("description", "")
            
            # Use README to build a better description if available
            readme_summary = ""
            if readme:
                # Extract first meaningful paragraph from README
                lines = [l.strip() for l in readme.split('\n') if l.strip() and not l.strip().startswith('#') and not l.strip().startswith('!') and not l.strip().startswith('---')]
                if lines:
                    readme_summary = ' '.join(lines[:3])[:200]

            # Detect Domain: Machine Learning, Frontend Web, or Backend Web
            techs_lower = [t.lower() for t in techs]
            deps_lower = [d.lower() for d in deps]
            
            is_ml = any(t in techs_lower or t in deps_lower for t in ["torch", "pytorch", "tensorflow", "keras", "scikit-learn", "numpy", "pandas", "opencv", "diffusers", "nlp", "ml", "ai"]) or any(kw in p_name.lower() or kw in (desc or "").lower() for kw in ["ai", "ml", "machine learning", "deep learning", "neural", "ecg", "heart", "prediction", "classifier"])
            is_frontend = any(t in techs_lower or t in deps_lower for t in ["react", "vue", "angular", "nextjs", "next.js", "svelte", "html", "css", "tailwind", "typescript", "javascript", "google/genai", "next", "types/react", "react-dom"])
            is_backend = any(t in techs_lower or t in deps_lower for t in ["fastapi", "flask", "django", "express", "node", "spring", "python", "postgresql", "mysql", "mongodb", "redis", "sqlite", "prisma", "convex", "shell", "bash"])

            bullets = []
            tech_str = ', '.join(techs[:3]) if techs else 'standard tools'
            dep_str = ', '.join(deps[:3]) if deps else ''
            
            # Define rich variation tables for bullet points based on project index
            # This ensures Project #1, #2, and #3 NEVER look identical!
            bullet_templates = {
                "ml": [
                    [
                        f"Engineered an advanced machine learning architecture for {p_name} to execute high-fidelity data modeling and feature processing using {tech_str}.",
                        f"Synthesized a custom artificial intelligence model for {p_name} leveraging {tech_str} to predict and classify core data patterns.",
                        f"Developed a high-performance deep learning pipeline for {p_name} utilizing {tech_str} to automate complex analytical workflows."
                    ],
                    [
                        f"Integrated and configured {dep_str} libraries to establish robust training configurations and accelerate statistical processing." if deps else "Constructed custom mathematical layers and preprocessing pipelines to refine raw datasets.",
                        f"Structured scalable neural network parameters and data ingestion layers to support low-latency model evaluations.",
                        f"Designed high-performance dataset parsers to guarantee reliable validation cycles and prevent overfitting."
                    ],
                    [
                        f"Optimized training pipelines and inference execution routines, enhancing speed metrics for maximum runtime throughput.",
                        f"Refactored matrix computation strategies to reduce memory footprint and safeguard resource utilization in production.",
                        f"Enhanced overall prediction accuracy metrics by refining neural layers and implementing modular code practices."
                    ]
                ],
                "backend": [
                    [
                        f"Architected a scalable, high-throughput backend service for {p_name} using {tech_str} to handle system-critical operations and performant data storage.",
                        f"Designed and deployed a modular RESTful API gateway for {p_name} leveraging {tech_str} to establish secure, low-latency endpoints.",
                        f"Engineered a resilient server-side framework for {p_name} utilizing {tech_str} to automate backend microservices."
                    ],
                    [
                        f"Integrated and configured {dep_str} libraries to implement reliable system integrations, strict type safety, and modular API contracts." if deps else "Constructed robust database handlers and transactional layers to accelerate data persistence.",
                        f"Configured multi-tier authentication protocols and structured database migrations to guarantee data integrity.",
                        f"Engineered high-performance web service integrations to support high concurrent load capacities cleanly."
                    ],
                    [
                        f"Refactored database query architectures and caching strategies, reducing latency metrics and safeguarding thread-safe operations in production.",
                        f"Optimized overall server-side execution cycles, implementing separation of concerns for simplified maintenance.",
                        f"Enhanced API response benchmarks by establishing micro-caching layers and optimizing structural algorithms."
                    ]
                ],
                "frontend": [
                    [
                        f"Designed and developed a premium, responsive client interface for {p_name} leveraging {tech_str} to deliver seamless state management.",
                        f"Crafted a visually stunning, highly interactive user experience for {p_name} using {tech_str} for pixel-perfect presentation.",
                        f"Architected an elegant client-side application structure for {p_name} utilizing {tech_str} to support rapid feature scaling."
                    ],
                    [
                        f"Integrated and configured {dep_str} libraries to establish high-fidelity routing, component rendering, and custom state hooks." if deps else "Constructed dynamic UI components and complex event listeners to deliver flawless user interactions.",
                        f"Engineered custom styling systems and reusable layout patterns to ensure cross-device display consistency.",
                        f"Optimized modern web rendering pipelines to eliminate layout shifts and deliver lightning-fast interactive states."
                    ],
                    [
                        f"Optimized overall compilation pipelines and asset loading speeds, implementing modular clean code structures for long-term maintainability.",
                        f"Refactored complex UI flows and rendering cycles to boost responsiveness and lower overall Time-to-Interactive.",
                        f"Established rigorous component structure guidelines, elevating long-term codebase maintainability."
                    ]
                ],
                "general": [
                    [
                        f"Engineered and deployed the {p_name} application using {tech_str} to deliver modular, high-performance system capabilities.",
                        f"Designed and synthesized the core architecture for {p_name} utilizing {tech_str} to resolve critical execution bottlenecks.",
                        f"Developed and modularized the {p_name} project using {tech_str} to enable high-efficiency local runs."
                    ],
                    [
                        f"Integrated and configured {dep_str} libraries to establish robust integration layers and modular code patterns." if deps else "Constructed optimized system wrappers and helper scripts to accelerate daily development runs.",
                        f"Structured robust file parsers and environment configs to streamline local deployment across environments.",
                        f"Refactored operational logic into decoupled components to improve scalability and reduce coupling."
                    ],
                    [
                        f"Optimized system runtimes and resource management, reducing build times and code complexity.",
                        f"Enhanced overall execution throughput by establishing modular structures and standard testing targets.",
                        f"Implemented rigorous code guidelines, ensuring a clean, open-source-ready codebase."
                    ]
                ]
            }

            v_idx = pIdx % 3
            if is_ml:
                bullets.append(bullet_templates["ml"][0][v_idx])
                bullets.append(bullet_templates["ml"][1][v_idx])
                bullets.append(bullet_templates["ml"][2][v_idx])
            elif is_frontend:
                bullets.append(bullet_templates["frontend"][0][v_idx])
                bullets.append(bullet_templates["frontend"][1][v_idx])
                bullets.append(bullet_templates["frontend"][2][v_idx])
            elif is_backend:
                bullets.append(bullet_templates["backend"][0][v_idx])
                bullets.append(bullet_templates["backend"][1][v_idx])
                bullets.append(bullet_templates["backend"][2][v_idx])
            else:
                bullets.append(bullet_templates["general"][0][v_idx])
                bullets.append(bullet_templates["general"][1][v_idx])
                bullets.append(bullet_templates["general"][2][v_idx])

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
                    "Optimized data querying layers to improve overall response times."
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

                Rewrite the "summary", and the bullet points inside "projects" and "experience" to strongly align with the job description keywords and technical demands, while strictly adhering to these CRITICAL rules:
                1. CONTEXT PRESERVATION: You MUST strictly preserve the core engineering actions, factual domain, and scope of the original projects and experiences. Under no circumstances should you fabricate or change the fundamental nature of the work.
                2. NO FABRICATION: Do not claim experience in areas completely unrelated to the original items. For example, do not rewrite a frontend calendar API integration to claim it uses "machine learning algorithms" or "statistical analysis" unless the original bullet explicitly mentions ML/AI components.
                3. ENRICHMENT OVER INVENTION: Inject relevant tech stack keywords and ATS verbs from the job description ONLY where they naturally complement and accurately reflect the existing project domain (e.g., specifying React/TypeScript for a frontend project, or SQL/FastAPI/REST APIs for a backend system if the project uses them).
                4. Keep the exact same number of bullet points and projects in the same order.
                5. EXPLAIN YOUR CHANGES: For the summary and for EACH rewritten bullet point, provide a short, 1-sentence explanation of WHY this change was made (e.g. "Injected React and TypeScript keywords to match job requirements"). Add these as a parallel list under a "reasons" key for projects and experience, and a "summary_reason" key at the root.

                Return ONLY a JSON object with matching structure:
                {{
                  "summary": "new tailored summary",
                  "summary_reason": "justification for summary optimization",
                  "experience": [
                     {{ 
                       "title": "job title", 
                       "company": "company", 
                       "start_date": "...", 
                       "end_date": "...", 
                       "bullets": ["tailored bullet 1", "tailored bullet 2"],
                       "reasons": ["reason for bullet 1 change", "reason for bullet 2 change"]
                     }}
                  ],
                  "projects": [
                     {{ 
                       "name": "project name", 
                       "tech": [...], 
                       "url": "...", 
                       "bullets": ["tailored bullet 1", "tailored bullet 2"],
                       "reasons": ["reason for bullet 1 change", "reason for bullet 2 change"]
                     }}
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
                    merged_data["summary_reason"] = tailored_res.get("summary_reason", "Optimized professional summary to align with target role.")
                    
                    if "experience" in tailored_res and len(tailored_res["experience"]) == len(original_data.get("experience", [])):
                        merged_data["experience"] = tailored_res["experience"]
                    if "projects" in tailored_res and len(tailored_res["projects"]) == len(original_data.get("projects", [])):
                        merged_data["projects"] = tailored_res["projects"]
                        
                    return merged_data
                else:
                    error_detail = f"AI Tailoring API call failed with status {res.status_code}: {res.text}"
                    print(error_detail)
                    if self.groq_api_key or self.api_key:
                        raise ValueError(error_detail)
            except Exception as e:
                error_detail = f"AI Tailoring Error: {str(e)}"
                print(error_detail)
                if self.groq_api_key or self.api_key:
                    raise ValueError(error_detail)

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

    def parse_resume_text(self, resume_text: str) -> dict:
        """
        Parses raw text of an existing resume into the structured JSON schema using the LLM.
        """
        if not self.url:
            raise ValueError("No AI API key or connection configured to parse resume.")
            
        prompt = f"""
        You are an expert AI Resume Parsing Engine.
        Your task is to take the following raw text from a candidate's existing resume and extract/map it into the exact structured JSON schema below.
        
        Raw Resume Text:
        ---
        {resume_text}
        ---

        Extracted Output JSON Schema:
        {{
          "name": "full name (default to 'Software Engineer' if not found)",
          "email": "email address (default to empty string)",
          "phone": "phone number (default to empty string)",
          "linkedin": "LinkedIn profile URL (default to empty string)",
          "github": "GitHub profile URL (default to empty string)",
          "website": "Personal website URL (default to empty string)",
          "summary": "Professional summary paragraph",
          "skills": {{
            "languages": ["programming language 1", "programming language 2"],
            "frameworks": ["framework 1", "framework 2"],
            "tools": ["tool/database/platform 1", "tool 2"]
          }},
          "experience": [
            {{
              "title": "job title",
              "company": "company name",
              "start_date": "start date/year",
              "end_date": "end date/year or Present",
              "bullets": [
                "detailed action-driven bullet point 1",
                "detailed action-driven bullet point 2"
              ]
            }}
          ],
          "projects": [
            {{
              "name": "project name",
              "tech": ["tech 1", "tech 2"],
              "url": "project url (default to empty string)",
              "bullets": [
                "detailed action-driven bullet point 1",
                "detailed action-driven bullet point 2"
              ]
            }}
          ],
          "education": [
            {{
              "school": "school/university name",
              "degree": "degree (e.g. B.Tech)",
              "field": "field of study (e.g. Computer Science)",
              "year": "graduation year (e.g. 2026)"
            }}
          ],
          "achievements": ["achievement bullet 1", "achievement bullet 2"],
          "coursework": {{
            "cs": "relevant CS courses listed in comma separated list",
            "math": "relevant math courses listed in comma separated list"
          }},
          "positions": [
            {{
              "title": "leadership role or position",
              "year": "duration/year",
              "description": "short description"
            }}
          ]
        }}
        
        CRITICAL RULES:
        1. Keep the parsed bullets factual and true to the candidate's input. Do not invent achievements.
        2. Ensure all fields are filled. If a section is missing, default it to empty list, empty dictionary, or empty string as shown.
        3. Do not wrap in markdown ```json, return raw JSON string.
        """
        
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": "You are a professional resume parsing engine that outputs structured JSON."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.2
        }
        
        import requests
        import json
        res = requests.post(self.url, headers=self.headers, json=payload, timeout=30)
        if res.status_code == 200:
            content = res.json()["choices"][0]["message"]["content"].strip()
            if content.startswith("```"):
                lines = content.split("\n")
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines[-1].startswith("```"):
                    lines = lines[:-1]
                content = "\n".join(lines).strip()
            return json.loads(content)
        else:
            raise ValueError(f"AI parsing call failed with status {res.status_code}: {res.text}")

    def synthesize_resume(self, github_data: dict = None, pdf_text: str = "", linkedin_text: str = "") -> dict:
        """
        Synthesizes multiple resume sources (GitHub, PDF resume text, LinkedIn profile text)
        into a single ultimate, ATS-optimized software engineering resume JSON structure.
        """
        if not self.url:
            raise ValueError("No AI API key or connection configured to synthesize resume.")

        github_summary = ""
        all_codebase_tools = set()
        if github_data:
            # 1. Collect general skills/languages
            detected_skills = github_data.get('detected_skills') or github_data.get('skills', {})
            if isinstance(detected_skills, dict):
                for cat in ["languages", "frameworks", "tools"]:
                    for skill in detected_skills.get(cat, []):
                        all_codebase_tools.add(str(skill))

            # 2. Collect languages from global language breakdown
            for l_info in github_data.get("languages", []):
                if isinstance(l_info, dict) and l_info.get("name"):
                    all_codebase_tools.add(l_info["name"])

            pruned_projects = []
            for p in github_data.get('top_projects', []):
                # Clean commit history - only keep commit messages, no code diff patches
                commits = p.get('commits', [])
                clean_commits = []
                for c in commits:
                    if isinstance(c, dict):
                        clean_commits.append(c.get('message', ''))
                    else:
                        clean_commits.append(str(c))
                
                # Collect topics and package dependencies
                for topic in p.get("topics", []):
                    all_codebase_tools.add(topic)
                for dep in p.get("dependencies", []):
                    all_codebase_tools.add(dep)

                pruned_projects.append({
                    "name": p.get("name"),
                    "description": p.get("description"),
                    "stars": p.get("stars", 0) or p.get("stargazers_count", 0),
                    "language": p.get("language"),
                    "topics": p.get("topics", []),
                    "dependencies": p.get("dependencies", [])[:15],
                    "readme_excerpt": p.get("readme", "")[:300],
                    "commits": clean_commits[:3]
                })
                
            sorted_codebase_skills = sorted(list(all_codebase_tools))
            github_summary = f"""
            GitHub Profile: {github_data.get('github', '')}
            Bio: {github_data.get('bio', '')}
            Top Projects: {pruned_projects}
            Detected Skills Matrix: {detected_skills}
            All Discovered Codebase Dependencies, Topics & Libraries: {", ".join(sorted_codebase_skills)}
            """

        prompt = f"""
        You are a World-Class Elite Resume Synthesis Engine and Expert Technical Recruiter.
        Your goal is to synthesize the following available data sources into the single, ultimate, ATS-optimized, high-fidelity Software Engineering Resume JSON structure.

        --- DATA SOURCE 1: GitHub Codebase & Profile Data ---
        {github_summary or '[None provided]'}

        --- DATA SOURCE 2: Uploaded PDF Resume Text ---
        {pdf_text or '[None provided]'}

        --- DATA SOURCE 3: LinkedIn Profile Text ---
        {linkedin_text or '[None provided]'}

        --- OUTPUT REQUIREMENTS ---
        1. Parse and extract the candidate's real personal details (Name, Email, Phone, LinkedIn, GitHub, Website). Use the most professional/complete values found across all sources.
        2. Skills Section: Combine and group all unique technical skills into three clean arrays inside "skills" (languages, frameworks, tools). This must be a comprehensive union of: 
           (a) all technical skills explicitly extracted from the PDF resume text (DATA SOURCE 2), 
           (b) all skills detected and used in the GitHub repositories (DATA SOURCE 1), and 
           (c) any additional relevant software engineering skills generated by you (the AI) that perfectly complement and enrich the developer's core tech stack. 
           Ensure there are no duplicates, keep all items highly relevant to Software Engineering, and sort them logically.
        3. Experience Section: Merge the work experience from the PDF and LinkedIn profiles. Keep job history chronological, complete, and highly detailed.
        4. Projects Section: ONLY output projects that are explicitly specified under top_projects in DATA SOURCE 1 (the GitHub codebase data). 
           Absolutely DO NOT extract, import, or merge any projects from the PDF resume or LinkedIn profile. You must completely ignore any projects from the PDF resume/LinkedIn and focus exclusively on translating the specified GitHub projects into highly detailed resume project entries (3 bullets per project).
           CRITICAL RULE: Absolutely NO fabricated metrics, percentages, or high-scale numbers (e.g. 'reduced latency by 40%', 'optimized queries by 30%', or 'scaled to 10k users') unless they are explicitly present in the input repository or commit descriptions. Focus on describing technical actions, architecture, libraries, and direct solutions instead.
        5. Education & Coursework: Extract real degrees, fields, graduation years, and relevant CS/math coursework from the PDF.
        6. Achievements & Positions: Extract any honors, competitive programming achievements, leadership roles, or leadership positions from the PDF.

        OUTPUT JSON SCHEMA (return ONLY this JSON, no markdown fences, no conversational filler):
        {{
          "name": "full name",
          "email": "email address",
          "phone": "phone number",
          "linkedin": "LinkedIn profile URL",
          "github": "GitHub profile URL",
          "website": "Personal website URL",
          "summary": "Compelling 3-4 sentence professional summary",
          "skills": {{
            "languages": ["lang1", "lang2"],
            "frameworks": ["fw1", "fw2"],
            "tools": ["tool1", "tool2"]
          }},
          "experience": [
            {{
              "title": "job title",
              "company": "company name",
              "start_date": "start date",
              "end_date": "end date or Present",
              "bullets": [
                "Detailed, action-oriented experience bullet point highlighting technologies and outcomes",
                "Another metrics-driven result-oriented bullet point"
              ]
            }}
          ],
          "projects": [
            {{
              "name": "project name",
              "tech": ["tech1", "tech2"],
              "url": "project url or empty string",
              "bullets": [
                "AI-generated high-impact bullet highlighting architecture, database, or API design decisions",
                "Metrics-focused bullet showing optimization, performance, testing, or user-centric results"
              ]
            }}
          ],
          "education": [
            {{
              "school": "school name",
              "degree": "degree (e.g. B.S.)",
              "field": "field of study (e.g. Computer Science)",
              "year": "graduation year"
            }}
          ],
          "achievements": ["achievement 1", "achievement 2"],
          "coursework": {{
            "cs": "course 1, course 2",
            "math": "math 1, math 2"
          }},
          "positions": [
            {{
              "title": "role/position name",
              "year": "year/duration",
              "description": "short description"
            }}
          ]
        }}
        """

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": "You are a professional resume synthesizer that outputs structured JSON."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.2
        }

        import requests
        import json
        res = requests.post(self.url, headers=self.headers, json=payload, timeout=30)
        if res.status_code == 200:
            content = res.json()["choices"][0]["message"]["content"].strip()
            if content.startswith("```"):
                lines = content.split("\n")
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines[-1].startswith("```"):
                    lines = lines[:-1]
                content = "\n".join(lines).strip()
            return json.loads(content)
        else:
            raise ValueError(f"AI synthesis call failed with status {res.status_code}: {res.text}")
