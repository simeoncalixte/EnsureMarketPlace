export async function runOcr(buffer: Buffer): Promise<{ text: string }> {
  // Prefer external OCR API when configured
  const apiUrl = process.env.OCR_API_URL;
  const apiKey = process.env.OCR_API_KEY;
  if (apiUrl) {
    const headers: Record<string, string> = { 'Content-Type': 'application/octet-stream' };
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
    const res = await fetch(apiUrl, { method: 'POST', body: buffer, headers });
    if (!res.ok) throw new Error(`OCR API error: ${res.status}`);
    const body = await res.json().catch(() => ({}));
    return { text: String(body.text ?? body.result ?? '') };
  }

  // Fallback: use tesseract.js if available
  try {
    const { createWorker } = await import('tesseract.js');
    const worker = createWorker();
    await worker.load();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    const { data } = await worker.recognize(buffer as any);
    await worker.terminate();
    return { text: data?.text ?? '' };
  } catch (err: any) {
    throw new Error(`No OCR available: ${err?.message ?? String(err)}`);
  }
}
