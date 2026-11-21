import { describe, expect, it } from 'vitest'
import {
  ARCHIVE_KIND,
  ARCHIVE_VERSION,
  MAX_ARCHIVE_CHARS,
  mergeCapsules,
  readArchive,
  writeArchive,
} from '@/lib/games/worry-capsule/archive'
import { type Capsule, openCapsule, sealCapsule } from '@/lib/games/worry-capsule/capsules'

const NOW = new Date('2026-11-21T10:00:00Z')
const one = sealCapsule({ id: 'one', worry: 'Will they like me?', horizon: 'week', now: NOW, timeZone: 'UTC' })
const two = openCapsule(
  sealCapsule({ id: 'two', worry: 'The car is making a noise', horizon: 'month', now: NOW, timeZone: 'UTC' }),
  'partly',
  'It was just the fan belt',
  new Date('2026-12-22T09:00:00Z'),
)

function envelope(capsules: unknown, extra: Record<string, unknown> = {}): string {
  return JSON.stringify({ kind: ARCHIVE_KIND, version: ARCHIVE_VERSION, capsules, ...extra })
}

describe('writeArchive and readArchive', () => {
  it('round-trips capsules exactly', () => {
    const text = writeArchive([one, two], NOW)
    expect(JSON.parse(text)).toMatchObject({ kind: ARCHIVE_KIND, version: ARCHIVE_VERSION, savedAt: NOW.toISOString() })
    expect(readArchive(text)).toEqual({ ok: true, capsules: [one, two] })
  })

  it('reads an empty archive', () => {
    expect(readArchive(envelope([]))).toEqual({ ok: true, capsules: [] })
  })

  it('calls text that is not JSON unreadable', () => {
    expect(readArchive('')).toEqual({ ok: false, reason: 'unreadable' })
    expect(readArchive('{"kind":')).toEqual({ ok: false, reason: 'unreadable' })
  })

  it('calls JSON from anywhere else foreign', () => {
    expect(readArchive('[]')).toEqual({ ok: false, reason: 'foreign' })
    expect(readArchive('null')).toEqual({ ok: false, reason: 'foreign' })
    expect(readArchive(JSON.stringify({ capsules: [one] }))).toEqual({ ok: false, reason: 'foreign' })
    expect(readArchive(JSON.stringify({ kind: 'someone-elses-app', version: 1, capsules: [] }))).toEqual({ ok: false, reason: 'foreign' })
  })

  it('recognises a copy from a newer version without reading it', () => {
    expect(readArchive(envelope([one], { version: ARCHIVE_VERSION + 1 }))).toEqual({ ok: false, reason: 'newer' })
  })

  it('rejects a copy with an impossible version', () => {
    expect(readArchive(envelope([one], { version: 0 }))).toEqual({ ok: false, reason: 'damaged' })
    expect(readArchive(envelope([one], { version: '1' }))).toEqual({ ok: false, reason: 'damaged' })
  })

  it('rejects the whole copy if any capsule is damaged, so nothing half-loads', () => {
    const cases: unknown[] = [
      'not-an-array',
      [one, { ...two, worry: '' }],
      [{ ...one, worry: 42 }],
      [{ ...one, horizon: 'year' }],
      [{ ...one, opensOn: '2026-02-30' }],
      [{ ...one, sealedAt: 'yesterday' }],
      [{ ...one, id: '' }],
      [{ ...one, opening: { at: NOW.toISOString(), outcome: 'maybe', note: '' } }],
      [{ ...one, opening: { at: NOW.toISOString(), outcome: 'no', note: 'n'.repeat(10_000) } }],
      [{ ...one, worry: 'w'.repeat(10_000) }],
      [{ ...one, opening: undefined }],
    ]
    for (const capsules of cases) {
      expect(readArchive(envelope(capsules))).toEqual({ ok: false, reason: 'damaged' })
    }
  })

  it('refuses something too large to be a copy from here', () => {
    expect(readArchive(' '.repeat(MAX_ARCHIVE_CHARS + 1))).toEqual({ ok: false, reason: 'too-large' })
  })

  it('keeps only the known fields of each capsule', () => {
    const result = readArchive(envelope([{ ...one, extra: '<script>' }]))
    expect(result).toEqual({ ok: true, capsules: [one] })
  })
})

describe('mergeCapsules', () => {
  it('adds capsules that are not here yet and leaves the rest alone', () => {
    const merged = mergeCapsules([one], [one, two])
    expect(merged).toEqual({ capsules: [one, two], added: 1, updated: 0 })
  })

  it('takes the opened copy of a capsule over the still-sealed one', () => {
    const sealedTwo: Capsule = { ...two, opening: null }
    expect(mergeCapsules([sealedTwo], [two])).toEqual({ capsules: [two], added: 0, updated: 1 })
    expect(mergeCapsules([two], [sealedTwo])).toEqual({ capsules: [two], added: 0, updated: 0 })
  })

  it('ignores duplicates inside the incoming copy', () => {
    expect(mergeCapsules([], [one, one])).toEqual({ capsules: [one], added: 1, updated: 0 })
  })
})
