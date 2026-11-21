/**
 * Replies are shown and spoken as plain words, so any markdown the model adds
 * (bold, italics, headings, lists, links, code) is reduced to its text.
 */
export function plainText(text: string): string {
  return text
    .split('\n')
    .map(line => line
      .replace(/^\s{0,3}#{1,6}\s+/, '')
      .replace(/^\s*>\s?/, '')
      .replace(/^\s*(?:[-*+•]|\d+[.)])\s+/, ''))
    .join('\n')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/`+/g, '')
    .replace(/\*\*|__/g, '')
    .replace(/(^|[^\w*])\*(?=\S)([^*\n]*?\S)\*(?!\w)/g, '$1$2')
    .replace(/(^|\W)_(?=\S)([^_\n]*?\S)_(?!\w)/g, '$1$2')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
