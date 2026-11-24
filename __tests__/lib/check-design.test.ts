import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const SCRIPT = join(process.cwd(), 'scripts', 'check-design.mjs')
let dir: string | null = null

function check(source: string, name = 'Thing.tsx'): { ok: boolean; output: string } {
  dir = mkdtempSync(join(tmpdir(), 'check-design-'))
  writeFileSync(join(dir, name), source)
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

describe('check-design', () => {
  it.each([
    ['a red focus ring', '<a className="focus-visible:ring-accent">x</a>'],
    ['a red pressed variant', '<button className="aria-pressed:bg-accent/20">x</button>'],
    ['a red tick', '<input type="checkbox" className="accent-[var(--accent)]" />'],
    ['a pressed button drawn as the primary one', '<Button aria-pressed={on} variant={on ? \'primary\' : \'secondary\'}>x</Button>'],
    ['a selected chip that turns red', '<span className={isSelected ? \'bg-accent text-white\' : \'bg-card-bg\'}>x</span>'],
    ['a chosen chip in flesh', '<button className="aria-pressed:bg-flesh">x</button>'],
    ['flesh words', '<p className="text-flesh">Go on</p>'],
    ['a Go used as a toggle', '<Go aria-pressed={on}>Sound</Go>'],
    ['a raw hex colour in a new file', '<div style={{ color: "#e63946" }} />'],
    ['an rgba colour in a new file', 'export const glow = "rgba(0, 0, 0, 0.1)"'],
    ["Tailwind's palette", '<p className="text-gray-500">x</p>'],
    ['an arbitrary colour that is not a token', '<p className="bg-[var(--melon-purple)]">x</p>'],
    ['capitals', '<p className="uppercase tracking-wider">x</p>'],
    ['a blurred shadow', '<div className="shadow-lg backdrop-blur-sm" />'],
    ['a stray animation', '<div className="animate-bounce" />'],
    ['a loop in the chrome', '.chrome { animation: drift 2s infinite; }'],
  ])('fails on %s', (_name, source) => {
    expect(check(source, source.startsWith('.') ? 'thing.css' : 'Thing.tsx').ok).toBe(false)
  })

  it.each([
    ['a primary action', '<Button variant="primary" onClick={go}>Begin</Button>'],
    ['the go-action', '<Go onClick={go}>Open today’s packet</Go>'],
    ['a chosen chip in rind green', '<button aria-pressed={on} className={on ? \'border-chosen-line bg-chosen\' : \'border-card-border\'}>x</button>'],
    ['a green focus ring', '<a className="focus-visible:ring-focus-ring hover:border-accent/50">x</a>'],
    ['a token in an arbitrary utility', '<p className="bg-[var(--sheet)] text-(--ink)">x</p>'],
    ['no shadow at all', '<div className="shadow-none animate-none" />'],
  ])('passes %s', (_name, source) => {
    expect(check(source).ok).toBe(true)
  })

  it('passes on the site as it stands, its recorded debt included', () => {
    expect(() => execFileSync(process.execPath, [SCRIPT], { encoding: 'utf8', stdio: 'pipe' })).not.toThrow()
  })
})
