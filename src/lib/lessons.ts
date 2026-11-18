/**
 * 60-second lessons — short, static psychoeducation cards. Understanding why
 * stress does what it does makes it less frightening, and needs no AI.
 * One lesson per day, chosen deterministically from the date.
 */

export interface Lesson {
  id: string
  title: string
  body: string
  takeaway: string
}

export const LESSONS: Lesson[] = [
  {
    id: 'stress-curve',
    title: 'Some stress actually helps',
    body: 'A moderate amount of stress sharpens focus and gets you studying. It is when stress climbs too high, for too long, that memory and concentration start to suffer. The goal is not zero stress; it is bringing it back into the useful range.',
    takeaway:
      'Feeling some pressure is not a problem to fix. It only needs managing when it tips over.',
  },
  {
    id: 'mind-blank',
    title: 'Why your mind goes blank',
    body: 'Under sudden stress, your brain prioritises survival over recall, so answers you know can briefly feel out of reach. It is temporary. Slowing your breathing and moving on to another question gives recall the chance to come back.',
    takeaway:
      'A blank is a stress response, not proof that you have forgotten.',
  },
  {
    id: 'sleep-memory',
    title: 'Sleep is part of studying',
    body: 'While you sleep, your brain sorts and strengthens what you learned during the day. Cutting sleep to study more often means remembering less of what you studied. In the final weeks, protecting sleep is one of the best revision strategies there is.',
    takeaway:
      'An hour of sleep can be worth more than an extra hour of revision.',
  },
  {
    id: 'comparison-trap',
    title: 'The comparison trap',
    body: 'You compare your behind-the-scenes struggles with everyone else’s highlight reel: their best mock score, not their bad days. That comparison is never fair, and it drains the energy you need for your own preparation.',
    takeaway: 'The only fair comparison is you, a month ago.',
  },
  {
    id: 'anxiety-not-prediction',
    title: 'Anxiety is not a prediction',
    body: 'Anxiety is very good at imagining the worst and very bad at forecasting what will actually happen. A strong feeling that you will fail tells you how stressed you are, not how the exam will go.',
    takeaway: 'Treat anxious thoughts as weather, not as a forecast.',
  },
  {
    id: 'breaks-focus',
    title: 'Breaks make focus last',
    body: 'Attention naturally fades after a stretch of hard concentration. Short, regular breaks (stretching, walking, looking out of a window) let it recover, so you get more done across the day than by pushing straight through.',
    takeaway: 'Resting is part of the work, not time taken away from it.',
  },
  {
    id: 'starting',
    title: 'Why starting is the hardest part',
    body: 'Procrastination is usually about avoiding an uncomfortable feeling, not laziness. Making the first step tiny (five minutes, one page) lowers that feeling enough to begin, and once you start, carrying on is much easier.',
    takeaway:
      'Do not wait to feel ready. Make the first step small enough to start anyway.',
  },
  {
    id: 'worry-vs-solve',
    title: 'Worrying is not problem-solving',
    body: 'Worrying feels productive, but it usually goes round in circles. Problem-solving ends in an action. If a worry has an action, do the action. If it does not, it can wait for your scheduled worry time.',
    takeaway: 'Ask: is there something I can do about this today?',
  },
  {
    id: 'panic-passes',
    title: 'Panic peaks and passes',
    body: 'A wave of panic usually peaks within about ten minutes and then eases, even if you do nothing. Fighting it tends to make it stronger. Slow breathing and riding the wave helps it pass sooner.',
    takeaway:
      'You have survived every panic wave so far. This one will pass too.',
  },
  {
    id: 'self-kindness',
    title: 'Kindness beats criticism',
    body: 'It is tempting to think being harsh with yourself keeps you motivated. Research suggests the opposite: people who respond to setbacks with self-compassion are more likely to try again and improve.',
    takeaway: 'Talk to yourself the way a good coach would.',
  },
  {
    id: 'caffeine',
    title: 'Caffeine and anxiety',
    body: 'Caffeine can cause a racing heart, jitteriness and restlessness, which feel a lot like anxiety. Late in the day it also disrupts sleep. If you are anxious or sleeping badly, try cutting caffeine after lunch.',
    takeaway: 'Sometimes “anxiety” is partly the third cup of tea.',
  },
  {
    id: 'movement',
    title: 'Movement calms the mind',
    body: 'Physical activity uses up the stress hormones your body has been building up, and it is one of the most reliable ways to lift mood and ease anxiety. It does not need a gym: a brisk ten-minute walk counts.',
    takeaway: 'When your head is busy, move your body.',
  },
  {
    id: 'naming',
    title: 'Name it to tame it',
    body: 'Simply putting a feeling into words (“I feel anxious”, “I feel let down”) can reduce its intensity. Naming a feeling gives you a little distance from it.',
    takeaway: 'Try finishing the sentence: right now I feel…',
  },
  {
    id: 'mocks-are-data',
    title: 'Mocks are practice data',
    body: 'Mock tests exist to show you where to improve before the real exam. A low score is information about what to revise, not a prediction of your final result or a measure of your worth.',
    takeaway: 'Ask a mock what it can teach you, not what it says about you.',
  },
]

function dayNumber(date: Date): number {
  return Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000,
  )
}

/** Today's lesson; `offset` lets the student flip to the next one. */
export function lessonForDate(date: Date, offset = 0): Lesson {
  const n = LESSONS.length
  return LESSONS[(((dayNumber(date) + offset) % n) + n) % n]
}
