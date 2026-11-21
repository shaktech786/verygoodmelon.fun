#!/usr/bin/env node
// Red is kept for the one main action on a screen. A choice someone has made, a box they
// ticked or the place keyboard focus sits is shown in rind green (--chosen, --chosen-line,
// --focus-ring), so red never reads as "wrong" next to something a visitor picked.
// Run by `npm run qa` and CI (optionally on given folders); exits 1 and lists every place red marks a state.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOTS = process.argv.length > 2 ? process.argv.slice(2) : ['components', 'app']
const RED = String.raw`(?:accent|accent-hover|melon-red|danger|red-\d{2,3}|rose-\d{2,3})(?:\/\d+)?\b`
const STATE_VARIANT = String.raw`(?:focus|focus-visible|focus-within|aria-pressed|aria-selected|aria-checked|aria-current|checked|peer-checked|group-aria-pressed|group-aria-selected|group-data-\[[^\]]+\]|peer-aria-checked|data-\[(?:state|selected|checked)[^\]]*\]|has-\[:checked\]|selected)`

const RULES = [
  {
    why: 'red in a focus, selected, checked or pressed variant',
    pattern: new RegExp(String.raw`(?<![\w-])(?:[\w-]+:)*${STATE_VARIANT}:(?:[\w-]+:)*(?:bg|text|border|ring|outline|fill|stroke|shadow|decoration|from|to|via)-${RED}`, 'g'),
  },
  {
    why: 'red as the tick or dot colour of a checkbox, radio or slider',
    pattern: new RegExp(String.raw`(?<![\w-])accent-(?:${RED}|\[var\(--(?:accent|accent-hover|melon-red|danger)\)\])`, 'g'),
  },
]

// Within one JSX opening tag: a control that carries a state also styled red, or a ternary on a state that turns red.
const STATEFUL_TAG = /\baria-(?:pressed|checked|selected)=|\brole=["'](?:radio|checkbox|switch|tab|option|menuitemradio|menuitemcheckbox)["']|\btype=["'](?:radio|checkbox)["']/
const RED_IN_TAG = new RegExp(String.raw`(?<![\w-:])(?:bg|text|border|ring|outline|fill|stroke)-${RED}|\bvariant=\{[^}]*['"]primary['"]`)
const RED_ON_STATE = new RegExp(String.raw`\b\w*(?:selected|checked|pressed|chosen|picked)\w*\b[^?{}]{0,60}\?\s*['"\x60][^'"\x60]*(?<![\w-:])(?:bg|text|border|ring|outline|fill|stroke)-${RED}`, 'i')

function* sourceFiles(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) {
      if (name !== 'node_modules' && !name.startsWith('.')) yield* sourceFiles(path)
    } else if (/\.(?:tsx|ts|jsx|js|css)$/.test(name)) {
      yield path
    }
  }
}

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length
}

/** Opening JSX tags with their start offset, braces inside attributes accounted for. */
function* openingTags(text) {
  const start = /<([A-Z][\w.]*|[a-z][\w-]*)(?=[\s>/])/g
  let match
  while ((match = start.exec(text))) {
    let depth = 0
    let quote = null
    let i = match.index + match[0].length
    for (; i < text.length; i++) {
      const c = text[i]
      if (quote) {
        if (c === quote) quote = null
      } else if (c === '"' || c === "'" || c === '`') {
        quote = c
      } else if (c === '{') {
        depth++
      } else if (c === '}') {
        depth--
      } else if (c === '>' && depth === 0) {
        break
      }
    }
    yield { index: match.index, tag: text.slice(match.index, i + 1) }
  }
}

const problems = []
for (const root of ROOTS) {
  for (const file of sourceFiles(root)) {
    const text = readFileSync(file, 'utf8')
    const where = relative(process.cwd(), file).replaceAll('\\', '/')
    for (const { why, pattern } of RULES) {
      for (const match of text.matchAll(pattern)) {
        problems.push(`${where}:${lineOf(text, match.index)}  ${match[0]}  (${why})`)
      }
    }
    if (!/\.(?:tsx|jsx)$/.test(file)) continue
    for (const { index, tag } of openingTags(text)) {
      if (STATEFUL_TAG.test(tag) && RED_IN_TAG.test(tag)) {
        problems.push(`${where}:${lineOf(text, index)}  ${tag.split('\n')[0].trim()}  (a pressed, checked or selected control styled red)`)
      } else if (RED_ON_STATE.test(tag)) {
        problems.push(`${where}:${lineOf(text, index)}  ${tag.match(RED_ON_STATE)[0]}  (turns red when chosen)`)
      }
    }
  }
}

if (problems.length) {
  console.error(`Red marks a state in ${problems.length} place(s); use the chosen or focus-ring tokens instead:\n`)
  for (const problem of problems) console.error(`  ${problem}`)
  process.exit(1)
}
console.log('check-red-states: red is only used for actions.')
