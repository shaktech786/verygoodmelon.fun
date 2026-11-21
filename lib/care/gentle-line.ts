import { soundsLikeDistress } from '@/lib/games/community-words/moderation'

/** Shown instead of the day's line when that line leans on something heavy and someone may be in danger. */
export const GENTLE_LINE = 'There is no hurry here. You are welcome to rest a while, just as you are.'

// The day's line is written fresh each day and its topics include impermanence, so it can drift toward
// endings; for someone who may be in danger, anything about loss, letting go or things ending steps aside.
const HEAVY_THEMES = [
  /\b(?:die[sd]?|dying|death|dead|mortal\w*|grave|funeral|afterlife)\b/,
  /\b(?:los[est]|losing|loss(?:es)?|grie[fv]\w*|mourn\w*|gone|goodbye|farewell)\b/,
  /\b(?:end|ends|ending|endings|ended|final|finally|last|over|finish\w*)\b/,
  /\b(?:surrender\w*|let(?:ting)? (?:it |them |yourself )?go|give (?:it )?up|giving up|release|disappear\w*|vanish\w*|fad(?:e|es|ed|ing))\b/,
  /\b(?:impermanen\w*|nothing lasts|temporary|fleeting|pass(?:es)? away)\b/,
  /\b(?:pain|hurt\w*|suffer\w*|lonely|empty|darkness|night)\b/,
]

/** The day's line, or a gentle fixed one when care mode is on and the day's line touches a heavy theme. */
export function lineForCare(line: string): string {
  const folded = line.toLowerCase().replace(/[‘’`]/g, "'")
  if (soundsLikeDistress(line) || HEAVY_THEMES.some((theme) => theme.test(folded))) return GENTLE_LINE
  return line
}
