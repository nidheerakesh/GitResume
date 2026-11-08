# Configuration

By the end of this page you will know which keys GitResume needs, where to put them, how it picks an AI provider, and how it finds the PDF engine.

GitResume runs with no keys: GitHub is fetched anonymously (rate limited) and project text is built from repo facts. Keys improve limits and quality. PDF parsing, Build resume and the career coach need an AI key.

## Where keys go

- **In the UI** (first screen): a GitHub token and one AI key (labelled "Groq or OpenRouter key"). The AI key is saved in `localStorage` (`gitresume_groq_key`). The GitHub token is kept in `sessionStorage` and clears when the tab closes. Both are sent to the backend with requests (the token in the POST body, the AI key as `groq_api_key`), so use a backend you trust.
- **On the server** (environment variables below). Useful when visitors should not paste keys. `python-dotenv` is in the requirements but nothing in `backend/` calls `load_dotenv`, so a `.env` file is not read by the app. Export variables in your shell, Docker, or your host's dashboard.

## AI provider selection

`ResumeTailor.__init__` in `backend/app/ai.py` picks one key, then detects the provider from its prefix.

Key order: `OPENROUTER_API_KEY` (env), then the key pasted in the UI, then `GROQ_API_KEY` (env), then `OPENAI_API_KEY` (env). The first non-empty one wins, so an `OPENROUTER_API_KEY` on the server overrides a key pasted in the UI.

| Key looks like | Endpoint | Model |
|---|---|---|
| `sk-or-...` (or contains "openrouter") | OpenRouter | `OPENROUTER_MODEL`, default `meta-llama/llama-3.3-70b-instruct` |
| `gsk_...` | Groq | `llama-3.3-70b-versatile` |
| `sk-ant-...` | `api.anthropic.com/v1/messages` | Not usable: requests and response parsing are OpenAI-shaped. Route Claude through OpenRouter instead. |
| `sk-...` longer than 40 chars, equal to `DEEPSEEK_API_KEY` or containing "deepseek" | DeepSeek | `deepseek-chat` |
| other `sk-...` longer than 40 chars | OpenAI | `gpt-3.5-turbo` |
| anything else | `CUSTOM_API_BASE` (default: OpenAI chat completions URL) | `CUSTOM_API_MODEL`, default `gpt-3.5-turbo` |

For DeepSeek, set `DEEPSEEK_API_KEY` to the same key you use, since DeepSeek keys otherwise look like OpenAI keys. For a custom or local server, `CUSTOM_API_BASE` must be the full chat completions URL.

## Environment variables

| Name | Used by | Purpose |
|---|---|---|
| `OPENROUTER_API_KEY` | backend | OpenRouter key, highest priority |
| `OPENROUTER_MODEL` | backend | Override the OpenRouter model |
| `GROQ_API_KEY` | backend | Groq key (also passed through by `docker-compose.yml` and `render.yaml`) |
| `OPENAI_API_KEY` | backend | OpenAI key, lowest priority |
| `DEEPSEEK_API_KEY` | backend | Marks an `sk-` key as DeepSeek |
| `CUSTOM_API_BASE` | backend | Full URL for any OpenAI-compatible server |
| `CUSTOM_API_MODEL` | backend | Model name for that server |
| `CORS_ORIGINS` | backend | Comma-separated allowed origins, default `*` |
| `TECTONIC_BIN` | backend | Path to the Tectonic executable |
| `VITE_API_BASE_URL` | frontend build | API base including `/api`; if unset, `http://localhost:5000/api` on localhost, `/api` elsewhere |

`VITE_API_BASE_URL` is read at build time, so changing it requires a rebuild (the Docker setup passes it as a build arg). `backend/.env.example` and `frontend/.env.example` exist as templates, but the backend does not load a `.env` file itself.

## PDF engine (Tectonic)

PDF output (the preview's PDF view, **Download PDF**, **Compile my edits**) needs the [Tectonic](https://tectonic-typesetting.github.io/) executable on the machine running the backend. `backend/app/pdf.py` looks for it in this order:

1. the path in `TECTONIC_BIN`, if that file exists
2. `tectonic` on `PATH`
3. `~/.local/bin/tectonic`

`GET /api/templates` reports `"pdf_available": true` when one is found; the frontend reads this once on load. Without it, the preview shows the Live sheet and **Download PDF** becomes **Print to PDF** (browser print dialog). Restart the backend and reload the page after installing.

Each compile has a 180 second timeout. Tectonic fetches LaTeX packages on demand, so the first compile on a fresh machine needs network access and is slower than later ones. `backend/Dockerfile` installs Tectonic 0.17.0 (x86_64 Linux musl build). Install steps for other systems are in the [Tectonic docs](https://tectonic-typesetting.github.io/book/latest/installation/).

## GitHub token (optional)

Without a token, GitResume uses the REST API anonymously, which GitHub limits to 60 requests per hour per IP. With a token it uses the GraphQL API (fewer requests) and the higher authenticated limit. A token with read access to public data is enough. The server does not read a GitHub token from an environment variable; it only comes from the UI.

The UI text says a token lets the scan read private repos, but the GraphQL query in `backend/app/github.py` requests `privacy: PUBLIC` only, so private repos are not included.

## CORS

`CORS_ORIGINS` defaults to `*`. In production set it to your frontend origin, for example `https://your-app.vercel.app`. On the single-domain Vercel setup it is not needed.
