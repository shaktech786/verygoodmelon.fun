#!/usr/bin/env node
// Seedpress's design rules (docs/design-system/PLAN.md §10.2). Run by `npm run qa` and CI, and as
// `check:red`, the name it replaced. Optionally checks only the given folders.
//
// Every rule is strict: any match fails. Flesh (and the red it replaces) is for the one go-action of a
// view, so it never marks a state: a choice someone made, a box they ticked or where keyboard focus sits.
// The old system's habits (raw colours, Tailwind's own palette, blurred shadows, capitals and tracking,
// looping animation in the chrome) fail too; the debt ratchet that once tolerated them is gone.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const args = process.argv.slice(2)
const ROOTS = args.filter((a) => !a.startsWith('--'))
if (ROOTS.length === 0) ROOTS.push('components', 'app', 'lib')
const MOTION_CSS = join(process.cwd(), 'app', 'styles', 'motion.css')

const RED = String.raw`(?:accent|accent-hover|melon-red|danger|flesh|flesh-press|flesh-wash|red-\d{2,3}|rose-\d{2,3})(?:\/\d+)?\b`
const STATE_VARIANT = String.raw`(?:focus|focus-visible|focus-within|aria-pressed|aria-selected|aria-checked|aria-current|checked|peer-checked|group-aria-pressed|group-aria-selected|group-data-\[[^\]]+\]|peer-aria-checked|data-\[(?:state|selected|checked)[^\]]*\]|has-\[:checked\]|selected)`
const UTIL = String.raw`(?:bg|text|border|ring|outline|fill|stroke|shadow|decoration|from|to|via|accent|caret|divide|placeholder)`

const STRICT = [
  {
    why: 'red or flesh in a focus, selected, checked or pressed variant',
    pattern: new RegExp(String.raw`(?<![\w-])(?:[\w-]+:)*${STATE_VARIANT}:(?:[\w-]+:)*(?:bg|text|border|ring|outline|fill|stroke|shadow|decoration|from|to|via)-${RED}`, 'g'),
  },
  {
    why: 'red or flesh as the tick or dot colour of a checkbox, radio or slider',
    pattern: new RegExp(String.raw`(?<![\w-])accent-(?:${RED}|\[var\(--(?:accent|accent-hover|melon-red|danger|flesh|flesh-press)\)\])`, 'g'),
  },
  {
    why: 'flesh as a text colour: flesh fills the go-action and is never words',
    pattern: /(?<![\w-])(?:[\w-]+:)*text-flesh(?:-press|-wash)?(?![\w-])/g,
  },
]

// Within one JSX opening tag: a control that carries a state also styled red, or a ternary on a state that turns red.
const STATEFUL_TAG = /\baria-(?:pressed|checked|selected)=|\brole=["'](?:radio|checkbox|switch|tab|option|menuitemradio|menuitemcheckbox)["']|\btype=["'](?:radio|checkbox)["']/
const RED_IN_TAG = new RegExp(String.raw`(?<![\w-:])(?:bg|text|border|ring|outline|fill|stroke)-${RED}|\bvariant=\{[^}]*['"]primary['"]`)
const RED_ON_STATE = new RegExp(String.raw`\b\w*(?:selected|checked|pressed|chosen|picked)\w*\b[^?{}]{0,60}\?\s*['"\x60][^'"\x60]*(?<![\w-:])(?:bg|text|border|ring|outline|fill|stroke)-${RED}`, 'i')
const GO_WITH_STATE = /^<Go\b[\s\S]*(?:\baria-(?:pressed|checked|selected)=|\brole=["'](?:radio|checkbox|switch|tab)["'])/

// Colour names any part of the site may point a var() at: Seedpress roles and the game ink maps.
const SYSTEM_TOKEN = /^(?:paper|sheet|well|ink|ink-soft|rule|rule-strong|rind|rind-wash|flesh|flesh-press|on-flesh|flesh-wash|seed|moss|dusk|clay|focus|care-paper|ink-a|ink-b|tp-[\w-]+|game-[\w-]+)$/
const PALETTE_NAMES = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose'
const motionAnimations = existsSync(MOTION_CSS)
  ? new Set([...readFileSync(MOTION_CSS, 'utf8').matchAll(/\.animate-([\w-]+)/g)].map((m) => m[1]))
  : new Set()

const HABITS = [
  {
    id: 'raw-colour',
    why: 'a raw colour; use a token from lib/design',
    applies: (file) => /\.tsx?$/.test(file) && !file.startsWith('lib/design/'),
    pattern: /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|\b(?:rgba?|hsla?|oklch)\(/g,
  },
  {
    id: 'arbitrary-colour',
    why: 'an arbitrary colour utility',
    applies: (file) => /\.tsx?$/.test(file),
    pattern: new RegExp(String.raw`(?<![\w-])(?:[\w-]+:)*${UTIL}-(?:\[(?:#|rgb|hsl|oklch)[^\]]*\]|\[var\(--([\w-]+)\)\]|\(--([\w-]+)\))`, 'g'),
    keep: (match) => !SYSTEM_TOKEN.test(match[1] ?? match[2] ?? ''),
  },
  {
    id: 'tailwind-palette',
    why: "Tailwind's own palette",
    applies: (file) => /\.tsx?$/.test(file),
    pattern: new RegExp(String.raw`(?<![\w-])(?:[\w-]+:)*${UTIL}-(?:${PALETTE_NAMES})-\d{2,3}(?![\w])`, 'g'),
  },
  {
    id: 'banned-utility',
    why: 'capitals, tracking, light weights, blur or blurred shadows',
    applies: (file) => /\.tsx?$/.test(file),
    pattern: /(?<![\w/-])(?:[\w-]+:)*(?:italic|uppercase|tracking-[\w[\].-]+|font-(?:light|thin|extralight)|shadow-(?!none(?![\w-]))[\w[\]/.-]+|blur-[\w[\]]+|backdrop-blur(?:-[\w[\]]+)?)(?![\w-])/g,
  },
  {
    id: 'animate',
    why: 'an animation not defined in app/styles/motion.css',
    applies: (file) => /\.tsx?$/.test(file),
    pattern: /(?<![\w-])(?:[\w-]+:)*animate-([\w-]+)(?![\w-])/g,
    keep: (match) => match[1] !== 'none' && !motionAnimations.has(match[1]),
  },
  {
    id: 'infinite',
    why: 'a loop outside a game: chrome never loops',
    applies: (file) => !/^(?:components|app|lib)\/games\//.test(file),
    pattern: /\binfinite\b/g,
  },
]

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
    for (const { why, pattern } of STRICT) {
      for (const match of text.matchAll(pattern)) {
        problems.push(`${where}:${lineOf(text, match.index)}  ${match[0]}  (${why})`)
      }
    }
    for (const rule of HABITS) {
      if (!rule.applies(where)) continue
      for (const match of text.matchAll(rule.pattern)) {
        if (rule.keep && !rule.keep(match)) continue
        problems.push(`${where}:${lineOf(text, match.index)}  ${match[0]}  (${rule.why})`)
      }
    }
    if (!/\.(?:tsx|jsx)$/.test(file)) continue
    for (const { index, tag } of openingTags(text)) {
      if (GO_WITH_STATE.test(tag)) {
        problems.push(`${where}:${lineOf(text, index)}  ${tag.split('\n')[0].trim()}  (a Go is an action, never a pressed, checked or chosen control)`)
      } else if (STATEFUL_TAG.test(tag) && RED_IN_TAG.test(tag)) {
        problems.push(`${where}:${lineOf(text, index)}  ${tag.split('\n')[0].trim()}  (a pressed, checked or selected control styled red)`)
      } else if (RED_ON_STATE.test(tag)) {
        problems.push(`${where}:${lineOf(text, index)}  ${tag.match(RED_ON_STATE)[0]}  (turns red when chosen)`)
      }
    }
  }
}

if (problems.length) {
  console.error(`check-design found ${problems.length} problem(s). Use the Seedpress tokens and components (components/seedpress):\n`)
  for (const problem of problems) console.error(`  ${problem}`)
  process.exit(1)
}
console.log('check-design: flesh and red are only used for actions, and no old habits remain.')
