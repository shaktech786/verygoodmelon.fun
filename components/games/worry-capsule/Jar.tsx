import type { Outcome } from '@/lib/games/worry-capsule/capsules'
import { SHELF_JAR_SCALE, shelfLayout } from '@/lib/games/worry-capsule/shelf'
import { cn } from '@/lib/utils/cn'
import styles from './Keeper.module.css'
import { OutcomeShape } from './parts'

export type JarScene = 'waiting' | 'filled' | 'sealing' | 'sealed' | 'ready' | 'opened'

interface JarProps {
  scene: JarScene
  motion: boolean
  plank?: boolean
  /** The day on the paper label, short enough for a label. Without it the label is ruled and blank. */
  label?: string
  className?: string
}

/** Pixel art in the Keeper's ink map: rind for the lid and plank, moss for the glass, clay for paper. */
function Glass({ className, tint = 'fill-moss/10' }: { className?: string; tint?: string }) {
  return (
    <g className={className}>
      <path
        d="M26 24 H54 V26 H57 V28 H59 V62 H57 V64 H55 V66 H25 V64 H23 V62 H21 V28 H23 V26 H26 Z"
        className={cn(tint, 'stroke-ink/45')}
        strokeWidth="2"
        strokeLinejoin="miter"
      />
      <rect x="25" y="31" width="2" height="16" className="fill-sheet/80" />
      <rect x="25" y="50" width="2" height="4" className="fill-sheet/80" />
    </g>
  )
}

function Plank() {
  return (
    <>
      <rect x="6" y="66" width="68" height="3" className="fill-rind/35" />
      <rect x="6" y="69" width="68" height="1" className="fill-rind/20" />
    </>
  )
}

function Lid({ className }: { className?: string }) {
  return (
    <g className={cn(styles.part, className)}>
      <rect x="34" y="11" width="12" height="4" className="fill-rind" />
      <rect x="22" y="15" width="36" height="7" className="fill-rind" />
      <rect x="22" y="20" width="36" height="2" className="fill-moss" />
      <rect x="24" y="16" width="4" height="2" className="fill-rind-wash/70" />
      <rect x="32" y="16" width="4" height="2" className="fill-rind-wash/70" />
      <rect x="40" y="16" width="4" height="2" className="fill-rind-wash/70" />
      <rect x="48" y="16" width="4" height="2" className="fill-rind-wash/70" />
    </g>
  )
}

/** The paper label on the glass: the day it was sealed, printed on it. Without a day, two ruled lines. */
function Label({ day, className }: { day?: string; className?: string }) {
  return (
    <g className={cn(styles.part, className)}>
      <rect x="30" y="29" width="20" height="19" className={cn(styles.paperFill, 'stroke-ink/30')} strokeWidth="1" />
      {day ? (
        <text
          x="40"
          y="41.5"
          textAnchor="middle"
          fontSize="6"
          fontWeight="700"
          className="fill-ink"
          textLength={day.length > 6 ? 17 : undefined}
          lengthAdjust="spacingAndGlyphs"
          shapeRendering="auto"
        >
          {day}
        </text>
      ) : (
        <>
          <rect x="33" y="35" width="14" height="1" className={styles.inkFill} />
          <rect x="33" y="39" width="10" height="1" className={styles.inkFill} />
        </>
      )}
    </g>
  )
}

/** The worry folded in half: the lower half of the page, with the upper half laid over it. */
function FoldedSlip({ className }: { className?: string }) {
  return (
    <g className={cn(styles.part, className)}>
      <rect x="31" y="50" width="18" height="10" className={styles.paperFill} />
      <rect x="31" y="50" width="18" height="1" className="fill-ink/25" />
      <rect x="34" y="53" width="11" height="1" className={styles.inkFaint} />
      <rect x="34" y="56" width="8" height="1" className={styles.inkFaint} />
    </g>
  )
}

/**
 * Sealing, as one beat: the lid presses down, then a paper label is printed with the day. Each part
 * rests in its final place, so without motion it is simply sealed.
 */
function SealingScene({ plank, day }: { plank: boolean; day?: string }) {
  return (
    <>
      {plank && <Plank />}
      <Glass />
      <FoldedSlip />
      <Label day={day} className={styles.labelPrint} />
      <Lid className={styles.lidDown} />
    </>
  )
}

/** A small pixel jar with a rind lid and a paper label. Purely decorative. */
export function Jar({ scene, motion, plank = true, label, className }: JarProps) {
  const still = motion || scene !== 'sealing' ? scene : 'sealed'
  const hasSlip = still !== 'waiting' && still !== 'opened' && still !== 'sealing'
  const hasLabel = still === 'sealed' || still === 'ready'
  const lidClass = still === 'waiting' || still === 'filled' ? styles.lidLifted : still === 'opened' ? styles.lidOff : undefined

  return (
    <svg
      viewBox="0 0 80 72"
      className={cn(motion && styles.motion, className)}
      aria-hidden="true"
      focusable="false"
      shapeRendering="crispEdges"
    >
      {still === 'sealing' ? (
        <SealingScene plank={plank} day={label} />
      ) : (
        <>
          {still === 'ready' && <circle cx="40" cy="42" r="32" className={styles.glow} shapeRendering="auto" />}
          {plank && <Plank />}
          <Glass />
          {hasSlip && <FoldedSlip />}
          {hasLabel && <Label day={label} />}
          <Lid className={lidClass} />
        </>
      )}
    </svg>
  )
}

function inkLinesFor(text: string): number {
  const length = text.trim().length
  return length === 0 ? 0 : Math.min(4, 1 + Math.floor(length / 70))
}

const INK_WIDTHS = [22, 18, 24, 14]

/** The open jar beside a blank page and a pencil; the page fills with lines as the worry is written. */
export function ComposeArt({ text, motion, className }: { text: string; motion: boolean; className?: string }) {
  const lines = inkLinesFor(text)
  return (
    <svg
      viewBox="0 0 128 72"
      className={cn(motion && styles.motion, className)}
      aria-hidden="true"
      focusable="false"
      shapeRendering="crispEdges"
    >
      <rect x="6" y="66" width="116" height="3" className="fill-rind/35" />
      <rect x="6" y="69" width="116" height="1" className="fill-rind/20" />
      <g transform="translate(4 0)">
        <Glass />
        <Lid className={styles.lidLifted} />
      </g>
      <g transform="rotate(-5 100 46)">
        <rect x="82" y="25" width="34" height="40" className={styles.paperFill} />
        <rect x="82" y="25" width="34" height="40" className="fill-none stroke-ink/20" strokeWidth="1" />
        {[33, 40, 47, 54].map((y, i) => (
          <g key={y}>
            <rect x="86" y={y} width="26" height="1" className={styles.ruleFill} />
            <rect
              x="86"
              y={y - 2}
              width={INK_WIDTHS[i]}
              height="1.5"
              className={cn(styles.inkFill, styles.inkLine, i < lines && styles.inkLineShown)}
            />
          </g>
        ))}
      </g>
      <g transform="rotate(38 116 58)">
        <rect x="104" y="56" width="18" height="4" className="fill-clay" />
        <rect x="104" y="56" width="18" height="1" className="fill-ink/20" />
        <rect x="122" y="56" width="3" height="4" className="fill-flesh/70" />
        <path d="M104 56 L99 58 L104 60 Z" className={styles.paperFill} shapeRendering="auto" />
        <rect x="99" y="57.5" width="1.5" height="1" className="fill-ink/70" />
      </g>
    </svg>
  )
}

const TINT: Record<Outcome, string> = { no: styles.tintNo, partly: styles.tintPartly, yes: styles.tintYes }

/**
 * An answered jar: the lid back on, the glass tinted by how it turned out and a paper label marked with
 * that outcome's shape, so the colour is never the only clue. The newest jar's label is printed as it joins.
 */
function KeptJar({ outcome, printing }: { outcome: Outcome; printing: boolean }) {
  return (
    <g>
      <Glass tint={TINT[outcome]} />
      <FoldedSlip />
      <g className={cn(printing && styles.part, printing && styles.closeLabel)}>
        <rect x="30" y="29" width="20" height="19" className={cn(styles.paperFill, 'stroke-ink/30')} strokeWidth="1" />
        <g transform="translate(31 29.5) scale(1.5)" shapeRendering="auto">
          <OutcomeShape outcome={outcome} />
        </g>
      </g>
      <Lid />
    </g>
  )
}

interface KeptShelfProps {
  /** Jars on the shelf, oldest first. */
  outcomes: readonly Outcome[]
  /** The last jar is the one just answered: its label is printed as the page arrives. */
  printingLast?: boolean
  motion: boolean
  /** CSS pixels per unit of the picture, before it is narrowed to fit. */
  zoom?: number
  className?: string
}

/** A plank of answered jars. Purely decorative: the same answers are listed in words beside it. */
export function KeptShelf({ outcomes, printingLast = false, motion, zoom = 1.3, className }: KeptShelfProps) {
  const { width, height, plankY, slots } = shelfLayout(outcomes, 0)
  const last = slots.length - 1
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: width * zoom }}
      className={cn('max-w-full h-auto', className, motion && styles.motion)}
      aria-hidden="true"
      focusable="false"
      shapeRendering="crispEdges"
    >
      <rect x="2" y={plankY} width={width - 4} height="3" className="fill-rind/35" />
      <rect x="2" y={plankY + 3} width={width - 4} height="1" className="fill-rind/20" />
      <rect x="14" y={plankY + 4} width="3" height="4" className="fill-rind/25" />
      <rect x={width - 17} y={plankY + 4} width="3" height="4" className="fill-rind/25" />
      {slots.map((slot, i) => (
        <g key={i} transform={`translate(${slot.x} ${slot.y}) scale(${SHELF_JAR_SCALE})`}>
          <KeptJar outcome={slot.outcome} printing={printingLast && i === last} />
        </g>
      ))}
    </svg>
  )
}
