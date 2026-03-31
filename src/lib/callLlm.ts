/** Calls the Netlify serverless proxy — API key never touches the browser. */
export async function callLlm(system: string, prompt: string): Promise<string> {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system, prompt }),
  });
  const data = (await res.json()) as { error?: string; text?: string };
  if (data.error) {
    throw new Error(data.error);
  }
  if (typeof data.text !== 'string') {
    throw new Error('Invalid response from AI proxy');
  }
  return data.text;
}
