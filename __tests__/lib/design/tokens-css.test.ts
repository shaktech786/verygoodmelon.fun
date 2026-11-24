import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('app/styles/tokens.css', () => {
  it('is exactly what scripts/build-tokens.mjs writes from lib/design/tokens.ts', () => {
    const generated = execFileSync(process.execPath, ['--no-warnings', join(process.cwd(), 'scripts', 'build-tokens.mjs'), '--stdout'], {
      encoding: 'utf8',
    })
    const committed = readFileSync(join(process.cwd(), 'app', 'styles', 'tokens.css'), 'utf8').replaceAll('\r\n', '\n')
    expect(committed).toBe(generated)
  })
})
