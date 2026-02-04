/**
 * Motivational quotes by category. Tone: tough love + self-deprecating humor.
 * getRandomQuote(category) returns a random quote for the given theme.
 */

export type QuoteCategory = 'general' | 'work' | 'fitness' | 'study' | 'personal' | 'finance' | 'goals'

const QUOTES: Record<QuoteCategory, string[]> = {
  general: [
    "Do it now, so you can go back to scrolling TikTok guilt-free.",
    "If you finish this, you're officially a productive human being for the next 5 minutes.",
    "Your future self will either thank you or judge you. Your call.",
    "The only bad time to start is never. The second-worst is after one more episode.",
    "Done is better than perfect. Your couch isn't judging.",
    "Small steps still move you. Unlike your phone, which moved you to the couch.",
    "You've already opened the app. Might as well type something.",
    "Procrastination is just optimism that tomorrow you'll feel like it.",
  ],
  work: [
    "Your boss isn't watching, but your bank account is. Get to work!",
    "Inbox zero is a myth. Task one is not. Start there.",
    "The meeting could've been an email. This task can't. Do it.",
    "Future you has a deadline. Present you has a 'later'. Fix that.",
    "Someone's getting promoted. It might as well be the person who did the thing.",
    "Your desk didn't ask for this mess. Your task list did. Clear it.",
    "Reply to that email. Yes, that one. You know the one.",
    "The only thing growing in your to-do list is the list. Change that.",
  ],
  fitness: [
    "Your muscles have memory. So does your couch. Choose wisely.",
    "The only bad workout is the one you didn't do. And the one you're still not doing.",
    "Your future abs are hiding behind 'I'll start Monday.' Today is Monday somewhere.",
    "The gym is judging no one. Your mirror might, though. Get moving.",
    "One more rep. Or one more scroll. Your body knows the difference.",
    "Rest days are valid. Today might not be one. Check the calendar.",
    "Your running shoes are not decorative. Prove it.",
    "The couch will still be there after. It's not going anywhere. You should.",
  ],
  study: [
    "Your diploma won't write itself. Neither will this. Start typing.",
    "Netflix has seasons. Your exam has a date. One is non-negotiable.",
    "The all-nighter is optional. Understanding the material is not. Plan accordingly.",
    "Highlighting is not studying. Neither is staring. Actually read it.",
    "Future you in the exam room will thank present you. Or not. Your call.",
    "The textbook is judging you. So is your grade. Open the book.",
    "One chapter now = one less panic later. You do the math.",
    "Your notes from last week exist. So does the test. Connect the dots.",
  ],
  personal: [
    "Your plants need water. Your tasks need you. Both are wilting.",
    "Adulting is just doing the thing before the thing becomes a crisis.",
    "The laundry basket is not a drawer. Your task list is not optional.",
    "You're one task away from feeling like you have it together. Maybe.",
    "The 'easy' thing stays easy only if you do it now.",
    "Your calendar doesn't lie. Your 'I'll do it later' does. Sync them.",
    "Small win today = less chaos tomorrow. You know the drill.",
    "Nobody's coming to do it for you. Sorry. Now go.",
  ],
  finance: [
    "Your bank account isn't judging. Yet. Track it before it does.",
    "Money doesn't grow on trees. It grows in spreadsheets. Open yours.",
    "Future you wants a vacation. Present you has receipts. Log them.",
    "The only budget that works is the one you actually look at.",
    "Your wallet has memory. So does your spending. Make it count.",
    "Income minus expenses isn't optional. Your peace of mind isn't either.",
    "One entry now = one less 'where did it go?' later.",
    "Your future self will thank you. Or send a strongly worded memo. Your call.",
  ],
  goals: [
    "Big goals are just small tasks that got done. Start one.",
    "Your future self has a resume. Make it impressive.",
    "The only bad goal is the one you never wrote down.",
    "Dreams need deadlines. Give yours one.",
    "You're one goal away from feeling like you have direction. Maybe.",
    "The finish line isn't moving. You are. Get closer.",
    "Ambition without a plan is just a mood. Turn it into a task.",
    "Nobody else is going to hit your targets. Sorry. Now go.",
  ],
}

/**
 * Maps raw category string (from input) to a quote theme.
 */
function normalizeCategory(raw: string): QuoteCategory {
  const lower = raw.trim().toLowerCase()
  if (!lower) return 'general'
  if (/\b(work|job|office|boss|career|meeting|email|project)\b/.test(lower)) return 'work'
  if (/\b(fitness|gym|workout|exercise|health|run|sport)\b/.test(lower)) return 'fitness'
  if (/\b(study|learn|exam|school|course|read|book)\b/.test(lower)) return 'study'
  if (/\b(personal|life|home|adult|chore)\b/.test(lower)) return 'personal'
  if (/\b(finance|budget|money|income|expense|saving)\b/.test(lower)) return 'finance'
  if (/\b(goal|target|ambition)\b/.test(lower)) return 'goals'
  return 'general'
}

/**
 * Returns a random motivational quote for the given category.
 * Pass the current category string from the form; it will be normalized internally.
 */
export function getRandomQuote(category: string): string {
  const theme = normalizeCategory(category)
  const list = QUOTES[theme]
  return list[Math.floor(Math.random() * list.length)]
}

/**
 * Returns a random quote for a fixed page/theme (e.g. Budget = finance, Goals = goals).
 * Use this when the "category" is the page itself, not user input.
 */
export function getRandomQuoteForPage(theme: QuoteCategory): string {
  const list = QUOTES[theme]
  return list[Math.floor(Math.random() * list.length)]
}
