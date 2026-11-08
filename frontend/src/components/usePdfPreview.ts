import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchPdf, type PdfRequest } from '../api';
import type { ResumeData } from '../types';

export interface PdfPreviewState {
  url: string | null;
  isCompiling: boolean;
  error: string;
  isCustom: boolean;
  available: boolean;
}

// Compiles the resume to a PDF once edits settle. Only the newest request may write.
export function usePdfPreview(resume: ResumeData | null, templateId: string, available: boolean) {
  const [url, setUrl] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [error, setError] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const seq = useRef(0);

  const show = useCallback(async (body: PdfRequest) => {
    const n = ++seq.current;
    setIsCompiling(true);
    setError('');
    try {
      const blob = await fetchPdf(body);
      if (n !== seq.current) return;
      setUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
    } catch (err) {
      if (n === seq.current) setError(err instanceof Error ? err.message : 'PDF compile failed.');
    } finally {
      if (n === seq.current) setIsCompiling(false);
    }
  }, []);

  useEffect(() => {
    if (!available || !resume) return;
    const timer = setTimeout(() => {
      setIsCustom(false);
      show({ resume_data: resume, template: templateId });
    }, 900);
    return () => clearTimeout(timer);
  }, [resume, templateId, available, show]);

  const compileLatex = (latex: string) => {
    setIsCustom(true);
    return show({ latex });
  };

  const state: PdfPreviewState = { url, isCompiling, error, isCustom, available };
  return { state, compileLatex };
}
