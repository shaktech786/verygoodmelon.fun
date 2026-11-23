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
const SCANNED_DIRS = ['components/games', 'components/ui', 'app/games', 'lib/games', 'lib/keepsake']

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
    if (statSync(path.join(ROOT, child)).isDirectory()) return sourceFiles(child)
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

  it('finds the games to scan', () => {
    expect(files.length).toBeGreaterThan(50)
  })

  it('every line a player can read is free of counting', () => {
    const offenders: string[] = []
    for (const file of files) {
      const unix = file.replace(/\\/g, '/')
      for (const text of playerText(file, readFileSync(path.join(ROOT, file), 'utf8'))) {
        if (!readsAsCounter(text)) continue
        if (ALLOWED.some((allowed) => allowed.file.test(unix) && allowed.text.test(text))) continue
        offenders.push(`${unix}: ${text}`)
      }
    }
    expect(offenders).toEqual([])
  })
})
