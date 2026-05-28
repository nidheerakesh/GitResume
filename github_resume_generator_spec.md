# GitHub Resume Generator Web App - Technical Specification

## 📋 Project Overview

A full-stack web application that automatically extracts GitHub profile data (repositories, commits, forks, contributions) and generates customizable, ATS-friendly LaTeX resumes using the Overleaf template format. Users can tailor content with AI-powered job descriptions, save multiple named versions, and download as PDF.

---

## 🎯 Core Features

### 1. GitHub Authentication & Data Analysis
- **OAuth 2.0 Integration**
  - GitHub App or OAuth Application setup
  - Scopes: `public_repo`, `read:user` (no write permissions needed)
  - Secure token storage (encrypted in backend session/database)
  - One-click "Connect GitHub" button

- **Data Extraction & Analysis**
  - Fetch all repositories (public + private with permission)
  - Analyze commits: total count, languages, frequency, contributions timeline
  - Repository metrics: stars, forks, watchers, topics/tags
  - Languages breakdown (% distribution)
  - Contribution graph insights (most active periods)
  - Fork analysis: original vs. contributed-to repos
  - README parsing for project descriptions
  - Commit messages analysis for keywords/skills

- **Smart Skill Detection**
  - Extract programming languages from repos
  - Extract technologies/frameworks from README files
  - Identify achievements from commit messages
  - Calculate proficiency levels based on commit frequency

### 2. LaTeX Resume Generation

- **Template: Overleaf ATS-Friendly (Off-Campus Style)**
  - Clean, simple structure optimized for ATS parsing
  - No complex graphics/colors that confuse ATS
  - Proper section hierarchy
  - Consistent formatting
  - Support for custom sections

- **Standard Resume Sections**
  - Header (Name, Email, Phone, LinkedIn, GitHub URL)
  - Professional Summary (AI-generated or manual)
  - Technical Skills (extracted + customizable)
  - Experience (job history with tailored descriptions)
  - Projects (top GitHub projects with descriptions)
  - Education (manual input)
  - Certifications/Awards (optional)
  - Additional Sections (custom fields)

### 3. AI-Powered Descriptions & Tailoring

- **Auto-Generated Content**
  - Project descriptions from README + commit analysis
  - Achievement highlights from contribution patterns
  - Technical skill summaries

- **Job Description Matching**
  - Input: Target job description
  - Process: AI analyzes job requirements and your GitHub data
  - Output: Tailored bullet points emphasizing relevant projects/skills
  - Edit & customize before saving

- **Resume Customization Workflow**
  1. Auto-generate content from GitHub
  2. Review and edit all sections
  3. Input job description for specific role
  4. AI suggests tailored versions
  5. Manual tweaks allowed
  6. Save as named version (e.g., "Google-SWE-2024")

### 4. Resume Version Management

- **Version Saving**
  - Save with custom names (e.g., "Google SDE", "Startup Backend Dev")
  - Each version stores:
    - LaTeX source code
    - Metadata (created date, target job)
    - All customizations
  - List all saved versions with timestamps
  - Compare versions side-by-side (optional)
  - Delete/duplicate versions

- **Download Options**
  - Download as PDF (requires LaTeX compilation backend)
  - Download as .tex file (raw LaTeX)
  - Download as .docx (optional, via pandoc)

---

## 🏗️ Tech Stack

### Frontend
- **Framework**: React 18+ (TypeScript)
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: React Context + Zustand
- **Form Handling**: React Hook Form + Zod validation
- **Rich Text**: TipTap or Draft.js (for editing)
- **PDF Preview**: React-PDF or similar
- **HTTP Client**: Axios or Fetch API
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js (Express.js) or Python (FastAPI)
- **Database**: PostgreSQL or MongoDB
  - Store: User profiles, resume versions, GitHub metadata cache
  - Encryption: For sensitive data (GitHub tokens)
- **Authentication**: Passport.js (OAuth 2.0)
- **GitHub API**: Octokit (Node) or PyGithub (Python)
- **AI/LLM Integration**: OpenAI API or similar (for tailoring)
- **LaTeX Compilation**: TinyTeX or Docker container (latexmk)
- **Task Queue**: Bull (Redis) or Celery for async PDF generation

### Infrastructure
- **Hosting**: Vercel (frontend) + Heroku/Railway (backend)
- **Database Hosting**: Supabase, Railway, or managed PostgreSQL
- **File Storage**: AWS S3 or similar (for PDFs, cached data)
- **Cache Layer**: Redis (for rate limiting, session management)

---

## 📊 Database Schema

### Users Table
```
id (UUID)
github_id (number)
github_username (string)
email (string)
oauth_token (encrypted string)
profile_data (JSON) - cached GitHub profile
created_at (timestamp)
updated_at (timestamp)
```

### ResomeVersions Table
```
id (UUID)
user_id (FK)
version_name (string) - e.g., "Google SWE"
latex_source (text)
metadata (JSON)
  - target_job_description
  - created_date
  - last_modified
  - tags/labels
created_at (timestamp)
updated_at (timestamp)
```

### CachedGitHubData Table
```
id (UUID)
user_id (FK)
repositories (JSON)
commits_analysis (JSON)
languages_breakdown (JSON)
skills_detected (JSON)
last_fetched (timestamp)
```

---

## 🔄 API Endpoints

### Authentication
- `POST /api/auth/github` - Initiate OAuth flow
- `GET /api/auth/callback` - GitHub OAuth callback
- `POST /api/auth/logout` - Logout user

### GitHub Data
- `GET /api/github/profile` - Fetch & analyze user's GitHub profile
- `GET /api/github/repos` - Get all repositories
- `POST /api/github/analyze` - Trigger detailed analysis
- `GET /api/github/stats` - Get extracted skills & metrics

### Resume Operations
- `POST /api/resume/generate` - Generate initial LaTeX from GitHub data
- `POST /api/resume/tailor` - Tailor resume based on job description
- `GET /api/resume/versions` - List all saved versions
- `POST /api/resume/versions` - Save new version
- `PUT /api/resume/versions/:id` - Update version
- `DELETE /api/resume/versions/:id` - Delete version
- `GET /api/resume/versions/:id/download` - Download as PDF/LaTeX
- `POST /api/resume/compile` - Compile LaTeX to PDF

### Utilities
- `POST /api/generate-description` - Generate project/achievement description
- `POST /api/extract-skills` - Extract skills from job description
- `GET /api/health` - Health check

---

## 🎨 UI/UX Workflow

### 1. Landing Page
- Brief explanation of what the app does
- GitHub login button
- Feature highlights

### 2. Dashboard (Post-Login)
- Display: GitHub profile summary
- Button: "Generate Resume"
- Sidebar: List of saved resume versions
- Settings: Manage GitHub connection

### 3. Resume Generator Page
#### Step 1: GitHub Analysis
- Show loading spinner while fetching data
- Display extracted data:
  - Repositories (with stats)
  - Top languages
  - Detected skills
  - Contribution insights

#### Step 2: Edit Sections
- Tabbed interface:
  - Header (Name, contact info)
  - Summary (AI-generated or write custom)
  - Skills (extracted + editable)
  - Experience (work history)
  - Projects (top repos, auto-populated)
  - Education
  - Custom sections (add more)
- Real-time LaTeX preview on right side
- Rich text editor for descriptions

#### Step 3: Job Tailoring
- Text area: Paste job description
- Button: "Analyze & Suggest"
- AI generates tailored bullet points for projects & experience
- User reviews and accepts/rejects suggestions
- Option to re-tailor for different roles

#### Step 4: Save & Download
- Input: Version name (e.g., "Google-SDE-2024")
- Optional: Tag with job title, company
- Download options:
  - PDF (compiled LaTeX)
  - LaTeX (.tex file)
  - Docx (optional)
- Show success message with version saved

### 4. Saved Versions Page
- Table/Grid of all versions:
  - Version name
  - Created date
  - Last modified
  - Tags/Company
- Actions per version:
  - Edit
  - Download
  - Duplicate
  - Compare
  - Delete
- Filter/search by name or date

---

## 🔐 Security Considerations

1. **OAuth Token Security**
   - Store tokens encrypted in database
   - Use environment variables for API secrets
   - Implement token refresh logic

2. **User Data**
   - No public GitHub profiles exposed
   - Encrypted at-rest for sensitive data
   - HTTPS only communication

3. **Rate Limiting**
   - GitHub API rate limits (60 req/hr unauthenticated, 5000/hr authenticated)
   - Implement local rate limiting (Redis)
   - Cache GitHub data to minimize API calls

4. **Input Validation**
   - Validate LaTeX syntax before compilation
   - Sanitize user inputs
   - Prevent LaTeX injection attacks

---

## ⚙️ Implementation Phases

### Phase 1: Core Setup (Week 1)
- Project scaffolding (frontend + backend)
- GitHub OAuth integration
- Basic database setup
- User authentication flow

### Phase 2: GitHub Analysis (Week 2)
- GitHub API integration with Octokit
- Data extraction (repos, commits, languages)
- Skill detection algorithm
- Caching strategy

### Phase 3: LaTeX Template & Generation (Week 3)
- Implement Overleaf ATS template
- Dynamic LaTeX generation from JSON data
- LaTeX compilation pipeline (Docker + latexmk)
- PDF generation

### Phase 4: UI & Resume Builder (Week 4)
- React component architecture
- Resume editor interface (tabbed layout)
- Real-time LaTeX preview
- Form validation

### Phase 5: AI-Powered Tailoring (Week 5)
- OpenAI API integration
- Job description parser
- Tailoring suggestions engine
- Manual editing interface

### Phase 6: Version Management & Storage (Week 6)
- Database schema for versions
- CRUD operations for saved versions
- Download functionality
- Version history/comparison

### Phase 7: Polish & Deployment (Week 7)
- Error handling & logging
- UI/UX refinement
- Testing (unit + integration)
- Deployment to production

---

## 📦 LaTeX Resume Template (Overleaf ATS-Friendly)

```latex
\documentclass[letterpaper]{article}
\usepackage[utf-8]{inputenc}
\usepackage[margin=0.5in]{geometry}
\usepackage[T1]{fontenc}
\usepackage{xcolor}
\usepackage{hyperref}
\usepackage{enumitem}

% No custom colors or complex formatting
\setlength{\parindent}{0pt}
\setlength{\parskip}{0pt}
\setlist{leftmargin=0.2in, nosep}

% Command definitions
\newcommand{\heading}[1]{{\large\bfseries #1}\vspace{3pt}}
\newcommand{\subheading}[4]{\textbf{#1} | #2 \hfill #3 -- #4 \vspace{3pt}}
\newcommand{\subheadingshort}[3]{\textbf{#1} | #2 \hfill #3 \vspace{3pt}}

\begin{document}

% HEADER
\begin{center}
\textbf{\Large YOUR_NAME} \\
\small Email | Phone | LinkedIn | GitHub
\end{center}
\vspace{6pt}
\hrule
\vspace{6pt}

% PROFESSIONAL SUMMARY (optional)
\heading{PROFESSIONAL SUMMARY}
\begin{itemize}
\item Brief overview of skills and experience
\end{itemize}
\vspace{6pt}

% TECHNICAL SKILLS
\heading{TECHNICAL SKILLS}
\begin{itemize}
\item \textbf{Languages:} Python, JavaScript, Java, C++
\item \textbf{Frameworks:} React, Node.js, FastAPI
\item \textbf{Tools:} Docker, Git, AWS
\end{itemize}
\vspace{6pt}

% EXPERIENCE
\heading{EXPERIENCE}
\subheading{Job Title}{Company}{Month Year}{Month Year}
\begin{itemize}
\item Achievement with metrics
\item Impact statement
\end{itemize}

\subheading{Previous Job}{Previous Company}{Month Year}{Month Year}
\begin{itemize}
\item Achievement with metrics
\end{itemize}
\vspace{6pt}

% PROJECTS
\heading{PROJECTS}
\subheadingshort{Project Name}{Technologies Used}{GitHub Link}
\begin{itemize}
\item Project description with impact
\item Key technologies and contributions
\end{itemize}
\vspace{6pt}

% EDUCATION
\heading{EDUCATION}
\subheading{Degree}{University}{Graduation Month}{Year}

\end{document}
```

---

## 🚀 Advanced Features (Future)

1. **Multiple Template Styles**
   - Modern minimalist
   - Traditional formal
   - Two-column layout
   - Creative/design-focused

2. **AI Enhancements**
   - Auto-generate cover letters
   - LinkedIn profile sync
   - Interview preparation tips based on resume

3. **Analytics**
   - Track which resume versions were downloaded
   - Analytics on which projects/skills are highlighted most

4. **Collaboration**
   - Share resume versions with others for feedback
   - Comment/suggest improvements

5. **Integration with Job Boards**
   - Direct submit to job applications
   - Auto-tailor based on job posting

---

## 📝 Installation & Deployment Guide

### Local Development Setup

#### Backend (Node.js/Express)
```bash
# Clone repo
git clone <repo-url>
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Fill in: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, DATABASE_URL, OPENAI_API_KEY

# Start development server
npm run dev
```

#### Frontend (React)
```bash
# In frontend directory
npm install

# Create .env file
REACT_APP_API_URL=http://localhost:5000
REACT_APP_GITHUB_CLIENT_ID=<your-client-id>

# Start development
npm start
```

#### Docker Setup
```bash
docker-compose up -d
```

### Production Deployment

**Frontend**: Deploy to Vercel
```bash
npm run build
# Connect to Vercel, auto-deploys on push
```

**Backend**: Deploy to Railway/Heroku
```bash
git push heroku main
```

**Database**: PostgreSQL on Railway or AWS RDS

---

## 📚 Dependencies Reference

### Frontend
- react@18+
- next.js (optional, for SSR)
- tailwindcss
- shadcn/ui
- react-hook-form
- zod
- axios
- zustand
- react-pdf / pdfjs-dist

### Backend
- express
- passport / passport-github2
- pg (PostgreSQL)
- jsonwebtoken
- dotenv
- cors
- helmet
- openai (or similar LLM)
- octokit
- latex-parser / texjs (for validation)
- bull / bull-board (job queue)

### Build & Deployment
- docker
- docker-compose
- latexmk (or tinylatex)

---

## 🧪 Testing Strategy

- **Unit Tests**: Jest for backend functions & utilities
- **Integration Tests**: Supertest for API endpoints
- **E2E Tests**: Cypress for full user workflows
- **LaTeX Compilation Tests**: Validate syntax before compilation

---

## 📊 Performance Optimization

1. **Caching**
   - Cache GitHub data (refresh every 24 hours)
   - Cache LaTeX compilation results
   - Browser caching for static assets

2. **Async Processing**
   - Queue PDF generation (long-running task)
   - Offload AI tailoring to background jobs

3. **Lazy Loading**
   - Load resume sections on demand
   - Paginate version list

---

## 🤝 Contributing & Maintenance

- Code style: Prettier + ESLint
- Git flow: main (production) + dev (staging)
- CI/CD: GitHub Actions for testing & deployment
- Documentation: Keep README & API docs updated

---

## 📞 Support & Feedback

- GitHub Issues for bug reports
- Feature request voting system
- Email support for premium features (future)

---

## License

MIT License - see LICENSE file

---

## Glossary

- **ATS**: Applicant Tracking System (automated resume parser)
- **OAuth 2.0**: Secure authentication protocol
- **LaTeX**: Document preparation system for professional documents
- **Octokit**: Official GitHub API client
- **PDFs Compilation**: Converting LaTeX source to PDF using latexmk

