import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { GLYPHS, type IconName } from '@/components/seedpress/icons/glyphs'

const NAMES = Object.keys(GLYPHS) as IconName[]

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) return sources(full)
    return /\.tsx?$/.test(name) && !full.endsWith(path.join('icons', 'glyphs.ts')) ? [readFileSync(full, 'utf8')] : []
  })
}

describe('seed stamps', () => {
  it.each(NAMES)('%s is 12 rows of 12 cells, only . and X', (name) => {
    const rows = GLYPHS[name]
    expect(rows).toHaveLength(12)
    for (const row of rows) expect(row).toMatch(/^[.X]{12}$/)
  })

  it.each(NAMES)('%s is not blank', (name) => {
    expect(GLYPHS[name].join('')).toContain('X')
  })

  it('every stamp is used by name somewhere in the site', () => {
    const code = [...sources(path.join(process.cwd(), 'components')), ...sources(path.join(process.cwd(), 'app'))].join('\n')
    const unused = NAMES.filter((name) => !code.includes(`'${name}'`) && !code.includes(`"${name}"`))
    expect(unused).toEqual([])
  })
})
