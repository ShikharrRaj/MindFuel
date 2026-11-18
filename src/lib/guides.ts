/**
 * Static guides: the panic explainer, the exam-hall pocket card, and the guide
 * for parents. Plain content kept out of components so it can be reviewed by
 * a clinician and translated without touching UI code.
 */

export interface GuideSection {
  heading: string
  points: string[]
}

/** "What's happening in my body?" A 30-second panic explainer. */
export const PANIC_EXPLAINER: GuideSection[] = [
  {
    heading: 'What is happening',
    points: [
      'Racing heart: adrenaline is pumping blood to your muscles, getting you ready to act. Uncomfortable, and in a healthy person usually not dangerous.',
      'Breathless or dizzy: fast breathing shifts the balance of gases in your blood, which can cause tingling or light-headedness.',
      'Tight chest: the muscles around your chest tense up under stress.',
      'Feeling unreal or far away: your brain is narrowing its attention onto the “threat”.',
    ],
  },
  {
    heading: 'What helps',
    points: [
      'Make your out-breath longer than your in-breath. This is the brake pedal for your nervous system.',
      'Do not fight the feeling. Let the wave rise and fall; it usually peaks within minutes.',
      'Remind yourself: “This is panic. It is horrible, but it will pass.”',
    ],
  },
]

export const PANIC_MEDICAL_NOTE =
  'Call 112 or get medical help straight away if chest pain is new, severe or spreads to your arm or jaw, if you faint, if breathlessness does not ease, or if you have a heart condition or asthma and this feels different.'

/** The exam-hall pocket card: a discreet 3-step routine. Works offline, prints. */
export const EXAM_HALL_STEPS: { title: string; detail: string }[] = [
  {
    title: 'Pause',
    detail: 'Pen down. Feet flat on the floor. Feel the chair under you.',
  },
  {
    title: 'Two sighs',
    detail:
      'Two sips of air in through your nose, then one long breath out. Twice.',
  },
  {
    title: 'Skip and return',
    detail: 'Mark the question. Do one you know. Come back to it later.',
  },
]

export const EXAM_HALL_REMINDER =
  'Blanking is temporary. You know more than this moment lets you feel.'

/** A guide for parents and guardians, shareable as its own page. */
export const PARENT_GUIDE: GuideSection[] = [
  {
    heading: 'What helps',
    points: [
      'Ask how their day went, not only how the mock went.',
      'Praise effort and consistency, not just ranks and scores.',
      'Protect the basics: sleep, regular meals and a little time outside.',
      'Treat breaks and rest days as part of preparation, not laziness.',
      'Listen first. Often they need to be heard more than they need advice.',
    ],
  },
  {
    heading: 'What adds pressure, even when it is meant kindly',
    points: [
      'Comparing them with siblings, cousins or neighbours’ children.',
      'Asking about rank or marks every day.',
      'Reminding them how much has been spent on coaching.',
      'Talking about the exam as the one thing that decides their future.',
    ],
  },
  {
    heading: 'Warning signs to take seriously',
    points: [
      'Withdrawing from family and friends, or staying in their room much more than usual.',
      'Big changes in sleep or eating.',
      'Saying things like “I am a burden”, “there is no point”, or talking about not wanting to live.',
      'Giving away belongings or saying goodbye in unusual ways.',
      'Marks or injuries they cannot explain, or hide.',
      'A sudden calm after a long low period, which can sometimes mean a decision has been made.',
    ],
  },
  {
    heading: 'If you are worried about their safety',
    points: [
      'Ask them directly and calmly whether they are thinking about suicide. Asking does not put the idea in their head.',
      'Do not leave them alone if you think they are at risk right now.',
      'Keep medicines, pesticides, sharp objects and other dangerous items locked away or out of the house.',
      'Get professional help: call Tele-MANAS on 14416 (free, 24/7), and 112 in an emergency.',
    ],
  },
  {
    heading: 'How to start a conversation',
    points: [
      '“You have been working so hard. How are you really doing?”',
      '“Whatever happens in the exam, we are proud of you and we love you.”',
      '“Is there anything we do that makes the pressure worse? We would like to know.”',
    ],
  },
]

export const PARENT_GUIDE_HELP =
  'In immediate danger, call 112. For guidance any time, call Tele-MANAS on 14416 (free, 24/7, many languages).'
