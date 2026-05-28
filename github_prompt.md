# GitHub-to-Resume Generation Prompt

Use this prompt with Claude, GPT-4, or similar LLMs to generate professional resume content from your GitHub analysis.

---

## 🎯 Master Prompt (Comprehensive)

```
You are an expert resume writer and technical recruiter who specializes in creating ATS-friendly, impact-driven resumes for software engineers and developers.

I'm providing you with my GitHub profile data and want you to help me craft a professional resume that highlights my technical expertise, achievements, and contributions.

## MY GITHUB DATA:

### Profile Information:
- Username: [GITHUB_USERNAME]
- Public Repositories: [TOTAL_REPOS]
- Followers: [FOLLOWERS]
- Following: [FOLLOWING]
- Total Public Contributions: [CONTRIBUTION_COUNT]

### Top Repositories:
[LIST OF TOP 5-10 REPOS WITH DESCRIPTION]
- Repository: [REPO_NAME]
  - Description: [README_DESCRIPTION]
  - Stars: [STAR_COUNT]
  - Language: [PRIMARY_LANGUAGE]
  - Last Updated: [LAST_UPDATE]
  - Topics: [TOPICS/TAGS]
  - Key Commits: [BRIEF_COMMIT_SUMMARY]

### Technical Skills Extracted:
- Languages: [EXTRACTED_LANGUAGES_WITH_PERCENTAGE]
- Frameworks & Libraries: [EXTRACTED_FRAMEWORKS]
- Tools & Platforms: [EXTRACTED_TOOLS]
- Databases: [DATABASES_USED]
- DevOps/Infrastructure: [DEVOPS_TOOLS]

### Contribution Patterns:
- Most Active Programming Languages: [TOP_3_LANGUAGES]
- Average Commits Per Month: [AVERAGE]
- Peak Activity Period: [TIME_PERIOD]
- Repository Types: [ORIGINAL_REPOS, FORKS, CONTRIBUTED_TO]
- Specializations Detected: [INFERRED_SPECIALIZATIONS]

### Recent Notable Commits:
[SAMPLE OF RECENT MEANINGFUL COMMITS WITH MESSAGES]

---

## TASK: Generate Resume Sections

Please create the following resume sections based on my GitHub data. Make each section:
✓ Quantifiable and metric-driven
✓ Action-oriented with strong verbs
✓ ATS-friendly (no complex formatting, no emojis)
✓ 3-5 bullet points per section
✓ Specific to my demonstrated skills and projects
✓ Professional and impactful

### 1. PROFESSIONAL SUMMARY (2-3 lines)
Create a compelling summary that:
- Highlights my core technical strengths
- Mentions key technologies I've mastered
- Reflects my GitHub contribution level
- Positions me for software engineering/developer roles
- Includes a quantifiable achievement (e.g., "100+ projects", "5K+ GitHub contributions")

Format: Concise, 2-3 sentences max

---

### 2. TECHNICAL SKILLS (Organized by Category)
Structure as:
- **Languages:** [List with proficiency]
- **Frontend:** [Frameworks/Libraries I've used]
- **Backend:** [Frameworks/Runtimes/APIs]
- **Databases:** [SQL/NoSQL systems]
- **Tools & DevOps:** [Git, Docker, CI/CD, Cloud platforms]
- **Specializations:** [Any standout areas from my repos]

Requirements:
- Only include skills demonstrated in my GitHub
- Organize by relevance to my strongest areas
- List 3-8 items per category max
- Order by proficiency level

---

### 3. PROJECTS (Top 3-5 with impact focus)
For each project, provide:

**Project Name** | [Technologies Used]
- [Quantifiable achievement or feature]
- [Technical challenge solved]
- [Impact or personal growth metric]

Requirements:
- Start with strongest/most relevant projects
- Include stars/forks only if significant (100+ stars = mention it)
- Use language that emphasizes complexity and impact
- Highlight what YOU built, not what the repo does generically
- If it's a fork with significant contributions, clarify: "Contributed X feature to [Project]"

---

### 4. OPEN SOURCE CONTRIBUTIONS (If Applicable)
List any:
- Merged pull requests to notable projects
- Contributions to popular repositories
- Contributions accepted with your name/GitHub handle
- Impact metrics (e.g., "PR merged into project with 10K+ stars")

Format: 
**Project Name** - Brief description of contribution (e.g., "Fixed critical bug in X, merged to 15K+ star repository")

---

### 5. TECHNICAL ACHIEVEMENTS & SPECIALIZATIONS
Based on my GitHub data, create 3-5 bullet points highlighting:
- Mastery of specific technologies
- Notable patterns in my contribution history
- Problem-solving approaches evident from my repos
- Scalability or architecture work
- Community involvement or mentoring

Example format:
- "Architected and deployed [X] project handling [metric] with [technology stack]"
- "Mastered full-stack development across [X] projects using [technologies]"
- "Demonstrated expertise in [specialization] with [quantifiable proof]"

---

### 6. GITHUB PROFILE STRENGTH ANALYSIS
Provide me with:
- Overall profile quality rating (1-10)
- Strengths: What's impressive about my GitHub
- Gaps: What would make my profile stronger
- Recommendations: What to build next to strengthen my portfolio

---

## TONE & STYLE REQUIREMENTS:

✓ Professional, confident, impact-driven language
✓ Use strong action verbs (Built, Engineered, Developed, Architected, Optimized, etc.)
✓ Quantify everything possible (metrics, scale, performance improvements)
✓ Avoid generic phrases like "passionate about coding"
✓ Emphasize complexity and scale of projects
✓ ATS-friendly: No special characters, emojis, or complex formatting
✓ Technical accuracy: Only claim expertise in what's proven in your GitHub

---

## OUTPUT FORMAT:

Structure your response as:

# RESUME CONTENT FROM GITHUB

## PROFESSIONAL SUMMARY
[Your summary here]

## TECHNICAL SKILLS
[Organized skills here]

## PROJECTS
[Top projects with descriptions]

## OPEN SOURCE CONTRIBUTIONS
[If applicable]

## TECHNICAL ACHIEVEMENTS
[Key achievements]

## GITHUB PROFILE ANALYSIS
[Strengths, gaps, recommendations]

---

## IMPORTANT NOTES:

1. If I don't have much GitHub history, suggest ways to quickly build a stronger portfolio
2. If I have specialized projects, emphasize those strengths
3. If I'm a contributor to major open source projects, that's a big plus - highlight it prominently
4. Tailor the experience section to suggest what types of roles my GitHub profile indicates I'd be best suited for
5. Make sure each bullet point is a standalone achievement (would make sense even without context)

Please proceed with generating my resume content based on my GitHub data above.
```

---

## 📋 Simplified Version (For Quick Use)

If the full prompt is too long, use this condensed version:

```
You are a resume expert. Using my GitHub profile data below, create professional resume sections that are:
- Quantifiable and metric-driven
- ATS-friendly (simple formatting, no emojis)
- Impact-focused with strong action verbs
- Only including skills/projects from my GitHub

MY GITHUB DATA:
- Username: [USERNAME]
- Repos: [NUMBER]
- Languages: [LIST]
- Top Projects: [LIST WITH DESCRIPTIONS]
- Total Contributions: [NUMBER]

Generate for me:
1. Professional Summary (2-3 sentences) - highlight my top 3 skills and GitHub strength
2. Technical Skills - organized by category, only from my GitHub
3. Top Projects (3-5) - with quantifiable achievements and impact
4. Technical Achievements - 3-5 bullet points showing mastery/growth

Keep it concise, impactful, and ready for a resume. Use strong verbs like: Engineered, Architected, Built, Optimized, Deployed, Developed.
```

---

## 🔧 How to Use This Prompt

### Step 1: Gather Your GitHub Data
Use GitHub's GraphQL API or REST API to collect:
```bash
# Get your profile stats
curl -H "Authorization: token YOUR_TOKEN" \
  https://api.github.com/user

# Get your repos
curl -H "Authorization: token YOUR_TOKEN" \
  https://api.github.com/user/repos?sort=stars&per_page=100

# Get contribution stats
curl -H "Authorization: token YOUR_TOKEN" \
  https://api.github.com/user/contribution/summary
```

Or use a simpler approach: copy your GitHub profile URL and ask Claude to visit it.

### Step 2: Fill in Your Data
Replace all `[BRACKETED_ITEMS]` with your actual GitHub statistics.

### Step 3: Send to Claude or Your LLM
Paste the prompt + your data into Claude.ai and run it.

### Step 4: Refine & Customize
- Copy the generated content
- Edit for accuracy and personal touch
- Adjust descriptions to match your experience level
- Remove generic phrases
- Add metrics from your actual work

---

## 💡 Pro Tips for Better Results

### Tip 1: Include Commit Messages
Add a sample of your recent commit messages - they often show your focus areas:
```
RECENT COMMITS:
- "Refactored authentication system to reduce login time by 40%"
- "Implemented caching layer improving API response time from 500ms to 50ms"
- "Built machine learning pipeline for data classification"
```

### Tip 2: Provide Context for Forks
If you have important fork contributions, clarify:
```
FORK CONTRIBUTIONS:
- [PROJECT_NAME]: Contributed feature X (PR #123, merged)
- [PROJECT_NAME]: Fixed critical bug in Y (affects 5K+ users)
```

### Tip 3: Add Career Stage/Goal
If you want tailored output, add this at the end:
```
CONTEXT FOR TAILORING:
- Career stage: [Junior/Mid/Senior]
- Target role: [SDE, Full-Stack, DevOps, Data Science, etc.]
- Industry interest: [Startups/FAANG/FinTech, etc.]
- Years of experience: [ACTUAL_YEARS]
```

### Tip 4: Ask for Multiple Versions
After the first prompt, ask:
```
Now create 3 different tailored versions of the above resume:
1. For a FAANG SDE role (emphasize scalability, complexity)
2. For a Startup role (emphasize full-stack, speed to market)
3. For a DevOps/Infrastructure role (emphasize automation, deployment)
```

### Tip 5: Iterate with Feedback
```
The professional summary feels too generic. Make it more specific about 
[YOUR_SPECIALIZATION]. Also, can you add more quantifiable metrics 
to the projects section (like performance improvements or user impact)?
```

---

## 🎯 Example Filled-In Prompt (Real Data)

```
My GitHub Data:
- Username: john-doe-dev
- Public Repos: 42
- Total Contributions: 2,847
- Languages: Python (35%), JavaScript (30%), Go (20%), Java (15%)
- Followers: 156

Top Repositories:
1. python-ml-toolkit (450 stars) - ML utilities library
2. react-dashboard (320 stars) - Admin dashboard template
3. go-microservices (280 stars) - Microservices framework
4. data-pipeline (120 stars) - ETL pipeline tool

Recent Commits:
- "Optimized database queries reducing response time by 60%"
- "Implemented gRPC service for real-time data sync"
- "Added comprehensive test coverage (95%)"

Target Role: Senior Backend Engineer at a fintech company

Please generate resume sections...
```

---

## 🚀 Advanced: Multi-Step Prompting

### Step 1: Analysis Pass
```
First, analyze my GitHub data and identify:
1. My strongest technical areas
2. Types of projects I excel at
3. What my GitHub says about my seniority level
4. What gaps exist in my portfolio

Provide this analysis before generating resume content.
```

### Step 2: Content Generation
```
Based on your analysis, now generate tailored resume sections for a [SPECIFIC_ROLE].
```

### Step 3: Job-Specific Tailoring
```
Here's a job description for [COMPANY] [POSITION]:
[PASTE_JOB_DESCRIPTION]

How would you tailor my resume content to highlight projects and skills most relevant to this role?
```

### Step 4: Comparison
```
Generate two versions:
1. General version (highlights overall strength)
2. Tailored version (focuses on this specific job)

Show the differences side-by-side.
```

---

## 📊 What Makes This Prompt Effective

✅ **Specific Requirements** - Defines exact format and tone needed
✅ **Guardrails** - Prevents vague, generic language
✅ **Context-Rich** - Provides all data upfront
✅ **Action-Oriented** - Uses strong verbs, metrics focus
✅ **Realistic** - ATS-friendly, actually usable content
✅ **Iterative** - Easy to refine and create variations
✅ **Role-Flexible** - Can be tailored for different positions

---

## 🎓 One More Thing: The Meta Prompt

When you've gathered your GitHub data and want the BEST results, try this meta approach:

```
You are Claude, an expert at helping engineers present their GitHub work as resume content.

My task: Convert my GitHub profile into powerful resume sections.
Your task: Ask me the most important clarifying questions about my GitHub data 
that will help you generate the BEST possible resume content.

Then, based on my answers, generate tailored, impactful resume sections.

Let's start - ask me your questions:
```

This gets Claude to help you think through what's actually impressive about your work.

---

## 📝 Final Checklist Before Using Prompt

Before sending your prompt, ensure you have:

- [ ] GitHub username and profile link
- [ ] List of 5-10 top repositories
- [ ] Programming languages with rough percentages
- [ ] Key frameworks/tools you've used
- [ ] Total contributions/commit count
- [ ] Any notable open source contributions
- [ ] Career stage/target role (optional but helpful)
- [ ] Specific job description to tailor toward (optional)
- [ ] 3-5 recent commit messages
- [ ] Project descriptions from README files

The more data you provide, the better the output!
```

---

## 🎯 Quick Reference: What Each Section Does

| Section | Purpose | Data Needed |
|---------|---------|------------|
| Professional Summary | Hook recruiters | Languages, projects, contribution count |
| Technical Skills | Pass ATS scan | All languages, frameworks, tools |
| Projects | Show accomplishments | Top repos, descriptions, stars/metrics |
| Open Source | Show community | Notable contributions, PR details |
| Achievements | Prove expertise | Patterns from your contribution history |
| Profile Analysis | Self-awareness | Overall GitHub strength evaluation |

---

Good luck! This prompt is designed to get professional, actionable resume content from your GitHub in one shot. 🚀
