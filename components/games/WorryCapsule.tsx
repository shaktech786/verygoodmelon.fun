'use client'

import { type ReactNode, useId, useRef, useState, useSyncExternalStore } from 'react'
import { Button } from '@/components/ui/Button'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { cn } from '@/lib/utils/cn'
import { type ArchiveProblem, MAX_ARCHIVE_CHARS, type Merge, mergeCapsules, readArchive, writeArchive } from '@/lib/games/worry-capsule/archive'
import {
  type Capsule,
  type Horizon,
  HORIZONS,
  MAX_NOTE_LENGTH,
  MAX_WORRY_LENGTH,
  OUTCOMES,
  type Outcome,
  capsuleStatus,
  normalizeWorry,
  openCapsule,
  opensOnFor,
  sealCapsule,
  shelve,
  tally,
} from '@/lib/games/worry-capsule/capsules'
import { OUTCOME_RESPONSES, RESTING_LINES, SEALED_LINES, pickLine } from '@/lib/games/worry-capsule/copy'
import { type DateKey, localDateKey } from '@/lib/games/worry-capsule/dates'
import { DevTimeTravel } from './worry-capsule/DevTimeTravel'
import { Jar } from './worry-capsule/Jar'
import styles from './worry-capsule/Keeper.module.css'
import {
  type KeeperSnapshot,
  commit,
  getServerSnapshot,
  getSnapshot,
  newCapsuleId,
  now,
  requestPersistence,
  subscribe,
} from './worry-capsule/keeperStore'
import { HelpLine, OUTCOME_WORDS, OutcomeMark, Slip, TallyCard, ViewHeading, formatDay, saveTextFile, sealedDay } from './worry-capsule/parts'

interface Draft {
  text: string
  horizon: Horizon
}

type View =
  | { kind: 'shelf' }
  | { kind: 'compose'; draft: Draft }
  | { kind: 'review'; draft: Draft }
  | { kind: 'sealed'; id: string }
  | { kind: 'rescue'; draft: Draft; reason: 'full' | 'unavailable' }
  | { kind: 'capsule'; id: string }

const EMPTY_DRAFT: Draft = { text: '', horizon: 'week' }

const IMPORT_PROBLEMS: Record<ArchiveProblem, string> = {
  unreadable: 'That file isn’t a copy saved from here, so nothing was changed.',
  foreign: 'That file isn’t a copy saved from here, so nothing was changed.',
  newer: 'That copy came from a newer version of this page, so nothing was changed. Reloading the page may help.',
  damaged: 'Part of that copy couldn’t be read, so nothing was changed.',
  'too-large': 'That file is much larger than a copy from here, so it wasn’t opened. Nothing was changed.',
}

function restoredMessage({ added, updated }: Merge): string {
  const parts: string[] = []
  if (added) parts.push(`${added} ${added === 1 ? 'capsule' : 'capsules'}`)
  if (updated) parts.push(`${updated} ${updated === 1 ? 'answer' : 'answers'}`)
  return `Restored ${parts.join(' and ')}.`
}

function copyFileName(today: DateKey): string {
  return `the-keeper-${today}.json`
}

const panel = 'bg-card-bg border border-card-border rounded-lg px-5 py-8 sm:px-10 sm:py-10'
const muted = 'text-sm sm:text-base text-foreground/75'

export default function WorryCapsule() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const motion = !useReducedMotion()
  const [view, setView] = useState<View | null>(null)
  const [navigated, setNavigated] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const [importMessage, setImportMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!snapshot.loaded) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className={cn(panel, 'min-h-[460px]')} aria-busy="true">
          <p className="sr-only">Opening the shelf</p>
        </div>
      </div>
    )
  }

  const nowDate = new Date(snapshot.nowMs)
  const today = localDateKey(nowDate)
  const { capsules } = snapshot
  const current: View = view ?? (capsules.length > 0 ? { kind: 'shelf' } : { kind: 'compose', draft: EMPTY_DRAFT })

  const go = (next: View | null) => {
    setNavigated(true)
    setImportMessage('')
    setAnnouncement('')
    setView(next)
  }

  const exportAll = (list: Capsule[] = capsules) => saveTextFile(copyFileName(today), writeArchive(list, now()))

  const seal = (draft: Draft) => {
    const worry = normalizeWorry(draft.text)
    if (!worry) return
    const capsule = sealCapsule({ id: newCapsuleId(), worry, horizon: draft.horizon, now: now() })
    const result = commit([...capsules, capsule])
    if (!result.ok) {
      go({ kind: 'rescue', draft, reason: result.reason })
      return
    }
    requestPersistence()
    go({ kind: 'sealed', id: capsule.id })
  }

  const letGo = (id: string): boolean => {
    const result = commit(capsules.filter((c) => c.id !== id))
    if (!result.ok) return false
    go(null)
    setAnnouncement('Let go. It is no longer on the shelf.')
    return true
  }

  const answer = (capsule: Capsule, outcome: Outcome, note: string): boolean => {
    const next = capsules.map((c) => (c.id === capsule.id ? openCapsule(c, outcome, note, now()) : c))
    if (!commit(next).ok) return false
    go({ kind: 'shelf' })
    setAnnouncement('Closed and kept. It is part of your tally now.')
    return true
  }

  const restore = async (file: File) => {
    if (file.size > MAX_ARCHIVE_CHARS * 4) {
      setImportMessage(IMPORT_PROBLEMS['too-large'])
      return
    }
    const result = readArchive(await file.text())
    let message: string
    if (!result.ok) {
      message = IMPORT_PROBLEMS[result.reason]
    } else if (result.capsules.length === 0) {
      message = 'That copy was empty, so nothing was changed.'
    } else {
      const latest = getSnapshot()
      const merged = mergeCapsules(latest.loaded ? latest.capsules : [], result.capsules)
      if (merged.added + merged.updated === 0) message = 'Everything in that copy is already here.'
      else message = commit(merged.capsules).ok ? restoredMessage(merged) : 'This browser couldn’t keep them just now, so nothing was changed.'
    }
    setImportMessage(message)
  }

  const restoreControls = (
    <input
      ref={fileInputRef}
      type="file"
      accept=".json,application/json"
      hidden
      data-testid="keeper-restore-input"
      onChange={(event) => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (file) void restore(file)
      }}
    />
  )
  const chooseFile = () => fileInputRef.current?.click()
  const importStatus = (
    <p role="status" className={cn('text-sm text-foreground', importMessage && 'mt-3')}>
      {importMessage}
    </p>
  )

  let body: ReactNode
  let bodyKey: string = current.kind

  if (current.kind === 'compose') {
    body = (
      <Composer
        draft={current.draft}
        today={today}
        snapshot={snapshot}
        motion={motion}
        focus={navigated}
        onChange={(draft) => setView({ kind: 'compose', draft })}
        onNext={(draft) => go({ kind: 'review', draft })}
        onCancel={capsules.length > 0 ? () => go({ kind: 'shelf' }) : undefined}
        restore={
          capsules.length === 0 && (
            <div className="mt-6 border-t border-card-border pt-5">
              <p className="text-sm text-foreground/75">
                Sealed some before, on another device or before this browser was cleared? They can come back from a saved copy.
              </p>
              <Button variant="ghost" size="sm" className="mt-2" onClick={chooseFile}>
                Restore from a copy
              </Button>
              {importStatus}
            </div>
          )
        }
      />
    )
  } else if (current.kind === 'review') {
    const { draft } = current
    body = (
      <div className="space-y-5">
        <ViewHeading focus={navigated}>Ready to seal it?</ViewHeading>
        <Slip label="Your worry" className="max-w-md mx-auto">{draft.text.trim()}</Slip>
        <Jar scene="waiting" motion={motion} className="w-28 h-24 mx-auto" />
        <p className={muted}>
          It comes back to you on <strong className="font-semibold text-foreground">{formatDay(opensOnFor(today, draft.horizon), today)}</strong>.
        </p>
        <p className="text-sm text-foreground/75">It lives only in this browser, on this device.</p>
        <div className="flex flex-col-reverse sm:flex-row gap-3 justify-center pt-1">
          <Button variant="secondary" onClick={() => go({ kind: 'compose', draft })}>Change it</Button>
          <Button onClick={() => seal(draft)}>Seal it</Button>
        </div>
      </div>
    )
  } else if (current.kind === 'sealed') {
    const capsule = capsules.find((c) => c.id === current.id)
    bodyKey = `sealed-${current.id}`
    body = capsule ? (
      <div>
        <Jar scene="sealing" motion={motion} className="w-44 h-40 mx-auto mb-4" />
        <div className={cn('space-y-4', styles.afterSeal)}>
          <ViewHeading focus={navigated}>Sealed.</ViewHeading>
          <p className="text-base sm:text-lg text-foreground">{pickLine(SEALED_LINES, capsule.id)}</p>
          <p className={muted}>
            It comes back on <strong className="font-semibold text-foreground">{formatDay(capsule.opensOn, today)}</strong>. Any time after that, it will be ready here.
          </p>
          <p className="text-sm text-foreground/75">Only this browser keeps it. A saved copy can move it or keep it safe.</p>
          <div className="flex flex-col-reverse sm:flex-row gap-3 justify-center pt-1">
            <Button variant="secondary" onClick={() => exportAll()}>Save a copy</Button>
            <Button onClick={() => go({ kind: 'shelf' })}>Done</Button>
          </div>
        </div>
      </div>
    ) : null
  } else if (current.kind === 'rescue') {
    body = <Rescue draft={current.draft} reason={current.reason} today={today} focus={navigated} onRetry={() => seal(current.draft)} onBack={() => go({ kind: 'compose', draft: current.draft })} />
  } else if (current.kind === 'capsule') {
    const capsule = capsules.find((c) => c.id === current.id)
    bodyKey = `capsule-${current.id}`
    if (capsule) {
      const status = capsuleStatus(capsule, nowDate)
      const back = () => go({ kind: 'shelf' })
      if (status === 'resting') body = <Resting capsule={capsule} today={today} motion={motion} focus={navigated} onBack={back} onLetGo={() => letGo(capsule.id)} />
      else if (status === 'ready') body = <Opening capsule={capsule} today={today} motion={motion} focus={navigated} onBack={back} onAnswer={(o, n) => answer(capsule, o, n)} />
      else body = <Reread capsule={capsule} today={today} motion={motion} focus={navigated} onBack={back} onLetGo={() => letGo(capsule.id)} />
    }
  }

  if (current.kind === 'shelf' || body === undefined || body === null) {
    bodyKey = 'shelf'
    const shelf = shelve(capsules, nowDate)
    const counts = tally(capsules)
    const waiting = [...shelf.ready, ...shelf.resting]
    body = (
      <div className="space-y-6">
        <div className="space-y-2">
          <ViewHeading focus={navigated}>Kept for you</ViewHeading>
          <p className={muted}>
            {shelf.ready.length > 0
              ? `${shelf.ready.length === 1 ? 'One capsule is' : `${shelf.ready.length} capsules are`} ready to open, whenever you like.`
              : waiting.length > 0
                ? 'Nothing to open today. Everything here is resting.'
                : 'Everything here has been opened.'}
          </p>
        </div>

        {waiting.length > 0 && (
          <ul className="grid grid-cols-3 min-[440px]:grid-cols-4 sm:grid-cols-5" aria-label="Sealed capsules">
            {waiting.map((capsule) => {
              const ready = capsuleStatus(capsule, nowDate) === 'ready'
              const sealedOn = sealedDay(capsule, today)
              return (
                <li key={capsule.id} className="border-b-4 border-melon-green/40 px-1 pt-2">
                  <button
                    type="button"
                    onClick={() => go({ kind: 'capsule', id: capsule.id })}
                    aria-label={ready ? `Sealed ${sealedOn}. Ready to open.` : `Sealed ${sealedOn}. Resting until ${formatDay(capsule.opensOn, today)}.`}
                    className="group w-full rounded-md pb-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent hover:bg-hover-bg transition-colors duration-75"
                  >
                    <Jar scene={ready ? 'ready' : 'sealed'} motion={false} plank={false} className="w-20 h-[4.5rem] sm:w-24 sm:h-[5.4rem] mx-auto" />
                    <span className={cn('block text-xs sm:text-sm', ready ? 'font-semibold text-foreground' : 'text-foreground/75')}>
                      {ready ? 'Ready' : formatDay(capsule.opensOn, today, 'short')}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <Button onClick={() => go({ kind: 'compose', draft: EMPTY_DRAFT })}>Seal another worry</Button>

        {counts.total > 0 && <TallyCard counts={counts} opened={shelf.opened} />}

        {shelf.opened.length > 0 && (
          <section aria-labelledby="keeper-opened" className="text-left">
            <h3 id="keeper-opened" className="text-base font-semibold text-foreground mb-2">Looked back on</h3>
            <ul className="divide-y divide-card-border border-y border-card-border">
              {shelf.opened.map((capsule) => capsule.opening && (
                <li key={capsule.id}>
                  <button
                    type="button"
                    onClick={() => go({ kind: 'capsule', id: capsule.id })}
                    className="w-full flex items-center gap-3 px-2 py-3 text-left hover:bg-hover-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent transition-colors duration-75"
                  >
                    <OutcomeMark outcome={capsule.opening.outcome} className="w-4 h-4" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-foreground">{capsule.worry}</span>
                      <span className="block text-xs text-foreground/75">
                        Sealed {sealedDay(capsule, today, 'short')} · {OUTCOME_WORDS[capsule.opening.outcome]}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="keeper-copy" className="rounded-lg bg-hover-bg p-5 text-left">
          <h3 id="keeper-copy" className="text-base font-semibold text-foreground">Keep a copy</h3>
          <p className="mt-1 text-sm text-foreground/75">
            Your capsules live only in this browser. A saved copy can restore them here or on another device.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => exportAll()}>Save a copy</Button>
            <Button variant="secondary" size="sm" onClick={chooseFile}>Restore from a copy</Button>
          </div>
          {importStatus}
          <StorageNotes snapshot={snapshot} />
        </section>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className={cn(panel, 'text-center')}>
        <p aria-live="polite" className={announcement ? 'mb-5 rounded-lg bg-success/15 px-4 py-2.5 text-sm text-foreground' : 'sr-only'}>
          {announcement}
        </p>
        <div key={bodyKey}>{body}</div>
      </div>
      {restoreControls}
      {process.env.NODE_ENV === 'development' && (
        <DevTimeTravel offsetDays={snapshot.devOffsetDays} today={formatDay(today, today)} />
      )}
    </div>
  )
}

function StorageNotes({ snapshot }: { snapshot: KeeperSnapshot }) {
  return (
    <>
      {!snapshot.writable && (
        <p className="mt-3 text-sm text-foreground">
          This browser isn’t keeping anything new right now. Saving a copy keeps what’s here safe.
        </p>
      )}
      {snapshot.storage === 'unreadable' && (
        <p className="mt-3 text-sm text-foreground">
          Something saved here earlier couldn’t be read. It has been set aside untouched rather than overwritten.
        </p>
      )}
    </>
  )
}

interface ComposerProps {
  draft: Draft
  today: DateKey
  snapshot: KeeperSnapshot
  motion: boolean
  focus: boolean
  onChange: (draft: Draft) => void
  onNext: (draft: Draft) => void
  onCancel?: () => void
  restore: ReactNode
}

function Composer({ draft, today, snapshot, motion, focus, onChange, onNext, onCancel, restore }: ComposerProps) {
  const id = useId()
  const ready = normalizeWorry(draft.text) !== null
  const left = MAX_WORRY_LENGTH - draft.text.length
  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault()
        if (ready) onNext(draft)
      }}
    >
      <Jar scene="waiting" motion={motion} className="w-28 h-24 sm:w-36 sm:h-32 mx-auto" />
      <div className="space-y-2">
        <ViewHeading focus={focus}>What’s on your mind?</ViewHeading>
        <p className={cn(muted, 'max-w-md mx-auto')}>
          Write down one worry and seal it away. It comes back on the day you choose, so you can see how it turned out.
        </p>
      </div>

      <div className="text-left">
        <label htmlFor={`${id}-worry`} className="block text-sm font-medium text-foreground mb-1.5">Your worry</label>
        <textarea
          id={`${id}-worry`}
          value={draft.text}
          maxLength={MAX_WORRY_LENGTH}
          rows={4}
          placeholder="I’m worried that…"
          onChange={(event) => onChange({ ...draft, text: event.target.value })}
          aria-describedby={left <= 100 ? `${id}-left` : undefined}
          className="w-full rounded-lg border border-card-border bg-background px-3.5 py-3 text-base text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent resize-y"
        />
        {left <= 100 && (
          <p id={`${id}-left`} className="mt-1 text-xs text-foreground/75 text-right">{left} characters left</p>
        )}
      </div>

      <fieldset className="text-left">
        <legend className="text-sm font-medium text-foreground mb-1.5">When should it come back?</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {HORIZONS.map((horizon) => (
            <label
              key={horizon.id}
              className="flex items-start gap-2.5 rounded-lg border border-card-border bg-background px-3 py-2.5 cursor-pointer transition-colors duration-75 hover:bg-hover-bg has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent"
            >
              <input
                type="radio"
                name={`${id}-horizon`}
                value={horizon.id}
                checked={draft.horizon === horizon.id}
                onChange={() => onChange({ ...draft, horizon: horizon.id })}
                className="mt-1 accent-[var(--accent)] focus:outline-none"
              />
              <span>
                <span className="block text-sm font-medium text-foreground">{horizon.label}</span>
                <span className="block text-xs text-foreground/75">{formatDay(opensOnFor(today, horizon.id), today, 'short')}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {(!snapshot.writable || snapshot.storage === 'unreadable') && (
        <div className="text-left rounded-lg bg-hover-bg px-4 py-3">
          {!snapshot.writable && (
            <p className="text-sm text-foreground">
              This browser isn’t keeping things right now, perhaps a private window. You can still write, and you’ll be offered a way to keep your words.
            </p>
          )}
          {snapshot.storage === 'unreadable' && (
            <p className="text-sm text-foreground">
              Something saved here earlier couldn’t be read. It has been set aside untouched rather than overwritten.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-3 justify-center">
        {onCancel && <Button type="button" variant="secondary" onClick={onCancel}>Back to the shelf</Button>}
        <Button type="submit" disabled={!ready}>Fold it up</Button>
      </div>

      <HelpLine />
      {restore}
    </form>
  )
}

interface CapsuleViewProps {
  capsule: Capsule
  today: DateKey
  motion: boolean
  focus: boolean
  onBack: () => void
}

function LetGo({ onLetGo, opened }: { onLetGo: () => boolean; opened: boolean }) {
  const [asking, setAsking] = useState(false)
  const [failed, setFailed] = useState(false)
  if (!asking) {
    return <Button variant="ghost" onClick={() => setAsking(true)}>Let it go</Button>
  }
  return (
    <div role="group" aria-label="Let it go" className="w-full rounded-lg bg-hover-bg px-4 py-3 space-y-3">
      <p className="text-sm text-foreground">
        {opened ? 'Let this one go? It leaves your tally too, for good.' : 'Let it go without opening it? It will be gone for good.'}
      </p>
      {failed && <p role="alert" className="text-sm text-foreground">This browser couldn’t change anything just now. It is still kept.</p>}
      <div className="flex flex-wrap gap-2 justify-center">
        <Button variant="secondary" size="sm" autoFocus onClick={() => setAsking(false)}>Keep it</Button>
        <Button variant="secondary" size="sm" onClick={() => setFailed(!onLetGo())}>Let it go</Button>
      </div>
    </div>
  )
}

function Resting({ capsule, today, motion, focus, onBack, onLetGo }: CapsuleViewProps & { onLetGo: () => boolean }) {
  return (
    <div className="space-y-4">
      <Jar scene="sealed" motion={motion} className="w-40 h-36 mx-auto" />
      <ViewHeading focus={focus}>Still resting</ViewHeading>
      <p className="text-base sm:text-lg text-foreground">{pickLine(RESTING_LINES, capsule.id)}</p>
      <p className={cn(muted, 'max-w-md mx-auto')}>
        You sealed it on {sealedDay(capsule, today)}. It comes back to you on{' '}
        <strong className="font-semibold text-foreground">{formatDay(capsule.opensOn, today)}</strong>. Nothing to do until then.
      </p>
      <div className="flex flex-col items-center gap-3 pt-1">
        <Button onClick={onBack}>Back to the shelf</Button>
        <LetGo onLetGo={onLetGo} opened={false} />
      </div>
    </div>
  )
}

function Opening({ capsule, today, motion, focus, onBack, onAnswer }: CapsuleViewProps & { onAnswer: (outcome: Outcome, note: string) => boolean }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [note, setNote] = useState('')
  const [failed, setFailed] = useState(false)
  const sealedOn = sealedDay(capsule, today)

  if (!open) {
    return (
      <div className="space-y-4">
        <Jar scene="ready" motion={motion} className="w-44 h-40 mx-auto" />
        <ViewHeading focus={focus}>This one is ready</ViewHeading>
        <p className={muted}>You sealed it on {sealedOn}. Open it whenever you like.</p>
        <div className="flex flex-col-reverse sm:flex-row gap-3 justify-center pt-1">
          <Button variant="secondary" onClick={onBack}>Not now</Button>
          <Button onClick={() => setOpen(true)}>Open it</Button>
        </div>
      </div>
    )
  }

  return (
    <div key="open" className="space-y-5">
      <Jar scene="opening" motion={motion} className="w-40 h-36 mx-auto" />
      <ViewHeading focus>On {sealedOn}, you wrote:</ViewHeading>
      <div className={cn(motion && styles.motion)}>
        <div className={styles.unfold}>
          <Slip label="Your worry" className="max-w-md mx-auto">{capsule.worry}</Slip>
        </div>
      </div>
      <div className={cn('space-y-5', motion && styles.motion)}>
        <div className={cn('space-y-5', styles.afterOpen)}>
          <fieldset>
            <legend className="mx-auto text-lg font-semibold text-foreground mb-3">Did it happen?</legend>
            <div className="flex justify-center gap-2 sm:gap-3">
              {OUTCOMES.map((option) => (
                <label
                  key={option.id}
                  className="min-w-[5.5rem] rounded-full border-2 border-card-border bg-background px-4 py-2 text-base font-medium text-foreground cursor-pointer transition-colors duration-75 hover:bg-hover-bg has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent has-[:focus-visible]:ring-offset-2"
                >
                  <input
                    type="radio"
                    name={`${id}-outcome`}
                    value={option.id}
                    checked={outcome === option.id}
                    onChange={() => setOutcome(option.id)}
                    className="sr-only"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div aria-live="polite">
            {outcome && <p className="text-base sm:text-lg text-foreground max-w-md mx-auto">{pickLine(OUTCOME_RESPONSES[outcome], capsule.id)}</p>}
          </div>

          {outcome && (
            <div className="text-left max-w-md mx-auto">
              <label htmlFor={`${id}-note`} className="block text-sm font-medium text-foreground mb-1.5">
                A line to your past self <span className="font-normal text-foreground/75">(optional)</span>
              </label>
              <textarea
                id={`${id}-note`}
                value={note}
                maxLength={MAX_NOTE_LENGTH}
                rows={2}
                onChange={(event) => setNote(event.target.value)}
                className="w-full rounded-lg border border-card-border bg-background px-3.5 py-3 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-y"
              />
            </div>
          )}

          {failed && (
            <p role="alert" className="text-sm text-foreground max-w-md mx-auto">
              This browser couldn’t keep your answer just now. It is still on screen; try again in a moment.
            </p>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-3 justify-center">
            <Button variant="secondary" onClick={onBack}>Not now</Button>
            <Button disabled={!outcome} onClick={() => outcome && setFailed(!onAnswer(outcome, note))}>Close the capsule</Button>
          </div>
          <HelpLine />
        </div>
      </div>
    </div>
  )
}

function Reread({ capsule, today, motion, focus, onBack, onLetGo }: CapsuleViewProps & { onLetGo: () => boolean }) {
  const opening = capsule.opening
  if (!opening) return null
  return (
    <div className="space-y-4">
      <Jar scene="opened" motion={motion} className="w-36 h-32 mx-auto" />
      <ViewHeading focus={focus}>On {sealedDay(capsule, today)}, you wrote:</ViewHeading>
      <Slip label="Your worry" className="max-w-md mx-auto">{capsule.worry}</Slip>
      <p className="flex items-center justify-center gap-2 text-base text-foreground">
        <OutcomeMark outcome={opening.outcome} className="w-4 h-4" />
        <span>
          Opened {formatDay(localDateKey(new Date(opening.at)), today)}: {OUTCOME_WORDS[opening.outcome].toLowerCase()}.
        </span>
      </p>
      <p className={cn(muted, 'italic max-w-md mx-auto')}>{pickLine(OUTCOME_RESPONSES[opening.outcome], capsule.id)}</p>
      {opening.note && (
        <div className="space-y-2">
          <p className="text-sm text-foreground/75">You wrote back:</p>
          <Slip label="Your note to your past self" className="max-w-md mx-auto">{opening.note}</Slip>
        </div>
      )}
      <div className="flex flex-col items-center gap-3 pt-1">
        <Button onClick={onBack}>Back to the shelf</Button>
        <LetGo onLetGo={onLetGo} opened />
      </div>
      <HelpLine />
    </div>
  )
}

interface RescueProps {
  draft: Draft
  reason: 'full' | 'unavailable'
  today: DateKey
  focus: boolean
  onRetry: () => void
  onBack: () => void
}

function Rescue({ draft, reason, today, focus, onRetry, onBack }: RescueProps) {
  const id = useId()
  const [copied, setCopied] = useState('')
  const worry = draft.text.trim()
  const copyWords = async () => {
    try {
      await navigator.clipboard.writeText(worry)
      setCopied('Copied. Your words are on the clipboard.')
    } catch {
      setCopied('Copying wasn’t allowed here. You can select the words above and copy them.')
    }
  }
  const saveFile = () => {
    const capsule = sealCapsule({ id: newCapsuleId(), worry, horizon: draft.horizon, now: now() })
    saveTextFile(copyFileName(today), writeArchive([capsule], now()))
  }
  return (
    <div className="space-y-4 text-left">
      <ViewHeading focus={focus} className="text-center">This browser couldn’t keep it</ViewHeading>
      <p className={muted}>
        {reason === 'full' ? 'Its storage is full.' : 'It may be a private window, or storage may be switched off.'} Your words are
        still here, so nothing is lost.
      </p>
      <div>
        <label htmlFor={`${id}-words`} className="block text-sm font-medium text-foreground mb-1.5">Your worry</label>
        <textarea
          id={`${id}-words`}
          readOnly
          value={worry}
          rows={3}
          onFocus={(event) => event.target.select()}
          className="w-full rounded-lg border border-card-border bg-background px-3.5 py-3 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={copyWords}>Copy the words</Button>
        <Button variant="secondary" size="sm" onClick={saveFile}>Save it as a file</Button>
        <Button variant="secondary" size="sm" onClick={onRetry}>Try again</Button>
      </div>
      <p role="status" className="text-sm text-foreground">{copied}</p>
      <p className="text-sm text-foreground/75">A saved file can be brought back here later with “Restore from a copy”.</p>
      <div className="text-center pt-1">
        <Button variant="ghost" onClick={onBack}>Back</Button>
      </div>
      <HelpLine />
    </div>
  )
}
