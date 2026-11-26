'use client'

import { type ReactNode, useId, useRef, useState, useSyncExternalStore } from 'react'
import { flushSync } from 'react-dom'
import { useCareMode } from '@/components/games/CareMode'
import { OwnSupportMark } from '@/components/games/OwnSupport'
import { CareBlock } from '@/components/seedpress/CareBlock'
import { Go } from '@/components/seedpress/Go'
import { Icon } from '@/components/seedpress/icons/Icon'
import { InlineConfirm } from '@/components/seedpress/InlineConfirm'
import { Note } from '@/components/seedpress/Note'
import { QuietButton } from '@/components/seedpress/QuietButton'
import { Stamp } from '@/components/seedpress/Stamp'
import { StatusLine } from '@/components/seedpress/StatusLine'
import { StickyTray } from '@/components/seedpress/StickyTray'
import { WritingSlip } from '@/components/seedpress/WritingSlip'
import { useSense } from '@/lib/design/sense'
import { soundsLikeDistress } from '@/lib/games/community-words/moderation'
import { cn } from '@/lib/utils/cn'
import { type ArchiveProblem, MAX_ARCHIVE_CHARS, type Merge, mergeCapsules, readArchive, writeArchive } from '@/lib/games/worry-capsule/archive'
import {
  type Capsule,
  HORIZONS,
  MAX_NOTE_LENGTH,
  MAX_WORRY_LENGTH,
  OUTCOMES,
  type Outcome,
  RESEAL_HORIZONS,
  type ResealHorizon,
  capsuleStatus,
  normalizeWorry,
  openCapsule,
  opensOnFor,
  resealCapsule,
  sealCapsule,
  sealedSameDay,
  shelve,
  tally,
} from '@/lib/games/worry-capsule/capsules'
import { NOT_YET_LINES, RESTING_LINES, SEALED_LINES, closedLine, outcomeResponse, pickLine } from '@/lib/games/worry-capsule/copy'
import { type DateKey, localDateKey } from '@/lib/games/worry-capsule/dates'
import type { WorryDraft as Draft } from '@/lib/games/worry-capsule/draft'
import { shelfOutcomes } from '@/lib/games/worry-capsule/shelf'
import { DevTimeTravel } from './worry-capsule/DevTimeTravel'
import { ComposeArt, Jar, KeptShelf } from './worry-capsule/Jar'
import styles from './worry-capsule/Keeper.module.css'
import {
  type KeeperSnapshot,
  commit,
  forgetDraft,
  getServerSnapshot,
  getSnapshot,
  keepDraft,
  newCapsuleId,
  now,
  requestPersistence,
  subscribe,
} from './worry-capsule/keeperStore'
import { HelpLine, OUTCOME_WORDS, OutcomeMark, Slip, TallyCard, ViewHeading, formatDay, saveTextFile, sealedDay } from './worry-capsule/parts'

type View =
  | { kind: 'shelf' }
  | { kind: 'compose'; draft: Draft; restored?: boolean }
  | { kind: 'review'; draft: Draft }
  | { kind: 'sealed'; id: string }
  | { kind: 'rescue'; draft: Draft; reason: 'full' | 'unavailable' }
  | { kind: 'capsule'; id: string }
  | { kind: 'closed'; id: string; first: boolean }

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

/** Jars shown on the shelf strip, and those already there when a new one joins them. */
const SHELF_JARS = 4
const PLACES_IN_DAY = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth']

/** Jars sealed on one day are told apart by their order, said as a word rather than a tally. */
function placeInDay(position: number): string {
  return `${PLACES_IN_DAY[position - 1] ?? 'next'} that day`
}
const CEREMONY_NEIGHBOURS = 3
/** Opened capsules listed before the rest wait behind "Show older". */
const RECENT_OPENED = 10

const stack = 'grid gap-4 justify-items-start'
const actions = 'flex flex-wrap items-center gap-3'

/** The helplines first, as the care block: sealing stays possible, but quietly, and never as the next step. */
function KeeperCare({ lead }: { lead: string }) {
  return (
    <>
      <OwnSupportMark />
      <CareBlock lead={lead} />
    </>
  )
}

export default function WorryCapsule() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const { motionScale } = useSense()
  const motion = motionScale === 1
  const [view, setView] = useState<View | null>(null)
  const [navigated, setNavigated] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const [quietNews, setQuietNews] = useState('')
  const [importMessage, setImportMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showOlder, setShowOlder] = useState(false)
  const firstOlderRef = useRef<HTMLButtonElement>(null)
  const { care, enterCareMode } = useCareMode()

  if (!snapshot.loaded) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="sp-sheet min-h-[460px]" aria-busy="true">
          <p className="sr-only">Opening the shelf</p>
        </div>
      </div>
    )
  }

  const nowDate = new Date(snapshot.nowMs)
  const today = localDateKey(nowDate)
  const { capsules } = snapshot
  const composeView: View = snapshot.draft ? { kind: 'compose', draft: snapshot.draft, restored: true } : { kind: 'compose', draft: EMPTY_DRAFT }
  const current: View = view ?? (capsules.length > 0 && !snapshot.draft ? { kind: 'shelf' } : composeView)

  const go = (next: View | null) => {
    setNavigated(true)
    setImportMessage('')
    setAnnouncement('')
    setQuietNews('')
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
    forgetDraft()
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
    const first = !capsules.some((c) => c.opening)
    go({ kind: 'closed', id: capsule.id, first })
    setQuietNews(`${first ? 'Closed and kept here.' : 'Closed and kept with the others.'} ${closedLine(capsule.id, first)}`)
    return true
  }

  const reseal = (capsule: Capsule, horizon: ResealHorizon): boolean => {
    const resealed = resealCapsule(capsule, horizon, now())
    if (!commit(capsules.map((c) => (c.id === capsule.id ? resealed : c))).ok) return false
    go({ kind: 'shelf' })
    setAnnouncement(`Sealed again. It comes back on ${formatDay(resealed.opensOn, today)}.`)
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
  const importStatus = <StatusLine>{importMessage}</StatusLine>

  let body: ReactNode
  let bodyKey: string = current.kind

  if (current.kind === 'compose') {
    const { restored } = current
    body = (
      <Composer
        draft={current.draft}
        restored={restored ?? false}
        today={today}
        snapshot={snapshot}
        motion={motion}
        focus={navigated}
        onChange={(draft) => {
          setView({ kind: 'compose', draft, restored })
          keepDraft(draft)
        }}
        onDiscard={() => {
          forgetDraft()
          setView({ kind: 'compose', draft: EMPTY_DRAFT })
        }}
        onNext={(draft) => {
          if (soundsLikeDistress(draft.text)) enterCareMode()
          go({ kind: 'review', draft })
        }}
        onCancel={capsules.length > 0 ? () => go({ kind: 'shelf' }) : undefined}
        restore={
          capsules.length === 0 && (
            <div className="grid gap-2 border-t border-rule pt-5">
              <p className="sp-soft m-0">
                Sealed some before, on another device or before this browser was cleared? They can come back from a saved copy.
              </p>
              <div>
                <QuietButton onClick={chooseFile}>Restore from a copy</QuietButton>
              </div>
              {importStatus}
            </div>
          )
        }
      />
    )
  } else if (current.kind === 'review' && soundsLikeDistress(current.draft.text)) {
    const { draft } = current
    // Words like these are met with support first; sealing stays possible, but quietly, and never as the next step
    body = (
      <div className="grid gap-5">
        <ViewHeading focus={navigated}>You don’t have to hold this alone</ViewHeading>
        <KeeperCare lead="What you wrote sounds very heavy. Please talk to someone who can be with you in it." />
        <p className="sp-soft m-0">Your words are safe here, and nothing is sealed unless you choose it.</p>
        <div className={actions}>
          <Stamp onClick={() => go({ kind: 'compose', draft })}>Change it</Stamp>
          <QuietButton onClick={() => seal(draft)}>Keep it in a jar anyway</QuietButton>
        </div>
      </div>
    )
  } else if (current.kind === 'review') {
    const { draft } = current
    body = (
      <div className="grid gap-5">
        <ViewHeading focus={navigated}>Ready to seal it?</ViewHeading>
        <Slip label="Your worry" className="max-w-md">{draft.text.trim()}</Slip>
        <Jar scene="waiting" motion={motion} className="mx-auto h-24 w-28" />
        <p className="sp-soft m-0">
          It comes back to you on <strong className="font-bold text-ink">{formatDay(opensOnFor(today, draft.horizon), today)}</strong>.
        </p>
        <p className="sp-soft m-0">It lives only in this browser, on this device.</p>
        <StickyTray className={actions}>
          <Stamp onClick={() => go({ kind: 'compose', draft })}>Change it</Stamp>
          {/* In care, sealing is never the main next step */}
          {care ? <Stamp onClick={() => seal(draft)}>Seal it</Stamp> : <Go onClick={() => seal(draft)}>Seal it</Go>}
        </StickyTray>
      </div>
    )
  } else if (current.kind === 'sealed') {
    const capsule = capsules.find((c) => c.id === current.id)
    bodyKey = `sealed-${current.id}`
    const supportFirst = capsule !== undefined && (care || soundsLikeDistress(capsule.worry))
    body = capsule && supportFirst ? (
      // No sealing ceremony and no settling line here: support comes first, then the plain facts
      <div className="grid gap-4">
        <ViewHeading focus={navigated}>It is kept</ViewHeading>
        <KeeperCare lead="If things feel too heavy right now, you can talk to someone." />
        <p className="sp-soft m-0">
          It comes back on <strong className="font-bold text-ink">{formatDay(capsule.opensOn, today)}</strong>. Only this browser keeps it.
        </p>
        <div className={actions}>
          <Stamp onClick={() => exportAll()}>Save a copy</Stamp>
          <Stamp onClick={() => go({ kind: 'shelf' })}>Back to the shelf</Stamp>
        </div>
      </div>
    ) : capsule ? (
      <div className={cn(motion && styles.motion)}>
        <Jar scene="sealing" motion={motion} label={sealedDay(capsule, today, 'short')} className="mx-auto mb-2 h-40 w-44" />
        {/* The words take no room until the label is printed, so the jar is not left above an empty card */}
        <div className={styles.reveal}>
          <div className={cn('grid gap-4', styles.revealInner, styles.afterSeal)}>
            <ViewHeading focus={navigated}>Sealed.</ViewHeading>
            <p className="sp-lead m-0">{pickLine(SEALED_LINES, capsule.id)}</p>
            <p className="sp-soft m-0">
              It comes back on <strong className="font-bold text-ink">{formatDay(capsule.opensOn, today)}</strong>. Any time after that, it will be ready here.
            </p>
            <p className="sp-soft m-0">Only this browser keeps it. A saved copy can move it or keep it safe.</p>
            <div className={actions}>
              <Stamp onClick={() => exportAll()}>Save a copy</Stamp>
              <Go onClick={() => go({ kind: 'shelf' })}>Done</Go>
            </div>
          </div>
        </div>
      </div>
    ) : null
  } else if (current.kind === 'rescue') {
    body = <Rescue calm={care || soundsLikeDistress(current.draft.text)} draft={current.draft} reason={current.reason} today={today} focus={navigated} onRetry={() => seal(current.draft)} onBack={() => go({ kind: 'compose', draft: current.draft })} />
  } else if (current.kind === 'closed') {
    const capsule = capsules.find((c) => c.id === current.id)
    bodyKey = `closed-${current.id}`
    if (capsule?.opening) {
      const others = shelve(capsules.filter((c) => c.id !== capsule.id), nowDate).opened
      body = (
        <div className={cn('grid gap-4', motion && styles.motion)}>
          <KeptShelf
            outcomes={[...shelfOutcomes(others, CEREMONY_NEIGHBOURS), capsule.opening.outcome]}
            printingLast={motion}
            motion={motion}
            zoom={1.6}
            className="mx-auto"
          />
          <div className={cn('grid gap-4 justify-items-start', styles.afterClose)}>
            <ViewHeading focus={navigated}>Closed.</ViewHeading>
            <p className="sp-lead m-0 max-w-md">{closedLine(capsule.id, current.first)}</p>
            <p className="sp-soft m-0">
              <span className="inline-flex items-center gap-2">
                <OutcomeMark outcome={capsule.opening.outcome} className="w-4 h-4" />
                {OUTCOME_WORDS[capsule.opening.outcome]}
              </span>
            </p>
            <Go onClick={() => go({ kind: 'shelf' })}>Back to the shelf</Go>
          </div>
        </div>
      )
    }
  } else if (current.kind === 'capsule') {
    const capsule = capsules.find((c) => c.id === current.id)
    bodyKey = `capsule-${current.id}`
    if (capsule) {
      const status = capsuleStatus(capsule, nowDate)
      const back = () => go({ kind: 'shelf' })
      if (status === 'resting') body = <Resting capsule={capsule} today={today} motion={motion} focus={navigated} onBack={back} onLetGo={() => letGo(capsule.id)} />
      else if (status === 'ready') body = <Opening capsule={capsule} today={today} motion={motion} focus={navigated} onBack={back} onAnswer={(o, n) => answer(capsule, o, n)} onReseal={(h) => reseal(capsule, h)} />
      else body = <Reread capsule={capsule} today={today} motion={motion} focus={navigated} onBack={back} onLetGo={() => letGo(capsule.id)} />
    }
  }

  if (current.kind === 'shelf' || body === undefined || body === null) {
    bodyKey = 'shelf'
    const shelf = shelve(capsules, nowDate)
    const counts = tally(capsules)
    const waiting = [...shelf.ready, ...shelf.resting]
    const sameDay = sealedSameDay(waiting)
    const hasOlder = shelf.opened.length > RECENT_OPENED
    const listed = showOlder ? shelf.opened : shelf.opened.slice(0, RECENT_OPENED)
    body = (
      <div className="grid gap-6">
        <div className="grid gap-2">
          <ViewHeading focus={navigated}>Kept for you</ViewHeading>
          <p className="sp-soft m-0">
            {shelf.ready.length > 0
              ? `${shelf.ready.length === 1 ? 'One capsule is' : `${shelf.ready.length} capsules are`} ready to open, whenever you like.`
              : waiting.length > 0
                ? 'Nothing to open today. Everything here is resting.'
                : 'Everything here has been opened.'}
          </p>
        </div>

        {waiting.length > 0 && (
          <ul className={styles.jarList} aria-label="Sealed capsules">
            {waiting.map((capsule) => {
              const ready = capsuleStatus(capsule, nowDate) === 'ready'
              const place = sameDay.get(capsule.id)
              const sealedOn = `${sealedDay(capsule, today)}${place && place.of > 1 ? `, the ${placeInDay(place.position)}` : ''}`
              return (
                <li key={capsule.id} className={styles.jarItem}>
                  <button
                    type="button"
                    onClick={() => go({ kind: 'capsule', id: capsule.id })}
                    aria-label={ready ? `Ready to open, sealed ${sealedOn}` : `Opens ${formatDay(capsule.opensOn, today)}, sealed ${sealedOn}`}
                    className={styles.jarButton}
                  >
                    <Jar scene={ready ? 'ready' : 'sealed'} motion={false} plank={false} className="mx-auto h-[4.5rem] w-20 sm:h-[5.4rem] sm:w-24" />
                    <span className={cn('block', ready && styles.jarReady)}>
                      {ready ? 'Ready' : `Opens ${formatDay(capsule.opensOn, today, 'short')}`}
                    </span>
                    <span className={styles.jarSoft}>
                      sealed {sealedDay(capsule, today, 'short')}
                      {/* The words stay sealed until it opens, so jars from one day are told apart by their order alone */}
                      {place && place.of > 1 && <span className="block">{placeInDay(place.position)}</span>}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <div>
          <Go onClick={() => go(composeView)}>{snapshot.draft ? 'Finish the worry you started' : 'Seal another worry'}</Go>
        </div>

        {counts.total > 0 && <TallyCard counts={counts} opened={shelf.opened} />}

        {shelf.opened.length > 0 && (
          <section aria-labelledby="keeper-opened" className="grid gap-3 text-left">
            <h3 id="keeper-opened" className="sp-h3 m-0">Looked back on</h3>
            <KeptShelf outcomes={shelfOutcomes(shelf.opened, SHELF_JARS)} motion={false} />
            <ul className={styles.openedList}>
              {listed.map((capsule, index) => capsule.opening && (
                <li key={capsule.id}>
                  <button
                    ref={index === RECENT_OPENED ? firstOlderRef : undefined}
                    type="button"
                    onClick={() => go({ kind: 'capsule', id: capsule.id })}
                    className={styles.openedRow}
                  >
                    <OutcomeMark outcome={capsule.opening.outcome} className="w-4 h-4" />
                    <span className="min-w-0 flex-1">
                      <span className={styles.openedWorry}>{capsule.worry}</span>
                      <span className={styles.openedMeta}>
                        Sealed {sealedDay(capsule, today, 'short')} · {OUTCOME_WORDS[capsule.opening.outcome]}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {hasOlder && !showOlder && (
              <div>
                <QuietButton
                  onClick={() => {
                    // The button leaves with the press, so focus goes on to the first of the older ones
                    flushSync(() => setShowOlder(true))
                    firstOlderRef.current?.focus()
                  }}
                >
                  Show older
                </QuietButton>
              </div>
            )}
          </section>
        )}

        <section aria-labelledby="keeper-copy" className="sp-sheet grid gap-3 text-left">
          <h3 id="keeper-copy" className="sp-h3 m-0">Keep a copy</h3>
          <p className="sp-soft m-0">
            Your capsules live only in this browser. A saved copy can restore them here or on another device.
          </p>
          <div className="sp-stamp-row">
            <Stamp icon="save" onClick={() => exportAll()}>Save a copy</Stamp>
            <Stamp onClick={chooseFile}>Restore from a copy</Stamp>
          </div>
          {importStatus}
          <StorageNotes snapshot={snapshot} />
        </section>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="sp-sheet text-left">
        <div aria-live="polite">{announcement && <Note className="mb-5">{announcement}</Note>}</div>
        <p aria-live="polite" className="sr-only">{quietNews}</p>
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
        <Note tone="look">This browser isn’t keeping anything new right now. Saving a copy keeps what’s here safe.</Note>
      )}
      {snapshot.storage === 'unreadable' && (
        <Note tone="look">Something saved here earlier couldn’t be read. It has been set aside untouched rather than overwritten.</Note>
      )}
    </>
  )
}

interface ComposerProps {
  draft: Draft
  restored: boolean
  today: DateKey
  snapshot: KeeperSnapshot
  motion: boolean
  focus: boolean
  onChange: (draft: Draft) => void
  onDiscard: () => void
  onNext: (draft: Draft) => void
  onCancel?: () => void
  restore: ReactNode
}

function Composer({ draft, restored, today, snapshot, motion, focus, onChange, onDiscard, onNext, onCancel, restore }: ComposerProps) {
  const id = useId()
  const boxRef = useRef<HTMLTextAreaElement>(null)
  const ready = normalizeWorry(draft.text) !== null
  const left = MAX_WORRY_LENGTH - draft.text.length
  return (
    <form
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault()
        if (ready) onNext(draft)
      }}
    >
      <ComposeArt text={draft.text} motion={motion} className="mx-auto h-24 w-44 sm:h-32 sm:w-56" />
      <div className="grid gap-2">
        <ViewHeading focus={focus}>What’s on your mind?</ViewHeading>
        <p className="sp-soft m-0 max-w-md">
          Write down one worry and seal it away. It comes back on the day you choose, so you can see how it turned out.
        </p>
      </div>

      {restored && draft.text && (
        <Note>
          <span className="block">You were partway through this. It was kept for you, just as you left it.</span>
          <QuietButton
            onClick={() => {
              onDiscard()
              boxRef.current?.focus()
            }}
          >
            Start a blank page
          </QuietButton>
        </Note>
      )}

      <WritingSlip
        label="Your worry"
        ref={boxRef}
        value={draft.text}
        maxLength={MAX_WORRY_LENGTH}
        rows={4}
        placeholder="I’m worried that…"
        onChange={(event) => onChange({ ...draft, text: event.target.value })}
        note={left <= 100 ? `${left} characters left` : null}
      />

      <fieldset className="m-0 grid min-w-0 gap-2 border-0 p-0">
        <legend className="mb-2 p-0 font-bold">When should it come back?</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {HORIZONS.map((horizon) => (
            <label key={horizon.id} className="sp-choice sp-choice--card">
              <input
                type="radio"
                name={`${id}-horizon`}
                value={horizon.id}
                checked={draft.horizon === horizon.id}
                onChange={() => onChange({ ...draft, horizon: horizon.id })}
              />
              <span className="sp-choice__face">
                <span className="sp-choice__mark">{draft.horizon === horizon.id && <Icon name="done" />}</span>
                <span>
                  <span className="sp-choice__title">{horizon.label}</span>
                  <span className="sp-choice__detail">{formatDay(opensOnFor(today, horizon.id), today, 'short')}</span>
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {!snapshot.writable && (
        <Note tone="look">
          This browser isn’t keeping things right now, perhaps a private window. You can still write, and you’ll be offered a way to keep your words.
        </Note>
      )}
      {snapshot.storage === 'unreadable' && (
        <Note tone="look">Something saved here earlier couldn’t be read. It has been set aside untouched rather than overwritten.</Note>
      )}

      <StickyTray className={actions}>
        {onCancel && <QuietButton onClick={onCancel}>Back to the shelf</QuietButton>}
        <Go type="submit" unavailable={ready ? undefined : 'Write your worry first.'}>Fold it up</Go>
      </StickyTray>

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
    return <QuietButton onClick={() => setAsking(true)}>Let it go</QuietButton>
  }
  return (
    <div className="grid w-full gap-3">
      {failed && <Note tone="look" role="alert">This browser couldn’t change anything just now. It is still kept.</Note>}
      <InlineConfirm
        question={opened ? 'Let this one go?' : 'Let it go without opening it?'}
        why={opened ? 'It leaves your shelf too, for good.' : 'It will be gone for good.'}
        keepLabel="Keep it"
        confirmLabel="Let it go"
        onKeep={() => setAsking(false)}
        onConfirm={() => setFailed(!onLetGo())}
      />
    </div>
  )
}

function Resting({ capsule, today, motion, focus, onBack, onLetGo }: CapsuleViewProps & { onLetGo: () => boolean }) {
  const lastLook = capsule.lookedIn.at(-1)
  return (
    <div className={stack}>
      <Jar scene="sealed" motion={motion} label={sealedDay(capsule, today, 'short')} className="mx-auto h-36 w-40" />
      <ViewHeading focus={focus}>Still resting</ViewHeading>
      <p className="sp-lead m-0">{pickLine(RESTING_LINES, capsule.id)}</p>
      <p className="sp-soft m-0 max-w-md">
        You sealed it on {sealedDay(capsule, today)}. It comes back to you on{' '}
        <strong className="font-bold text-ink">{formatDay(capsule.opensOn, today)}</strong>. Nothing to do until then.
      </p>
      {lastLook && (
        <p className="sp-soft m-0 max-w-md">
          You looked in on {formatDay(localDateKey(new Date(lastLook)), today)}, and it was too soon to tell, so it has more time.
        </p>
      )}
      <div className={stack}>
        <Go onClick={onBack}>Back to the shelf</Go>
        <LetGo onLetGo={onLetGo} opened={false} />
      </div>
    </div>
  )
}

type Choice = Outcome | 'not-yet'

const CHOICES: readonly { id: Choice; label: string }[] = [...OUTCOMES, { id: 'not-yet', label: 'Too soon to tell' }]

interface OpeningProps extends CapsuleViewProps {
  onAnswer: (outcome: Outcome, note: string) => boolean
  onReseal: (horizon: ResealHorizon) => boolean
}

function Opening({ capsule, today, motion, focus, onBack, onAnswer, onReseal }: OpeningProps) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [outcome, setOutcome] = useState<Choice | null>(null)
  const [again, setAgain] = useState<ResealHorizon>('week')
  const [note, setNote] = useState('')
  const [failed, setFailed] = useState(false)
  const sealedOn = sealedDay(capsule, today)
  const label = sealedDay(capsule, today, 'short')

  if (!open) {
    return (
      <div className={stack}>
        <Jar scene="ready" motion={motion} label={label} className="mx-auto h-40 w-44" />
        <ViewHeading focus={focus}>This one is ready</ViewHeading>
        <p className="sp-soft m-0">You sealed it on {sealedOn}. Open it whenever you like.</p>
        <div className={actions}>
          <Stamp onClick={onBack}>Back to the shelf</Stamp>
          <Go onClick={() => setOpen(true)}>Open it</Go>
        </div>
      </div>
    )
  }

  // Opening only reads the label: the lid is simply off and the worry is there, with no theatrics
  return (
    <div key="open" className="grid gap-5">
      <Jar scene="opened" motion={false} className="mx-auto h-36 w-40" />
      <ViewHeading focus>On {sealedOn}, you wrote:</ViewHeading>
      <Slip label="Your worry" className="max-w-md">{capsule.worry}</Slip>
      <fieldset className="m-0 grid min-w-0 gap-3 border-0 p-0">
        <legend className="mb-3 p-0 text-lg font-bold">How did it turn out?</legend>
        <div className="sp-stamp-row">
          {CHOICES.map((option) => (
            <label key={option.id} className="sp-choice">
              <input
                type="radio"
                name={`${id}-outcome`}
                value={option.id}
                checked={outcome === option.id}
                onChange={() => setOutcome(option.id)}
              />
              <span className="sp-choice__face">
                {outcome === option.id && <Icon name="done" />}
                {option.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div aria-live="polite">
        {outcome && (
          <p className="sp-lead m-0 max-w-md">
            {outcome === 'not-yet' ? pickLine(NOT_YET_LINES, capsule.id) : outcomeResponse(outcome, capsule.id)}
          </p>
        )}
      </div>

      {outcome === 'not-yet' && (
        <fieldset className="m-0 grid min-w-0 max-w-md gap-2 border-0 p-0">
          <legend className="mb-2 p-0 font-bold">Look again in</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {RESEAL_HORIZONS.map((horizon) => (
              <label key={horizon.id} className="sp-choice sp-choice--card">
                <input
                  type="radio"
                  name={`${id}-again`}
                  value={horizon.id}
                  checked={again === horizon.id}
                  onChange={() => setAgain(horizon.id)}
                />
                <span className="sp-choice__face">
                  <span className="sp-choice__mark">{again === horizon.id && <Icon name="done" />}</span>
                  <span>
                    <span className="sp-choice__title">{horizon.label}</span>
                    <span className="sp-choice__detail">{formatDay(opensOnFor(today, horizon.id), today, 'short')}</span>
                  </span>
                </span>
              </label>
            ))}
          </div>
          <p className="sp-soft m-0">It won’t join the answers on your shelf until you can say how it went.</p>
        </fieldset>
      )}

      {outcome && outcome !== 'not-yet' && (
        <div className="max-w-md">
          <WritingSlip
            label="A line to your past self (optional)"
            value={note}
            maxLength={MAX_NOTE_LENGTH}
            rows={2}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
      )}

      {failed && (
        <Note tone="look" role="alert">
          This browser couldn’t keep your answer just now. It is still on screen; try again in a moment.
        </Note>
      )}

      <StickyTray className={actions}>
        <QuietButton onClick={onBack}>Back to the shelf</QuietButton>
        {outcome === 'not-yet' ? (
          <Go onClick={() => setFailed(!onReseal(again))}>Seal it again</Go>
        ) : (
          <Go
            unavailable={outcome ? undefined : 'Say how it turned out first.'}
            onClick={() => outcome && setFailed(!onAnswer(outcome, note))}
          >
            Close the capsule
          </Go>
        )}
      </StickyTray>
      <HelpLine />
    </div>
  )
}

function Reread({ capsule, today, focus, onBack, onLetGo }: CapsuleViewProps & { onLetGo: () => boolean }) {
  const opening = capsule.opening
  if (!opening) return null
  return (
    <div className={stack}>
      <Jar scene="opened" motion={false} className="mx-auto h-32 w-36" />
      <ViewHeading focus={focus}>On {sealedDay(capsule, today)}, you wrote:</ViewHeading>
      <Slip label="Your worry" className="max-w-md">{capsule.worry}</Slip>
      <p className="m-0 flex items-center gap-2">
        <OutcomeMark outcome={opening.outcome} className="w-4 h-4" />
        <span>
          Opened {formatDay(localDateKey(new Date(opening.at)), today)}: {OUTCOME_WORDS[opening.outcome].toLowerCase()}.
        </span>
      </p>
      <p className="sp-soft m-0 max-w-md">{outcomeResponse(opening.outcome, capsule.id)}</p>
      {opening.note && (
        <div className="grid gap-2">
          <p className="sp-soft m-0">You wrote back:</p>
          <Slip label="Your note to your past self" className="max-w-md">{opening.note}</Slip>
        </div>
      )}
      <div className={stack}>
        <Go onClick={onBack}>Back to the shelf</Go>
        <LetGo onLetGo={onLetGo} opened />
      </div>
      <HelpLine />
    </div>
  )
}

interface RescueProps {
  /** In care, or for words that sound heavy, sealing again is never the main next step. */
  calm: boolean
  draft: Draft
  reason: 'full' | 'unavailable'
  today: DateKey
  focus: boolean
  onRetry: () => void
  onBack: () => void
}

function Rescue({ calm, draft, reason, today, focus, onRetry, onBack }: RescueProps) {
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
    <div className="grid gap-4 text-left">
      <ViewHeading focus={focus}>This browser couldn’t keep it</ViewHeading>
      <p className="sp-soft m-0">
        {reason === 'full' ? 'Its storage is full.' : 'It may be a private window, or storage may be switched off.'} Your words are
        still here, so nothing is lost.
      </p>
      <WritingSlip
        label="Your worry"
        readOnly
        value={worry}
        rows={3}
        onFocus={(event) => event.target.select()}
      />
      <div className="sp-stamp-row">
        <Stamp icon="copy" onClick={copyWords}>Copy the words</Stamp>
        <Stamp icon="save" onClick={saveFile}>Save it as a file</Stamp>
      </div>
      <StatusLine>{copied}</StatusLine>
      <p className="sp-soft m-0">A saved file can be brought back here later with “Restore from a copy”.</p>
      <div className={actions}>
        <QuietButton onClick={onBack}>Back</QuietButton>
        {calm ? <Stamp onClick={onRetry}>Try again</Stamp> : <Go onClick={onRetry}>Try again</Go>}
      </div>
      <HelpLine />
    </div>
  )
}
