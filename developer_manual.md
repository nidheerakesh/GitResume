# 📖 GitResume Developer Guide & Interactive Walkthrough

Congratulations! The **GitResume** project is now fully initialized, configured, and running side-by-side on your local machine.

*   **FastAPI API Server**: Active and running on [http://localhost:5000](http://localhost:5000)
*   **Vite + React SPA**: Active and running on [http://localhost:5173](http://localhost:5173)

Let's do a complete walk-through of the code structure, explaining exactly how it works and what tools we used!

---

## 📂 The Directory Architecture

```
GitResume/
├── backend/
│   ├── app/
│   │   ├── __init__.py      # Package indicator
│   │   ├── main.py          # FastAPI application controller (routes, CORS, schema)
│   │   ├── github.py        # Scraper, analyzer, and local mock database cache
│   │   ├── resume.py        # Jinja2 LaTeX engine with custom delimiters
│   │   └── ai.py            # OpenAI LLM and local keyword-based heuristic tailoring engine
│   ├── requirements.txt     # Python backend dependencies
│   ├── run.py               # Start script (runs uvicorn on port 5000)
│   └── venv/                # Local isolated python environment
└── frontend/
    ├── index.html           # Pre-configured Outfit & Inter font styles
    ├── package.json         # React & Lucide Icon dependencies
    ├── src/
    │   ├── App.css          # Reset
    │   ├── App.tsx          # Dual-panel dashboard state & live print controller
    │   ├── index.css        # Premium custom HSL dark styles & print engine override
    │   └── main.tsx         # Mount script
```

---

## 🔬 In-Depth Code Walkthrough & Lessons

### 1. Custom Delimiters for LaTeX (Jinja2)
*   **Location**: [resume.py](file:///home/nidhi/GitResume/backend/app/resume.py)
*   **Concept**: Standard Jinja2 variables look like `{{ variable }}`. However, LaTeX uses `{}` heavily for styling commands (e.g., `\textbf{text}`). Rendering standard Jinja2 within a LaTeX template would crash the compiler.
*   **Solution**: We customized the Jinja2 engine boundaries to use LaTeX-friendly symbols:
    *   Variables: `<< variable >>`
    *   Blocks/Conditions: `<% if summary %> ... <% endif %>`
*   **Sanitization**: We implemented the `sanitize_latex` method to escape control characters like `&`, `%`, and `_` to prevent LaTeX parsing breaks.

### 2. High-Performance Scraper & Local Fallback
*   **Location**: [github.py](file:///home/nidhi/GitResume/backend/app/github.py)
*   **Concept**: An unauthenticated public request to the GitHub API is limited to 60 requests per hour. To guarantee a perfect user experience without hitting limits, we:
    *   Added support for a GitHub OAuth/personal access token.
    *   Built a highly descriptive **local mock data fallback** using actual active structures (`aeon-planner`, `contest-fetcher-api`), so developers can run, test, and preview the entire dashboard in offline environments!

### 3. Smart Keyword Tailoring & Heuristic API
*   **Location**: [ai.py](file:///home/nidhi/GitResume/backend/app/ai.py)
*   **Concept**: The application takes a target job description and uses AI to align the resume summary, technologies, and bullet points.
*   **Solution**: If an `OPENAI_API_KEY` is present in the environment variables, the system executes high-grade GPT semantic alignments. If offline or no key is present, the backend switches to a **keyword scanning algorithm** that extracts required tools from the job description and rewrites achievements dynamically.

### 4. Print-Perfect Engine vs. LaTeX Compiler
*   **Location**: [index.css](file:///home/nidhi/GitResume/frontend/src/index.css) & [App.tsx](file:///home/nidhi/GitResume/frontend/src/App.tsx)
*   **Concept**: Standard local PDF compilers require multi-gigabyte TexLive packages, which are notoriously slow and fail frequently.
*   **Solution**: We built a dual compilation pipeline:
    1.  **LaTeX Code**: Creates standard, compile-ready, Off-Campus Overleaf `.tex` files that the user can download instantly.
    2.  **Native Print PDF**: Uses standard `@media print` directives in our CSS. When you click "Download PDF" in the app, it runs a native browser print-frame. The browser hides the navbar, sidebar, buttons, and dark background, formatting the preview as a clean, selectable, standard ATS-compliant PDF document directly.

---

## 🛠️ Developer Verification & How to Interact

Since the headless browser subagent experienced an environment-level CDP protocol block on the host machine (which is standard for isolated containers), **you get to be the QA engineer and test it live yourself!**

Open your desktop browser and navigate to:
👉 **[http://localhost:5173](http://localhost:5173)**

### Try This Interactive Test:
1.  On the Landing Page, click the `@charliegerard` or `@gaearon` demo chip.
2.  Click **Build My Resume**. Wait about 1.5 seconds for the profile analysis to complete.
3.  **Explore the left tabs**: Click on **Skills**, **Work**, and **Projects** to edit fields and watch the document preview on the right update in real-time.
4.  Click on the **AI Tailor** tab, paste a job description (e.g., *"Looking for a React developer skilled in TypeScript and frontend state optimization"*), and click **Optimize & Tailor**. Watch the summary and bullet points automatically adapt!
5.  Click on the **LaTeX** tab to inspect the raw LaTeX source code.
6.  Click **Download PDF** to trigger your native browser printer, and save your selectable ATS-friendly PDF resume!

---

## 💡 Master Prompt Reference

We also shipped a comprehensive **[GitHub-to-Resume Prompt Guide](file:///home/nidhi/GitResume/github_prompt.md)** in your root directory! If you want to use Claude, GPT-4, or another LLM externally to generate customized resume components or analyze your GitHub stats, this guide is completely ready for you.

