/**
 * Companion — the conversational, always-available support chat. Replies stream
 * in token-by-token (genuine streaming, no fake delay) and every message is
 * conditioned on the student's exam context and recent mood. A local crisis
 * check on the user's own message surfaces help immediately, before any network
 * round-trip.
 */

import { useEffect, useRef, useState } from 'react'
import { streamChat } from '../lib/api'
import { detectCrisis } from '../lib/safety'
import type { ChatMessage, UserProfile } from '../lib/types'
import SafetyCard from './SafetyCard'

interface Props {
  profile: UserProfile
  recentMoodSummary: string
}

const GREETING: ChatMessage = {
  role: 'assistant',
  content:
    "I'm here whenever you need to talk — about the exam, the pressure, or anything at all. What's on your mind right now?",
}

export default function Companion({ profile, recentMoodSummary }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING])
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const [showSafety, setShowSafety] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)

  // Keep the latest message in view as content streams in.
  useEffect(() => {
    logRef.current?.lastElementChild?.scrollIntoView({ block: 'end' })
  }, [messages])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const content = input.trim()
    if (!content || pending) return

    if (detectCrisis(content).isCrisis) setShowSafety(true)

    const userMsg: ChatMessage = { role: 'user', content }
    const history = [...messages, userMsg]
    setMessages([...history, { role: 'assistant', content: '' }])
    setInput('')
    setPending(true)

    try {
      await streamChat(
        {
          exam: profile.exam,
          examDateISO: profile.examDateISO,
          recentMoodSummary,
          messages: history,
        },
        (chunk) => {
          setMessages((prev) => {
            const next = [...prev]
            const lastIndex = next.length - 1
            next[lastIndex] = {
              role: 'assistant',
              content: next[lastIndex].content + chunk,
            }
            return next
          })
        },
      )
    } catch (err) {
      setMessages((prev) => {
        const next = [...prev]
        next[next.length - 1] = {
          role: 'assistant',
          content:
            err instanceof Error
              ? `Sorry — ${err.message}`
              : 'Sorry, I could not reply just now. Please try again.',
        }
        return next
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="card" aria-labelledby="companion-title">
      <p className="card__eyebrow">Companion</p>
      <h2 id="companion-title">Talk it through</h2>

      {showSafety && <SafetyCard />}

      <div className="chat">
        <div
          className="chat__log"
          ref={logRef}
          role="log"
          aria-live="polite"
          aria-label="Conversation with MindFuel"
        >
          {messages.map((m, i) => (
            <div key={i} className={`bubble bubble--${m.role}`}>
              <span className="sr-only">
                {m.role === 'user' ? 'You said: ' : 'MindFuel said: '}
              </span>
              {m.content || (pending && i === messages.length - 1 ? '…' : '')}
            </div>
          ))}
        </div>

        <form className="chat__form" onSubmit={send}>
          <label htmlFor="chat-input" className="sr-only">
            Type a message to MindFuel
          </label>
          <input
            id="chat-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message…"
            maxLength={4000}
            autoComplete="off"
          />
          <button type="submit" className="btn btn--primary" disabled={pending}>
            {pending ? <span className="spinner" aria-hidden="true" /> : 'Send'}
          </button>
        </form>
      </div>
    </section>
  )
}
