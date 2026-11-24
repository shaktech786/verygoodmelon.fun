import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { readsAsCounter } from '../e2e/helpers/counters'

/**
 * Scans every piece of player-facing text in the games' source, endings included, since
 * most of it only appears deep into play. Interpolated values become "9", so a template
 * like `${done} of ${total}` is caught the same way the rendered words would be.
 */

const ROOT = process.cwd()
// Every page a visitor can reach, not only the games; the API routes send data, not text to read
const SCANNED_DIRS = ['components/games', 'components/ui', 'app', 'lib/games', 'lib/keepsake']
const SKIPPED_DIRS = ['app/api']

// "+{hidden}" in JSX, or "+${n}" in a template, standing alone is an overflow tally: some marks shown, "+3" more.
// A modifier such as "+2 Weight" or "Attacks +1" is a combat rule, not a tally, so only the bare badge is matched.
const PLUS_TALLY = /^\(?\+9\)?(?:\s+(?:more|others?))?$/i

/** Text that matches a pattern but is content, not a counter. Each entry says why. */
const ALLOWED: { file: RegExp; text: RegExp; why: string }[] = [
  { file: /BreathingPatterns\.tsx$/, text: /a few minutes after the breathing stops/, why: 'advice about how calm arrives, not a timer' },
  { file: /hard-talk\/content\.ts$/, text: /Could we have ten minutes\?/, why: 'a line of dialogue to rehearse' },
  { file: /hope-daily\/words\.ts$/, text: /./, why: 'sourced hopeful facts that quote real durations' },
  { file: /thought-pockets\/data\/enemies\.ts$/, text: /lost three times/, why: 'a character speaking' },
  { file: /thought-pockets\/components\/BattleScreen\.tsx$/, text: /lose 9 of 9/, why: 'a combat preview of Focus lost, not progress' },
  { file: /thought-pockets\/components\/MenuScreens\.tsx$/, text: /Resolve 9\/9/, why: 'a health stat in a saved walk, not progress' },
  { file: /thought-pockets\/data\/(cards|conclusion)\.ts$/, text: /\btimes\b/, why: 'card rules: how many times a Conclusion counts' },
  { file: /thought-pockets\/engine\/battle\.ts$/, text: /^stops at 3\/4$/, why: 'a short combat note: three quarters of Resolve' },
  {
    file: /thought-pockets\/(data\/(cards|enemies|relics|schools)\.ts|engine\/battle\.ts|components\/(BattleScreen|RoundShow|ThoughtPockets)\.tsx)$/,
    text: /\d+ (?:more|damage|turns?)\b|\bturn \d/i,
    why: 'combat rules in play: damage dealt, extra Weight, Focus or Unsettle, and the turn a bias tires',
  },
  {
    file: /thought-pockets\/(data\/walkArgument\.ts|components\/WalkArgument\.tsx)$/,
    text: /^9 damage$/,
    why: "the argument card's equation, Weight × Multiplier = damage, kept as the combat rule it is; the end summary retells the walk in words",
  },
  { file: /community-words\/WritingParts\.tsx$/, text: /^9\/9 characters$/, why: 'a length limit beside a text box, owned by The Awakening and The Final Word' },
  { file: /keepsake\/render\.ts$/, text: /Times New Roman/, why: 'a font name' },
  { file: /thought-pockets\/data\/cards\.ts$/, text: /^\+9$/, why: "a card's Multiplier bonus written as +N, a combat rule, not a tally" },
  { file: /^app\/about\/page\.tsx$/, text: /nothing against the clock\. Play one for a few minutes/, why: 'says there are no clocks; "a few minutes" is how long a game takes, not a timer' },
  { file: /^app\/privacy\/page\.tsx$/, text: /how many seconds it was open/, why: 'the privacy notice disclosing what is recorded' },
  { file: /^app\/privacy\/SiteNumbers\.tsx$/, text: /^Times opened$/, why: 'the anonymous site totals the privacy page publishes for transparency, not a player’s progress' },
  { file: /^app\/thoughts\/SubmitThought\.tsx$/, text: /^9 \/ 2,000 characters/, why: 'a length limit beside a text box, like the one in The Awakening' },
]

/** Class lists and inline styles are code; everything else may reach a player. */
function isStyling(node: ts.Node): boolean {
  if (ts.isJsxAttribute(node)) return ['className', 'style'].includes(node.name.getText())
  return ts.isCallExpression(node) && ['cn', 'clsx'].includes(node.expression.getText())
}

function sourceFiles(dir: string): string[] {
  const full = path.join(ROOT, dir)
  return readdirSync(full).flatMap((name) => {
    const child = path.join(dir, name)
    if (statSync(path.join(ROOT, child)).isDirectory()) {
      return SKIPPED_DIRS.includes(child.replace(/\\/g, '/')) ? [] : sourceFiles(child)
    }
    return /\.tsx?$/.test(name) ? [child] : []
  })
}

function templateText(node: ts.TemplateExpression): string {
  return node.head.text + node.templateSpans.map((span) => `9${span.literal.text}`).join('')
}

function jsxChildrenText(children: ts.NodeArray<ts.JsxChild>): string {
  return children
    .map((child) => {
      if (ts.isJsxText(child)) return child.text
      if (ts.isJsxExpression(child)) {
        const inner = child.expression
        if (!inner) return ''
        if (ts.isStringLiteral(inner) || ts.isNoSubstitutionTemplateLiteral(inner)) return inner.text
        if (ts.isTemplateExpression(inner)) return templateText(inner)
        return '9'
      }
      return ' '
    })
    .join('')
    .replace(/\s+/g, ' ')
}

/** Every string literal, template and run of JSX text in a file, as a player would read it. */
function playerText(file: string, source: string): string[] {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const found: string[] = []
  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node) || isStyling(node)) return
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) found.push(node.text)
    else if (ts.isTemplateExpression(node)) found.push(templateText(node))
    else if (ts.isJsxElement(node)) found.push(jsxChildrenText(node.children))
    ts.forEachChild(node, visit)
  }
  visit(sf)
  // A lone Tailwind token such as ring-blue-400/60 in a lookup table is styling too
  return found.map((t) => t.trim()).filter((t) => t && !/^[a-z-]+-\d+\/\d+$/.test(t))
}

describe('no counters, scores, countdowns or clocks in game text', () => {
  const files = SCANNED_DIRS.flatMap(sourceFiles)

  it('finds the games and the pages around them to scan', () => {
    expect(files.length).toBeGreaterThan(50)
    const unix = files.map((file) => file.replace(/\\/g, '/'))
    for (const page of ['app/page.tsx', 'app/about/page.tsx', 'app/offline/page.tsx', 'app/support/page.tsx']) {
      expect(unix).toContain(page)
    }
    expect(unix.some((file) => file.startsWith('app/thoughts/'))).toBe(true)
    expect(unix.some((file) => file.startsWith('app/api/'))).toBe(false)
  })

  it('reads an overflow badge such as +{hidden} as a tally', () => {
    const [text] = playerText('Badge.tsx', 'const Badge = ({ hidden }: { hidden: number }) => <span>+{hidden}</span>')
    expect(PLUS_TALLY.test(text)).toBe(true)
    expect(PLUS_TALLY.test(playerText('Badge.ts', 'const badge = (n: number) => `+${n}`')[0])).toBe(true)
  })

  it('every line a player can read is free of counting', () => {
    const offenders: string[] = []
    for (const file of files) {
      const unix = file.replace(/\\/g, '/')
      for (const text of playerText(file, readFileSync(path.join(ROOT, file), 'utf8'))) {
        if (!readsAsCounter(text) && !PLUS_TALLY.test(text)) continue
        if (ALLOWED.some((allowed) => allowed.file.test(unix) && allowed.text.test(text))) continue
        offenders.push(`${unix}: ${text}`)
      }
    }
    expect(offenders).toEqual([])
    // Parsing every page and game is slow when the whole suite shares the machine
  }, 30_000)
})
