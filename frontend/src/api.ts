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
