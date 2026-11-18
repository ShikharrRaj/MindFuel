/**
 * Calm Toolkit — the activity library.
 *
 * Every activity is plain typed data: what it is, who it is for, how long it
 * takes, where it can be done, and how to run it (a breathing pacer, a guided
 * checklist, a timer, a short reflection worksheet, a menu, or a copyable
 * script). The selection engine in `calm.ts` reads these fields; the UI renders
 * the `format`. Adding an activity means adding data here — no code changes.
 *
 * Content is written to be safe, small and doable in minutes. It still needs a
 * licensed clinical psychologist's review before a public launch.
 */

import type { PrepPhase } from './exams'

/** What the student says it feels like right now (step 1 of the calm flow). */
export type CalmState =
  | 'racing-thoughts'
  | 'panic'
  | 'overwhelmed'
  | 'cant-sleep'
  | 'bad-mock'
  | 'future-fear'
  | 'comparison'
  | 'family-pressure'
  | 'cant-focus'
  | 'low-energy'
  | 'irritable'
  | 'lonely'

export const CALM_STATES: { id: CalmState; label: string }[] = [
  { id: 'racing-thoughts', label: 'Racing thoughts' },
  { id: 'panic', label: 'Panic / tight chest' },
  { id: 'overwhelmed', label: 'Overwhelmed by syllabus' },
  { id: 'cant-sleep', label: "Can't sleep" },
  { id: 'bad-mock', label: 'After a bad mock' },
  { id: 'future-fear', label: 'Fear about results' },
  { id: 'comparison', label: 'Comparing with others' },
  { id: 'family-pressure', label: 'Family pressure' },
  { id: 'cant-focus', label: "Can't focus" },
  { id: 'low-energy', label: 'Low, no energy' },
  { id: 'irritable', label: 'Irritable / angry' },
  { id: 'lonely', label: 'Lonely' },
]

export function stateLabel(id: CalmState): string {
  return CALM_STATES.find((s) => s.id === id)?.label ?? id
}

/** Where the student is — constrains what is practical (and discreet). */
export type Setting = 'desk' | 'bed' | 'silent' | 'can-move'

export const SETTINGS: { id: Setting; label: string }[] = [
  { id: 'desk', label: 'At my desk' },
  { id: 'bed', label: 'In bed' },
  { id: 'silent', label: 'Exam hall / library' },
  { id: 'can-move', label: 'I can move around' },
]

/** Distress band derived from the 0–10 rating. */
export type IntensityBand = 'high' | 'mid' | 'low'

/**
 * Bottom-up ("body") activities calm the nervous system directly; top-down
 * ("mind") activities work with thoughts. High distress → body first.
 */
export type ActivityMode = 'body' | 'mind'

export type ActivityGroup =
  | 'breathing'
  | 'body'
  | 'grounding'
  | 'thinking'
  | 'exam'
  | 'sleep'
  | 'connection'
  | 'anger'

export const GROUP_LABELS: Record<ActivityGroup, string> = {
  breathing: 'Breathing',
  body: 'Body',
  grounding: 'Grounding',
  thinking: 'Thinking tools',
  exam: 'For exam days',
  sleep: 'Sleep',
  connection: 'Low mood & connection',
  anger: 'Anger & frustration',
}

/** One breathing phase. `motion` drives the pacer's grow / shrink visual. */
export interface BreathPhase {
  label: string
  seconds: number
  motion: 'in' | 'out' | 'hold'
}

export interface ReflectField {
  id: string
  label: string
  placeholder?: string
}

export interface ScriptChoice {
  id: string
  label: string
  text: string
}

/** How an activity is run — each kind has its own player in the UI. */
export type ActivityFormat =
  | { kind: 'breathing'; phases: BreathPhase[]; rounds: number }
  | { kind: 'steps'; steps: string[] }
  | { kind: 'timer'; seconds: number; steps: string[] }
  | { kind: 'reflect'; fields: ReflectField[]; closing: string }
  | { kind: 'menu'; options: string[]; closing: string }
  | { kind: 'script'; intro: string; choices: ScriptChoice[] }

export interface Activity {
  id: string
  name: string
  group: ActivityGroup
  mode: ActivityMode
  /** One line on what it helps with. */
  purpose: string
  /** Typical duration in minutes. */
  minutes: number
  states: CalmState[]
  intensity: IntensityBand[]
  /** Settings where this activity is practical. */
  settings: Setting[]
  /** Can be done silently without anyone noticing (exam hall / library). */
  discreet: boolean
  /** Uses breath holds — skipped when someone reports panic. */
  avoidInPanic?: boolean
  /** Shown before starting, e.g. a medical caution. */
  caution?: string
  /** Prep phases where this activity is especially fitting. */
  phases?: PrepPhase[]
  format: ActivityFormat
}

const ALL_SETTINGS: Setting[] = ['desk', 'bed', 'silent', 'can-move']
const SEATED: Setting[] = ['desk', 'bed', 'silent']

const breath = (
  label: string,
  seconds: number,
  motion: BreathPhase['motion'],
): BreathPhase => ({ label, seconds, motion })

export const ACTIVITIES: Activity[] = [
  // ---------------------------------------------------------------- breathing
  {
    id: 'physiological-sigh',
    name: 'Cyclic sighing',
    group: 'breathing',
    mode: 'body',
    purpose:
      'The fastest way to calm a racing body: a double breath in, then a long breath out.',
    minutes: 1,
    states: [
      'panic',
      'racing-thoughts',
      'overwhelmed',
      'future-fear',
      'irritable',
      'bad-mock',
    ],
    intensity: ['high', 'mid'],
    settings: ALL_SETTINGS,
    discreet: true,
    phases: ['final-sprint', 'exam-day'],
    format: {
      kind: 'breathing',
      phases: [
        breath('Breathe in through your nose', 2, 'in'),
        breath('Sip in a little more', 1, 'in'),
        breath('Long, slow breath out', 6, 'out'),
      ],
      rounds: 6,
    },
  },
  {
    id: 'extended-exhale',
    name: 'Longer breath out',
    group: 'breathing',
    mode: 'body',
    purpose:
      'Breathing out longer than you breathe in tells your body it is safe. No holding.',
    minutes: 2,
    states: ['panic', 'racing-thoughts', 'future-fear', 'cant-sleep'],
    intensity: ['high', 'mid'],
    settings: ALL_SETTINGS,
    discreet: true,
    format: {
      kind: 'breathing',
      phases: [breath('Breathe in', 4, 'in'), breath('Breathe out', 6, 'out')],
      rounds: 10,
    },
  },
  {
    id: 'box-breathing',
    name: 'Box breathing',
    group: 'breathing',
    mode: 'body',
    purpose: 'Steadies a busy mind and settles exam-day nerves.',
    minutes: 2,
    states: ['racing-thoughts', 'future-fear', 'cant-focus'],
    intensity: ['mid', 'low'],
    settings: ALL_SETTINGS,
    discreet: true,
    avoidInPanic: true,
    caution: 'If holding your breath feels uncomfortable, shorten the holds.',
    phases: ['final-sprint', 'exam-day'],
    format: {
      kind: 'breathing',
      phases: [
        breath('Breathe in', 4, 'in'),
        breath('Hold', 4, 'hold'),
        breath('Breathe out', 4, 'out'),
        breath('Hold', 4, 'hold'),
      ],
      rounds: 6,
    },
  },
  {
    id: 'four-seven-eight',
    name: '4-7-8 breathing',
    group: 'breathing',
    mode: 'body',
    purpose: 'Winds the body down. Good when rest or sleep is hard.',
    minutes: 2,
    states: ['cant-sleep', 'racing-thoughts'],
    intensity: ['mid', 'low'],
    settings: SEATED,
    discreet: true,
    avoidInPanic: true,
    caution: 'If holding your breath feels uncomfortable, shorten the hold.',
    phases: ['final-sprint', 'exam-day'],
    format: {
      kind: 'breathing',
      phases: [
        breath('Breathe in', 4, 'in'),
        breath('Hold', 7, 'hold'),
        breath('Breathe out slowly', 8, 'out'),
      ],
      rounds: 4,
    },
  },
  {
    id: 'resonance-breathing',
    name: 'Slow, even breathing',
    group: 'breathing',
    mode: 'body',
    purpose:
      'About six breaths a minute. A daily practice that lowers your baseline stress.',
    minutes: 5,
    states: ['racing-thoughts', 'future-fear', 'cant-focus', 'cant-sleep'],
    intensity: ['mid', 'low'],
    settings: SEATED,
    discreet: true,
    phases: ['foundation', 'momentum', 'consolidation'],
    format: {
      kind: 'breathing',
      phases: [breath('Breathe in', 5, 'in'), breath('Breathe out', 5, 'out')],
      rounds: 30,
    },
  },

  // --------------------------------------------------------------------- body
  {
    id: 'cold-water-reset',
    name: 'Cold-water reset',
    group: 'body',
    mode: 'body',
    purpose:
      'Cool water on your face can quickly slow your heart rate. For very strong waves.',
    minutes: 1,
    states: ['panic', 'overwhelmed', 'irritable'],
    intensity: ['high'],
    settings: ['can-move'],
    discreet: false,
    caution:
      'Skip this if you have a heart condition, low blood pressure, a history of fainting or an eating disorder, or check with a doctor first.',
    format: {
      kind: 'timer',
      seconds: 60,
      steps: [
        'Go to a tap, or grab a cold bottle or a cold pack.',
        'Splash cool (not icy) water on your face, or hold the cold thing against your cheeks and the back of your neck.',
        'Keep breathing slowly while you do it, for about 30 seconds.',
        'Dry off and notice your heartbeat settling.',
      ],
    },
  },
  {
    id: 'pmr-short',
    name: 'Squeeze and release',
    group: 'body',
    mode: 'body',
    purpose:
      'Tense each muscle group, then let it go. Releases tension you did not know you were holding.',
    minutes: 5,
    states: ['overwhelmed', 'cant-sleep', 'irritable', 'future-fear'],
    intensity: ['mid', 'low'],
    settings: ['desk', 'bed'],
    discreet: false,
    format: {
      kind: 'steps',
      steps: [
        'Make tight fists for 5 seconds. Release and feel the difference for 10 seconds.',
        'Lift your shoulders up to your ears for 5 seconds. Drop them.',
        'Scrunch your whole face for 5 seconds. Let it go soft.',
        'Tighten your stomach for 5 seconds. Release.',
        'Press your feet into the floor and tense your legs for 5 seconds. Release.',
        'Take one long breath out and let your whole body feel heavy.',
      ],
    },
  },
  {
    id: 'shake-out',
    name: '60-second shake-out',
    group: 'body',
    mode: 'body',
    purpose: 'Burns off restless energy and resets a stuck mind.',
    minutes: 1,
    states: ['irritable', 'cant-focus', 'low-energy', 'overwhelmed'],
    intensity: ['high', 'mid'],
    settings: ['can-move'],
    discreet: false,
    format: {
      kind: 'timer',
      seconds: 60,
      steps: [
        'Stand up and shake out your hands for 10 seconds.',
        'Add your arms and shoulders.',
        'Shake out each leg, then bounce gently on your heels.',
        'Finish with one long breath out.',
      ],
    },
  },
  {
    id: 'palm-press',
    name: 'Palm press',
    group: 'body',
    mode: 'body',
    purpose:
      'A silent way to release tension. Nobody in an exam hall will notice.',
    minutes: 1,
    states: ['panic', 'future-fear', 'overwhelmed', 'racing-thoughts'],
    intensity: ['high', 'mid'],
    settings: SEATED,
    discreet: true,
    phases: ['final-sprint', 'exam-day'],
    format: {
      kind: 'steps',
      steps: [
        'Press your palms together firmly in front of your chest (or under the desk) for 5 seconds.',
        'Release and notice the warmth in your hands for 10 seconds.',
        'Repeat 5 times, breathing out slowly each time you release.',
      ],
    },
  },
  {
    id: 'butterfly-hug',
    name: 'Butterfly hug',
    group: 'body',
    mode: 'body',
    purpose:
      'Slow, alternating taps that soothe when everything feels like too much.',
    minutes: 2,
    states: ['overwhelmed', 'lonely', 'panic', 'bad-mock'],
    intensity: ['high', 'mid'],
    settings: ['desk', 'bed', 'can-move'],
    discreet: false,
    format: {
      kind: 'steps',
      steps: [
        'Cross your arms over your chest so your hands rest near your collarbones.',
        'Tap slowly with one hand, then the other, like a butterfly’s wings.',
        'Keep breathing slowly. Let your thoughts pass like clouds.',
        'Continue for a minute or two, then stop and notice how you feel.',
      ],
    },
  },
  {
    id: 'desk-stretch',
    name: 'Desk stretch',
    group: 'body',
    mode: 'body',
    purpose: 'Undoes hours of sitting and brings your focus back.',
    minutes: 3,
    states: ['cant-focus', 'low-energy', 'irritable'],
    intensity: ['mid', 'low'],
    settings: ['desk', 'can-move'],
    discreet: false,
    format: {
      kind: 'steps',
      steps: [
        'Slowly roll your neck: ear to shoulder, chin to chest, other ear.',
        'Roll your shoulders back five times.',
        'Circle your wrists and stretch your fingers wide.',
        'Sit tall and twist gently to each side.',
        'Stand up, reach for the ceiling, then let your arms drop.',
      ],
    },
  },
  {
    id: 'daylight-walk',
    name: '10-minute walk',
    group: 'body',
    mode: 'body',
    purpose:
      'Movement and daylight are among the most reliable mood lifters there are.',
    minutes: 10,
    states: [
      'low-energy',
      'cant-focus',
      'irritable',
      'overwhelmed',
      'comparison',
    ],
    intensity: ['mid', 'low'],
    settings: ['can-move'],
    discreet: false,
    format: {
      kind: 'timer',
      seconds: 600,
      steps: [
        'Leave your books behind. Phone in your pocket.',
        'Walk at an easy pace, outside if you can.',
        'Notice five things you would normally walk past.',
        'Let your arms swing and your breathing slow down.',
      ],
    },
  },

  // ---------------------------------------------------------------- grounding
  {
    id: 'grounding-54321',
    name: '5-4-3-2-1 grounding',
    group: 'grounding',
    mode: 'body',
    purpose: 'Pulls you out of spiralling thoughts and back into the present.',
    minutes: 3,
    states: ['racing-thoughts', 'panic', 'overwhelmed', 'future-fear'],
    intensity: ['high', 'mid'],
    settings: ALL_SETTINGS,
    discreet: true,
    format: {
      kind: 'steps',
      steps: [
        'Name 5 things you can see around you.',
        'Notice 4 things you can physically feel.',
        'Listen for 3 things you can hear.',
        'Find 2 things you can smell.',
        'Notice 1 thing you can taste.',
      ],
    },
  },
  {
    id: 'grounding-333',
    name: '3-3-3 reset',
    group: 'grounding',
    mode: 'body',
    purpose: 'A 1-minute version of grounding for when you are short on time.',
    minutes: 1,
    states: ['panic', 'racing-thoughts', 'overwhelmed'],
    intensity: ['high', 'mid'],
    settings: ALL_SETTINGS,
    discreet: true,
    format: {
      kind: 'steps',
      steps: [
        'Name 3 things you can see.',
        'Name 3 sounds you can hear.',
        'Move 3 parts of your body: fingers, toes, shoulders.',
      ],
    },
  },
  {
    id: 'orient-room',
    name: 'Look around the room',
    group: 'grounding',
    mode: 'body',
    purpose:
      'Slowly taking in your surroundings tells your brain there is no danger here.',
    minutes: 1,
    states: ['panic', 'overwhelmed'],
    intensity: ['high'],
    settings: ALL_SETTINGS,
    discreet: true,
    format: {
      kind: 'steps',
      steps: [
        'Slowly turn your head and look around you.',
        'Let your eyes land on five things of one colour.',
        'Notice the light, the floor under you, the space around you.',
        'Say to yourself: “I am here, in this room, right now. This will pass.”',
      ],
    },
  },
  {
    id: 'feet-anchor',
    name: 'Feet on the floor',
    group: 'grounding',
    mode: 'body',
    purpose: 'Anchors you through your body. Works silently in the exam hall.',
    minutes: 1,
    states: ['panic', 'future-fear', 'overwhelmed', 'racing-thoughts'],
    intensity: ['high', 'mid'],
    settings: ['desk', 'silent'],
    discreet: true,
    phases: ['exam-day'],
    format: {
      kind: 'steps',
      steps: [
        'Plant both feet flat on the floor.',
        'Press down gently and feel the ground push back.',
        'Hold your pen: notice its weight, texture and temperature.',
        'Tell yourself: “This feeling is temporary. It will pass.”',
      ],
    },
  },

  // ----------------------------------------------------------------- thinking
  {
    id: 'thought-reframe',
    name: 'Catch, check, change',
    group: 'thinking',
    mode: 'mind',
    purpose: 'Turns a harsh thought into a fairer one, in three questions.',
    minutes: 5,
    states: [
      'racing-thoughts',
      'bad-mock',
      'comparison',
      'future-fear',
      'family-pressure',
    ],
    intensity: ['mid', 'low'],
    settings: SEATED,
    discreet: true,
    format: {
      kind: 'reflect',
      fields: [
        {
          id: 'catch',
          label: 'Catch it: what is the thought?',
          placeholder: 'e.g. “I’m never going to clear this exam.”',
        },
        {
          id: 'check',
          label: 'Check it: what is the evidence for and against it?',
        },
        {
          id: 'change',
          label: 'Change it: what is a fairer way to see it?',
          placeholder: 'e.g. “My scores are uneven, but they are improving.”',
        },
      ],
      closing:
        'Thoughts are not facts. You just practised seeing one more clearly.',
    },
  },
  {
    id: 'worry-time',
    name: 'Park the worry',
    group: 'thinking',
    mode: 'mind',
    purpose:
      'Gives a worry its own slot later today, so it stops interrupting your study now.',
    minutes: 3,
    states: ['racing-thoughts', 'future-fear', 'cant-focus', 'cant-sleep'],
    intensity: ['mid', 'low'],
    settings: SEATED,
    discreet: true,
    format: {
      kind: 'reflect',
      fields: [
        { id: 'worry', label: 'Write the worry in one line' },
        {
          id: 'action',
          label: 'Is there one small thing you can do about it today?',
          placeholder: 'It is fine to write “nothing right now”.',
        },
        {
          id: 'when',
          label: 'Pick a 15-minute worry time later today',
          placeholder: 'e.g. 6:30 pm, after tea',
        },
      ],
      closing:
        'When the worry comes back before then, tell it: “Not now. I’ll think about you at worry time.”',
    },
  },
  {
    id: 'decatastrophise',
    name: 'Worst, best, most likely',
    group: 'thinking',
    mode: 'mind',
    purpose: 'Shrinks a fear about results back to its real size.',
    minutes: 5,
    states: ['future-fear', 'bad-mock', 'family-pressure'],
    intensity: ['mid', 'low'],
    settings: SEATED,
    discreet: true,
    format: {
      kind: 'reflect',
      fields: [
        { id: 'worst', label: 'What is the worst that could happen?' },
        { id: 'best', label: 'What is the best that could happen?' },
        { id: 'likely', label: 'What is most likely to happen?' },
        {
          id: 'cope',
          label:
            'If the worst did happen, what would you do, and who would help?',
        },
      ],
      closing:
        'Even the worst case has a next step. You have more options than fear tells you.',
    },
  },
  {
    id: 'control-circle',
    name: 'What I can control',
    group: 'thinking',
    mode: 'mind',
    purpose: 'Separates what is yours to act on from what you can let go of.',
    minutes: 4,
    states: ['overwhelmed', 'family-pressure', 'future-fear', 'comparison'],
    intensity: ['mid', 'low'],
    settings: SEATED,
    discreet: true,
    format: {
      kind: 'reflect',
      fields: [
        {
          id: 'can',
          label: 'In my control right now',
          placeholder: 'e.g. revising one chapter, sleeping by 11',
        },
        {
          id: 'cannot',
          label: 'Not in my control',
          placeholder: 'e.g. the paper’s difficulty, other people’s scores',
        },
        { id: 'next', label: 'One thing from the first list I will do next' },
      ],
      closing:
        'Put your energy where it can actually move something. The rest can wait outside the circle.',
    },
  },
  {
    id: 'fact-vs-feeling',
    name: 'Fact or feeling?',
    group: 'thinking',
    mode: 'mind',
    purpose: 'Untangles “I feel like I will fail” from what is actually true.',
    minutes: 3,
    states: ['bad-mock', 'future-fear', 'comparison'],
    intensity: ['mid', 'low'],
    settings: SEATED,
    discreet: true,
    format: {
      kind: 'reflect',
      fields: [
        { id: 'feeling', label: 'The feeling says…' },
        { id: 'facts', label: 'The facts are…' },
        { id: 'conclusion', label: 'Looking only at the facts, I can say…' },
      ],
      closing: 'Feelings are real, but they are not always accurate forecasts.',
    },
  },
  {
    id: 'self-compassion-break',
    name: 'Self-compassion break',
    group: 'thinking',
    mode: 'mind',
    purpose:
      'Being kind to yourself after a setback helps you bounce back more than self-criticism does.',
    minutes: 3,
    states: ['bad-mock', 'comparison', 'low-energy', 'lonely'],
    intensity: ['mid', 'low'],
    settings: ALL_SETTINGS,
    discreet: true,
    format: {
      kind: 'steps',
      steps: [
        'Name it: “This is a hard moment. I am stressed.”',
        'Remember: “Struggling is part of preparing for something hard. Every serious aspirant feels this.”',
        'Put a hand on your chest and say: “May I be kind to myself right now.”',
      ],
    },
  },
  {
    id: 'friend-test',
    name: 'Would I say this to a friend?',
    group: 'thinking',
    mode: 'mind',
    purpose:
      'Swaps your inner critic for the voice you would use with a friend.',
    minutes: 2,
    states: ['comparison', 'bad-mock', 'low-energy'],
    intensity: ['mid', 'low'],
    settings: SEATED,
    discreet: true,
    format: {
      kind: 'reflect',
      fields: [
        { id: 'self', label: 'What are you saying to yourself?' },
        {
          id: 'friend',
          label: 'What would you say to a friend who told you that?',
        },
      ],
      closing:
        'Now read the second answer again, slowly. It applies to you too.',
    },
  },

  // --------------------------------------------------------------------- exam
  {
    id: 'mock-debrief',
    name: 'Mock-test debrief',
    group: 'exam',
    mode: 'mind',
    purpose:
      'Turns a bad score into one clear lesson, without beating yourself up.',
    minutes: 5,
    states: ['bad-mock', 'comparison', 'future-fear'],
    intensity: ['mid', 'low'],
    settings: SEATED,
    discreet: true,
    format: {
      kind: 'reflect',
      fields: [
        { id: 'well', label: 'One thing that went well' },
        {
          id: 'fix',
          label: 'One thing to fix',
          placeholder: 'A topic or a habit, not “everything”.',
        },
        { id: 'letgo', label: 'One thing to let go of' },
      ],
      closing: 'A mock is practice data, not a verdict on you.',
    },
  },
  {
    id: 'next-tiny-step',
    name: 'Next tiny step',
    group: 'exam',
    mode: 'mind',
    purpose: 'When the syllabus feels too big, find a 5-minute way in.',
    minutes: 3,
    states: ['overwhelmed', 'cant-focus', 'low-energy'],
    intensity: ['mid', 'low'],
    settings: SEATED,
    discreet: true,
    format: {
      kind: 'reflect',
      fields: [
        { id: 'big', label: 'What feels too big right now?' },
        {
          id: 'tiny',
          label: 'What is the smallest piece you could start in 5 minutes?',
          placeholder: 'e.g. “Open chapter 4 and read the first page.”',
        },
      ],
      closing:
        'Start just that, for 5 minutes. Starting is the hardest part; momentum does the rest.',
    },
  },
  {
    id: 'blank-mind',
    name: 'If your mind goes blank',
    group: 'exam',
    mode: 'body',
    purpose: 'A silent routine for when an answer you know will not come.',
    minutes: 1,
    states: ['panic', 'future-fear'],
    intensity: ['high', 'mid'],
    settings: ['desk', 'silent'],
    discreet: true,
    phases: ['consolidation', 'final-sprint', 'exam-day'],
    format: {
      kind: 'steps',
      steps: [
        'Put your pen down. Blanking is normal: stress briefly blocks recall, and it comes back.',
        'Two sighs: two sips of air in through your nose, one long breath out.',
        'Mark the question and move on to one you know.',
        'Come back to it later. Recall often returns once you are calmer.',
      ],
    },
  },
  {
    id: 'pre-exam-ritual',
    name: 'Pre-exam ritual',
    group: 'exam',
    mode: 'mind',
    purpose:
      'A calm, predictable routine for the night before and the morning of.',
    minutes: 10,
    states: ['future-fear', 'cant-sleep'],
    intensity: ['mid', 'low'],
    settings: ['desk', 'bed'],
    discreet: false,
    phases: ['final-sprint', 'exam-day'],
    format: {
      kind: 'steps',
      steps: [
        'Night before: pack your admit card, ID, pens and water bottle.',
        'Stop new topics. Light revision of what you already know only.',
        'Write down any worries on paper, then close the notebook.',
        'In bed: four rounds of 4-7-8 breathing.',
        'Morning: a light breakfast and water. Leave early.',
        'Before you walk in: three slow sighs. Tell yourself: “I have prepared. I will do my best with what I know.”',
      ],
    },
  },
  {
    id: 'comparison-detox',
    name: 'Comparison detox',
    group: 'exam',
    mode: 'mind',
    purpose: 'Steps back from rank talk and other people’s scores.',
    minutes: 3,
    states: ['comparison'],
    intensity: ['mid', 'low'],
    settings: ALL_SETTINGS,
    discreet: true,
    format: {
      kind: 'steps',
      steps: [
        'Mute study-group and social-app notifications for the next 2 hours.',
        'Write down one thing you have improved at this month.',
        'Remember: you see their highlights, not their struggles.',
        'Your only fair comparison is you, last month.',
      ],
    },
  },
  {
    id: 'parent-script',
    name: 'Talking to parents',
    group: 'exam',
    mode: 'mind',
    purpose: 'Words for telling your family what you need, without a fight.',
    minutes: 5,
    states: ['family-pressure'],
    intensity: ['mid', 'low'],
    settings: ALL_SETTINGS,
    discreet: true,
    format: {
      kind: 'script',
      intro:
        'Pick what you need most. Edit the words so they sound like you, then say them or send them.',
      choices: [
        {
          id: 'space',
          label: 'I need some space',
          text: 'I know you care about my exam, and I am working hard. When we talk about ranks every day, it makes me more anxious, not less. Could we talk about my preparation once a week instead? It would really help me focus.',
        },
        {
          id: 'reassurance',
          label: 'I need reassurance',
          text: 'I have been feeling a lot of pressure lately and I am scared of letting you down. It would mean a lot to hear that you are proud of my effort, whatever the result.',
        },
        {
          id: 'help',
          label: 'I need help with something',
          text: 'I am struggling with something and I would like your help. Can we find some time to talk today, just the two of us?',
        },
      ],
    },
  },

  // -------------------------------------------------------------------- sleep
  {
    id: 'brain-dump',
    name: 'Brain dump',
    group: 'sleep',
    mode: 'mind',
    purpose: 'Empties a busy head so it does not keep you awake.',
    minutes: 5,
    states: ['cant-sleep', 'racing-thoughts', 'overwhelmed'],
    intensity: ['mid', 'low'],
    settings: ['desk', 'bed'],
    discreet: true,
    format: {
      kind: 'reflect',
      fields: [
        {
          id: 'dump',
          label: 'Everything on your mind, as a list',
          placeholder: 'Tasks, worries, random thoughts. Anything goes.',
        },
      ],
      closing: 'It is written down now. You do not have to hold it tonight.',
    },
  },
  {
    id: 'cognitive-shuffle',
    name: 'Random-word drift',
    group: 'sleep',
    mode: 'mind',
    purpose:
      'Imagining random, unrelated things quietens a mind that will not switch off.',
    minutes: 10,
    states: ['cant-sleep', 'racing-thoughts'],
    intensity: ['mid', 'low'],
    settings: ['bed'],
    discreet: true,
    format: {
      kind: 'steps',
      steps: [
        'Pick a simple word, like “BED”.',
        'For the first letter, think of unrelated words: banana, bus, balloon, bell…',
        'Picture each one for a moment, then move on.',
        'When you run out, go to the next letter. It is fine to drift off part-way.',
      ],
    },
  },
  {
    id: 'body-scan-sleep',
    name: 'Body scan for sleep',
    group: 'sleep',
    mode: 'body',
    purpose:
      'Relaxes you from toes to head and slows your breathing for sleep.',
    minutes: 10,
    states: ['cant-sleep'],
    intensity: ['mid', 'low'],
    settings: ['bed'],
    discreet: true,
    format: {
      kind: 'steps',
      steps: [
        'Lie on your back and let your arms rest by your sides.',
        'Bring attention to your toes. Let them soften.',
        'Move slowly up: feet, calves, knees, thighs, hips. Soften each one.',
        'Stomach, chest, shoulders, arms, hands.',
        'Neck, jaw, eyes, forehead. Let your face go slack.',
        'Finish with four slow breaths, each out-breath longer than the in-breath.',
      ],
    },
  },

  // --------------------------------------------------------------- connection
  {
    id: 'tiny-pleasant',
    name: 'One small good thing',
    group: 'connection',
    mode: 'mind',
    purpose:
      'When energy is low, doing one small pleasant thing helps more than waiting to feel like it.',
    minutes: 5,
    states: ['low-energy', 'lonely'],
    intensity: ['mid', 'low'],
    settings: ['desk', 'can-move'],
    discreet: false,
    format: {
      kind: 'menu',
      options: [
        'Make a cup of chai or coffee and drink it slowly',
        'Step onto a balcony or by a window for some air',
        'Play one favourite song, start to finish',
        'Eat a piece of fruit, slowly',
        'Water a plant or tidy one small corner',
        'Send a funny meme to a friend',
      ],
      closing: 'Go and do it now. Come back whenever you are ready.',
    },
  },
  {
    id: 'three-good-things',
    name: 'Three good things',
    group: 'connection',
    mode: 'mind',
    purpose:
      'Trains your attention to notice what went right, not only what went wrong.',
    minutes: 3,
    states: ['low-energy', 'comparison', 'lonely', 'bad-mock'],
    intensity: ['low', 'mid'],
    settings: SEATED,
    discreet: true,
    format: {
      kind: 'reflect',
      fields: [
        { id: 'one', label: 'One good thing today' },
        { id: 'two', label: 'A second good thing' },
        { id: 'three', label: 'A third, however small' },
      ],
      closing: 'Small good things count. They add up over weeks.',
    },
  },
  {
    id: 'reach-out',
    name: 'Reach out to someone',
    group: 'connection',
    mode: 'mind',
    purpose:
      'Ready-made words, for when you want company but cannot find what to say.',
    minutes: 2,
    states: ['lonely', 'low-energy'],
    intensity: ['mid', 'low'],
    settings: ALL_SETTINGS,
    discreet: true,
    format: {
      kind: 'script',
      intro: 'Pick one, copy it, and send it to someone you trust.',
      choices: [
        {
          id: 'talk',
          label: 'Just to talk',
          text: 'Hey, are you free for a quick call later? Nothing serious, I would just like to talk to someone.',
        },
        {
          id: 'hard-day',
          label: 'Having a hard day',
          text: 'Today has been a tough day for me. Could we talk for a bit when you have time?',
        },
        {
          id: 'study',
          label: 'Study together',
          text: 'Want to study together for an hour this week? Even on a video call. It would help me stay on track.',
        },
      ],
    },
  },

  // -------------------------------------------------------------------- anger
  {
    id: 'name-it',
    name: 'Name it, then release it',
    group: 'anger',
    mode: 'body',
    purpose:
      'Putting a feeling into words and letting your body discharge it takes the edge off.',
    minutes: 3,
    states: ['irritable', 'family-pressure'],
    intensity: ['high', 'mid'],
    settings: ['desk', 'bed', 'can-move'],
    discreet: false,
    format: {
      kind: 'steps',
      steps: [
        'Say it, out loud or in your head: “I feel angry because…”',
        'Squeeze a cushion, or push against a wall, hard, for 10 seconds. Then let go.',
        'Three long breaths out.',
        'Ask yourself: what do I actually need right now?',
      ],
    },
  },
]

const BY_ID = new Map(ACTIVITIES.map((a) => [a.id, a]))

export function getActivity(id: string): Activity | undefined {
  return BY_ID.get(id)
}

/** Total seconds for one full round of a breathing pattern. */
export function roundSeconds(phases: BreathPhase[]): number {
  return phases.reduce((sum, p) => sum + p.seconds, 0)
}

export interface BreathPosition {
  phaseIndex: number
  /** Seconds already spent in the current phase (0 = it just started). */
  intoPhase: number
  secondsLeft: number
  /** 1-based round number. */
  round: number
}

/** Where a pacer is after `elapsed` whole seconds. */
export function breathPosition(
  phases: BreathPhase[],
  elapsed: number,
): BreathPosition {
  const cycle = roundSeconds(phases)
  let t = elapsed % cycle
  let phaseIndex = 0
  while (phaseIndex < phases.length - 1 && t >= phases[phaseIndex].seconds) {
    t -= phases[phaseIndex].seconds
    phaseIndex++
  }
  return {
    phaseIndex,
    intoPhase: t,
    secondsLeft: phases[phaseIndex].seconds - t,
    round: Math.floor(elapsed / cycle) + 1,
  }
}
