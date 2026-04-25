function safeParseJsonChunk(text: string) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch (_) {
    return null;
  }
}

async function callOpenAI(messages: any[], model = process.env.LLM_MODEL ?? 'gpt-3.5-turbo') {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model, messages, temperature: 0.0, max_tokens: 1500 }),
  });
  if (!res.ok) throw new Error(`OpenAI error ${res.status}`);
  const j = await res.json();
  const content = j?.choices?.[0]?.message?.content ?? '';
  return String(content);
}

export async function classifyDocument(text: string) {
  if (!text || text.trim().length === 0) return { document_type: 'unknown', confidence: 0 };
  if (!process.env.OPENAI_API_KEY) {
    // simple heuristic fallback
    const lowered = text.toLowerCase();
    if (lowered.includes('acord')) return { document_type: 'ACORD', confidence: 0.8 };
    if (lowered.includes('loss run')) return { document_type: 'LOSS_RUN', confidence: 0.75 };
    if (lowered.includes('statement of values') || lowered.includes('sov')) return { document_type: 'SOV', confidence: 0.75 };
    return { document_type: 'OTHER', confidence: 0.5 };
  }

  const prompt = `Classify the following document text into one of these types: ACORD, LOSS_RUN, SOV, FINANCIALS, ENGINEERING_REPORT, OTHER. Return a JSON object with keys: document_type and confidence (0.0-1.0).\n\nText:\n${text.slice(0, 4000)}`;
  const reply = await callOpenAI([{ role: 'system', content: 'You are a concise document classifier.' }, { role: 'user', content: prompt }]);
  const parsed = safeParseJsonChunk(reply) ?? {};
  return { document_type: parsed.document_type ?? 'OTHER', confidence: parsed.confidence ?? 0.5 };
}

export async function extractStructured(text: string, instructions?: string) {
  if (!process.env.OPENAI_API_KEY) {
    // naive fallback: try to find key: value lines
    const out: Record<string, unknown> = {};
    text.split('\n').slice(0, 200).forEach((l) => {
      const m = l.match(/^(\w[\w ]+):\s*(.+)$/);
      if (m) out[m[1].trim()] = m[2].trim();
    });
    return out;
  }
  const prompt = `Extract structured JSON from the following document text. ${instructions ?? ''}\nReturn only a JSON object.\n\nText:\n${text.slice(0, 6000)}`;
  const reply = await callOpenAI([{ role: 'system', content: 'You are a JSON extractor.' }, { role: 'user', content: prompt }]);
  const parsed = safeParseJsonChunk(reply) ?? {};
  return parsed;
}
