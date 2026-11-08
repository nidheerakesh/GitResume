import type { ResumeData, TemplateInfo } from './types';
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ||
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : '/api');

export async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    if (body.detail) return body.detail;
  } catch {
    // Body was not JSON; use the fallback message.
  }
  return fallback;
}

export interface TemplateList { templates: TemplateInfo[]; default: string; pdf_available: boolean; }

export async function fetchTemplates(): Promise<TemplateList> {
  const res = await fetch(`${API_BASE_URL}/templates`);
  if (!res.ok) throw new Error('Could not load templates.');
  return res.json();
}

export type PdfRequest = { resume_data: ResumeData; template: string } | { latex: string };

export async function fetchPdf(body: PdfRequest): Promise<Blob> {
  const res = await fetch(`${API_BASE_URL}/resume/pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let message = 'PDF compile failed.';
    try {
      const payload = await res.json();
      if (typeof payload.detail === 'string') message = payload.detail;
      else if (payload.detail?.message) message = `LaTeX error: ${payload.detail.message}`;
    } catch {
      // Body was not JSON; keep the generic message.
    }
    throw new Error(message);
  }
  return res.blob();
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
