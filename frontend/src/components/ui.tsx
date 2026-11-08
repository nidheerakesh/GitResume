import { useId, type ReactNode, type Ref } from 'react';
import { RefreshCw, Trash2 } from 'lucide-react';

type InputType = 'text' | 'email' | 'password' | 'url' | 'tel';

interface TextInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: InputType;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  spellCheck?: boolean;
  error?: string;
  inputRef?: Ref<HTMLInputElement>;
  children?: ReactNode;
}

// Typed fields never get spellcheck, and a field name comes from its label
const slug = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function TextInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required,
  autoComplete = 'off',
  spellCheck,
  error,
  inputRef,
  children,
}: TextInputProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const checkSpelling = spellCheck ?? (type === 'text' ? undefined : false);

  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>{label}</label>
      <input
        ref={inputRef}
        id={id}
        name={slug(label)}
        type={type}
        className="form-control"
        value={value}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        spellCheck={checkSpelling}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <span id={errorId} className="field-error">{error}</span>}
      {children}
    </div>
  );
}

interface TextAreaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}

export function TextArea({ label, value, onChange, rows = 3, placeholder }: TextAreaProps) {
  const id = useId();
  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>{label}</label>
      <textarea
        id={id}
        name={slug(label)}
        className="form-control"
        rows={rows}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

interface ItemCardProps {
  header: ReactNode;
  onDelete: () => void;
  hidden?: boolean;
  children: ReactNode;
}

export function ItemCard({ header, onDelete, hidden, children }: ItemCardProps) {
  // Deleting an entry drops everything typed into it, so ask first
  const confirmDelete = () => {
    if (window.confirm('Delete this entry? This cannot be undone.')) onDelete();
  };

  return (
    <section className={`item-card${hidden ? ' is-hidden' : ''}`}>
      <header className="item-card-header">
        {header}
        <button className="btn-icon btn-delete" onClick={confirmDelete} aria-label="Delete entry">
          <Trash2 size={16} />
        </button>
      </header>
      {children}
    </section>
  );
}

export function Alert({ tone, children }: { tone: 'error' | 'success' | 'warning' | 'info'; children: ReactNode }) {
  return <div className={`alert alert-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>{children}</div>;
}

export function Spinner({ size = 14 }: { size?: number }) {
  return <RefreshCw className="spin" size={size} aria-hidden="true" />;
}
