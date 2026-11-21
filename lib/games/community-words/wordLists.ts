/**
 * Word lists for the shared word clouds of The Final Word and The Awakening.
 *
 * Entries are lowercase ASCII after normalisation (accents stripped, look-alike
 * digits and symbols mapped back to letters). Plural and verb endings are
 * matched automatically, so list only the base form. When adding a word,
 * add a case to __tests__/lib/community-words-moderation.test.ts, including an
 * innocent word that contains it, so the filter never starts eating real words.
 */

/** Hate, slurs, sexual content and harassment: a submission containing one is not stored. */
export const ABUSIVE_WORDS = [
  // Slurs
  'nigger', 'nigga', 'coon', 'spic', 'spick', 'wetback', 'chink', 'gook',
  'kike', 'raghead', 'towelhead', 'paki', 'sandnigger', 'beaner', 'gyppo', 'pikey',
  'faggot', 'fag', 'dyke', 'tranny', 'shemale', 'retard', 'spaz', 'mong',
  'whore', 'slut', 'cunt', 'twat',
  // Sexual
  'porn', 'porno', 'pussy', 'cock', 'cum', 'jizz', 'blowjob', 'handjob', 'dildo',
  'pedo', 'paedo', 'pedophile', 'paedophile',
  // Harassment
  'kys',
] as const

/** Phrases (whole words, in order) that make a submission abusive. */
export const ABUSIVE_PHRASES = [
  'kill yourself', 'kill urself', 'kill your self', 'neck yourself', 'hang yourself',
  'you should die', 'drink bleach', 'heil', 'white power', 'race war',
] as const

/**
 * Words of self-harm and dying. A farewell may use them honestly ("dying was
 * easier with you there"), so they never block a submission, but drawn large
 * in a cloud they would greet the next visitor, who may be fragile, with a
 * method or a wish to die.
 */
const CRISIS_WORDS = [
  'kill', 'suicide', 'suicidal', 'pill', 'overdose', 'die', 'died', 'dying', 'dead', 'death', 'noose', 'hang',
] as const

/**
 * Swearing, and words someone may need to say sincerely (a survivor naming what
 * happened, a grandchild naming the war): allowed in a submission, never drawn
 * in the shared cloud.
 */
export const CLOUD_HIDDEN_WORDS = [
  'rape', 'rapist', 'nazi', 'hitler', 'penis', 'vagina', 'boobs', 'tits', 'anal', 'orgasm',
  'horny', 'nude', 'nudes',
  'fuck', 'fucker', 'fuckin', 'motherfucker', 'shit', 'bullshit', 'shitty', 'piss', 'pissed',
  'bitch', 'bastard', 'asshole', 'arse', 'arsehole', 'dick', 'dickhead', 'prick', 'bollocks',
  'wank', 'wanker', 'damn', 'goddamn', 'crap', 'douche', 'douchebag', 'sex', 'sexy', 'suck', 'sucks',
  ...CRISIS_WORDS,
] as const
