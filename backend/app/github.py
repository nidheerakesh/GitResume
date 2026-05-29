import requests
from typing import Dict, List, Any

class GitHubAnalyzer:
    def __init__(self, token: str = None):
        self.token = token
        self.headers = {}
        if token:
            self.headers["Authorization"] = f"token {token}"
        self.headers["Accept"] = "application/vnd.github.v3+json"
        
    def fetch_user_data(self, username: str) -> Dict[str, Any]:
        """
        Fetches GitHub profile and repo information for a user.
        If requests fail (e.g. rate limit, invalid user), raises Exception.
        """
        # Fetch profile
        profile_url = f"https://api.github.com/users/{username}"
        profile_res = requests.get(profile_url, headers=self.headers)
        
        if profile_res.status_code != 200:
            if profile_res.status_code == 403:
                raise Exception("GitHub API Rate Limit exceeded. Please paste a Personal Access Token (PAT) into the 'GitHub Token' input box on the screen to bypass the rate limit.")
            elif profile_res.status_code == 404:
                raise Exception(f"GitHub user '{username}' was not found. Please double check the username.")
            raise Exception(f"Failed to fetch profile for user {username}: {profile_res.text}")
            
        profile = profile_res.json()
        
        # Fetch repos (up to 100 public repos)
        repos_url = f"https://api.github.com/users/{username}/repos?per_page=100&type=owner"
        repos_res = requests.get(repos_url, headers=self.headers)
        
        if repos_res.status_code != 200:
            if repos_res.status_code == 403:
                raise Exception("GitHub API Rate Limit exceeded. Please paste a Personal Access Token (PAT) into the 'GitHub Token' input box on the screen to bypass the rate limit.")
            raise Exception(f"Failed to fetch repositories for user {username}: {repos_res.text}")
            
        repos = repos_res.json()
        
        return {
            "profile": profile,
            "repositories": repos
        }

    def fetch_user_commits(self, owner: str, repo: str, username: str) -> list:
        """
        Optimized Code Harvester: Fetches up to 3 commits and fetches diffs for the latest 2 commits 
        to preserve API rate limits while maintaining rich developer context.
        """
        try:
            # Query up to 3 recent commits by this author
            commits_url = f"https://api.github.com/repos/{owner}/{repo}/commits?author={username}&per_page=3"
            res = requests.get(commits_url, headers=self.headers)
            if res.status_code == 200:
                commits = res.json()
                contributions = []
                # Restrict to top 2 commits detail fetches to prevent hitting rate limits
                for c in commits[:2]:
                    sha = c.get("sha")
                    commit_msg = c.get("commit", {}).get("message", "Contributed code")
                    if not sha:
                        continue
                        
                    # Fetch direct files changed and their code patches (diffs)
                    detail_url = f"https://api.github.com/repos/{owner}/{repo}/commits/{sha}"
                    detail_res = requests.get(detail_url, headers=self.headers)
                    
                    code_changes = []
                    if detail_res.status_code == 200:
                        detail_data = detail_res.json()
                        files = detail_data.get("files", [])
                        for f in files:  # Inspect modified files
                            filename = f.get("filename")
                            patch = f.get("patch")
                            if filename and patch:
                                # Keep patch modifications
                                clean_patch = patch.replace('\n', '\n        ')
                                code_changes.append(f"File: {filename}\n        Code Diffs:\n        {clean_patch}")
                    
                    contributions.append({
                        "message": commit_msg.strip(),
                        "code_diffs": code_changes
                    })
                return contributions
        except Exception as e:
            print(f"Failed to fetch detailed code diffs for {owner}/{repo}: {e}")
        return []

    def fetch_repo_readme(self, owner: str, repo: str) -> str:
        """
        Fetches and decodes the README file for a repository.
        Returns the first ~1500 chars of the README content, or empty string on failure.
        """
        try:
            url = f"https://api.github.com/repos/{owner}/{repo}/readme"
            res = requests.get(url, headers=self.headers)
            if res.status_code == 200:
                import base64
                data = res.json()
                content = base64.b64decode(data.get("content", "")).decode("utf-8", errors="ignore")
                # Truncate to keep prompt budgets sane
                return content[:1500]
        except Exception as e:
            print(f"Failed to fetch README for {owner}/{repo}: {e}")
        return ""

    def fetch_repo_context(self, owner: str, repo: str, default_branch: str = "main") -> dict:
        """
        Fetches deep code context for a repository:
        - Language breakdown (bytes per language)
        - Root file listing (project structure)
        - Key dependency files (package.json deps, requirements.txt)
        - Actual source code samples (e.g., main.py, app.tsx) for deep AI code analysis
        """
        context = {"languages": {}, "file_tree": [], "dependencies": [], "source_code": []}
        
        try:
            # 1. Language breakdown (bytes per language)
            lang_url = f"https://api.github.com/repos/{owner}/{repo}/languages"
            lang_res = requests.get(lang_url, headers=self.headers)
            if lang_res.status_code == 200:
                context["languages"] = lang_res.json()
            
            # 2. Recursive tree listing (project structure & source files)
            tree_url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/{default_branch}?recursive=1"
            tree_res = requests.get(tree_url, headers=self.headers)
            if tree_res.status_code == 200:
                items = tree_res.json().get("tree", [])
                
                # File tree: limit to top level or interesting dirs
                context["file_tree"] = [item["path"] for item in items if "/" not in item["path"] or item["path"].startswith("src/")]
                
                # 3. Fetch dependencies and source code
                dep_files = ["package.json", "requirements.txt", "Pipfile", "pyproject.toml"]
                source_exts = (".py", ".ts", ".tsx", ".js", ".jsx", ".go", ".rs", ".java", ".cpp", ".c", ".h")
                
                source_candidates = []
                
                for item in items:
                    path = item["path"]
                    if item["type"] == "blob":
                        # Fetch dependencies
                        fname = path.split("/")[-1]
                        if fname in dep_files:
                            try:
                                raw_url = f"https://raw.githubusercontent.com/{owner}/{repo}/{default_branch}/{path}"
                                dep_res = requests.get(raw_url, timeout=5)
                                if dep_res.status_code == 200:
                                    if fname == "package.json":
                                        import json
                                        try:
                                            pkg = json.loads(dep_res.text)
                                            all_deps = list((pkg.get("dependencies") or {}).keys()) + list((pkg.get("devDependencies") or {}).keys())
                                            context["dependencies"].extend(all_deps)
                                        except:
                                            pass
                                    elif fname == "requirements.txt":
                                        lines = dep_res.text.strip().split("\n")
                                        for line in lines:
                                            line = line.strip()
                                            if line and not line.startswith("#"):
                                                pkg_name = line.split("==")[0].split(">=")[0].split("<=")[0].split("~=")[0].strip()
                                                if pkg_name:
                                                    context["dependencies"].append(pkg_name)
                            except:
                                pass
                        
                        # Collect source candidates
                        if fname.endswith(source_exts) and "test" not in path.lower() and "node_modules" not in path.lower():
                            source_candidates.append(path)
                
                # 4. Fetch up to 2 interesting source files for deep AI analysis
                # Prioritize 'main', 'app', 'index', or files in 'src'
                def score_source(path):
                    score = 0
                    lower_path = path.lower()
                    if "src/" in lower_path or "app/" in lower_path: score += 10
                    if "main" in lower_path or "index" in lower_path or "app" in lower_path: score += 20
                    return score
                
                source_candidates.sort(key=score_source, reverse=True)
                
                for path in source_candidates[:2]:
                    try:
                        raw_url = f"https://raw.githubusercontent.com/{owner}/{repo}/{default_branch}/{path}"
                        src_res = requests.get(raw_url, timeout=5)
                        if src_res.status_code == 200:
                            # Truncate source to 1500 chars to avoid exceeding token limits
                            context["source_code"].append({
                                "file": path,
                                "code": src_res.text[:1500]
                            })
                    except:
                        pass
        except Exception as e:
            print(f"Failed to fetch repo context for {owner}/{repo}: {e}")
        
        return context

    def analyze_profile(self, username: str) -> Dict[str, Any]:
        """
        Aggregates and synthesizes languages, repos, stars, and skill lists.
        """
        try:
            raw_data = self.fetch_user_data(username)
            profile = raw_data["profile"]
            # Exclude forked repositories right at the entrance!
            repos = [r for r in raw_data["repositories"] if not r.get("fork", False)]
        except Exception as e:
            # Fall back to mock only if username is demo or test, otherwise propagate the error!
            if username.lower() in ["demo", "test"]:
                print(f"Using demo mode for {username}")
                return self.get_mock_analysis(username)
            raise e

        # 1. Total stats
        total_repos = len(repos)
        stars_count = sum(repo.get("stargazers_count", 0) for repo in repos)
        forks_count = sum(repo.get("forks_count", 0) for repo in repos)
        
        # 2. Languages distribution
        languages_dict = {}
        for repo in repos:
            lang = repo.get("language")
            if lang:
                languages_dict[lang] = languages_dict.get(lang, 0) + 1
                
        total_lang_counts = sum(languages_dict.values())
        languages_breakdown = []
        if total_lang_counts > 0:
            languages_breakdown = [
                {"name": lang, "count": count, "percentage": round((count / total_lang_counts) * 100, 1)}
                for lang, count in sorted(languages_dict.items(), key=lambda x: x[1], reverse=True)
            ]

        # 3. Top projects (Filtered to include only repositories with active candidate commits)
        sorted_repos = sorted(repos, key=lambda x: x.get("stargazers_count", 0), reverse=True)
        top_projects = []
        for repo in sorted_repos:
            if len(top_projects) >= 5:
                break
                
            owner = repo.get("owner", {}).get("login")
            name = repo.get("name")
            
            # Fetch user commits first to verify active participation
            commits = self.fetch_user_commits(owner, name, username)
            
            # Skip repository if the candidate has 0 commits to it (ensures zero contribution repos are ignored)
            if not commits:
                continue
                
            desc = repo.get("description") or ""
            
            # Fetch deep code context: README, languages, file tree, dependencies, source code
            default_branch = repo.get("default_branch", "main")
            readme_content = self.fetch_repo_readme(owner, name)
            repo_context = self.fetch_repo_context(owner, name, default_branch)
            
            top_projects.append({
                "name": name,
                "description": desc,
                "stars": repo.get("stargazers_count", 0),
                "forks": repo.get("forks_count", 0),
                "url": repo.get("html_url"),
                "language": repo.get("language") or "Other",
                "topics": repo.get("topics", []),
                "commits": commits,
                "readme": readme_content,
                "repo_languages": repo_context.get("languages", {}),
                "file_tree": repo_context.get("file_tree", []),
                "dependencies": repo_context.get("dependencies", []),
                "source_code": repo_context.get("source_code", [])
            })

        # 4. Detected Skills
        detected_languages = list(languages_dict.keys())
        detected_frameworks = []
        detected_tools = ["Git", "GitHub Actions"]

        # Basic scanning for topics/keywords across all repos
        all_topics = []
        for repo in repos:
            all_topics.extend(repo.get("topics", []))
            
        topics_lower = [t.lower() for t in all_topics]
        names_lower = [repo.get("name", "").lower() for repo in repos]
        descs_lower = [repo.get("description", "").lower() for repo in repos if repo.get("description")]
        
        framework_keywords = {
            "react": "React", "nextjs": "Next.js", "next.js": "Next.js", "vue": "Vue.js", "angular": "Angular",
            "fastapi": "FastAPI", "flask": "Flask", "django": "Django", "express": "Express.js",
            "spring": "Spring Boot", "laravel": "Laravel", "svelte": "Svelte", "pytorch": "PyTorch",
            "tensorflow": "TensorFlow", "keras": "Keras", "scikit-learn": "Scikit-Learn", "pandas": "Pandas",
            "numpy": "NumPy", "opencv": "OpenCV", "flutter": "Flutter", "react-native": "React Native",
            "vite": "Vite", "tailwind": "TailwindCSS", "bootstrap": "Bootstrap"
        }
        tool_keywords = {
            "docker": "Docker", "kubernetes": "Kubernetes", "aws": "AWS", "gcp": "Google Cloud",
            "postgres": "PostgreSQL", "mysql": "MySQL", "mongodb": "MongoDB", "redis": "Redis",
            "sqlite": "SQLite", "git": "Git", "github": "GitHub", "gitlab": "GitLab",
            "npm": "NPM", "yarn": "Yarn", "pnpm": "PNPM", "webpack": "Webpack", "postman": "Postman",
            "heroku": "Heroku", "vercel": "Vercel", "netlify": "Netlify", "supabase": "Supabase",
            "convex": "Convex", "prisma": "Prisma", "graphql": "GraphQL"
        }
        
        def has_keyword(kw):
            if kw in topics_lower:
                return True
            for n in names_lower:
                if kw in n:
                    return True
            for d in descs_lower:
                # Pad description with spaces for safe word-boundary matching
                padded = f" {d.replace('.', ' ').replace(',', ' ').replace(';', ' ')} "
                if f" {kw} " in padded:
                    return True
            return False
        
        for k, v in framework_keywords.items():
            if has_keyword(k) and v not in detected_frameworks:
                detected_frameworks.append(v)
                
        for k, v in tool_keywords.items():
            if has_keyword(k) and v not in detected_tools:
                detected_tools.append(v)

        return {
            "name": profile.get("name") or username,
            "username": username,
            "avatar_url": profile.get("avatar_url"),
            "bio": profile.get("bio"),
            "email": profile.get("email") or f"{username}@github.com",
            "public_repos": total_repos,
            "followers": profile.get("followers", 0),
            "total_stars": stars_count,
            "total_forks": forks_count,
            "languages": languages_breakdown,
            "top_projects": top_projects,
            "detected_skills": {
                "languages": detected_languages,
                "frameworks": detected_frameworks if detected_frameworks else ["React", "FastAPI"],
                "tools": detected_tools
            }
        }

    def get_mock_analysis(self, username: str) -> Dict[str, Any]:
        """
        Fallback mock data generator for seamless API experience.
        """
        return {
            "name": f"{username}",
            "username": username,
            "avatar_url": "https://avatars.githubusercontent.com/u/9919?v=4",
            "bio": "",
            "email": f"{username}@github.com",
            "public_repos": 3,
            "followers": 0,
            "total_stars": 0,
            "total_forks": 0,
            "languages": [
                {"name": "Python", "count": 8, "percentage": 57.1},
                {"name": "TypeScript", "count": 4, "percentage": 28.6},
                {"name": "HTML/CSS", "count": 2, "percentage": 14.3}
            ],
            "top_projects": [
                {
                    "name": "aeon-planner",
                    "description": "An AI-powered daily study-planner and roadmap manager with RPG game elements.",
                    "stars": 0,
                    "forks": 0,
                    "url": f"https://github.com/{username}/aeon-planner",
                    "language": "TypeScript",
                    "topics": ["react", "convex", "typescript", "rpg", "planner"],
                    "commits": [
                        {
                            "message": "feat: implement Convex sync hooks and real-time state synchronization",
                            "code_diffs": [
                                "File: src/hooks/useConvexSync.ts\n        Code Diffs:\n        + export const useConvexSync = (taskId: string) => {\n        +   const mutate = useMutation(api.tasks.updateState);\n        +   useEffect(() => {\n        +     mutate({ id: taskId, status: 'completed' });\n        +   }, [taskId]);\n        + };"
                            ]
                        }
                    ]
                },
                {
                    "name": "contest-fetcher-api",
                    "description": "High performance server-side contest scraper proxy supporting multi-platform caching.",
                    "stars": 0,
                    "forks": 0,
                    "url": f"https://github.com/{username}/contest-fetcher-api",
                    "language": "Python",
                    "topics": ["python", "fastapi", "web-scraper", "redis"],
                    "commits": [
                        {
                            "message": "feat: implement direct contest fetching bypassing kontests.net aggregator",
                            "code_diffs": [
                                "File: app/fetcher.py\n        Code Diffs:\n        + def fetch_direct_contests():\n        +   res = requests.get('https://codeforces.com/api/contest.list', headers={'User-Agent': 'Mozilla/5.0'})\n        +   return parse_codeforces(res.json())\n        -   # Deprecated: return requests.get('https://kontests.net/api/v1/all')"
                            ]
                        }
                    ]
                },
                {
                    "name": "git-resume-generator",
                    "description": "Synthesize ATS-friendly Overleaf resume templates straight from public GitHub histories.",
                    "stars": 0,
                    "forks": 0,
                    "url": f"https://github.com/{username}/git-resume-generator",
                    "language": "Python",
                    "topics": ["python", "jinja2", "latex", "openai"],
                    "commits": [
                        {
                            "message": "feat: migrate OpenAI package initialization to direct REST calls to bypass httpx clashes",
                            "code_diffs": [
                                "File: app/ai_generator.py\n        Code Diffs:\n        + payload = {'model': self.model, 'messages': [{'role': 'user', 'content': prompt}]}\n        + res = requests.post('https://api.groq.com/openai/v1/chat/completions', headers=self.headers, json=payload)\n        - self.client = OpenAI(api_key=self.api_key)"
                            ]
                        }
                    ]
                }
            ],
            "detected_skills": {
                "languages": ["Python", "TypeScript", "JavaScript", "HTML", "CSS"],
                "frameworks": ["React", "FastAPI", "Next.js", "Express.js"],
                "tools": ["Git", "GitHub Actions", "Docker", "PostgreSQL", "Convex", "Redis"]
            }
        }
