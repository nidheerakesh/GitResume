# Provenance: where each fallback bullet comes from

Verified against backend/app/github.py and backend/app/ai.py in the working tree (main plus the approved bug fixes). The data in this folder was captured with no AI key, so every bullet comes from the local fallback, not from an LLM.

## What the backend reads per repo (GitHubAnalyzer)
- Repo list and filtering: `analyze_profile` drops forks, scores the rest, and keeps the top candidates. With a token it lists via GraphQL (`fetch_user_data_graphql`), otherwise REST (`fetch_user_data_rest`, public repos only).
- README: `fetch_repo_readme` reads `/repos/{o}/{r}/readme` and keeps the first 1500 characters.
- Commits: `fetch_user_commits` keeps up to 2 of the user's commits per repo (message plus diff patches). Only the message is used by the fallback.
- Languages and dependencies: `fetch_repo_context` reads `/languages` (bytes per language) and parses dependency manifests such as `package.json` and `requirements.txt`.
- Rate guard: when the remaining GitHub quota is low, README, commits and context come back empty for that repo, so fewer fallback bullets exist.

## How a fallback bullet is built (`_fact_bullets`, ai.py)
Each selected repo gets at most 3 bullets, in this order, and each one maps to exactly one input:
1. `description`: the repo's GitHub description, first letter capitalised, one trailing full stop. Skipped if empty.
2. `languages+deps`: "Written in" plus the top 3 languages by bytes (`repo_languages`), then "using" plus up to 4 cleaned dependency names when manifests were found. Skipped if no language is known.
3. `readme`: the first sentence of the README (`_first_sentence`: first non-empty line that does not start with a heading, image, HTML, list, table or code marker, cut at the first ". " and at 160 characters). Skipped when it equals the description. It is not stripped of Markdown, so bold markers and truncation can appear in the bullet.
4. `commit`: "Commit history includes:" plus the first line of up to 2 recent commit messages, joined with semicolons. Merge, WIP, typo, "update readme", "initial commit" and "add files via upload" messages are skipped.

Only the first 3 of these that exist are kept (`res[:3]`). If none exist, the bullet is "Contributed to the NAME repository." (not hit in this capture).

The summary line and the achievement line are also templated from real counts (languages detected, public repo count, star count).

## Files in this folder
- `resume.json`: the raw `/api/resume/generate` response.
- `profile.json`: per repo, the exact inputs the fallback used (description, languages, dependencies detected, README first sentence and its URL, commit messages and their URLs). Only public repos are present.
- `citations.json`: each bullet in resume.json matched to its input by exact reconstruction of the rule above, with a real GitHub URL (repo page, README blob on the default branch, or commit). `extra_source_urls` lists the second commit when a bullet merges two. A bullet that cannot be reconstructed is marked `unmatched`; there are none in this capture.

## Capture notes
- Username: nidheerakesh. Token was injected into the profile request by Playwright and never typed into the page or written to disk.
- The local gh token lacks the `read:user` scope, so the app's GraphQL path returns an error. The capture backend was started through a wrapper that routes only that user-fetch step to the app's own REST function, authenticated with the same token. All other app code ran unchanged.
