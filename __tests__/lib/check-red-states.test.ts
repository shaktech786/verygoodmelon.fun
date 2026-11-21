import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const SCRIPT = join(process.cwd(), 'scripts', 'check-red-states.mjs')
let dir: string | null = null

function check(source: string): { ok: boolean; output: string } {
  dir = mkdtempSync(join(tmpdir(), 'red-states-'))
  writeFileSync(join(dir, 'Thing.tsx'), source)
  try {
    return { ok: true, output: execFileSync(process.execPath, [SCRIPT, dir], { encoding: 'utf8', stdio: 'pipe' }) }
  } catch (error) {
    return { ok: false, output: String((error as { stderr?: string }).stderr) }
  }
}

afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true })
  dir = null
})

describe('check-red-states', () => {
  it.each([
    ['a red focus ring', '<a className="focus-visible:ring-accent">x</a>'],
    ['a red pressed variant', '<button className="aria-pressed:bg-accent/20">x</button>'],
    ['a red tick', '<input type="checkbox" className="accent-[var(--accent)]" />'],
    ['a pressed button drawn as the primary one', '<Button aria-pressed={on} variant={on ? \'primary\' : \'secondary\'}>x</Button>'],
    ['a selected chip that turns red', '<span className={isSelected ? \'bg-accent text-white\' : \'bg-card-bg\'}>x</span>'],
  ])('fails on %s', (_name, source) => {
    expect(check(source).ok).toBe(false)
  })

  it.each([
    ['a primary action', '<Button variant="primary" onClick={go}>Begin</Button>'],
    ['a chosen chip in rind green', '<button aria-pressed={on} className={on ? \'border-chosen-line bg-chosen\' : \'border-card-border\'}>x</button>'],
    ['a green focus ring', '<a className="focus-visible:ring-focus-ring hover:border-accent/50">x</a>'],
  ])('passes %s', (_name, source) => {
    expect(check(source).ok).toBe(true)
  })

  it('passes on the site as it stands', () => {
    expect(() => execFileSync(process.execPath, [SCRIPT], { encoding: 'utf8', stdio: 'pipe' })).not.toThrow()
  })
})
