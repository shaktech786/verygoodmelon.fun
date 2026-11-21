import { cn } from '@/lib/utils/cn'
import styles from './Keeper.module.css'

export type JarScene = 'waiting' | 'sealing' | 'sealed' | 'ready' | 'opening' | 'opened'

interface JarProps {
  scene: JarScene
  motion: boolean
  plank?: boolean
  className?: string
}

/** A small pixel jar with a watermelon-rind lid and a red wax seal. Purely decorative. */
export function Jar({ scene, motion, plank = true, className }: JarProps) {
  const still = motion ? scene : scene === 'sealing' ? 'sealed' : scene === 'opening' ? 'opened' : scene
  const hasSlip = still === 'sealing' || still === 'sealed' || still === 'ready' || still === 'opening'
  const hasSeal = still === 'sealing' || still === 'sealed' || still === 'ready' || still === 'opening'
  const lidClass =
    still === 'waiting' ? styles.lidLifted
      : still === 'sealing' ? styles.lidDown
        : still === 'opening' ? cn(styles.lidOff, styles.lidUp)
          : still === 'opened' ? styles.lidOff
            : undefined

  return (
    <svg
      viewBox="0 0 80 72"
      className={cn(motion && styles.motion, className)}
      aria-hidden="true"
      focusable="false"
      shapeRendering="crispEdges"
    >
      {still === 'ready' && <circle cx="40" cy="42" r="32" className={styles.glow} shapeRendering="auto" />}

      {plank && (
        <>
          <rect x="6" y="66" width="68" height="3" className="fill-melon-green/35" />
          <rect x="6" y="69" width="68" height="1" className="fill-melon-green/20" />
        </>
      )}

      {/* Glass body with stepped, pixel corners */}
      <path
        d="M26 24 H54 V26 H57 V28 H59 V62 H57 V64 H55 V66 H25 V64 H23 V62 H21 V28 H23 V26 H26 Z"
        className="fill-success/10 stroke-foreground/45"
        strokeWidth="2"
        strokeLinejoin="miter"
      />
      <rect x="25" y="31" width="2" height="16" className="fill-background/80" />
      <rect x="25" y="50" width="2" height="4" className="fill-background/80" />

      {hasSlip && (
        <g className={cn(styles.part, still === 'sealing' && styles.slipDrop, still === 'opening' && styles.slipRise)}>
          <rect x="31" y="42" width="18" height="18" className={styles.paperFill} />
          <rect x="31" y="50" width="18" height="1" className="fill-foreground/20" />
          <rect x="34" y="45" width="11" height="1" className={styles.inkFill} />
          <rect x="34" y="54" width="9" height="1" className={styles.inkFill} />
          <rect x="34" y="57" width="12" height="1" className={styles.inkFill} />
        </g>
      )}

      <g className={cn(styles.part, lidClass)}>
        <rect x="34" y="11" width="12" height="4" className="fill-melon-green" />
        <rect x="22" y="15" width="36" height="7" className="fill-melon-green" />
        <rect x="22" y="20" width="36" height="2" className="fill-success" />
        <rect x="24" y="16" width="4" height="2" className="fill-success/70" />
        <rect x="32" y="16" width="4" height="2" className="fill-success/70" />
        <rect x="40" y="16" width="4" height="2" className="fill-success/70" />
        <rect x="48" y="16" width="4" height="2" className="fill-success/70" />
      </g>

      {hasSeal && (
        <g className={cn(styles.part, still === 'sealing' && styles.stamp, still === 'opening' && styles.sealAway)}>
          <circle cx="40" cy="25" r="6" className="fill-melon-red" shapeRendering="auto" />
          <circle cx="40" cy="25" r="4" className="fill-none stroke-background/50" strokeWidth="1" shapeRendering="auto" />
          <ellipse cx="40" cy="25" rx="1.3" ry="2" className="fill-foreground" shapeRendering="auto" />
        </g>
      )}
    </svg>
  )
}
