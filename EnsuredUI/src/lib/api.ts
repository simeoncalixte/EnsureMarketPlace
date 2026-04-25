export function getApiBase(): string {
  // Priority: runtime window overrides -> Vite env -> empty (same origin)
  // Ensure no trailing slash
  const win = typeof window !== 'undefined' ? (window as any) : undefined;
  const runtime = win?.__API_BASE__ ?? win?.__VITE_API_BASE__ ?? win?.VITE_API_BASE;
  const env = typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE;
  const base = runtime ?? env ?? '';
  return String(base).replace(/\/$/, '');
}

export default getApiBase;
