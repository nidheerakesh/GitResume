import type { GitHubAnalysis } from '../../types';
import { RepoCuration, type RepoView } from './RepoCuration';
import { Spinner } from '../ui';

export interface GitHubSource {
  data: GitHubAnalysis | null;
  isLoading: boolean;
  repoView: RepoView;
  onScrape: () => void;
  onUseAlone: () => void;
}

export interface PdfSource {
  text: string;
  filename: string;
  isUploading: boolean;
  onUpload: (file: File) => void;
  onUseAlone: () => void;
}

interface GitHubSourceCardProps {
  source: GitHubSource;
  username: string;
  hasToken: boolean;
}

export function GitHubSourceCard({ source, username, hasToken }: GitHubSourceCardProps) {
  const loaded = source.data;
  const topProjects = loaded?.top_projects || [];

  return (
    <div className="source-card">
      <div className="source-card-main">
        <div className="source-card-body">
          <h4>GitHub repositories</h4>
          <p className="muted">
            Reads each repo's README, dependency files, and commit messages to find real technical depth.
          </p>
          {loaded ? (
            <div className="status-line status-line-success">
              Connected as @{loaded.username || username}. {topProjects.length} repos found.
            </div>
          ) : (
            <div className="muted tiny">
              {hasToken ? 'Token set. Scans public and private repos.' : 'Scans public repos. Add a token on the sign-in screen for private repos.'}
            </div>
          )}
        </div>
        <div className="source-card-actions">
          <button
            className={`btn btn-block ${loaded ? 'btn-secondary' : 'btn-primary'}`}
            onClick={source.onScrape}
            disabled={source.isLoading}
          >
            {source.isLoading ? (
              <>
                <Spinner /> Scanning…
              </>
            ) : loaded ? (
              'Rescan GitHub'
            ) : (
              'Scan GitHub'
            )}
          </button>
          {loaded && (
            <button className="btn btn-accent btn-xs btn-block" onClick={source.onUseAlone}>
              Use GitHub only
            </button>
          )}
        </div>
      </div>

      {loaded && topProjects.length > 0 && (
        <div className="source-card-curation">
          <RepoCuration projects={topProjects} view={source.repoView} />
        </div>
      )}
    </div>
  );
}

interface PdfSourceCardProps {
  source: PdfSource;
}

export function PdfSourceCard({ source }: PdfSourceCardProps) {
  const loaded = source.text !== '';

  return (
    <div className="source-card">
      <div className="source-card-main">
        <div className="source-card-body">
          <h4>Resume PDF</h4>
          <p className="muted">
            Extracts work history, education, titles, and dates from an existing resume.
          </p>
          {loaded && (
            <div className="status-line status-line-success">
              {source.filename} loaded. {source.text.length.toLocaleString()} characters.
            </div>
          )}
        </div>
        <div className="source-card-actions">
          <label className="file-picker">
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) source.onUpload(file);
                e.target.value = '';
              }}
            />
            <span className={`btn btn-secondary btn-block ${source.isUploading ? 'is-busy' : ''}`}>
              {source.isUploading ? (
                <>
                  <Spinner /> Parsing…
                </>
              ) : loaded ? (
                'Replace PDF'
              ) : (
                'Choose PDF'
              )}
            </span>
          </label>
          {loaded && (
            <button className="btn btn-accent btn-xs btn-block" onClick={source.onUseAlone} disabled={source.isUploading}>
              Use PDF only
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
