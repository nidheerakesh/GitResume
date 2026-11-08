# Troubleshooting

Each entry gives the symptom, the cause in the code, and what to do.

## "GitHub API rate limit exceeded ... Add a GitHub token and try again" (HTTP 429)

Anonymous REST access is capped at 60 requests per hour per IP, and one scan spends many requests. When the profile or repo list call is refused, the backend now returns 429 with this message instead of sample data. Add a GitHub token on the first screen (it moves you to the GraphQL API and the higher authenticated limit), or wait and rescan. A 502 with the same advice means GitHub refused the repo list for another reason.

## "GitHub user '<name>' was not found" (HTTP 404)

The username does not exist, or has a typo. Only the usernames `demo` and `test` return built-in sample data when a fetch fails; any other failure is an error.

## A yellow banner says "GitHub rate limit reached; N repos scanned without README/languages"

The scan ran low on rate budget part-way. Those N repos are still listed and still selectable, but have no README, language breakdown, file tree or commits, so their generated text is thin. Add a token and click **Rescan GitHub**. Note that results are cached in server memory for 10 minutes per username (and the cache survives a token change), so a rescan within that window may return the same result, warning included. Wait it out or restart the backend.

## Few or no repos listed

Forks, archived repos, near-empty repos, mirrors and coursework-looking repos are filtered out. Repos where you have no commits are dropped. Repos with no dependency manifest and no `src/`, `app/`, `lib/`, `backend/`, `frontend/` or `components/` path are scored down, and a repo scoring under 25 is not recommended (it can still be selected by hand if listed). Private repos are not included even with a token (the GraphQL query requests public only).

## The preview says "The server has no PDF engine"

The backend could not find Tectonic, so `GET /api/templates` returned `"pdf_available": false`. Install Tectonic and make sure it is found (`TECTONIC_BIN`, `PATH`, or `~/.local/bin/tectonic`; see [Configuration](configuration.md#pdf-engine-tectonic)), restart the backend, then reload the page. Until then **Print to PDF** uses the browser dialog and prints the IIT-layout Live sheet, not the selected template.

## The PDF preview shows an error note ("LaTeX error: ..." or "PDF compile failed.")

The backend returned 422 (the compiler rejected the source) or 503 (Tectonic missing at request time). The message is the first `!` error line from the compiler. If you edited the source in the LaTeX tab, fix it there or click **Rebuild from fields**. Compiles time out after 180 seconds; the first compile on a new machine downloads packages and can be slow, so retry once.

## The LaTeX tab loses my edits

It rebuilds from the form fields whenever resume data or the template changes (editing a field, applying a tailored copy, loading a version, switching template). Download the `.tex` or use **Compile my edits** before changing anything else.

## "AI API completion failed with status ..." or a 500 with an AI message

The provider rejected the call: bad key, exhausted quota, or a rate limit (for example Groq's free tier). With a key from the UI, `GROQ_API_KEY` or `OPENAI_API_KEY`, the error is returned rather than hidden. Check the key prefix against [Configuration](configuration.md), wait and retry, or switch provider. Keys and bearer tokens are redacted from returned errors (`sanitize_error` in `backend/app/main.py`). For **Use GitHub only**, the UI hides the failure and builds a local draft from commit messages, so a draft that looks plain may mean the AI call failed.

## "No AI API key or connection configured to parse/synthesize resume"

PDF parsing and **Build resume** have no offline mode, and **Build resume** needs a key even with only GitHub loaded. Paste a key on the first screen or set one on the server, or use **Use GitHub only**.

## An Anthropic key (`sk-ant-...`) does not work

The code points at the Anthropic messages endpoint but sends and reads OpenAI-style payloads, so calls fail. Use OpenRouter with a Claude model, or another provider.

## Bullets look generic or read like repo metadata

You are probably on the no-key fallback, which only restates facts ("Written in Python using FastAPI", commit messages). Add an AI key. The tailoring window shows only a generic summary rewrite without a key.

## The tailored resume hides some of my projects

In the review window only the top three matches start checked, and unchecked projects are hidden. Open the Projects tab and tick "Include Project" to bring one back, or load the `Before tailoring` version from History.

## Browser shows a network error or CORS error

- Backend not running, or the frontend points at the wrong place. On localhost the frontend uses `http://localhost:5000/api`; elsewhere it uses `/api` unless `VITE_API_BASE_URL` was set at build time. Rebuild after changing it.
- `CORS_ORIGINS` is set but does not include your frontend's exact origin (scheme, host, port). Separate multiple origins with commas.

## PDF upload fails

- "Could not extract any text": the PDF is probably scanned images. Use a text-based PDF.
- Upload also needs an AI key, because the text is parsed by the model.
- Import errors for `pdfplumber` or `multipart`: re-run `pip install -r requirements.txt` in `backend/`.
- The LinkedIn URL route exists in the API but the UI does not use it, and LinkedIn often blocks automated fetches. Upload "Save to PDF" output instead.

## Saved versions disappeared

They are stored in `localStorage` for that browser and origin. Clearing site data, a different browser, or a different domain (hosted vs localhost) starts empty.

## Docker frontend cannot reach the API

`VITE_API_BASE_URL` is baked in at build time (`http://localhost:5000/api` in `docker-compose.yml`). If you open the app from another host, rebuild with that host in the build arg.
