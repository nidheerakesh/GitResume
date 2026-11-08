import { useState, type MouseEvent } from 'react';
import { Trash2 } from 'lucide-react';
import type { ProjectItem, SavedVersion, TailorChoices, TailorDiffItem, TailorInsights } from '../types';
import { useDialog } from './useDialog';

interface VersionsModalProps {
  versions: SavedVersion[];
  onLoad: (version: SavedVersion) => void;
  onDelete: (id: string, e: MouseEvent) => void;
  onClose: () => void;
}

export function VersionsModal({ versions, onLoad, onDelete, onClose }: VersionsModalProps) {
  const dialogRef = useDialog<HTMLDivElement>(onClose);

  return (
    <div className="modal-backdrop">
      <div ref={dialogRef} className="modal modal-sm" role="dialog" aria-modal="true" aria-labelledby="versions-title">
        <div className="modal-header">
          <h4 id="versions-title">Saved versions</h4>
          <button className="btn-icon btn-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {versions.length === 0 ? (
          <p className="empty-state">No saved versions yet. Name a version in the editor and save it.</p>
        ) : (
          <div className="version-list">
            {versions.map((v) => (
              <div key={v.id} className="version-row">
                <button type="button" className="version-load" onClick={() => onLoad(v)}>
                  <span className="version-name">{v.name}</span>
                  <span className="muted tiny">Saved {v.timestamp}</span>
                </button>
                <button className="btn-icon btn-delete" onClick={(e) => onDelete(v.id, e)} aria-label={`Delete ${v.name}`}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        <button className="btn btn-secondary btn-block modal-footer-btn" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

interface TailorReviewModalProps {
  diffs: TailorDiffItem[];
  insights: TailorInsights | null;
  projects: ProjectItem[];
  onToggle: (id: string, status: 'accepted' | 'rejected') => void;
  onClose: () => void;
  onApply: (choices: TailorChoices, versionName: string) => void;
}

const STATUS_LABEL: Record<TailorDiffItem['status'], string> = {
  pending: 'Pending',
  accepted: 'Staged',
  rejected: 'Discarded',
};

export function TailorReviewModal({ diffs, insights, projects, onToggle, onClose, onApply }: TailorReviewModalProps) {
  const dialogRef = useDialog<HTMLDivElement>(onClose);
  const staged = diffs.filter(d => d.status === 'accepted').length;
  const discarded = diffs.filter(d => d.status === 'rejected').length;
  const pending = diffs.filter(d => d.status === 'pending').length;
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(insights ? insights.relevantProjects.slice(0, 3) : projects.filter(p => !p.hidden).map(p => p.name))
  );
  const [reorderSkills, setReorderSkills] = useState(true);
  const [versionName, setVersionName] = useState(`Tailored: ${insights?.targetRole ?? 'job'}`);
  const canSave = (selected.size > 0 || staged > 0) && versionName.trim() !== '';

  const toggleProject = (name: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <div className="modal-backdrop">
      <div ref={dialogRef} className="modal modal-lg" role="dialog" aria-modal="true" aria-labelledby="review-title">
        <div className="modal-header">
          <div>
            <h4 id="review-title">Create tailored resume</h4>
            <p className="muted tiny">Pick what goes into the tailored copy. Nothing changes until you save it.</p>
          </div>
          <button className="btn-icon btn-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {insights && (
          <>
            <section className="tailor-block">
              <h5>Job keywords</h5>
              {insights.keywords.matched.length + insights.keywords.missing.length === 0 ? (
                <p className="muted tiny">No keywords detected.</p>
              ) : (
                <>
                  <div className="chip-row">
                    {insights.keywords.matched.map(k => <span key={`hit-${k}`} className="kw kw-hit">{k}</span>)}
                    {insights.keywords.missing.map(k => <span key={`miss-${k}`} className="kw kw-miss">{k}</span>)}
                  </div>
                  <p className="muted tiny">Missing keywords are never added for you. Add one only if you really have that skill.</p>
                </>
              )}
            </section>

            <section className="tailor-block">
              <h5>Projects to include</h5>
              {insights.relevantProjects.map((name, i) => (
                <label key={name} className="tailor-project">
                  <input type="checkbox" checked={selected.has(name)} onChange={() => toggleProject(name)} />
                  <span>{name}</span>
                  {i < 3 && <span className="kw kw-hit">Top match</span>}
                </label>
              ))}
              <p className="muted tiny">Unchecked projects stay in the resume but are hidden.</p>
            </section>

            <section className="tailor-block">
              <h5>Skills</h5>
              <label className="tailor-project">
                <input type="checkbox" checked={reorderSkills} onChange={() => setReorderSkills(v => !v)} />
                <span>Put job-matching skills first</span>
              </label>
            </section>
          </>
        )}

        {diffs.length === 0 && (
          <p className="muted small">No bullet rewrites suggested. You can still save a copy with the projects and skills above.</p>
        )}
        <div className="diff-list">
          {diffs.map(diff => (
            <article key={diff.id} className={`diff-card is-${diff.status}`}>
              <div className="diff-card-header">
                <span className="diff-target">
                  {diff.type === 'summary' ? 'Summary' : diff.parentName}
                </span>
                <span className={`status-pill status-${diff.status}`}>{STATUS_LABEL[diff.status]}</span>
              </div>

              <div className="diff-compare">
                <div className="diff-pane is-original">
                  <span>{diff.original}</span>
                </div>
                <div className="diff-pane is-tailored">
                  <span>{diff.tailored}</span>
                </div>
              </div>

              {diff.reason && (
                <div className="diff-reason">
                  <strong>Why:</strong>
                  {diff.reason}
                </div>
              )}

              <div className="diff-actions">
                <button
                  type="button"
                  className={`btn btn-secondary btn-sm diff-reject ${diff.status === 'rejected' ? 'is-active' : ''}`}
                  onClick={() => onToggle(diff.id, 'rejected')}
                >
                  Discard
                </button>
                <button
                  type="button"
                  className={`btn btn-secondary btn-sm diff-accept ${diff.status === 'accepted' ? 'is-active' : ''}`}
                  onClick={() => onToggle(diff.id, 'accepted')}
                >
                  Stage
                </button>
              </div>
            </article>
          ))}
        </div>

        <div className="modal-footer">
          <span className="muted tiny">
            {staged} staged, {discarded} discarded, {pending} pending
          </span>
          <div className="row row-tight">
            <input
              className="form-control version-name-input"
              aria-label="Name for the tailored copy"
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
            />
            <button className="btn btn-secondary" onClick={onClose}>Close</button>
            <button
              className="btn btn-primary"
              onClick={() => onApply({ selectedProjects: [...selected], reorderSkills }, versionName)}
              disabled={!canSave}
            >
              Save tailored copy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
