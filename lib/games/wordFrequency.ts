import { isCloudSafeWord } from '@/lib/games/community-words/moderation'

export interface WordFrequency {
  word: string
  count: number
}

const MAX_CLOUD_WORDS = 50
const MIN_WORD_LENGTH = 3

const STOP_WORDS = new Set([
  'the', 'and', 'you', 'that', 'was', 'for', 'are', 'with', 'his', 'her', 'they', 'this',
  'have', 'from', 'had', 'but', 'not', 'what', 'all', 'were', 'when', 'your', 'can', 'there',
  'each', 'which', 'she', 'how', 'their', 'will', 'other', 'about', 'out', 'then', 'them',
  'these', 'those', 'some', 'would', 'could', 'should', 'like', 'him', 'into', 'has', 'more',
  'been', 'its', 'who', 'now', 'than', 'did', 'does', 'get', 'got', 'may', 'any', 'our',
  'just', 'very', 'too', 'also', 'because', 'here', 'where', 'why', 'one', 'much',
  'it\'s', 'i\'m', 'i\'ve', 'i\'ll', 'don\'t', 'you\'re', 'that\'s', 'can\'t', 'didn\'t',
])

/**
 * Counts how many submissions use each meaningful word, in any script. A word
 * repeated within one submission counts once, so no one can make it bigger.
 */
export function countWords(submissions: string[]): WordFrequency[] {
  const counts = new Map<string, number>()

  for (const submission of submissions) {
    const words = submission
      .toLowerCase()
      // Tag-like text is shown verbatim elsewhere, but "script" or "img" are not anyone's words
      .replace(/<[^>]*>/g, ' ')
      .replace(/[‘’]/g, '\'')
      .replace(/[^\p{L}\p{M}\p{N}\s']/gu, ' ')
      .split(/\s+/)
      .map((word) => word.replace(/^'+|'+$/g, ''))

    for (const word of new Set(words)) {
      if (word.length < MIN_WORD_LENGTH || STOP_WORDS.has(word) || /^\p{N}+$/u.test(word)) continue
      if (!isCloudSafeWord(word)) continue
      counts.set(word, (counts.get(word) ?? 0) + 1)
    }
  }

  return Array.from(counts, ([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
    .slice(0, MAX_CLOUD_WORDS)
}
