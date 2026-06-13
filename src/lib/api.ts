/**
 * Browser-side client for the server AI functions. The browser only ever talks
 * to our own /api routes — it never holds or sees the Gemini key.
 */

import type { Analysis, ChatMessage, ExamType } from './types'

export interface AnalyzeRequest {
  exam: ExamType
  examDateISO: string
  mood: number
  text: string
  tags: string[]
  recentMoodSummary: string
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const data = await res.json()
    if (data && typeof data.error === 'string') return data.error
  } catch {
    /* not JSON */
  }
  return 'Something went wrong. Please try again.'
}

/** Request a structured journal analysis. Throws with a friendly message on failure. */
export async function requestAnalysis(req: AnalyzeRequest): Promise<Analysis> {
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) throw new Error(await errorMessage(res))
  const data = (await res.json()) as { analysis: Analysis }
  return data.analysis
}

export interface ChatRequest {
  exam: ExamType
  examDateISO: string
  recentMoodSummary: string
  messages: ChatMessage[]
}

/**
 * Stream a companion reply. Calls `onToken` for each chunk as it arrives, so the
 * UI renders the response progressively. Resolves with the full text.
 */
export async function streamChat(
  req: ChatRequest,
  onToken: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(req),
    signal,
  })
  if (!res.ok || !res.body) throw new Error(await errorMessage(res))

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let full = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    full += chunk
    onToken(chunk)
  }
  return full
}
