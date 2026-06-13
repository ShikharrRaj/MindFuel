/**
 * POST /api/chat — server-side streaming companion chat.
 *
 * Streams Gemini's reply token-by-token so the UI feels instant (real
 * streaming, not an artificial delay). Like /api/analyze, the API key stays
 * server-side and input is validated and capped first.
 */

import { GoogleGenAI } from '@google/genai'
import { buildPromptContext } from '../src/lib/context'
import { buildChatSystemInstruction } from '../src/lib/prompts'
import { detectCrisis, HELPLINES, SUPPORT_DISCLAIMER } from '../src/lib/safety'
import type { ChatMessage, ExamType } from '../src/lib/types'

export const config = { runtime: 'edge' }

const MODEL = 'gemini-2.5-flash'
const MAX_MESSAGE_LENGTH = 4000
const MAX_HISTORY = 20

interface ChatBody {
  exam: ExamType
  examDateISO: string
  recentMoodSummary: string
  messages: ChatMessage[]
}

function textStream(text: string): Response {
  const encoder = new TextEncoder()
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(text))
        controller.close()
      },
    }),
    { headers: { 'content-type': 'text/plain; charset=utf-8' } },
  )
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return new Response('Server is not configured.', { status: 500 })

  let body: ChatBody
  try {
    body = (await req.json()) as ChatBody
  } catch {
    return new Response('Invalid JSON body.', { status: 400 })
  }

  const messages = (body.messages ?? []).slice(-MAX_HISTORY)
  const last = messages[messages.length - 1]
  if (!last || last.role !== 'user' || !last.content.trim()) {
    return new Response('A user message is required.', { status: 400 })
  }
  if (last.content.length > MAX_MESSAGE_LENGTH) {
    return new Response('Message is too long.', { status: 413 })
  }

  // Crisis fast-path: respond with care + helplines directly, without coaching.
  if (detectCrisis(last.content).isCrisis) {
    const lines = HELPLINES.map((h) => `• ${h.name}: ${h.contact} — ${h.detail}`)
    return textStream(
      `I'm really glad you told me, and I'm concerned about how much pain you're in right now. You deserve support from someone who can be fully present with you. Please consider reaching out right now:\n\n${lines.join(
        '\n',
      )}\n\nIf you might act on these feelings, please contact emergency services or go to the nearest hospital. ${SUPPORT_DISCLAIMER}`,
    )
  }

  const ctx = buildPromptContext(
    {
      exam: body.exam,
      examDateISO: body.examDateISO,
      recentMoodSummary: body.recentMoodSummary || 'no prior check-ins yet',
    },
    new Date(),
  )

  try {
    const ai = new GoogleGenAI({ apiKey })
    const stream = await ai.models.generateContentStream({
      model: MODEL,
      contents: messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      config: {
        systemInstruction: buildChatSystemInstruction(ctx),
        temperature: 0.8,
        // Disable extended thinking for snappier, lower-latency streaming.
        thinkingConfig: { thinkingBudget: 0 },
        maxOutputTokens: 600,
      },
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const piece = chunk.text
            if (piece) controller.enqueue(encoder.encode(piece))
          }
        } catch (err) {
          console.error('chat stream error:', err)
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  } catch (err) {
    console.error('chat error:', err)
    return new Response('Could not reach the companion right now.', {
      status: 502,
    })
  }
}
