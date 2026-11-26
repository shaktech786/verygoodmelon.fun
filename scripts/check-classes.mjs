#!/usr/bin/env node
// Lists every utility class written in app/ and components/ that the production build has no rule for.
// After the Tailwind namespace reset (docs/design-system/PLAN.md section 10.1) a stock name such as `rounded-lg`,
// `text-xs` or `bg-accent` generates nothing, and the element silently loses its style. Run `npm run build`
// first. Classes built from a template (`bg-${tone}`) cannot be read statically and are listed for review.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const CSS_DIR = join(process.cwd(), '.next', 'static')
const ROOTS = ['app', 'components']

function* files(dir, test) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) {
      if (name !== 'node_modules' && !name.startsWith('.')) yield* files(path, test)
    } else if (test.test(name)) {
      yield path
    }
  }
}

if (!existsSync(CSS_DIR)) {
  console.error('check-classes: no build found in .next/static; run `npm run build` first.')
  process.exit(2)
}

const built = new Set()
for (const file of files(CSS_DIR, /\.css$/)) {
  const css = readFileSync(file, 'utf8')
  for (const match of css.matchAll(/\.((?:\\.|[\w-])+)/g)) built.add(match[1].replace(/\\(.)/g, '$1'))
}

// A word is judged only if it reads like a Tailwind utility, so prose and identifiers are skipped.
const PREFIXES = [
  'bg', 'text', 'border', 'ring', 'outline', 'fill', 'stroke', 'shadow', 'decoration', 'from', 'to', 'via', 'accent', 'caret', 'divide',
  'placeholder', 'p', 'px', 'py', 'pt', 'pr', 'pb', 'pl', 'ps', 'pe', 'm', 'mx', 'my', 'mt', 'mr', 'mb', 'ml', 'ms', 'me', 'gap', 'space',
  'w', 'h', 'size', 'min-w', 'min-h', 'max-w', 'max-h', 'rounded', 'font', 'leading', 'tracking', 'opacity', 'z', 'top', 'right', 'bottom',
  'left', 'inset', 'grid', 'col', 'row', 'flex', 'basis', 'grow', 'shrink', 'order', 'justify', 'items', 'content', 'self', 'place',
  'overflow', 'object', 'aspect', 'columns', 'transition', 'duration', 'delay', 'ease', 'animate', 'scale', 'rotate', 'translate', 'skew',
  'origin', 'blur', 'brightness', 'contrast', 'grayscale', 'saturate', 'backdrop', 'drop-shadow', 'cursor', 'select', 'pointer-events',
  'list', 'whitespace', 'break', 'line-clamp', 'underline-offset', 'indent', 'align', 'mix-blend', 'bg-blend', 'will-change', 'snap',
  'scroll', 'touch', 'resize', 'appearance', 'backface', 'perspective', 'transform', 'filter', 'table', 'float', 'clear',
]
const WORDS = new Set([
  'flex', 'grid', 'block', 'inline', 'inline-block', 'inline-flex', 'inline-grid', 'hidden', 'contents', 'relative', 'absolute', 'fixed',
  'sticky', 'static', 'italic', 'uppercase', 'lowercase', 'capitalize', 'underline', 'overline', 'line-through', 'no-underline', 'truncate',
  'antialiased', 'sr-only', 'not-sr-only', 'rounded', 'border', 'shadow', 'ring', 'outline', 'blur', 'transition', 'container', 'visible',
  'invisible', 'resize', 'grow', 'shrink', 'isolate', 'tabular-nums', 'transform', 'filter',
])
// Words that read like utilities and are not classes: a DOM event, a CSS value in a style string, prose, an element id.
const NOT_CLASSES = new Set(['!container', 'blur', 'content-page', 'ease-in-out', 'fill-box', 'left-aligned', 'right-hand', 'self-harm', 'self-hosted', 'shadow'])
const prefixed = new RegExp(`^-?(?:${PREFIXES.join('|')})-`)

function baseOf(token) {
  let depth = 0
  let current = ''
  for (const c of token) {
    if (c === '[' || c === '(') depth++
    if (c === ']' || c === ')') depth--
    if (c === ':' && depth === 0) current = ''
    else current += c
  }
  return current.replace(/^!/, '').replace(/!$/, '')
}

function looksLikeUtility(token) {
  const base = baseOf(token)
  return WORDS.has(base) || prefixed.test(base)
}

const missing = new Map()
const dynamic = []
for (const root of ROOTS) {
  for (const file of files(root, /\.(?:tsx?|jsx?)$/)) {
    const where = relative(process.cwd(), file).replaceAll('\\', '/')
    const text = readFileSync(file, 'utf8')
    // Quote pairing across a whole file is fragile (an apostrophe in a comment flips it), so every word is read.
    // Prose that happens to look like a utility is rare and shows up in review.
    text.split('\n').forEach((lineText, i) => {
      for (const raw of lineText.split(/[\s"'`{};]+/)) {
        let token = raw.replace(/^[(,]+|[,.]+$/g, '')
        while (token.endsWith(')') && token.split('(').length < token.split(')').length) token = token.slice(0, -1)
        if (!token || !/^[\w!:/[\]()%#,=&>*@+.$-]+$/.test(token)) continue
        if (token.includes('$')) {
          if (looksLikeUtility(token.replace(/\$\{[^}]*\}?/g, 'x'))) dynamic.push(`${where}:${i + 1}  ${token}`)
          continue
        }
        if (!looksLikeUtility(token) || built.has(token) || NOT_CLASSES.has(token)) continue
        if (!missing.has(token)) missing.set(token, [])
        missing.get(token).push(`${where}:${i + 1}`)
      }
    })
  }
}

if (dynamic.length) {
  console.log(`Built from a template (review by hand): ${dynamic.length}`)
  for (const d of dynamic) console.log(`  ${d}`)
}
if (missing.size) {
  console.error(`check-classes: ${missing.size} class(es) that look like utilities have no rule in the build:\n`)
  for (const [token, places] of [...missing].sort()) {
    console.error(`  ${token}  (${places.slice(0, 4).join(', ')}${places.length > 4 ? `, +${places.length - 4}` : ''})`)
  }
  process.exit(1)
}
console.log('check-classes: every utility class used in app/ and components/ has a rule in the build.')
