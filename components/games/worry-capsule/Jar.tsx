import { cn } from '@/lib/utils/cn'
import styles from './Keeper.module.css'

export type JarScene = 'waiting' | 'filled' | 'sealing' | 'sealed' | 'ready' | 'opening' | 'opened'

interface JarProps {
  scene: JarScene
  motion: boolean
  plank?: boolean
  className?: string
}

function Glass({ className }: { className?: string }) {
  return (
    <g className={className}>
      <path
        d="M26 24 H54 V26 H57 V28 H59 V62 H57 V64 H55 V66 H25 V64 H23 V62 H21 V28 H23 V26 H26 Z"
        className="fill-success/10 stroke-foreground/45"
        strokeWidth="2"
        strokeLinejoin="miter"
      />
      <rect x="25" y="31" width="2" height="16" className="fill-background/80" />
      <rect x="25" y="50" width="2" height="4" className="fill-background/80" />
    </g>
  )
}

function Plank() {
  return (
    <>
      <rect x="6" y="66" width="68" height="3" className="fill-melon-green/35" />
      <rect x="6" y="69" width="68" height="1" className="fill-melon-green/20" />
    </>
  )
}

function Lid({ className }: { className?: string }) {
  return (
    <g className={cn(styles.part, className)}>
      <rect x="34" y="11" width="12" height="4" className="fill-melon-green" />
      <rect x="22" y="15" width="36" height="7" className="fill-melon-green" />
      <rect x="22" y="20" width="36" height="2" className="fill-success" />
      <rect x="24" y="16" width="4" height="2" className="fill-success/70" />
      <rect x="32" y="16" width="4" height="2" className="fill-success/70" />
      <rect x="40" y="16" width="4" height="2" className="fill-success/70" />
      <rect x="48" y="16" width="4" height="2" className="fill-success/70" />
    </g>
  )
}

function Seal({ className }: { className?: string }) {
  return (
    <g className={cn(styles.part, className)}>
      <circle cx="40" cy="25" r="6" className="fill-melon-red" shapeRendering="auto" />
      <circle cx="40" cy="25" r="4" className="fill-none stroke-background/50" strokeWidth="1" shapeRendering="auto" />
      <ellipse cx="40" cy="25" rx="1.3" ry="2" className="fill-foreground" shapeRendering="auto" />
    </g>
  )
}

/** The worry folded in half: the lower half of the page, with the upper half laid over it. */
function FoldedSlip({ className }: { className?: string }) {
  return (
    <g className={cn(styles.part, className)}>
      <rect x="31" y="50" width="18" height="10" className={styles.paperFill} />
      <rect x="31" y="50" width="18" height="1" className="fill-foreground/25" />
      <rect x="34" y="53" width="11" height="1" className={styles.inkFaint} />
      <rect x="34" y="56" width="8" height="1" className={styles.inkFaint} />
    </g>
  )
}

/**
 * Sealing, as one beat: the open page folds in half, drops into the jar, the lid comes down
 * and the wax is pressed. Each part rests in its final place, so without motion it is simply sealed.
 */
function SealingScene({ plank }: { plank: boolean }) {
  return (
    <>
      {plank && <Plank />}
      <Glass className={styles.jarSettle} />
      <Lid className={styles.lidDown} />
      <g className={styles.dropIn}>
        <rect x="31" y="50" width="18" height="10" className={styles.paperFill} />
        <rect x="34" y="53" width="11" height="1" className={styles.inkFill} />
        <rect x="34" y="56" width="8" height="1" className={styles.inkFill} />
        <g className={cn(styles.flap, styles.foldFlap)}>
          <rect x="31" y="40" width="18" height="10" className={styles.paperFill} />
          <rect x="34" y="43" width="12" height="1" className={styles.inkFill} />
          <rect x="34" y="46" width="10" height="1" className={styles.inkFill} />
        </g>
        <rect x="31" y="50" width="18" height="1" className="fill-foreground/25" />
      </g>
      <Seal className={styles.stamp} />
    </>
  )
}

/** A small pixel jar with a watermelon-rind lid and a red wax seal. Purely decorative. */
export function Jar({ scene, motion, plank = true, className }: JarProps) {
  const still = motion ? scene : scene === 'sealing' ? 'sealed' : scene === 'opening' ? 'opened' : scene
  const hasSlip = still !== 'waiting' && still !== 'opened' && still !== 'sealing'
  const hasSeal = still === 'sealed' || still === 'ready' || still === 'opening'
  const lidClass =
    still === 'waiting' || still === 'filled' ? styles.lidLifted
      : still === 'opening' ? cn(styles.lidOff, styles.lidUp)
        : still === 'opened' ? styles.lidOff
          : undefined

  return (
    <svg
      viewBox={still === 'sealing' ? '0 -30 80 102' : '0 0 80 72'}
      className={cn(motion && styles.motion, className)}
      aria-hidden="true"
      focusable="false"
      shapeRendering="crispEdges"
    >
      {still === 'sealing' ? (
        <SealingScene plank={plank} />
      ) : (
        <>
          {still === 'ready' && <circle cx="40" cy="42" r="32" className={styles.glow} shapeRendering="auto" />}
          {plank && <Plank />}
          <Glass />
          {hasSlip && <FoldedSlip className={cn(still === 'opening' && styles.slipRise)} />}
          <Lid className={lidClass} />
          {hasSeal && <Seal className={cn(still === 'opening' && styles.sealAway)} />}
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
      <rect x="6" y="66" width="116" height="3" className="fill-melon-green/35" />
      <rect x="6" y="69" width="116" height="1" className="fill-melon-green/20" />
      <g transform="translate(4 0)">
        <Glass />
        <Lid className={styles.lidLifted} />
      </g>
      <g transform="rotate(-5 100 46)">
        <rect x="82" y="25" width="34" height="40" className={styles.paperFill} />
        <rect x="82" y="25" width="34" height="40" className="fill-none stroke-foreground/20" strokeWidth="1" />
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
        <rect x="104" y="56" width="18" height="4" className="fill-warm" />
        <rect x="104" y="56" width="18" height="1" className="fill-foreground/20" />
        <rect x="122" y="56" width="3" height="4" className="fill-melon-red/70" />
        <path d="M104 56 L99 58 L104 60 Z" className={styles.paperFill} shapeRendering="auto" />
        <rect x="99" y="57.5" width="1.5" height="1" className="fill-foreground/70" />
      </g>
    </svg>
  )
}

/** With motion off, sealing is told in three still frames instead of one moving one. */
export function SealSteps({ className }: { className?: string }) {
  const frame = 'flex w-[5.25rem] flex-col items-center gap-1'
  const arrow = <span className="pb-6 text-foreground/50">›</span>
  return (
    <div className={cn('flex items-end justify-center gap-2', className)} aria-hidden="true">
      <div className={frame}>
        <svg viewBox="22 36 36 30" className="h-16 w-full" focusable="false" shapeRendering="crispEdges">
          <FoldedSlip />
        </svg>
        <span className="text-xs text-foreground/75">Folded</span>
      </div>
      {arrow}
      <div className={frame}>
        <Jar scene="filled" motion={false} plank={false} className="h-16 w-full" />
        <span className="text-xs text-foreground/75">Set inside</span>
      </div>
      {arrow}
      <div className={frame}>
        <Jar scene="sealed" motion={false} plank={false} className="h-16 w-full" />
        <span className="text-xs font-semibold text-foreground">Sealed</span>
      </div>
    </div>
  )
}
