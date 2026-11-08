import { useEffect, useRef, type FormEvent } from 'react';
import { TextInput, Alert } from './ui';
import { ResumeSheet } from './ResumePreview';
import { SAMPLE_RESUME } from './sampleResume';

const DEMO_PROFILES = ['gaearon', 'charliegerard', 'tannerlinsley'];

interface LoginCardProps {
  username: string;
  setUsername: (value: string) => void;
  usernameError: string;
  token: string;
  setToken: (value: string) => void;
  groqKey: string;
  setGroqKey: (value: string) => void;
  errorMsg: string;
  onSubmit: (e: FormEvent) => void;
}

export function LoginCard(props: LoginCardProps) {
  const usernameRef = useRef<HTMLInputElement>(null);

  // Move focus to the username field when it fails validation
  useEffect(() => {
    if (props.usernameError) usernameRef.current?.focus();
  }, [props.usernameError]);

  return (
    <main id="main" className="page page-wide landing">
      <section className="landing-copy">
        <h1 className="landing-title">Your GitHub repos, typeset as a resume.</h1>
        <p className="landing-lede">
          GitResume reads your repositories and your existing resume, drafts the bullets with an LLM, and lets you approve every change before you export LaTeX.
        </p>

        <form className="login-form" onSubmit={props.onSubmit}>
          {props.errorMsg && <Alert tone="error">{props.errorMsg}</Alert>}

          <TextInput
            label="GitHub username"
            placeholder="e.g. gaearon…"
            value={props.username}
            onChange={props.setUsername}
            required
            autoComplete="username"
            spellCheck={false}
            error={props.usernameError}
            inputRef={usernameRef}
          />
          <TextInput
            label="Personal access token (optional)"
            type="password"
            placeholder="Needed for private repos…"
            value={props.token}
            onChange={props.setToken}
            autoComplete="off"
          />
          <TextInput
            label="Groq or OpenRouter key (optional)"
            type="password"
            placeholder="Enables AI drafting. Without it, a local draft is used…"
            value={props.groqKey}
            onChange={props.setGroqKey}
            autoComplete="off"
          />

          <div className="row">
            <button type="submit" className="btn btn-primary btn-lg">
              Open workspace
            </button>
          </div>
        </form>

        <div className="demo-profiles">
          <span className="demo-profiles-label">Or try a public profile</span>
          <div className="row row-tight">
            {DEMO_PROFILES.map((demo) => (
              <button key={demo} type="button" className="skill-chip chip-button" onClick={() => props.setUsername(demo)}>
                @{demo}
              </button>
            ))}
          </div>
        </div>
      </section>

      <aside className="landing-sample" aria-label="Sample output">
        <div className="resume-preview-wrapper">
          <ResumeSheet resume={SAMPLE_RESUME} />
        </div>
        <p className="landing-caption">Sample output. The name and details are made up.</p>
      </aside>
    </main>
  );
}
