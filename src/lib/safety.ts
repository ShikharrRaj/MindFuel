/**
 * Safety layer — the most important responsibility of a mental-wellness tool.
 *
 * This is a PURE, local, deterministic first line of defence. It runs in the
 * browser the instant a student submits text, BEFORE any network call, so that
 * if someone expresses crisis-level distress we can surface real help even if
 * the AI is slow, rate-limited, or offline. The server-side AI provides a
 * second, smarter judgement (see /api/analyze) — defence in depth, never one
 * single point of failure.
 *
 * Design choices:
 * - We bias toward FALSE POSITIVES. Showing helpline resources to a student who
 *   isn't in crisis is a minor annoyance; missing a real crisis is unacceptable.
 * - Matching is word-boundary aware to avoid absurd false hits (e.g. "die" in
 *   "diet" or "studied").
 * - Students write in English, romanised Hindi ("Hinglish") and Devanagari,
 *   often mixed in one sentence. Text is normalised first so spelling,
 *   keyboard and Unicode variance can't hide a crisis (`normalizeForMatching`).
 * - Phrases only. Bare words such as "mar" (die), "khatam" (over) or "maut"
 *   (death) are everyday exam slang and are never matched on their own.
 * - No regex lookbehind: Safari < 16.4 (inside Vite's default browser target)
 *   can't parse it, and a SyntaxError here would take the helplines down too.
 *   Idiom exclusions that look backwards use `unless()` guards instead.
 *
 * Deliberately NOT matched — hyperbole and idioms, each pinned by a test:
 * - "thak ke mar gaya", "hans hans ke mar gaya", "bore hoke mar raha" (dead
 *   tired / died laughing / bored to death) and their Devanagari forms;
 * - "mar gaya", "mar jaunga" on their own ("I'm dead", "I'll die of this heat").
 *   Only the conditional "…to mar jaunga" ("if X, then I'll die") is matched;
 * - harm FROM others: "mummy maar dalegi", "ye exam jaan le lega", "physics ne
 *   jaan nikal di", "usko maarna hai" (anger at a person, not self-harm);
 * - "… ke liye jaan de dunga" (I'd give my life FOR a friend / the country);
 * - negated general statements: "zindagi khatam nahi hoti ek exam se";
 * - study talk: "syllabus/chapters khatam kar dunga", "kal tak sab khatam kar
 *   dunga" (a study noun right before or after "sab"). "Bas ab sab khatam kar
 *   dunga" and "aaj raat tak sab khatam kar dunga" still match.
 *
 * Guards never look past the end of the sentence (see normalizeForMatching):
 * "Main bahut thak gaya hu. Bas mar jaun." is flagged. Words for suicide
 * itself are never excluded, not even "suicide prevention" or "helpline".
 */

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

/** Straight, curly and modifier apostrophes: deleted, so "can’t" = "cant". */
const APOSTROPHES = /['‘’ʼ`´]/g

/**
 * Stripped before matching: the Devanagari nukta (U+093C, so ज़/ख़/ड़ match
 * ज/ख/ड whether typed precomposed or decomposed), Latin combining accents,
 * variation selectors, and every format control (\p{Cf}: zero-width space,
 * ZWJ, ZWNJ, soft hyphen, BOM, bidi marks). Phone keyboards put ZWJ/ZWNJ inside
 * Devanagari conjuncts, and invisible characters are the cheapest filter dodge.
 */
const INVISIBLES = /[़̀-ͯ︀-️]|\p{Cf}/gu

/** Any run of characters that is not a letter, combining sign or digit. */
const SEPARATORS = /[^\p{L}\p{M}\p{N}]+/gu
/** Sentence ends: a separator run containing one becomes a boundary. */
const SENTENCE_END = /[.!?;।॥…\n\r]/

/**
 * Canonical text: apostrophes dropped, NFKD → lower-case → strip INVISIBLES →
 * NFKC (NFC that also folds full-width / styled letters), and every run of
 * punctuation or whitespace collapsed to ONE character: "\n" if it ends a
 * sentence, else a space. Patterns run on a copy with "\n" read as a space
 * (same length, so indices line up); idiom guards stop at the "\n", so an
 * exclusion in one sentence can never cancel a crisis phrase in the next.
 */
function normalizeForMatching(text: string): string {
  return text
    .replace(APOSTROPHES, '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(INVISIBLES, '')
    .normalize('NFKC')
    .replace(SEPARATORS, (run) => (SENTENCE_END.test(run) ? '\n' : ' '))
    .trim()
}

/**
 * Devanagari spelling folds, applied to the input AND to Devanagari pattern
 * sources (so patterns stay in natural spelling): nukta dropped, chandrabindu →
 * anusvara (दूँ = दूं), and long vowels → short (ी→ि, ू→ु, ई→इ, ऊ→उ), the
 * commonest typing slips.
 */
function foldDevanagari(s: string): string {
  return s
    .normalize('NFD')
    .replace(/़/g, '')
    .normalize('NFC')
    .replace(/ँ/g, 'ं')
    .replace(/ी/g, 'ि')
    .replace(/ू/g, 'ु')
    .replace(/ई/g, 'इ')
    .replace(/ऊ/g, 'उ')
}

/**
 * Spelling-tolerant "skeleton" that the Hinglish and Devanagari patterns run
 * on: Devanagari folded, then every run of one repeated letter or sign
 * collapsed ("jeena"→"jena", "nahiii"→"nahi", "maaarna"→"marna", "chhat"→"chat").
 */
function toSkeleton(normalized: string): string {
  return foldDevanagari(normalized).replace(/([\p{L}\p{M}])\1+/gu, '$1')
}

// ---------------------------------------------------------------------------
// Pattern plumbing
// ---------------------------------------------------------------------------

/**
 * A phrase with an idiom guard: a hit is ignored when the text just before it
 * matches `unlessAfter` (a `$`-anchored regex). This stands in for lookbehind
 * (see the header). Guards must stay narrow: they can only REMOVE matches.
 */
interface GuardedPattern {
  pattern: RegExp
  unlessAfter: RegExp
}
type CrisisRule = RegExp | GuardedPattern

/**
 * Compile a Hinglish / Devanagari pattern. `${…}` splices in shared fragments,
 * and Devanagari in the source is folded exactly like the input text.
 */
function rx(strings: TemplateStringsArray, ...fragments: string[]): RegExp {
  return new RegExp(foldDevanagari(String.raw(strings, ...fragments)), 'u')
}

/** Attach an idiom guard to a pattern (see GuardedPattern). */
function unless(pattern: RegExp, unlessAfter: RegExp): GuardedPattern {
  return {
    pattern: new RegExp(pattern.source, pattern.flags + 'g'),
    unlessAfter,
  }
}

/** Devanagari word start / end (`\b` only understands ASCII letters). */
const B = String.raw`(?:^| )`
const E = String.raw`(?![\p{L}\p{M}])`

// ---------------------------------------------------------------------------
// English
// ---------------------------------------------------------------------------

/**
 * English phrases that signal possible self-harm / crisis-level distress.
 * Kept as explicit multi-word phrases where possible to reduce noise. Matched
 * against the normalised text AND its skeleton ("i want to dieee").
 */
const CRISIS_PATTERNS: RegExp[] = [
  /\bkill myself\b/i,
  /\bkilling myself\b/i,
  /\bend(ing)? my life\b/i,
  /\bend(ing)? it all\b/i,
  /\b(take|taking|took|taken) my (own )?life\b/i,
  /\bwant to die\b/i,
  /\bwanna die\b/i,
  /\b(do not|don'?t) (want to|wanna) (be alive|live|exist|wake up)\b/i,
  /\bno reason to live\b/i,
  /\b(no|any) (reason|point) (in |to )?(keep )?(living|going on)\b/i,
  /\btired of living\b/i,
  /\bbetter off dead\b/i,
  /\bbetter off( \S+){0,2} (without me|if i (just )?(died|was dead|were dead|was gone|wasnt here))\b/i,
  /\bwant to be dead\b/i,
  /\brather (just )?(die|be dead)\b/i,
  /\bwish i (would|could)( just)? die\b/i,
  /\bstop existing\b/i,
  /\b(not|isnt|aint) worth living\b/i,
  /\b(dont|do not|cant|cannot) (see|find) (a|any) (reason|point) to (live|keep living|go on)\b/i,
  /\bwant (it|this|everything|my life) (all )?to (end|stop)\b/i,
  /\bgoodbye (note|notes|letter|letters)\b/i,
  /\bthis is my goodbye\b/i,
  /\b(saving|saved|collecting|collected|hoarding|stockpiling) (up )?(my |the )?(sleeping )?(pills|tablets)\b/i,
  /\bif i (was|were) gone\b/i,
  /\b(just )?(want|wanna) (to )?end it\b/i,
  /\bwish i (was|were) dead\b/i,
  /\bcan'?t go on\b/i,
  /\bself[\s-]?harm/i, // self-harm, self harming, selfharm
  /\bhurt(ing)? myself\b/i,
  /\bcut(ting)? myself\b/i,
  /\b(slit|cut) my wrists?\b/i,
  /\bhang(ing)? myself\b/i,
  /\bjump(ing)? (off|from) (\S+ ){0,2}(building|bridge|roof|terrace|balcony)\b/i,
  /\b(take|took|taking|going to) (an )?overdose\b/i,
  /\bend(ing)? it (tonight|today|forever)\b/i,
  /\bsleep( and)?( just)? (never|not) wake up\b/i,
  /\b(wish i( would|d)?|hope i( dont| do not)?) never wake up\b/i,
  /\b(take|taking|took|swallow(ing)?) all (of )?(my |the |these |those )?(sleeping )?(pills|tablets)\b/i,
  /\btell my (parents|family|mom|mum|dad|mummy|papa)( \S+){0,3} sorry\b/i,
  /\b(this is|this was) my last (message|post|note)\b/i,
  /\bend myself\b/i,
  /\bunalive\b/i,
  /\bhate being alive\b/i,
  /\b(dont|do not|cant|cannot) see myself (alive|living|being alive)\b/i,
  /\bwont be alive\b/i,
  /\bwont be around (for )?(much longer|long|another|next)\b/i,
  /\bdisappear (and never come back|forever)\b/i,
  /\b(painless )?ways to (die|kill myself|end my life)\b/i,
  /\bburn(ed|t|ing)? (myself|my (arms?|wrists?|skin|hands?))\b/i,
  /\b(till|until) (it|i) bleeds?\b/i,
  /\b(started|been) cutting( myself)?( again)?\b(?! (carbs|sugar|hair|class|classes|down|back)\b)/i,
  /\bhid(e|ing) (my |the )?(cuts|scars)\b/i,
  /\bdont blame (anyone|anybody|my (parents|family))\b/i,
  /\bnice knowing (you|u|you all|u all|yall)\b/i,
  /\b(want|wanna|going|gonna) (to )?kms\b/i,
  /\bsewer ?slide\b/i,
  // suicide, suicidal, su1cide, s*icide. No exclusions, deliberately: someone
  // typing "suicide helpline ka number" or "suicidal. helpline never picks up"
  // should see the helplines, and a prevention talk showing them costs little.
  /\bsuicid/i,
  /\bs ?u?[i1l] ?c ?[i1l] ?d ?e\b/i,
]

/**
 * Stems looked for INSIDE long run-together tokens ("mainbasmarnachahtahu"),
 * where spaces — and so every phrase pattern — are lost. Matched against the
 * skeleton, only in tokens of RUN_TOGETHER_MIN_LENGTH+ characters, so ordinary
 * words can't collide with a stem.
 */
const RUN_TOGETHER_STEMS =
  /(?:marnachah|marjanachah|mrnachah|jenanahi|jinanahi|khudkokhatam|khudkomar|khudkushi|atmahatya|atmhatya|suicid|मरनाचाह|मरजानाचाह|जिनानहि|खुदकोखत्म|आत्महत्या|खुदकुशि)/u
const RUN_TOGETHER_MIN_LENGTH = 12

// ---------------------------------------------------------------------------
// Romanised Hindi ("Hinglish")
// ---------------------------------------------------------------------------
// Written in SKELETON form: no doubled letters ("jena" matches jeena/jeeena,
// "chat" matches chhat, "jan" matches jaan). SMS spellings are listed
// explicitly (nhi, mjhe, mrna, khtm).

const NOT = String.raw`(?:nahi|nahin|nhi|nhin|nai|ni|na|nahe)\b`
/** chahta / chahti / chahte / chahata / chahu / chahun(ga) / chahiye / chahat */
const WANT = String.raw`(?:chah?a?th?[aei]|chah[aeiu]|chaiye|chahat)`
const ME = String.raw`\bmu?jh?(?:e|ko)\b`
const SELF = String.raw`\b(?:khud|khd|apne ?ap) ?(?:ko|k)\b`
/** zindagi / zindgi / zndgi / jindagi, life, jeevan / jivan / jiwan */
const LIFE = String.raw`\b(?:[zj]i?nda?g[iey]|life|j[ei][vw]an)\b`
const END = String.raw`(?:khatam|khatm|khtm|khtam|khatma|khalas|end|ant|samapt)\b`
const GOD = String.raw`(?:bhagwan|bhagvan|bhgwan|bhagwanji|god|upar ?wal[ae]|ishwar|iswar|isvar|prabhu|rab|alah|khuda)\b`
/** Someone else as the object: "usko maarna hai" is anger, not self-harm. */
const OTHER = String.raw`(?:use|usko|uske|unhe|unko|tujhe|tujhko|tumhe|tumko|apko|isko|inko|sabko|kisi|kisiko|logo|logon)\b`
const OTHER_BEFORE = rx`(?:\b${OTHER}|\bko) $`
/** Study context right before "sab": "syllabus sab khatam kar dunga". */
const STUDY = String.raw`(?:sylabus|silabus|chapters?|chaptr|revision|notes|homework|hw|asignments?|portion|backlog|questions?|padhai|padai|topics?|lectures?|modules?|boks?|dp|shets?|series)`
const STUDY_BEFORE = rx`\b${STUDY}(?: (?:ka|ki|ke))? $`
/**
 * A word that is not "me / myself": "jaan de dunga tere liye" is loyalty, but
 * "jaan de dunga, mere liye kuch nahi bacha" (nothing left for me) is not.
 */
const NOT_ME = String.raw`(?!(?:mere|meri|mera|mujh\S*|apne|apni|khud)\b)`
/** "dosti ke liye jaan de dunga" — loyalty idiom, not intent. */
const LIYE_BEFORE = rx`\bliye(?: (?:main|mai|me|mein|hum|apni))? $`
/** "Dying of" tiredness / laughter / hunger / heat / boredom / sleepiness. */
const IDIOM = String.raw`(?:thak|hans|bhukh?|bhokh?|garmi|thand|sardi|bore|nend|nind)\S*`
const IDIOM_BEFORE = rx`\b${IDIOM}(?: \S+){0,2} $`

const HINGLISH_PATTERNS: CrisisRule[] = [
  // Wanting to die: "mar jana chahta hoon", "marna chahti hu", "mrna chahta".
  unless(
    rx`\bma?r(?:na| ?jana)(?: hi| bhi)?(?: ${NOT})? ${WANT}`,
    OTHER_BEFORE,
  ),
  // "mujhe mar jana hai", "mujhe bas marna hai", "mjhe mrna h".
  rx`${ME}(?: (?!${OTHER}|\S+ ko\b)\S+){0,2} (?:mar ?jana|ma?rna) (?:hai|he|h)\b`,
  rx`\b(?:mar ?jana|ma?rna) (?:hai|he|h) ${ME}`,
  rx`\b(?:bas|bs|ab) (?:ab |bas |bs )?(?:mar ?jana|ma?rna) (?:hai|he|h)\b`,
  rx`\b(?:ise|is se|isase) (?:acha|behtar|beter)(?: toh?)? (?:main |mai )?mar`,
  rx`\bkahi?n? ja ?ke mar\b`,
  rx`\b(?:bas|ab) (?:ab |bas |to |main |mai )?(?:kud|kod) ja(?:u|un|on)\b`,
  rx`\bm(?:a|o)ut (?:hi )?(?:achi|acha|behtar|beter)\b`,
  rx`\bj[ei]na (?:bekar|vyarth|faltu)\b`,
  rx`${LIFE}(?: \S+){0,8} (?:ise|isko|use) (?:khatam|khatm|khtm|khtam|end) (?:(?:kar|kr) ?[dl][uoe]|karna|krna)`,
  rx`\b${GOD}(?: ke)? pas ja(?:na|u|un|on|ung\S*)\b`,
  // "marne ka mann / khayal / plan", "marne ke tarike", "marne ke baare me".
  unless(
    rx`\bma?r(?:ne| ?jane) (?:ka|ki|ke)(?: \S+)? (?:man|mn|dil|ich\S*|khayal|khyal|vichar|soch|irada|plan|tarik\S*|bare|dua\S*|siva\S*|siwa\S*|alava|alawa|ilava|ilawa)\b`,
    OTHER_BEFORE,
  ),
  // Wishing to die: "kaash main mar jaaun", "dil karta hai mar jaun".
  rx`\bkash(?: \S+){0,2} mar (?:hi )?ja`,
  rx`\b(?:dil|man|mn) (?:kar|kr|ho)\S*(?: \S+){0,3} mar (?:hi )?ja(?:u|un|on|ye|e|na)?\b`,
  unless(
    rx`\b(?:bas|ab) (?:ab |bas |to |main |mai )?mar (?:hi )?ja(?:u|un|on|t[ai] h(?:u|un|on))\b`,
    IDIOM_BEFORE,
  ),
  // "mar jau toh…" (if I died, then…) — not "mar jau toh bhi" (even if I die).
  unless(rx`\bmar ja(?:u|un|on) toh?\b(?! bhi\b)`, IDIOM_BEFORE),
  rx`\bmar (?:hi )?ja(?:u|un|on|unga|ungi|onga|ongi|ta|ti|e|ye)? toh?(?: \S+){0,2} (?:acha|behtar|beter|th[ei]k|sahi|sukun|shanti|aram|khush)`,
  unless(
    rx`\bma?r(?:na| jana) (?:hi )?(?:behtar|beter|acha|sahi|th[ei]k)`,
    OTHER_BEFORE,
  ),
  rx`\bmar ky(?:u|o)n? ${NOT} ja`,
  rx`\bkabhi (?:na|nahi|nhi) uth(?:u|un|on)\b`,
  rx`\bkabhi uth(?:u|un|on) (?:hi )?${NOT}`,
  rx`\bkash(?: \S+){0,4} uth(?:u|un|on) (?:hi )?${NOT}`,
  rx`\bab (?:aur|or) ${NOT} (?:r[ae]h|j[ei]) sak`,
  rx`\bankh (?:hi )?${NOT} khul`,
  rx`\bsubah ${NOT} dekh(?:u|un|on)\b`,
  rx`\b(?:aj|kal) (?:ki )?rat (?:meri )?(?:last|akhri|akhiri|antim)(?: rat)? (?:hai|he|h) meri\b`,
  rx`\bmeri (?:last|akhri|akhiri|antim) rat\b`,
  // Conditional: "fail hua to main mar jaunga", "warna mar jaungi", "mar
  // jaunga agar…". Bare "mar jaunga" and "garmi se to mar jaunga" are excluded.
  unless(
    rx`\b(?:toh?|warna|varna) (?:main |mai |me |mein )?mar (?:hi )?ja(?:u|o)n?g[ai]\b(?! (?:\S+ )?${IDIOM})`,
    IDIOM_BEFORE,
  ),
  rx`\bmar (?:hi )?ja(?:u|o)n?g[ai] (?:agar|if|jab|warna|varna)\b`,
  // Not wanting to live: "jeena nahi chahta", "jeene ka mann nahi".
  rx`\bj[ei]na(?: hi| bhi)? ${NOT}`,
  rx`\b${NOT} j[ei]na\b`,
  rx`\bj[ei]ne ka ${NOT} (?:hai|he|h)\b`,
  rx`\bky(?:u|o)n? j[ei](?:yu|yun|u|un)\b`,
  rx`\b${LIFE}(?: \S+){0,2} bojh\b`,
  rx`\bduniya (?:me|mein|main) ${NOT} r[ae]hna`,
  rx`\bj[ei](?:ne|ye|n|ve) (?:ka|ki|ke)(?: (?:koi|bhi|ab)){0,2} (?:man|mn|dil|ich\S*|wajah?|vajah?|matlab|mtlb|maksad|maqsad|fayda|faida|fyda|reason|point|mod|irada|umed|umid|hosla|himat|sahara)\b(?: \S+){0,2} (?:${NOT}|khatam|khtm)`,
  rx`\b(?:wajah?|vajah?|matlab|reason|maksad|fayda|faida|point) ${NOT}(?: \S+)? j[ei]ne (?:ka|ki|ke)\b`,
  // Not "pa…" alone: "JEE nahi pass kar paya" must not match (JEE → "je").
  rx`\b(?:${NOT} j[ei]|j[ei] ${NOT}) (?:sak\S*|paunga|paungi|pa rah\S*)`,
  rx`\bj[ei]ne se (?:thak|tang|ub)`,
  // "jee kar kya karoon", "jeene ke layak nahi", "zinda rehne layak nahi".
  rx`\bj[ei] ?(?:kar|kr|ke) (?:kya|kia) (?:karu|karun|karunga|karungi|fayda|faida|matlab)\b`,
  rx`\b(?:j[ei]ne|zinda r[ae]hne|(?:duniya|dunia) (?:me|mein) r[ae]hne) (?:ka |ke |ki )?(?:hi )?(?:layak|lyak|laik|kabil|hak)\b`,
  rx`${ME}(?: ab)? live ${NOT} kar`,
  // "kal subah tak main nahi rahunga" — not "main Kota me nahi rahunga".
  rx`\b(?:main|mai) ${NOT} r[ae]h(?:unga|ungi|onga|ongi|u|un|on)\b(?! (?:\S+ )?(?:me|mein|pe|par|ghar|yaha|yahan|waha|wahan|kota|hostel|sath)\b)`,
  rx`\bzinda (?:${NOT} r[ae]h|r[ae]hna ${NOT}|r[ae]hne (?:ka|ki|ke) (?:man|mn|dil|ich\S*|wajah?|vajah?|matlab|reason|fayda|faida|point)\b(?: \S+)? ${NOT})`,
  // Words for suicide: khudkushi, aatmahatya / atmhatya, aatmghaat, sucide.
  rx`\b(?:khud ?kushi|khudkh?[ua]sh?[iey])`,
  rx`\b(?:ata?ma? ?ha?t[iy]{0,2}a|atmghat)`,
  rx`\bsui?[cs]i?d(?:e|al)`,
  // Self as object: "khud ko khatam kar dunga", "apne aap ko maar dalungi".
  rx`${SELF}(?: (?:hi|bhi|ab|bas))? (?:khatam|khatm|khtm|khtam|khalas|mar|marna|marne|mard\S*|maru\S*|kil|hurt|harm|end|nuksan|chot|kat|katna|katne|katu\S*|cut|jala ?[dl]\S*)\b`,
  rx`\b(?:khatam|khatm|khtm|khtam|khalas|mar|kil|hurt|harm|end)(?: (?:kar|kr|de\S*|le\S*|dal\S*|dy?[uo]\S*|l[uo]\S*|hu|hun|hon)){1,3} ${SELF}`,
  rx`\b(?:nas|nase|nasen|naso|kalai|wrists?)\b(?: \S+)? (?:kat|cut)`,
  // Cutting: "blade se haath kaat leti hu" (not "haath kat gaya", an accident).
  rx`\b(?:hath|kalai|wrist|bazu)\S* (?:kat|cut) [ld][eiuo]\S*`,
  rx`\bblade (?:se|ki|wali)\b(?: \S+){0,3} (?:kat|cut)`,
  rx`\bblade chala`,
  rx`\b(?:hath|kalai|bazu|wrist|arm)\S* (?:pe|par) (?:\S+ ){0,2}(?:blade|lines?|cuts?|kat\S*) (?:laga(?:na|ti|ta|i| l)|mar|bana|kiya|kie|kar)`,
  rx`\bcuts? (?:chupa|chhupa)`,
  // Ending life: "zindagi khatam kar dungi", "life end kar lunga".
  // Negated general statements ("zindagi khatam nahi hoti") are excluded.
  rx`${LIFE} (?:ko |ka |hi )?${END}(?! ${NOT})`,
  rx`\b(?:khatam|khatm|khtm|khtam|end) (?:kar|kr) ?[dl]\S*(?: (?:apni|meri|ye|yeh|is|pura))? ${LIFE}`,
  // "bas ab sab khatam kar dunga" (study context right before "sab" excluded).
  unless(
    rx`\bsab(?: kuch)? (?:khatam|khatm|khtm|khtam|khalas|end) (?:(?:kar|kr) ?[dl][uoe]\S*|(?:kar|kr) (?:raha|rha|rahi|rhi)|(?:karna|krna|karne|krne) (?:chah\S*|hai|he|ka (?:man|mn|dil|soch)))`,
    STUDY_BEFORE,
  ),
  unless(
    rx`\b(?:khatam|khatm|khtm|khtam|khalas|end) (?:kar|kr) ?(?:[dl]y?[uoe]\S*|na|ne)(?: (?:${WANT}|chahiye)\S*)?(?: hu| hun| hon)? sab\b(?! ${STUDY}\b)`,
    STUDY_BEFORE,
  ),
  // Giving up one's life: "jaan de dunga", "apni jaan le lungi".
  unless(
    rx`\bjan (?:de ?d(?:u|o)n?(?:ga|gi)?|de ?det[ai]|de ?denge|dena|dene (?:ka|ki|ke))\b(?!(?: ${NOT_ME}\S+){1,2} liye\b)`,
    LIYE_BEFORE,
  ),
  unless(
    rx`\b(?:apni|khud ?ki) jan (?:le|de|lena|dena|lu|du)\b(?!(?: ${NOT_ME}\S+){1,3} liye\b)`,
    LIYE_BEFORE,
  ),
  // Methods: hanging, poison, pesticide, pills, jumping, trains.
  rx`\b(?:ph|f)an?s[iy] (?:laga|lga|lag|ka (?:ph|f)and)`,
  rx`\b(?:(?:ph|f)and[ae]|pankh[ae]|rasi|dupat[ae]|chuni)(?: \S+)? (?:se|pe|par|me|mein) latak`,
  rx`\bpankh\S*(?: \S+){0,6} latak`,
  rx`\blatak ja(?:u|un|on) toh?\b`,
  rx`\b(?:zeher|zehar|zahar|jahar|zaher|zehr|zahr|jeher) (?:kha|pi|pe|le|nigal)`,
  rx`\b(?:kid|ked|chuh)\S* mar\S* (?:ki|wali|vali) (?:dawa|dwa|davai|dawai|goli|tablet)\S*(?: \S+){0,2} (?:pi|pe|kha|nigal|le)\b`,
  rx`\b(?:sari|sab|bahut|bohot|bht|puri|ek sath)(?: \S+){0,2} gol[iy]\S*(?: \S+){0,2} (?:kha|le|nigal)`,
  rx`\bgol[iy]\S*(?: \S+){0,6} (?:sab|sari|ek sath)(?: \S+){0,2} (?:kha|nigal)`,
  // Stockpiling: "neend ki goliyan jama kar rakhi", "sleeping pills collect".
  rx`\b(?:n[ei]n?d ki|sleping) (?:gol[iy]\S*|pils|tablets?)(?: \S+){0,2} (?:jama|ikath\S*|colect|store|stock)`,
  rx`\b(?:chat|terace|teras|building|bilding|balcony|balkoni|pul|bridge|manzil|manjil|flor)(?: \S+)? (?:se|par|pe) (?:\S+ )?(?:kud|kod|chalang|jump)`,
  rx`\b(?:nadi|river|samundar|samandar|nahar|kuan|kue|kuye)(?: \S+)? (?:me|mein|main) (?:\S+ )?(?:kud|kod|chalang|jump)`,
  rx`\b(?:train|metro|truck|trak|gadi|bus)(?: \S+)? ke (?:age|samne|niche|neche) (?:\S+ )?(?:kud|kod|a ?ja(?:u|o)|let|jump)`,
  rx`\b(?:track|trak|patri)\S*(?: \S+)? (?:pe|par)(?: \S+){0,2} (?:let|so ja|kud|kod)`,
  // Burdensomeness: "mere bina sab khush rahenge", "main bojh hu".
  rx`\b(?:sab|sabko|sabhi|ghar ?wal\S*|family|mumy papa)\b(?: \S+){0,2} mere bina(?: \S+){0,2} (?:khush|better|beter|acha|ache|th[ei]k)\b`,
  rx`\bbojh (?:hu|hun|hon|ban gaya|ban gayi)\b`,
  rx`\bmere (?:jane|marne|na r[ae]hne) se\b(?: \S+){0,3} (?:rahat|sukun|khush|better|beter|acha|ache|th[ei]k)`,
  // Farewell + apology: "papa sorry … alvida", "maaf kar dena, alvida".
  rx`\b(?:ye|yeh|ya) (?:mera|meri) (?:last|akhri|akhiri|antim) (?:msg|mesage|post|note|entry|diary)\b`,
  rx`\b(?:mumy|mama|papa|maa|ma|mom|dad)\b(?: \S+){0,3} (?:bolna|bol dena|kehna|kah dena|batana) sory\b`,
  rx`\bkisi ko (?:dosh|blame|doshi)\S*(?: \S+)? mat\b`,
  rx`\b(?:maf kar dena|maf karna|maf kr dena|sory)\b(?: \S+){0,8} (?:alvida|goodbye|good bye)\b(?! (?:party|function))`,
  rx`\b(?:alvida|goodbye)\b(?! (?:party|function))(?: \S+){0,8} (?:maf kar dena|maf karna|maf kr dena|sory)\b`,
  rx`\bmere bina (?:sab|sabhi|sab log|ghar ?wale|family|mumy papa|ma papa)\b(?: \S+){0,2} (?:khush|better|beter|acha|ache|th[ei]k)\b`,
  rx`\b(?:sab|sabhi|ghar ?wale|family)\b(?: \S+){0,2} (?:khush|better|beter|acha|ache|th[ei]k)\b(?: \S+){0,2} mere bina\b`,
  // Passive wishes: "bhagwan mujhe utha le", "maut aa jaye", "alvida duniya".
  rx`\b${GOD}(?: (?!nam\b)\S+){0,3} utha (?:le|lo|lena|lijiye|lijie|lijye)\b`,
  rx`\butha (?:le|lo|lena|lijiye|lijie|lijye)(?: \S+){0,2} ${GOD}`,
  rx`\bm(?:a|o)ut (?:a ?ja(?:ye|e|aye|ti|ta|y)|ky(?:u|o)n? ${NOT} a|de de|de do|chah\S*)`,
  rx`\b(?:alvida (?:duniya|dunia|zindagi|zindgi)|(?:duniya|dunia) (?:ko )?alvida)\b`,
  rx`\b(?:duniya|dunia) (?:ko )?chh?od (?:du|do|de|jau|jao|jana|jaun)`,
  rx`\b(?:duniya|dunia) se chal[aei] ja(?:u|o|na)`,
  rx`\bhamesha ke liye (?:so|chal[aei]) ja`,
  rx`\b(?:gayab|gaib|lapata) ho ja(?:na|u|un|on|ung\S*)\b(?: \S+){0,2} hamesha ke liye\b`,
  rx`\bhamesha ke liye (?:gayab|gaib|lapata) ho ja(?:na|u|un|on|ung\S*)\b`,
  rx`\bchal[aei] ja(?:u|o)\S* hamesha ke liye\b`,
]

// ---------------------------------------------------------------------------
// Devanagari
// ---------------------------------------------------------------------------
// Natural spelling: `rx` folds nukta / chandrabindu / vowel length in the
// source the same way as in the input, so "जीना", "ज़िंदगी", "दूँगा" are fine.

const D_NOT = String.raw`(?:नहीं|नही|नई|ना|न|नइखे|कोनी)${E}`
const D_ME = String.raw`मु(?:झ|ज)(?:े|को)${E}`
const D_SELF = String.raw`(?:ख़ुद|अपने आप|अपनेआप|स्वयं|अपने) ?को${E}`
const D_LIFE = String.raw`(?:ज़िंदगी|ज़िन्दगी|ज़िदगी|जीवन|लाइफ)`
const D_END = String.raw`(?:ख़त्म|खतम|समाप्त|अंत|एंड)${E}`
const D_GOD = String.raw`(?:भगवान|ईश्वर|प्रभु|ऊपर ?वाले|ऊपर ?वाला|रब|अल्लाह|ख़ुदा)`
const D_LIYE = String.raw`लि(?:ए|ये)`
const D_STUDY_BEFORE = rx`(?:^| )(?:सिलेबस|सिलैबस|चैप्टर|अध्याय|पढ़ाई|रिवीजन|नोट्स|होमवर्क|सवाल|प्रश्न)(?: (?:का|की|के))? ?$`
const D_LIYE_BEFORE = rx`(?:^| )${D_LIYE}(?: (?:मैं|मै|में|हम|अपनी))? ?$`
const D_IDIOM = String.raw`(?:थक|हंस|हँस|भूख|गर्मी|ठंड|सर्दी|बोर|नींद)\S*`
const D_IDIOM_BEFORE = rx`(?:^| )${D_IDIOM}(?: \S+){0,2} ?$`

const DEVANAGARI_PATTERNS: CrisisRule[] = [
  // Wanting to die: "मरना चाहता हूँ", "मर जाना चाहती हूं".
  rx`${B}मर(?:ना| जाना)(?: ही| भी)?(?: ${D_NOT})? चाह`,
  rx`${B}${D_ME}(?: \S+){0,2} (?:मर जाना|मरना) (?:है|हैं|हे)${E}`,
  rx`${B}(?:मर जाना|मरना) (?:है|हैं|हे) ${D_ME}`,
  rx`${B}(?:बस|अब) (?:मर जाना|मरना) (?:है|हैं|हे)${E}`,
  rx`${B}कहीं जा ?के मर${E}`,
  rx`${B}मौत (?:ही )?(?:अच्छी|बेहतर)`,
  rx`${B}${D_LIFE}\S*(?: \S+){0,8} (?:इसे|इसको) (?:ख़त्म|खतम) (?:कर ?(?:दू|दे|लू|ले)|करना)`,
  rx`${B}${D_GOD} के पास जा(?:ना|ऊं|ऊंगा|ऊंगी)${E}`,
  rx`${B}(?:आंख|आँख) (?:ही )?${D_NOT} खुल`,
  rx`${B}सुबह ${D_NOT} देखूं${E}`,
  rx`${B}आज (?:की )?रात(?: मेरी)? (?:आख़िरी|आखरी|अंतिम|लास्ट)(?: रात)? है मेरी${E}`,
  rx`${B}मेरी (?:आख़िरी|आखरी|अंतिम|लास्ट) रात${E}`,
  rx`${B}मर(?:ने| जाने) (?:का|की|के)(?: \S+)? (?:मन|दिल|इच्छा|ख़्याल|ख़याल|विचार|सोच|इरादा|तरीक|प्लान|बारे|दुआ|सिवा|अलावा)`,
  rx`${B}काश(?: \S+){0,2} मर (?:ही )?जा`,
  rx`${B}(?:दिल|मन) (?:कर|हो)\S*(?: \S+){0,3} मर (?:ही )?जा(?:ऊं|ऊ|ए|ये|ना)${E}`,
  rx`${B}मर जा(?:ऊं|ऊ|ए|ये|ता|ती|ऊंगा|ऊंगी)? तो(?: \S+){0,2} (?:अच्छा|बेहतर|ठीक|सही|सुकून|शांति|आराम|ख़ुश)`,
  rx`${B}मर(?:ना| जाना) (?:ही )?(?:बेहतर|अच्छा|सही|ठीक)`,
  rx`${B}मर क्य(?:ों|ो|ूं|ू) ${D_NOT} जा`,
  unless(rx`${B}मर जाऊं तो${E}(?! भी${E})`, D_IDIOM_BEFORE),
  rx`${B}काश(?: \S+){0,4} उठूं (?:ही )?${D_NOT}`,
  rx`${B}अब और ${D_NOT} (?:रह|जी) सक`,
  rx`${B}कभी (?:ना|न|नहीं) उठ(?:ूं|ू)${E}`,
  unless(
    rx`${B}(?:तो|वरना) (?:मैं |मै |में )?मर (?:ही )?जाऊं?ग(?:ा|ी)${E}(?! (?:\S+ )?${D_IDIOM})`,
    D_IDIOM_BEFORE,
  ),
  rx`${B}मर (?:ही )?जाऊं?ग(?:ा|ी) (?:अगर|जब|वरना)${E}`,
  // Not wanting to live: "जीना नहीं चाहता", "जीने का मन नहीं करता".
  rx`${B}जीना(?: ही| भी)? ${D_NOT}`,
  rx`${B}${D_NOT} जीना${E}`,
  rx`${B}(?:अब )?(?:कोनी|कोन्या) जी(?:णो|णा|ना)${E}`,
  rx`${B}क्य(?:ों|ो|ूं|ू) जियूं${E}`,
  rx`${B}${D_LIFE}(?: \S+){0,2} बोझ`,
  rx`${B}दुनिया में ${D_NOT} रहना`,
  rx`${B}(?:जीने|जिये|जियें) (?:का|की|के)(?: (?:कोई|भी|अब)){0,2} (?:मन|दिल|इच्छा|वजह|मतलब|मक़सद|कारण|फ़ायदा|उम्मीद|हौसला|हिम्मत|सहारा)(?: \S+){0,2} (?:${D_NOT}|ख़त्म)`,
  rx`${B}(?:वजह|मतलब|कारण|फ़ायदा|मक़सद)(?: \S+)? ${D_NOT}(?: \S+)? जीने (?:का|की|के)${E}`,
  rx`${B}(?:${D_NOT} जी|जी ${D_NOT}) (?:सक\S*|पाऊंगा|पाऊंगी|पा रह\S*)`,
  rx`${B}जीने से (?:थक|तंग|ऊब)`,
  rx`${B}जी ?(?:कर|के) (?:क्या|किसलिए) (?:करूं|फ़ायदा|मतलब)`,
  rx`${B}(?:जीने|ज़िंदा रहने|दुनिया में रहने) (?:के |का |की )?(?:ही )?(?:लायक|काबिल|हक़)`,
  rx`${B}(?:मैं|मै) ${D_NOT} रहूं(?:ग(?:ा|ी))?${E}(?! (?:\S+ )?(?:में|पे|पर|घर|यहां|वहां|कोटा|हॉस्टल|साथ)${E})`,
  rx`${B}(?:ज़िंदा|ज़िन्दा) (?:${D_NOT} रह|रहना ${D_NOT}|रहने (?:का|की) (?:मन|इच्छा|वजह)(?: \S+)? ${D_NOT})`,
  // Words for suicide: आत्महत्या, आत्मघात, ख़ुदकुशी, सुसाइड.
  rx`${B}(?:[आअ]त्?म ?हत्?या|आत्मघात)`,
  rx`${B}ख़ुद्? ?[कख]ु?शी`,
  rx`${B}सु(?:इ)?साइड`,
  // Self as object: "ख़ुद को ख़त्म कर दूँगा", "अपने आप को मार डालूंगी".
  rx`${B}${D_SELF}(?: (?:ही|भी|अब))? (?:ख़त्म|खतम|मार(?!्)|किल|हर्ट|नुक़सान|चोट|काट|एंड|जला)`,
  rx`${B}(?:ख़त्म|खतम|मार|किल|एंड) (?:कर|डाल|दे|ले)\S*(?: \S+)? (?:ख़ुद|अपने आप|अपनेआप) ?को${E}`,
  rx`${B}(?:नस|नसें|नसे|कलाई)(?: \S+)? काट`,
  rx`${B}(?:हाथ|कलाई|बाजू)\S* काट (?:ल|द)\S*`,
  rx`${B}ब्लेड (?:से|की|वाली)(?: \S+){0,3} (?:काट|कट)`,
  rx`${B}ब्लेड चला`,
  rx`${B}कट\S* छुपा`,
  rx`${B}(?:हाथ|कलाई|बाजू)\S* (?:पर|पे) (?:\S+ )?(?:कट|ब्लेड|निशान) (?:लगा(?:ना|ती|ता|ई| ल)|मार|बना|कर)`,
  // Ending life: "ज़िंदगी ख़त्म कर दूंगा". "ज़िंदगी ख़त्म नहीं होती" is excluded.
  rx`${B}${D_LIFE} (?:को |का )?${D_END}(?! ${D_NOT})`,
  rx`${B}(?:ख़त्म|खतम|एंड) कर ?(?:द|ल)\S*(?: (?:अपनी|मेरी|ये|यह|इस))? ${D_LIFE}`,
  unless(
    rx`${B}सब(?: कुछ)? (?:ख़त्म|खतम) (?:कर ?(?:दू|दे|लू|ले)\S*|करना (?:चाह\S*|है)|करने (?:का|की) (?:मन|सोच))`,
    D_STUDY_BEFORE,
  ),
  // Giving up one's life: "जान दे दूँगा", "अपनी जान ले लूंगी".
  unless(
    rx`${B}जान (?:दे ?दू\S*|दे ?दे(?:ता|ती|ंगे)|देना|देने (?:का|की|के))(?!(?: \S+){1,2} ${D_LIYE}${E})`,
    D_LIYE_BEFORE,
  ),
  unless(
    rx`${B}(?:अपनी|ख़ुद की) जान (?:ले|दे|लेना|देना)${E}(?!(?: \S+){1,3} ${D_LIYE}${E})`,
    D_LIYE_BEFORE,
  ),
  // Methods.
  rx`${B}फाँ?सी (?:लगा|का फंदा)`,
  rx`${B}(?:फंदे|पंखे|रस्सी|दुपट्टे|चुन्नी)(?: \S+)? (?:से|पर|पे|में) लटक`,
  rx`${B}(?:ज़हर|विष) (?:खा|पी|ले|निगल)`,
  rx`${B}(?:सारी|सब|बहुत|ढेर|एक साथ)(?: \S+){0,2} गोलि\S*(?: \S+){0,2} (?:खा|निगल|ले)`,
  rx`${B}नींद की गोलि\S*(?: \S+){0,2} (?:जमा|इकट्ठ)`,
  rx`${B}(?:रेलवे )?(?:ट्रैक|पटरी)\S*(?: \S+)? (?:पर|पे)(?: \S+){0,2} (?:लेट|सो जा|कूद)`,
  rx`${B}(?:छत|बिल्डिंग|पुल|ब्रिज|बालकनी|टेरेस|मंज़िल)(?: \S+)? (?:से|पर) (?:\S+ )?(?:कूद|छलांग|जंप)`,
  rx`${B}(?:नदी|समुंदर|समुद्र|नहर|कुएं|कुआं)(?: \S+)? में (?:\S+ )?(?:कूद|छलांग|जंप)`,
  rx`${B}(?:ट्रेन|मेट्रो|ट्रक|गाड़ी)(?: \S+)? के (?:आगे|सामने|नीचे) (?:\S+ )?(?:कूद|आ जा|लेट|जंप)`,
  // Burdensomeness: "मेरे बिना सब ख़ुश रहेंगे".
  rx`${B}मेरे बिना (?:सब|सभी|घर ?वाले|परिवार)(?: \S+){0,2} (?:ख़ुश|बेहतर|अच्छ|ठीक)`,
  rx`${B}(?:सब|सबको|सभी|घर ?वाल|परिवार)\S*(?: \S+){0,2} मेरे बिना(?: \S+){0,2} (?:ख़ुश|बेहतर|अच्छ|ठीक)`,
  rx`${B}बोझ (?:हूं|हूँ|हु|बन गया|बन गई)`,
  rx`${B}मेरे (?:जाने|मरने|ना रहने|न रहने) से(?: \S+){0,3} (?:राहत|सुकून|ख़ुश|बेहतर|अच्छ)`,
  // Farewell + apology: "माफ़ कर देना, अलविदा".
  rx`${B}माफ़ (?:कर|कर देना|करना)${E}(?: \S+){0,8} अलविदा`,
  rx`${B}(?:ये|यह) मेरी (?:आख़िरी|आखरी|अंतिम|लास्ट) (?:एंट्री|मैसेज|पोस्ट|नोट|डायरी)`,
  rx`${B}किसी को (?:दोष|दोषी|ब्लेम)(?: \S+)? मत${E}`,
  rx`${B}अलविदा(?: \S+){0,8} माफ़ (?:कर|करना)${E}`,
  // Passive wishes: "भगवान मुझे उठा ले", "मौत आ जाए", "अलविदा दुनिया".
  rx`${B}${D_GOD}(?: (?!नाम)\S+){0,3} उठा (?:ले|लो|लें|लीजिए|लीजिये)${E}`,
  rx`${B}उठा (?:ले|लो|लें|लीजिए|लीजिये)(?: \S+){0,2} ${D_GOD}`,
  rx`${B}मौत (?:आ ?जा(?:ए|ये|ती|े)|क्य(?:ों|ो|ूं|ू) ${D_NOT} आ|दे दे|दे दो|चाह)`,
  rx`${B}(?:अलविदा (?:दुनिया|ज़िंदगी)|दुनियां? (?:को )?अलविदा)`,
  rx`${B}दुनिया (?:को )?छोड़ (?:दू|दे|जाऊ|जाना)`,
  rx`${B}दुनिया से चल(?:ा|े|ी) जा(?:ऊ|ना)`,
  rx`${B}हमेशा के लिए (?:सो|चल(?:ा|े|ी)) जा`,
  rx`${B}हमेशा के लिए (?:ग़ायब|लापता) हो जा(?:ना|ऊं|ऊंगा|ऊंगी)${E}`,
]

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

export interface CrisisCheck {
  isCrisis: boolean
  /** The matched fragments, useful for tests and (optionally) logging counts. */
  matches: string[]
}

/** How far back an idiom guard may look: a few words is all any guard uses. */
const GUARD_WINDOW = 120

/**
 * The text a guard may inspect before index `idx`: back to the start of the
 * sentence, and at most GUARD_WINDOW characters, cut at a word boundary (a
 * half word could fake an idiom). Bounded, so long input stays linear.
 */
function guardContext(marked: string, idx: number): string {
  // From idx itself: a Devanagari match starts ON its separator, which may
  // be the sentence-end "\n".
  let from = marked.lastIndexOf('\n', idx) + 1
  if (idx - from > GUARD_WINDOW) {
    const cut = marked.indexOf(' ', idx - GUARD_WINDOW)
    from = cut === -1 || cut >= idx ? idx : cut + 1
  }
  return marked.slice(from, idx)
}

/** A text to scan, and the same text with sentence boundaries marked. */
interface Form {
  text: string
  marked: string
}

/** First non-guarded hit of `rule` in `form`, trimmed; null if none. */
function firstHit(rule: CrisisRule, form: Form): string | null {
  if (rule instanceof RegExp) {
    const m = form.text.match(rule)
    return m ? m[0].trim() : null
  }
  for (const m of form.text.matchAll(rule.pattern)) {
    const before = guardContext(form.marked, m.index ?? 0)
    if (!rule.unlessAfter.test(before)) return m[0].trim()
  }
  return null
}

/**
 * Scan free text for crisis-level language in English, Hinglish and
 * Devanagari. Returns which patterns matched (as normalised fragments, one per
 * pattern) so the result is explainable and testable.
 */
export function detectCrisis(text: string): CrisisCheck {
  const markedText = normalizeForMatching(text)
  const markedSkeleton = toSkeleton(markedText)
  const normalized: Form = {
    text: markedText.replace(/\n/g, ' '),
    marked: markedText,
  }
  const skeleton: Form = {
    text: markedSkeleton.replace(/\n/g, ' '),
    marked: markedSkeleton,
  }
  const matches: string[] = []
  // Each form is scanned as-is and with sentence ends kept as "\n": a
  // lookahead exclusion (e.g. "… liye") cannot see past a "\n", so the union
  // never lets an exclusion reach into the next sentence. Only adds matches.
  const scan = (rules: readonly CrisisRule[], forms: readonly Form[]) => {
    const variants = forms.flatMap((f) =>
      f.text === f.marked ? [f] : [f, { text: f.marked, marked: f.marked }],
    )
    for (const rule of rules) {
      for (const form of variants) {
        const hit = firstHit(rule, form)
        if (hit !== null) {
          matches.push(hit)
          break
        }
      }
    }
  }
  scan(CRISIS_PATTERNS, [normalized, skeleton])
  scan(HINGLISH_PATTERNS, [skeleton])
  scan(DEVANAGARI_PATTERNS, [skeleton])
  for (const token of skeleton.text.split(' ')) {
    if (token.length < RUN_TOGETHER_MIN_LENGTH) continue
    const m = token.match(RUN_TOGETHER_STEMS)
    if (m) {
      matches.push(m[0])
      break
    }
  }
  return { isCrisis: matches.length > 0, matches }
}

/** A verified support resource shown during the safety flow. */
export interface Helpline {
  name: string
  contact: string
  detail: string
  /** Tel/URL for an actionable link where possible. */
  href: string
  /** Answers 24/7 — these are the lines shown in compact "help now" blocks. */
  alwaysOpen?: boolean
}

/**
 * Indian mental-health helplines. These are government / well-established
 * services so the guidance is actionable and trustworthy for the target users.
 */
export const HELPLINES: Helpline[] = [
  {
    name: 'Tele-MANAS (Govt. of India)',
    contact: '14416',
    detail: '24/7 national mental health support, multiple languages.',
    href: 'tel:14416',
    alwaysOpen: true,
  },
  // KIRAN (1800-599-0019) was merged into Tele-MANAS in Feb 2024, so it is not
  // listed separately. 112 is India's single emergency number.
  {
    name: 'Emergency services (112)',
    contact: '112',
    detail: 'If you or someone else is in immediate danger. Free, 24/7.',
    href: 'tel:112',
    alwaysOpen: true,
  },
  {
    name: 'iCall (TISS)',
    contact: '9152987821',
    detail: 'Counsellor support, Mon–Sat, 10am–8pm.',
    href: 'tel:9152987821',
  },
  {
    name: 'AASRA',
    contact: '+91-9820466726',
    detail: '24/7 crisis support and suicide prevention.',
    href: 'tel:+919820466726',
    alwaysOpen: true,
  },
]

/** Standard disclaimer shown across the app — MindFuel is support, not therapy. */
export const SUPPORT_DISCLAIMER =
  'MindFuel is a supportive companion, not a substitute for professional medical or mental-health care. If you are in distress, please reach out to a trusted person or one of the helplines below.'
