import { describe, expect, it } from 'vitest'
import { buildPromptContext } from './context'
import {
  buildAnalyzeSystemInstruction,
  buildAnalyzeUserContent,
  buildChatSystemInstruction,
} from './prompts'

const now = new Date('2026-06-13T09:00:00')
const ctx = buildPromptContext(
  {
    exam: 'NEET',
    examDateISO: '2026-06-20',
    recentMoodSummary: 'recent mood averaging 2.4/5 over 5 check-ins',
  },
  now,
)

describe('buildPromptContext', () => {
  it('derives exam label, phase, and countdown from context', () => {
    expect(ctx.examLabel).toContain('NEET')
    expect(ctx.phaseLabel).toBe('Final sprint')
    expect(ctx.countdown).toBe('7 days to go')
  })
})

describe('analysis prompts', () => {
  it('system instruction encodes safety + context + JSON-only output', () => {
    const sys = buildAnalyzeSystemInstruction(ctx)
    expect(sys).toContain('NEET')
    expect(sys.toLowerCase()).toContain('self-harm')
    expect(sys).toContain('JSON')
    expect(sys).toContain('reasoning')
  })

  it('user content includes mood, tags, and the entry', () => {
    const content = buildAnalyzeUserContent(2, 'I feel overwhelmed', [
      'mock test',
    ])
    expect(content).toContain('2/5')
    expect(content).toContain('mock test')
    expect(content).toContain('I feel overwhelmed')
  })
})

describe('chat prompt', () => {
  it('keeps the persona, safety, and brevity guidance', () => {
    const sys = buildChatSystemInstruction(ctx)
    expect(sys.toLowerCase()).toContain('companion')
    expect(sys.toLowerCase()).toContain('self-harm')
  })
})
