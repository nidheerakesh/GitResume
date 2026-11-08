import { Trash2 } from 'lucide-react';
import type { SavedVersion } from '../types';
import { Alert, Spinner } from './ui';
import { GitHubSourceCard, PdfSourceCard, type GitHubSource, type PdfSource } from './portal/SourceCards';

interface PortalProps {
  username: string;
  token: string;
  errorMsg: string;
  savedVersions: SavedVersion[];
  onDisconnect: () => void;
  onLoadVersion: (version: SavedVersion) => void;
  onDeleteVersion: (id: string) => void;
  github: GitHubSource;
  pdf: PdfSource;
  isSynthesizing: boolean;
  onSynthesize: () => void;
}

function SavedVersions({ versions, onLoad, onDelete }: {
  versions: SavedVersion[];
  onLoad: (version: SavedVersion) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <section className="portal-section">
      <h3 className="section-title">Saved versions ({versions.length})</h3>
      {versions.length > 0 ? (
        <div className="version-grid">
          {versions.map((version) => (
            <div key={version.id} className="version-card">
              <div className="version-meta">
                <span className="version-name">{version.name}</span>
                <span className="muted tiny">{new Date(version.timestamp).toLocaleString()}</span>
              </div>
              <div className="row row-tight">
                <button className="btn btn-primary btn-sm" onClick={() => onLoad(version)}>
                  Load
                </button>
                <button className="btn btn-secondary btn-sm btn-danger" onClick={() => onDelete(version.id)}>
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          No saved versions yet. Save a version from the editor to reload it here.
        </div>
      )}
    </section>
  );
}

function HowItWorks() {
  return (
    <div className="guide">
      <h4 className="guide-title">How it works</h4>
      <div className="guide-grid">
        <div>
          <strong>Sources</strong>
          Load GitHub, a resume PDF, or both. A repo is used only if you keep it selected.
        </div>
        <div>
          <strong>Private repos</strong>
          A personal access token lets the scan read private repositories. It stays in this tab's session storage.
        </div>
        <div>
          <strong>LinkedIn</strong>
          LinkedIn blocks most automated reads. Use More, then Save to PDF, and upload that file as the resume PDF.
        </div>
        <div>
          <strong>Review</strong>
          The AI tailor proposes changes. You stage or discard each one before it touches the resume.
        </div>
      </div>
    </div>
  );
}

export function Portal(props: PortalProps) {
  const githubData = props.github.data;
  const pdfText = props.pdf.text;
  const hasSource = Boolean(githubData || pdfText);

  return (
    <main id="main" className="page page-wide">
      <div className="portal">
        <div className="portal-header">
          <div>
            <h1 className="portal-title">@{props.username}</h1>
            <p className="muted">Load a saved version, or build a new resume from the sources below.</p>
          </div>
          <button className="btn btn-secondary" onClick={props.onDisconnect}>
            Change profile
          </button>
        </div>

        {props.errorMsg && <Alert tone="error">{props.errorMsg}</Alert>}
        {(props.github.data?.warnings || []).map((w) => <Alert key={w} tone="warning">{w}</Alert>)}

        <SavedVersions versions={props.savedVersions} onLoad={props.onLoadVersion} onDelete={props.onDeleteVersion} />

        <section className="portal-section">
          <div className="section-head">
            <h3 className="section-title">Sources</h3>
            <span className="muted">Add one or both. More sources give a fuller draft.</span>
          </div>

          <div className="source-stack">
            <GitHubSourceCard source={props.github} username={props.username} hasToken={props.token.trim() !== ''} />
            <PdfSourceCard source={props.pdf} />
          </div>

          <div className="synthesize">
            <h3 className="section-title">Build</h3>
            <p className="synthesize-copy">
              Combines the sources above into one draft. Every change stays reviewable in the editor.
            </p>
            <div className="source-checks">
              <span className={githubData ? 'is-ok' : ''}>{githubData ? '✓' : '○'} GitHub</span>
              <span className={pdfText ? 'is-ok' : ''}>{pdfText ? '✓' : '○'} Resume PDF</span>
            </div>
            <button
              className="btn btn-primary btn-cta"
              onClick={props.onSynthesize}
              disabled={!hasSource || props.isSynthesizing}
            >
              {props.isSynthesizing ? (
                <>
                  <Spinner size={16} /> Building resume…
                </>
              ) : (
                'Build resume'
              )}
            </button>
          </div>

          <HowItWorks />
        </section>
      </div>
    </main>
  );
}
