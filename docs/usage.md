# Usage

By the end of this page you will know every step the UI exposes, from scanning repos to exporting a PDF. Labels in bold match the UI in `frontend/src/`. For what each step sends to the AI, see [How it works](how-it-works.md).

## Generate a resume from GitHub

1. On the first screen enter a username. Add a GitHub token and an AI key if you have them, then click **Open workspace**.
2. In the portal, click **Scan GitHub** (the button reads **Rescan GitHub** afterwards).
3. Choose repos (below), then click **Use GitHub only**.

Without an AI key this still works, but the project text comes from facts in the repo (description, languages and dependencies, first README sentence, commit messages), not from a model. If the generate request fails for any reason, the UI silently builds a local draft from your commit messages instead. That draft includes a summary sentence and an "Open Source Contributor" achievement stamped with the current year, so check it.

## Choose repos

After a scan, the list shows candidate repos (at most 18 are analysed) with search, a language filter and a Stars/Name sort. Recommended repos are pre-selected, up to 7. If none are recommended, the first 7 in score order are selected.

- The badge reads `N of 7 selected`. Selecting an eighth shows "7 repos is the limit"; unselect one first.
- **Select top 7** picks the first 7 in the backend's score order (not necessarily the recommended set). **Clear** empties the selection.
- Only selected repos are sent to the AI.
- Every selected repo is kept in the generated resume. Generation does not drop repos.

If GitHub's rate limit was hit mid-scan, a warning banner appears above the sources, for example "GitHub rate limit reached; 4 repos scanned without README/languages. Add a token." Those repos are listed with thinner data. See [Troubleshooting](troubleshooting.md).

## Combine GitHub with an existing resume PDF

1. Click **Choose PDF**. The backend extracts text with pdfplumber and an AI call parses it, so this needs an AI key.
2. Click **Build resume**. It combines GitHub and PDF (experience, education and similar come from the PDF). It needs an AI key even when only GitHub is loaded; use **Use GitHub only** for the no-key path.
3. **Use PDF only** parses the PDF into the editor without GitHub data. If the parse fails, nothing visible happens.

There is a LinkedIn URL endpoint in the backend, but the UI does not call it. Save your LinkedIn profile as PDF (More, then Save to PDF) and upload that.

## Edit

The left panel has tabs: Header, Skills, Education, Experience, Projects, Achievements, Coursework, Positions, Tailor, LaTeX. Skills are comma-separated lists. In Projects, each project has an "Include Project" checkbox; unchecked projects are hidden from every template but not deleted. The Header tab has Degree Course and Roll Number fields, which the IIT template uses.

## Choose a template and preview

The preview header has a **Template** menu and a **PDF / Live sheet** toggle. The choice is remembered in `localStorage` (`gitresume_template`).

| Template | Layout |
|---|---|
| IIT style (default) | Academic one-column with roll number, coursework and positions |
| Jake's Resume | Classic one-column ATS layout |
| Modern minimal | Sans-serif one-column with a colored accent |
| Compact two-column | Sidebar for skills and education |

- **PDF** shows the compiled PDF and recompiles about a second after you stop editing. It is disabled when the server has no Tectonic; the preview then shows the Live sheet with a note.
- **Live sheet** is an HTML approximation. It always uses the IIT layout, whatever template is selected, so check the PDF view before exporting.

## Create a tailored resume

1. Open the **Tailor** tab, paste the job description, and click **Create tailored resume**.
2. A review window opens with:
   - **Job keywords**: skills from your resume that the job mentions (matched) and ones it asks for that you do not have (missing). Missing keywords are never added for you.
   - **Projects to include**: all projects, ranked by fit. The top three are checked and marked "Top match". Unchecked projects stay in the resume but are hidden.
   - **Skills**: a checkbox to put job-matching skills first (on by default).
   - Proposed rewrites of the summary and bullets, each with the original, the rewrite and a "Why" line. Mark each **Stage** or **Discard**.
3. Name the copy (default `Tailored: <role>`) and click **Save tailored copy**.

Saving applies the tailored copy in the editor and stores it as a version. It also stores your pre-tailoring resume as `Before tailoring (<date>)`, unless an identical version already exists. Nothing changes if you close the window.

With an AI key, the model rewrites bullets and suggests missing keywords. Without a key you still get project ranking, skill order and a keyword check, but missing keywords come only from a fixed list of 20 common technologies, and the only rewrite offered is a generic one-sentence summary. Discard it if you do not want it.

## Save named versions

Type a name in the field at the top of the editor and click **Save version**. **History (n)** in the header lists saved versions, and the portal screen lists them with Load and Delete. Versions live in your browser's `localStorage` (`gitresume_versions`), so they stay on that browser and origin.

## Ask the career coach

Click **Ask the coach** (lower right, once a resume is open) and ask, for example, "Why did you put Jinja2 in my skills?". The backend sends your current resume JSON plus the last 8 chat messages to the model. It answers from the resume data and general ATS advice; it does not re-fetch GitHub. It needs an AI key.

## Export

- **PDF**: **Download PDF** compiles on the server with Tectonic and downloads `resume_<name>.pdf`. When the server has no Tectonic the button reads **Print to PDF** and opens the browser print dialog instead (a print stylesheet prints only the Live sheet, which is IIT layout).
- **LaTeX**: **Download .tex** saves `resume_<name>.tex` for the selected template. The LaTeX tab shows the source with **Copy source**. Templates use packages such as `cfr-lm` and `fontawesome` (IIT) that [Overleaf](https://www.overleaf.com) provides.
- **Hand-edited LaTeX**: edit the source in the LaTeX tab and click **Compile my edits** to render it in the PDF preview (needs Tectonic). **Rebuild from fields** regenerates the source from the form. Editing any field also rebuilds the source and replaces hand edits, so download the `.tex` first. While your hand-edited source is shown, **Download PDF** compiles that source rather than the form data.
