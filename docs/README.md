# GitResume guide

GitResume reads your GitHub repositories (languages, READMEs, dependency files, recent commit messages) and turns them into an editable resume. You can tailor it to a job description, pick one of four LaTeX templates, and export a compiled PDF or the `.tex` source. It is a FastAPI backend plus a React (Vite) frontend, MIT licensed.

## Pages

- [Quickstart](quickstart.md): run it locally or with Docker and generate a first resume.
- [Usage](usage.md): pick repos, edit, choose a template, create a tailored resume, save versions, export.
- [Configuration](configuration.md): AI providers, GitHub token, Tectonic, environment variables.
- [How it works](how-it-works.md): what is fetched from GitHub, what the AI sees, what happens without a key.
- [Troubleshooting](troubleshooting.md): rate limits, errors, missing PDF engine, missing keys.
- [Deploy](deploy.md): Vercel, Docker, Render as configured in this repo.
- [Contributing](../CONTRIBUTING.md)
