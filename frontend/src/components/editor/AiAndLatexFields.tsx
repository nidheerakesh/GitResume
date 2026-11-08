import { CheckCircle, Copy, Play, RefreshCw, Sparkles } from 'lucide-react';
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
          Paste a job description to get a tailored copy: reworded bullets you approve one by one, the projects that fit the job, skills ordered for it, and a keyword check. Your current resume is kept as a saved version.
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
            <Sparkles size={16} /> Create tailored resume
          </>
        )}
      </button>
      {tailorSuccess && (
        <div className="status-line status-line-success status-line-center">
          <CheckCircle size={16} /> Tailored copy ready for review.
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
  onCompileEdits: () => void;
  canCompileEdits: boolean;
}

export function LatexFields({ latexCode, setLatexCode, isCompiling, onRecompile, onCopy, onCompileEdits, canCompileEdits }: LatexFieldsProps) {
  return (
    <div className="stack">
      <div className="toolbar">
        <span className="toolbar-title">LaTeX source</span>
        <div className="row row-tight">
          <button className="btn btn-primary btn-sm" onClick={onCompileEdits} disabled={!canCompileEdits || isCompiling || !latexCode.trim()}>
            <Play size={14} /> Compile my edits
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onRecompile} disabled={isCompiling}>
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
        Edit the source and press <strong>Compile my edits</strong> to see it in the PDF preview. Editing any field rebuilds this source from the fields and replaces hand edits, so download the .tex first if you want to keep them.
      </div>
      <p className="muted small">
        Download .tex to open it in <a href="https://www.overleaf.com" target="_blank" rel="noopener noreferrer">Overleaf</a> or any LaTeX editor.
      </p>
    </div>
  );
}
