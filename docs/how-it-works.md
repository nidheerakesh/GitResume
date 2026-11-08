# How it works

This page explains what GitResume reads, what it sends to the AI, and what you get when no AI is available.

```
username (+ optional token)
   |
   v
github.py   fetch profile + repos, score, deep-fetch up to 18 candidates
   |        (cached in memory for 10 minutes per username)
   v
you         pick up to 7 repos in the UI
   |
   v
ai.py       prompt with README, deps, languages, commit messages
   |        no key -> facts-only local fallback
   v
editor      you edit, tailor, save versions
   |
   v
resume.py   Jinja2 renders LaTeX (.tex) from the chosen template
pdf.py      Tectonic compiles the .tex to PDF (if installed)
```

## 1. GitHub fetch (`backend/app/github.py`)

- With a token: one GraphQL query for the profile and up to 50 public, non-fork repos ordered by stars, with 3 commits of history preloaded per repo. Without a token: REST calls for the profile and `/repos?per_page=100&type=owner`.
- Hard filters drop forks, archived repos, near-empty repos, mirrors, and repos whose name, description or topics look like coursework or notes (for example "solutions", "cheat_sheet"), unless the description claims original work.
- A heuristic score (keywords for AI, backend, systems and full-stack work, description and topics, recency, homepage, capped stars and forks) picks up to 18 candidates for deep fetching.
- For each candidate: up to 2 commit messages, the README (first 1500 characters), language byte counts, a file tree (top-level paths and `src/`), dependency names from `package.json` and `requirements.txt`, and up to two source files (first 1500 characters each).
- Repos with no commits by the user are dropped, except repos that were skipped for lack of rate budget (they are kept with thin data). A second score adds points for README depth, CI, tests, Docker and a dependency manifest, and subtracts points for loose files with no manifest or source folder. The response lists all surviving candidates, sorted by score. Up to 7 above a score of 25 are marked recommended, with a penalty for repeating a primary language.
- Skills are detected by matching repo names, topics and descriptions against keyword lists, plus GitHub's language data.

Failure behaviour: an unknown user returns 404 and a rate limit returns 429 ("Add a GitHub token and try again"). If the rate budget runs low mid-scan, the code skips READMEs, repo context and commits for the remaining repos and adds a `warnings` entry to the response, which the portal shows as a banner. Only the usernames `demo` and `test` return built-in sample data on failure. Results, including warnings, are cached by username for 10 minutes.

## 2. AI generation (`backend/app/ai.py`)

For each selected repo the generate prompt includes: description, stars, primary language, topics, language breakdown, file structure, up to 25 dependency names, the first 400 characters of the README, and the available commit messages (at most 2, since the fetch keeps 2). Patches and source files are fetched but not sent.

What the prompt instructs (read it in `generate_resume_from_github`):

- Skills only from what appears in the inputs.
- No invented metrics, percentages or scale unless present in the input.
- `experience` and `achievements` stay empty unless the input has real entries; every listed repo must appear as a project.

Limits you should know about:

- These are instructions to a model, not enforced checks. Read the output before using it.
- The prompt's style examples are written to look like polished resume bullets, and the model may imitate their tone. Check every claim against your repo.
- The frontend (`normalizeResumeData`) filters generated projects to the repos you selected.
- Each AI call has a 30 second timeout (15 seconds for the standalone summary call).

## 3. Tailoring

`tailor_resume` sends the resume JSON and job text and asks for reworded summary and bullets with a one-line reason each, the project names most relevant to the job, and job keywords missing from the resume. Rewrites are merged back only if the number of projects and experience entries is unchanged. The server then computes, without the model:

- project ranking: the model's picks first, then the rest by overlap with the job text
- skill order: skills mentioned in the job text first
- keyword report: your resume terms found in the job text (matched), and missing terms the model suggested or that appear in a fixed list of 20 technologies

Matching is whole-word and case-insensitive. The UI shows rewrites as per-change Stage/Discard, lets you choose projects, and saves the result as a new version (see [Usage](usage.md)). The frontend only keeps project names and skills that already exist in your resume.

## 4. No AI key

- Generate (**Use GitHub only**): `generate_resume_from_github` returns facts only. Each project gets up to three bullets from: the repo description; "Written in <languages> using <dependencies>"; the first sentence of the README; "Commit history includes: ..." with up to two non-boilerplate commit messages. Start and end dates are empty. The summary is a template sentence from your top languages and repo names, and there is one achievement ("Open Source Contributor") with counts from the selected repos and a hardcoded year of 2025. Edit or remove it.
- Tailor: summary replaced by a fixed generic sentence; bullets unchanged; ranking, skill order and keyword report still computed.
- Parse (PDF), Build resume (synthesize) and chat have no fallback and return an error. In the UI, **Use PDF only** fails silently.

When a key is configured and the AI call fails, behaviour depends on where the key came from. A key from the UI, `GROQ_API_KEY` or `OPENAI_API_KEY` makes the request fail with an error message. A key only from `OPENROUTER_API_KEY` falls through to the local fallback. In the UI, a failed generate request falls back to a local conversion of your commit messages.

## 5. LaTeX and PDF (`backend/app/resume.py`, `backend/app/pdf.py`)

`generate_resume_latex` escapes LaTeX special characters in every string, then renders the selected Jinja2 template from `backend/app/templates/` (`iit`, `jakes`, `modern`, `twocol`) with custom delimiters (`<< >>`, `<% %>`) so braces in LaTeX do not clash. `POST /api/resume/pdf` writes the LaTeX to a temporary directory and runs `tectonic -X compile`. Responses: PDF bytes on success, 503 if Tectonic is missing, 422 with the compiler message and log tail on a LaTeX error.

The IIT template header comment credits another author ("Tejas Khairnar"), so confirm you may reuse that template before publishing a resume built from it. The Jake's Resume template header says it is based on the MIT-licensed design by Jake Gutierrez.
