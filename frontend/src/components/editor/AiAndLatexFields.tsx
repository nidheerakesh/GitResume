import { CheckCircle, Copy, RefreshCw, Sparkles } from 'lucide-react';
import { Spinner, TextArea } from '../ui';

interface TailorFieldsProps {
  jobDescription: string;
  setJobDescription: (value: string) => void;
  isTailoring: boolean;
  tailorSuccess: boolean;
  onTailor: () => void;
}

export function TailorFields({ jobDescription, setJobDescription, isTailoring, tailorSuccess, onTailor }: TailorFieldsProps) {
  return (
    <div className="stack">
      <div className="note note-accent">
        <span className="note-title"><Sparkles size={16} /> Tailor to a job</span>
        <p>
          Paste a job description. The model proposes changes to the summary and bullets. You stage or discard each one before it applies.
        </p>
      </div>

      <TextArea
        label="Job description"
        rows={8}
        placeholder="Paste the full job description…"
        value={jobDescription}
        onChange={setJobDescription}
      />

      <button className="btn btn-primary btn-block" onClick={onTailor} disabled={isTailoring || !jobDescription.trim()}>
        {isTailoring ? (
          <>
            <Spinner size={16} /> Reading the job…
          </>
        ) : (
          <>
            <Sparkles size={16} /> Get suggestions
          </>
        )}
      </button>
      {tailorSuccess && (
        <div className="status-line status-line-success status-line-center">
          <CheckCircle size={16} /> Suggestions ready for review.
        </div>
      )}
    </div>
  );
}

interface LatexFieldsProps {
  latexCode: string;
  setLatexCode: (value: string) => void;
  isCompiling: boolean;
  onRecompile: () => void;
  onCopy: () => void;
}

export function LatexFields({ latexCode, setLatexCode, isCompiling, onRecompile, onCopy }: LatexFieldsProps) {
  return (
    <div className="stack">
      <div className="toolbar">
        <span className="toolbar-title">LaTeX source</span>
        <div className="row row-tight">
          <button className="btn btn-primary btn-sm" onClick={onRecompile} disabled={isCompiling}>
            <RefreshCw size={14} className={isCompiling ? 'spin' : ''} />
            Rebuild from fields
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onCopy}>
            <Copy size={14} /> Copy source
          </button>
        </div>
      </div>

      {isCompiling ? (
        <div className="empty-state">
          <Spinner size={20} /> Compiling…
        </div>
      ) : (
        <textarea
          className="latex-editor"
          aria-label="LaTeX source"
          value={latexCode}
          onChange={(e) => setLatexCode(e.target.value)}
        />
      )}

      <div className="note note-info">
        Edits here stay in this source. The preview follows the fields, not this box. <strong>Rebuild from fields</strong> replaces this source with a fresh one from the fields.
      </div>
      <p className="muted small">
        Compiles as a standard article class. Paste it into <a href="https://www.overleaf.com" target="_blank" rel="noopener noreferrer">Overleaf</a> to get a PDF.
      </p>
    </div>
  );
}
