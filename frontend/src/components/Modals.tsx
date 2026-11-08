import type { MouseEvent } from 'react';
import { Trash2 } from 'lucide-react';
import type { SavedVersion, TailorDiffItem } from '../types';
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
  onToggle: (id: string, status: 'accepted' | 'rejected') => void;
  onClose: () => void;
  onApply: () => void;
}

const STATUS_LABEL: Record<TailorDiffItem['status'], string> = {
  pending: 'Pending',
  accepted: 'Staged',
  rejected: 'Discarded',
};

export function TailorReviewModal({ diffs, onToggle, onClose, onApply }: TailorReviewModalProps) {
  const dialogRef = useDialog<HTMLDivElement>(onClose);
  const staged = diffs.filter(d => d.status === 'accepted').length;
  const discarded = diffs.filter(d => d.status === 'rejected').length;
  const pending = diffs.filter(d => d.status === 'pending').length;

  return (
    <div className="modal-backdrop">
      <div ref={dialogRef} className="modal modal-lg" role="dialog" aria-modal="true" aria-labelledby="review-title">
        <div className="modal-header">
          <div>
            <h4 id="review-title">Review suggested changes</h4>
            <p className="muted tiny">Stage the changes you want. Discard the rest. Nothing changes until you apply.</p>
          </div>
          <button className="btn-icon btn-close" onClick={onClose} aria-label="Close">×</button>
        </div>

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
            <button className="btn btn-secondary" onClick={onClose}>Close</button>
            <button className="btn btn-primary" onClick={onApply} disabled={staged === 0}>
              Apply {staged} staged
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
