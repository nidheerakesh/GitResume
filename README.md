# GitResume: Premium ATS Resume Architect and Deep Code Intelligence Engine

GitResume is a premium, open-source, automated resume-building application that turns your raw digital footprint on GitHub into high-fidelity, recruitment-ready, and ATS-compliant resumes.

Unlike basic resume generators that only look at repository names or generic commits, GitResume implements **Deep Code Intelligence** by programmatically scanning your README document structures, primary languages, dependency manifests (`package.json`, `requirements.txt`), and even downloads raw source code files to synthesize deeply technical resume accomplishments.

---

## Features

- **Deep Code Intelligence**: Automatically extracts dependency frameworks, language details, root directory structures, and implementation patterns directly from your public GitHub code files.
- **ATS-Optimized Project Bullet Points**: Leverages custom AI models (Groq/OpenAI) to write impact-driven bullet points using strong system action verbs aligned with **Google's X-Y-Z formula** (*Accomplished X, measured by Y, by doing Z*).
- **Real LaTeX (.tex) Export**: Auto-compiles your resume structures into clean, professional LaTeX source code ready to be pasted directly into Overleaf or compile offline.
- **Print-Ready Native Preview**: Built-in CSS overrides format the live dashboard preview into a clean, selectable, single-page PDF document when using the browser print-frame.
- **Individual Groq/GitHub Auth**: Users can paste their own GitHub Personal Access Tokens and Groq/OpenAI Keys to secure high-frequency limits independently.
- **Robust Local Fallback**: Integrated offline database mode which generates reliable engineering summaries based on static code patterns if API limits are completely depleted.

---

## Project Directory Structure

```
GitResume/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI application server (routes, CORS schemas)
│   │   ├── github.py        # Code tree scraper & GitHub API client
│   │   ├── resume.py        # Jinja2 custom LaTeX compiler
│   │   └── ai.py            # AI Prompt optimizer & local fallback engine
│   ├── requirements.txt     # Python backend dependencies
│   └── run.py               # Backend startup script (port 5000)
└── frontend/
    ├── package.json         # Node and React modules
    ├── src/
    │   ├── App.tsx          # Main resume designer interface
    │   ├── index.css        # Premium custom UI styles and CSS print layout
    │   └── main.tsx         # Frontend mount script
```

---

## Local Development Setup

To run GitResume locally on your machine, follow these steps:

### 1. Backend Setup
Make sure you have python 3.8+ installed:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python run.py
```
The FastAPI server will be active at [http://localhost:5000](http://localhost:5000).

### 2. Frontend Setup
Make sure you have Node.js installed:
```bash
cd frontend
npm install
npm run dev
```
The Vite React app will be running at [http://localhost:5173](http://localhost:5173).

---

## Docker Containerization

To spin up both frontend and backend instantly using Docker:

```bash
docker-compose up --build
```
This launches:
* **Frontend**: [http://localhost:5173](http://localhost:5173)
* **Backend**: [http://localhost:5000](http://localhost:5000)

---

## Deployment

This project is pre-configured for a single-platform, monorepo deployment hosted entirely on **Vercel** using Vercel Serverless Functions.

To deploy:
1. Import your GitHub repository into Vercel.
2. Select the repository root folder. Vercel will automatically detect and parse the `vercel.json` routing orchestrator.
3. Configure your server keys under **Project Settings -> Environment Variables** (e.g., add `GROQ_API_KEY`).
4. Click **Deploy**. Both the Vite frontend and FastAPI backend will serve dynamically on the same domain, eliminating CORS configuration entirely.

---

## License

This project is open-source and licensed under the [MIT License](LICENSE). Feel free to customize and expand it!
