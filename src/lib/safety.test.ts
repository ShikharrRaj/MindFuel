import { describe, expect, it } from 'vitest'
import { detectCrisis, HELPLINES } from './safety'
import safetySource from './safety.ts?raw'

describe('detectCrisis', () => {
  it('flags explicit self-harm language', () => {
    expect(detectCrisis('I want to kill myself').isCrisis).toBe(true)
    expect(detectCrisis("I can't go on like this").isCrisis).toBe(true)
    expect(detectCrisis('thinking about suicide').isCrisis).toBe(true)
    expect(detectCrisis('I feel like ending it all').isCrisis).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(detectCrisis('I WANT TO DIE').isCrisis).toBe(true)
  })

  it('does not false-positive on ordinary exam-stress text', () => {
    expect(detectCrisis('I studied all day and feel exhausted').isCrisis).toBe(
      false,
    )
    expect(detectCrisis('My diet has been terrible this week').isCrisis).toBe(
      false,
    )
    expect(
      detectCrisis('This physics chapter is killing my motivation').isCrisis,
    ).toBe(false)
  })

  it('returns the matched fragment for explainability', () => {
    const result = detectCrisis('honestly I want to die')
    expect(result.matches.length).toBeGreaterThan(0)
  })
})

describe('HELPLINES', () => {
  it('provides actionable tel links for each helpline', () => {
    expect(HELPLINES.length).toBeGreaterThan(0)
    for (const line of HELPLINES) {
      expect(line.href.startsWith('tel:')).toBe(true)
      expect(line.contact).toBeTruthy()
    }
  })

  it('always includes the national mental-health line and 112', () => {
    const contacts = HELPLINES.map((h) => h.contact)
    expect(contacts).toContain('14416')
    expect(contacts).toContain('112')
    expect(HELPLINES.filter((h) => h.alwaysOpen).length).toBeGreaterThanOrEqual(
      2,
    )
  })
})

describe('detectCrisis — Hinglish (romanised Hindi)', () => {
  it.each([
    'main mar jana chahta hoon',
    'mai marna chahti hu',
    'marna chahata hun',
    'jeena nahi chahta',
    'jeena nahin chahti ab',
    'jeena nai chahta',
    'jeene ka mann nahi karta',
    'khudkushi kar lunga',
    'aatmahatya ke baare me soch rahi hu',
    'atmhatya kar lungi',
    'suicide kar lunga',
    'suicide kar lungi',
    'khud ko khatam kar dunga',
    'zindagi khatam kar dungi',
    'sab khatam kar dunga',
    'mujhe mar jana hai',
    'jaan de dunga',
  ])('flags "%s"', (text) => {
    expect(detectCrisis(text).isCrisis).toBe(true)
  })

  it('tolerates spelling, spacing, punctuation and case variance', () => {
    for (const text of [
      'MAR JAANA CHAHTA HUN',
      'mar-jaana...   chahta hu!!!',
      'maaaarna chahta huuu',
      'jeenaaa nahiii chahtaaa',
      'mjhe mrna h',
      'jeena nhi chahta',
      'mainbasmarnachahtahu',
    ]) {
      expect(detectCrisis(text).isCrisis, text).toBe(true)
    }
  })
})

describe('detectCrisis — Devanagari', () => {
  it.each([
    'मैं मरना चाहता हूँ',
    'मरना चाहती हूं',
    'आत्महत्या कर लूंगा',
    'खुदकुशी के बारे में सोचता हूँ',
    'अब जीना नहीं चाहता',
    'जीना नहीं चाहती',
    'ज़िंदगी खत्म कर दूंगा',
    'खुद को खत्म कर दूँगी',
    'जान दे दूँगा',
    'मुझे मर जाना है',
  ])('flags "%s"', (text) => {
    expect(detectCrisis(text).isCrisis).toBe(true)
  })

  it('normalises nukta, chandrabindu, zero-width characters and vowel length', () => {
    for (const text of [
      'ख़ुदकुशी', // ख़ुदकुशी, decomposed nukta
      'ख़ुदकुशी', // ख़ुदकुशी, precomposed nukta
      'आत्म‍हत्या', // ZWJ inside a conjunct
      'मरना‌ चाहता', // ZWNJ
      'जिंदगी ख़त्म कर दूँगा', // no nukta / nukta mixed
      'ज़िन्दगी खत्म कर दूंगा', // half-न instead of anusvara
      'जिना नहि चाहता', // short-vowel typos
      'मुझे suicide करना है', // mixed script
    ]) {
      expect(detectCrisis(text).isCrisis, text).toBe(true)
    }
  })
})

describe('detectCrisis — normalisation of English text', () => {
  it('handles curly apostrophes, invisible characters and styled letters', () => {
    expect(detectCrisis('I can’t go on').isCrisis).toBe(true)
    expect(detectCrisis('su​icide').isCrisis).toBe(true)
    expect(detectCrisis('ｋｉｌｌ ｍｙｓｅｌｆ').isCrisis).toBe(true)
    expect(detectCrisis('i want to dieeee').isCrisis).toBe(true)
  })

  it('covers forms the original English list missed', () => {
    expect(detectCrisis('I thought about taking my own life').isCrisis).toBe(
      true,
    )
    expect(detectCrisis('been self-harming again').isCrisis).toBe(true)
    expect(detectCrisis('i dont wanna be alive').isCrisis).toBe(true)
  })
})

describe('detectCrisis — deliberately excluded idioms and study talk', () => {
  it.each([
    // Hyperbole: dead tired / died laughing / bored to death / dying of heat.
    'thak ke mar gaya aaj',
    'hans hans ke mar gaya',
    'bore hoke mar raha hu',
    'garmi se mar jaunga',
    'aaj to mar hi jaunga thak ke',
    'mar gaya yaar, kal maths ka paper hai',
    'थक के मर गया आज',
    'हंस हंस के मर गया',
    // Harm from others, anger at others.
    'mummy result dekh ke maar dalegi',
    'ye exam meri jaan le lega',
    'physics ne jaan nikal di',
    'usko maarne ka mann karta hai',
    // Loyalty idiom.
    'dosti ke liye jaan de dunga',
    'jaan de dunga desh ke liye',
    'दोस्ती के लिए जान दे दूंगा',
    // Negated general statements.
    'zindagi khatam nahi hoti ek exam se',
    'ज़िंदगी खत्म नहीं होती एक परीक्षा से',
    // Study plans.
    'syllabus sab khatam kar dunga',
    'aaj raat tak sab chapters khatam kar dunga',
    'कल तक सिलेबस खत्म कर दूंगा',
    // "JEE" skeletonises to "je" (= jee, to live): must not collide.
    'JEE nahi pass kar paya',
    'जी नहीं, पापा',
  ])('does not flag "%s"', (text) => {
    expect(detectCrisis(text).isCrisis).toBe(false)
  })

  it('never matches bare single words', () => {
    for (const word of [
      'mar',
      'khatam',
      'maut',
      'jaan',
      'मर',
      'ख़त्म',
      'मौत',
    ]) {
      expect(detectCrisis(word).isCrisis, word).toBe(false)
    }
  })

  it('keeps the exclusions narrow: the self-directed form still matches', () => {
    expect(detectCrisis('khud ko maar dunga').isCrisis).toBe(true)
    expect(detectCrisis('fail hua to main mar jaunga').isCrisis).toBe(true)
    expect(detectCrisis('bas ab sab khatam kar dunga').isCrisis).toBe(true)
    expect(
      detectCrisis('dosti ke liye jaan de dunga. par sach me ab jaan de dunga')
        .isCrisis,
    ).toBe(true)
  })
})

describe('detectCrisis — contract and robustness', () => {
  it('keeps the { isCrisis, matches } shape with string fragments', () => {
    const none = detectCrisis('')
    expect(none).toEqual({ isCrisis: false, matches: [] })
    const hit = detectCrisis('मुझे मर जाना है')
    expect(hit.isCrisis).toBe(true)
    expect(
      hit.matches.every((m) => typeof m === 'string' && m.length > 0),
    ).toBe(true)
  })

  it('stays fast on long input (no catastrophic backtracking)', () => {
    const long = 'mar khatam jaan liye sab tak '.repeat(2000)
    const start = performance.now()
    detectCrisis(long)
    expect(performance.now() - start).toBeLessThan(1000)
  })

  it('uses no regex lookbehind, which Safari < 16.4 cannot parse', () => {
    // A SyntaxError at import would take the helplines down with the app.
    expect(safetySource).not.toMatch(/\(\?<[=!]/)
  })
})

// Security review (2026-11-11): exclusions must never cancel help across a
// sentence end, and words for suicide always show help.
describe('detectCrisis — exclusions never hide a real crisis', () => {
  it.each([
    'I am suicidal. Helpline numbers never pick up.',
    'suicide helpline ka number do',
    'attended a suicide prevention seminar',
    'आत्महत्या रोकथाम पर सेमिनार हुआ',
    'Main bahut thak gaya hu. Bas mar jaun.',
    'Agar result kharab aaya to mar jaunga. Has anyone felt this?',
    'aaj raat tak sab khatam kar dunga',
    'kal tak sab khatam kar dunga',
    'आज रात तक सब ख़त्म कर दूँगा',
    'Main jaan de dunga, mere liye kuch nahi bacha',
    'mar jaungi to sab theek ho jayega',
    'mar jaungi to sab thik ho jayega',
    'bas... mar jaun',
    'थक गया हूं। तो मैं मर जाऊंगा',
    'थक गई हूं। मर जाऊं तो',
    'दोस्त के लिए। जान दे दूँगा',
  ])('flags "%s"', (text) => {
    expect(detectCrisis(text).isCrisis).toBe(true)
  })

  it('still honours an idiom inside the same sentence', () => {
    expect(detectCrisis('thak ke mar gaya aaj').isCrisis).toBe(false)
    expect(detectCrisis('hans hans ke mar gaya').isCrisis).toBe(false)
  })

  it('stays fast on long, repetitive input', () => {
    const text = 'थक मर जाऊं तो '.repeat(1200) // ~16k characters
    const start = performance.now()
    detectCrisis(text)
    expect(performance.now() - start).toBeLessThan(250)
  })
})
