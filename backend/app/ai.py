import os
import json
import re
import requests
from typing import Dict, List, Any

def _mentions(term: str, text_lower: str) -> bool:
    t = term.strip().lower()
    if not t:
        return False
    return re.search(r"(?<![a-z0-9])" + re.escape(t) + r"(?![a-z0-9])", text_lower) is not None


def _resume_terms(data: dict) -> list:
    skills = data.get("skills", {}) or {}
    terms = []
    for key in ("languages", "frameworks", "tools"):
        terms += skills.get(key, []) or []
    for p in data.get("projects", []) or []:
        terms += p.get("tech", []) or []
    seen, out = set(), []
    for t in terms:
        if isinstance(t, str) and t.strip() and t.lower() not in seen:
            seen.add(t.lower())
            out.append(t.strip())
    return out


def _reorder_skills(skills: dict, jd_lower: str) -> dict:
    out = {}
    for key in ("languages", "frameworks", "tools"):
        items = list((skills or {}).get(key, []) or [])
        out[key] = sorted(items, key=lambda s: not _mentions(s, jd_lower))
    return out


def _rank_projects(projects: list, jd_lower: str, preferred: list = None) -> list:
    names = [p.get("name", "") for p in projects or [] if p.get("name")]
    lower_map = {n.lower(): n for n in names}
    ranked = []
    for n in preferred or []:
        if isinstance(n, str) and n.lower() in lower_map and lower_map[n.lower()] not in ranked:
            ranked.append(lower_map[n.lower()])

    def score(p):
        terms = (p.get("tech", []) or []) + re.findall(r"[A-Za-z0-9+#.]+", p.get("name", ""))
        terms += re.findall(r"[A-Za-z0-9+#.]{4,}", " ".join(p.get("bullets", []) or []))
        return sum(1 for t in terms if _mentions(t, jd_lower))

    rest = sorted([p for p in projects or [] if p.get("name") and p.get("name") not in ranked], key=score, reverse=True)
    return ranked + [p.get("name") for p in rest]


def _match_keywords(data: dict, jd_lower: str, extra_missing: list = None, vocab: list = None) -> dict:
    terms = _resume_terms(data)
    have = {t.lower() for t in terms}
    matched = [t for t in terms if _mentions(t, jd_lower)]
    missing = []
    for k in (extra_missing or []) + (vocab or []):
        if isinstance(k, str) and k.strip() and k.lower() not in have and k.lower() not in {m.lower() for m in missing}:
            if extra_missing and k in extra_missing or _mentions(k, jd_lower):
                missing.append(k.strip())
    return {"matched": matched, "missing": missing}


_SKIP_MSG = ["initial commit", "add files via upload", "update readme", "merge", "pull request", "wip", "typo"]


def _plural(n: int, word: str) -> str:
    return f"{n} {word}" if n == 1 else f"{n} {word}s"


def _first_sentence(text: str) -> str:
    lines = [l.strip() for l in (text or "").split("\n")]
    lines = [l for l in lines if l and l[0] not in "#!<[|-`"]
    if not lines:
        return ""
    s = lines[0].split(". ")[0].strip()
    return s[:160].rstrip(".")


def _commit_themes(commits: list) -> list:
    out = []
    for c in commits or []:
        msg = c.get("message", "") if isinstance(c, dict) else str(c)
        first = (msg or "").split("\n")[0].strip()
        if first and not any(k in first.lower() for k in _SKIP_MSG) and first not in out:
            out.append(first.rstrip("."))
    return out[:2]


def _fact_bullets(p: dict, techs: list, deps: list) -> list:
    res = []
    desc = (p.get("description") or "").strip().rstrip(".")
    if desc:
        res.append(desc[0].upper() + desc[1:] + ".")
    langs = [k for k, _ in sorted((p.get("repo_languages") or {}).items(), key=lambda x: x[1], reverse=True)][:3]
    if not langs and p.get("language"):
        langs = [p["language"]]
    if langs:
        line = "Written in " + ", ".join(langs)
        if deps:
            line += " using " + ", ".join(deps[:4])
        res.append(line + ".")
    sent = _first_sentence(p.get("readme"))
    if sent and sent.lower() != desc.lower():
        res.append(sent + ".")
    themes = _commit_themes(p.get("commits"))
    if themes:
        res.append("Commit history includes: " + "; ".join(themes) + ".")
    return res[:3] or [f"Contributed to the {p.get('name', 'project')} repository."]


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
        # Pure dynamic extraction of skills with no forced, generic boilerplate dumps
        skills = analysis.get("detected_skills") or {}
        if not isinstance(skills, dict):
            skills = {}
        
        langs = list(skills.get("languages") or [])
        fworks = list(skills.get("frameworks") or [])
        tools = list(skills.get("tools") or [])

        # Clean duplicates but preserve actual parsed values
        skills["languages"] = list(set(langs))
        skills["frameworks"] = list(set(fworks))
        skills["tools"] = list(set(tools))
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

You are an AI-powered resume writer, technical recruiter, developer portfolio strategist, and engineering career analyst.

Your job is to transform structured GitHub intelligence into:
* resumes
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
1. DYNAMIC SKILLS EXTRACTION: Focus strictly on technical skills, packages, and frameworks that are explicitly present in the input sources (repositories, topics, parsed dependencies). Do NOT dump a generic list of standard technologies for a field (e.g. do not just append TailwindCSS, Next.js, FastAPI, Nginx, or Docker to every web developer). Instead, only represent the exact languages and libraries they actually used. You may logically suggest 2-3 matching additional skills (such as React Router if they used React, or PyTorch Lightning if they used PyTorch) only where they directly complement their unique stack, keeping the skillset highly specific and custom.
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

Perform archetype detection, trait analysis, and technical evaluation based on this evidence. 

FEW-SHOT STYLISTIC TEMPLATE EXAMPLES (Follow these styles with absolute fidelity):
You must dynamically analyze the candidate's raw repository names, metadata, and code patch changes to detect the specific languages, tools, libraries (e.g. NumPy, Scikit-learn, React, Tailwind CSS), and systems algorithms they used.
Formulate a highly polished, descriptive project title (e.g. "Real-Time Study Sync & RPG Dashboard (AEON)" instead of just "aeon-planner"), and write 3-4 recruiter-ready bullet points matching the exact caliber of these examples:

* Style Example 1 (Full-Stack Web / SaaS):
  - Name: "AEON: Real-Time RPG Study Sync Platform"
  - Tech: ["React", "TypeScript", "Convex", "Vite", "Tailwind CSS"]
  - Bullets:
    * "Architected real-time client-state synchronization across the dashboard views by implementing Convex sync hooks and reactive Convex query schemas."
    * "Engineered an RPG-themed gamification engine utilizing normalized study streaks, flat-rate task completion XP formulas, and state managers."
    * "Refactored calendar views by mapping Google Calendar API integrations to dynamic upcoming contest sidebar widgets, enabling seamless platform-agnostic schedule alignment."

* Style Example 2 (Signal Processing & Data Science):
  - Name: "ECG Signal Analysis & Arrhythmia Classification (AI-ECG)"
  - Tech: ["Python", "PyTorch", "Scikit-Learn", "NumPy", "Pandas", "Matplotlib"]
  - Bullets:
    * "Engineered arrhythmia classification neural networks by processing raw physiological waveforms using PyTorch and customized Scikit-Learn evaluation pipelines."
    * "Optimized raw waveform data-handling routines with vectorised NumPy and Pandas pipelines for data preparation."
    * "Formulated preprocessing and model evaluation models on the MIT-BIH dataset signal recordings."

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
  "summary": "<2-3 sentence factual summary using only languages, projects, and facts present in the input>",
  "skills": {{
    "languages": ["<language present in the input>"],
    "frameworks": ["<framework or library present in the input>"],
    "tools": ["<tool or platform present in the input>"]
  }},
  "projects": [
    {{
      "name": "<repository name or descriptive title>",
      "tech": ["<technology present in the input for this repository>"],
      "start_date": "<Mon YYYY from the input, or empty string>",
      "end_date": "<Mon YYYY, Present, or empty string>",
      "url": "<repository URL from the input>",
      "bullets": [
        "<bullet describing a feature or design choice supported by the input for this repository>"
      ]
    }}
  ],
  "experience": [],
  "achievements": []
}}

Rules for the JSON: use only facts present in the input. Do not invent roles, employers, awards, dates, metrics, or features. Leave "experience" and "achievements" as empty arrays unless the input contains real entries for them. Include every repository listed in the input as a project.
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

        # Local heuristic fallback
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

        for pIdx, p in enumerate(analysis.get("top_projects", [])):
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
            # Filter and clean package names
            techs = []
            for t in raw_techs:
                cleaned = clean_tech_name(t)
                if cleaned and cleaned not in techs:
                    techs.append(cleaned)

            # Filter and clean dependencies specifically
            deps = []
            for d in raw_deps:
                cleaned = clean_tech_name(d)
                if cleaned and cleaned not in deps:
                    deps.append(cleaned)

            p_name = p.get("name", "Project")
            desc = p.get("description", "")
            bullets = _fact_bullets(p, techs, deps)

            mock_projects.append({
                "name": p_name,
                "tech": techs[:4],
                "start_date": "",
                "end_date": "",
                "url": p.get("url") or f"https://github.com/{analysis.get('username')}/{p.get('name')}",
                "bullets": bullets[:3]
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
                "description": f"Maintained {repo_count} public repositories on GitHub with {_plural(star_count, 'star')}",
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
                Never add skills, tools, employers, projects, numbers or metrics that are not in the original resume.
                Only reword existing bullets; keep the same number of bullets per entry.

                Return ONLY a JSON object with matching structure:
                {{
                  "summary": "new tailored summary",
                  "summary_reason": "justification for summary optimization",
                  "target_role": "job title from the job description",
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
                  ],
                  "relevant_projects": ["project names copied exactly from the input, most relevant first"],
                  "missing_keywords": ["important skills or tools the job asks for that do NOT appear anywhere in the resume"]
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
                    merged_data["target_role"] = tailored_res.get("target_role") or detected_role
                    merged_data["relevant_projects"] = _rank_projects(original_data.get("projects", []), job_lower, tailored_res.get("relevant_projects"))
                    merged_data["skills"] = _reorder_skills(original_data.get("skills", {}), job_lower)
                    merged_data["keywords"] = _match_keywords(original_data, job_lower, tailored_res.get("missing_keywords"), job_keywords)

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

        tailored_data["target_role"] = detected_role
        tailored_data["relevant_projects"] = _rank_projects(original_data.get("projects", []), job_lower)
        tailored_data["skills"] = _reorder_skills(original_data.get("skills", {}), job_lower)
        tailored_data["keywords"] = _match_keywords(original_data, job_lower, None, job_keywords)

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
        You are a Resume Synthesis Engine and Expert Technical Recruiter.
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
           CRITICAL SKILLS RULE: Absolutely do NOT dump a generic list of standard technologies for a field (e.g. do not just append Next.js, TailwindCSS, MongoDB, Redis, Docker, Kubernetes, etc. to every web developer). Only suggest 2-3 additional relevant software engineering skills that uniquely and directly complement the candidate's core stack. Keep the skillset completely customized.
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
