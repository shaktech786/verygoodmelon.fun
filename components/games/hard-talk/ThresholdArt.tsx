import { cn } from '@/lib/utils/cn'

interface ThresholdArtProps {
  /** 0 at the first step, 1 at the last: the door opens and the envoy walks up to it. */
  progress: number
  reducedMotion: boolean
}

const FLOOR_Y = 88
const DOOR_X = 100
const DOOR_TOP = 22
const DOOR_W = 34

/** A melon-slice envoy holding a folded note, standing at a door that opens as the steps go by. */
export function ThresholdArt({ progress, reducedMotion }: ThresholdArtProps) {
  const open = Math.min(1, Math.max(0, progress))
  const panelW = DOOR_W * (1 - open * 0.82)
  const walk = 34 * open
  const motion = reducedMotion ? undefined : 'transform 700ms ease-in-out, width 700ms ease-in-out, opacity 700ms ease-in-out'

  return (
    <svg viewBox="0 0 160 100" className="pixelated mx-auto h-auto w-full max-w-[15rem] sm:max-w-xs" aria-hidden="true" focusable="false">
      <rect x="8" y={FLOOR_Y} width="144" height="3" className="fill-card-border" />

      <path
        d={`M${DOOR_X} ${FLOOR_Y + 3} L${DOOR_X + DOOR_W} ${FLOOR_Y + 3} L${DOOR_X + DOOR_W + 4} 99 L${DOOR_X - 6 - 40 * open} 99 Z`}
        className="fill-warm"
        style={{ opacity: open * 0.45, transition: motion }}
      />

      <rect x={DOOR_X} y={DOOR_TOP} width={DOOR_W} height={FLOOR_Y - DOOR_TOP} className="fill-warm" />
      <rect x={DOOR_X + 4} y={DOOR_TOP + 4} width={DOOR_W - 8} height={FLOOR_Y - DOOR_TOP - 4} className="fill-background" style={{ opacity: 0.25 }} />

      <rect x={DOOR_X + DOOR_W - panelW} y={DOOR_TOP} height={FLOOR_Y - DOOR_TOP} width={panelW} className="fill-melon-green" style={{ transition: motion }} />
      <rect
        x={DOOR_X + DOOR_W - panelW + 3}
        y={DOOR_TOP + 4}
        height={FLOOR_Y - DOOR_TOP - 8}
        width={Math.max(0, panelW - 6)}
        className="fill-success"
        style={{ opacity: 0.5, transition: motion }}
      />
      <rect
        x={DOOR_X + DOOR_W - panelW + 2}
        y={(DOOR_TOP + FLOOR_Y) / 2 + 2}
        width="2"
        height="4"
        className="fill-foreground"
        style={{ opacity: panelW > 8 ? 1 : 0, transition: motion }}
      />

      <rect x={DOOR_X - 4} y={DOOR_TOP - 4} width="4" height={FLOOR_Y - DOOR_TOP + 4} className="fill-melon-green" />
      <rect x={DOOR_X + DOOR_W} y={DOOR_TOP - 4} width="4" height={FLOOR_Y - DOOR_TOP + 4} className="fill-melon-green" />
      <rect x={DOOR_X - 4} y={DOOR_TOP - 4} width={DOOR_W + 8} height="4" className="fill-melon-green" />

      <g style={{ transform: `translateX(${walk}px)`, transition: motion }}>
        <Envoy />
      </g>
    </svg>
  )
}

/** The melon-slice envoy with its folded note, standing on the floor line. */
function Envoy() {
  return (
    <>
      <rect x="30" y="73" width="3" height={FLOOR_Y - 73} className="fill-foreground" />
      <rect x="43" y="73" width="3" height={FLOOR_Y - 73} className="fill-foreground" />
      <path d="M20 56 A18 18 0 0 0 56 56 Z" className="fill-melon-green" />
      <path d="M22 56 A16 16 0 0 0 54 56 Z" className="fill-success" />
      <path d="M24.5 56 A13.5 13.5 0 0 0 51.5 56 Z" className="fill-melon-red" />
      <rect x="30" y="59" width="2.5" height="3" className="fill-foreground" />
      <rect x="43.5" y="59" width="2.5" height="3" className="fill-foreground" />
      <path d="M34.5 64.5 Q38 67 41.5 64.5" className="fill-none stroke-foreground" strokeWidth="1.2" strokeLinecap="round" />
      <ellipse cx="31" cy="66.5" rx="0.9" ry="1.4" className="fill-foreground" style={{ opacity: 0.7 }} />
      <ellipse cx="45" cy="66.5" rx="0.9" ry="1.4" className="fill-foreground" style={{ opacity: 0.7 }} />
      <ellipse cx="38" cy="69.5" rx="0.9" ry="1.4" className="fill-foreground" style={{ opacity: 0.7 }} />
      <rect x="53" y="63" width="5" height="1.5" className="fill-melon-green" />
      <rect x="57" y="58" width="11" height="9" className="fill-card-bg stroke-foreground" strokeWidth="1" />
      <rect x="59" y="60.5" width="7" height="1" className="fill-foreground" style={{ opacity: 0.6 }} />
      <rect x="59" y="63" width="5" height="1" className="fill-foreground" style={{ opacity: 0.6 }} />
    </>
  )
}

const STEP_DOOR_X = 86
const STEP_DOOR_W = 36
const STEP_DOOR_TOP = 14
/** How far the door swings: enough to let a line of light through, no further. */
const CRACK = 0.8

const STEP_OUT_STYLE = `
@keyframes plain-speaker-crack { from { transform: scaleX(1) } to { transform: scaleX(${CRACK}) } }
@keyframes plain-speaker-spill { from { opacity: 0 } to { opacity: 0.5 } }
.plain-speaker-crack { animation: plain-speaker-crack 1300ms ease-in-out 250ms both }
.plain-speaker-spill { animation: plain-speaker-spill 1300ms ease-in-out 250ms both }
`

/** The envoy at a closed door that opens just a crack; with reduced motion it is simply already ajar. */
export function StepOutArt({ reducedMotion }: { reducedMotion: boolean }) {
  const hinge = { transformBox: 'fill-box', transformOrigin: 'left center', transform: `scaleX(${CRACK})` } as const
  const gap = STEP_DOOR_X + STEP_DOOR_W * CRACK
  return (
    <svg viewBox="0 0 140 100" className="pixelated mx-auto h-auto w-full max-w-[16rem] sm:max-w-xs" aria-hidden="true" focusable="false">
      {!reducedMotion && <style>{STEP_OUT_STYLE}</style>}
      <rect x="4" y={FLOOR_Y} width="132" height="3" className="fill-card-border" />
      <path
        d={`M${gap} ${FLOOR_Y + 3} L${STEP_DOOR_X + STEP_DOOR_W} ${FLOOR_Y + 3} L${STEP_DOOR_X + STEP_DOOR_W + 10} 99 L${gap - 14} 99 Z`}
        className={cn('fill-warm', !reducedMotion && 'plain-speaker-spill')}
        style={{ opacity: 0.5 }}
      />
      <rect x={STEP_DOOR_X} y={STEP_DOOR_TOP} width={STEP_DOOR_W} height={FLOOR_Y - STEP_DOOR_TOP} className="fill-warm" />
      <g className={cn(!reducedMotion && 'plain-speaker-crack')} style={hinge}>
        <rect x={STEP_DOOR_X} y={STEP_DOOR_TOP} width={STEP_DOOR_W} height={FLOOR_Y - STEP_DOOR_TOP} className="fill-melon-green" />
        <rect x={STEP_DOOR_X + 4} y={STEP_DOOR_TOP + 5} width={STEP_DOOR_W - 8} height={FLOOR_Y - STEP_DOOR_TOP - 10} className="fill-success" style={{ opacity: 0.5 }} />
        <rect x={STEP_DOOR_X + STEP_DOOR_W - 6} y={(STEP_DOOR_TOP + FLOOR_Y) / 2 + 2} width="2.5" height="5" className="fill-foreground" />
      </g>
      <rect x={STEP_DOOR_X - 4} y={STEP_DOOR_TOP - 4} width="4" height={FLOOR_Y - STEP_DOOR_TOP + 4} className="fill-melon-green" />
      <rect x={STEP_DOOR_X + STEP_DOOR_W} y={STEP_DOOR_TOP - 4} width="4" height={FLOOR_Y - STEP_DOOR_TOP + 4} className="fill-melon-green" />
      <rect x={STEP_DOOR_X - 4} y={STEP_DOOR_TOP - 4} width={STEP_DOOR_W + 8} height="4" className="fill-melon-green" />
      <g transform="translate(8 0)">
        <Envoy />
      </g>
    </svg>
  )
}

interface BreathMelonProps {
  breathingIn: boolean
  reducedMotion: boolean
}

/** Swells while the player says they are breathing in and settles as they breathe out, at their pace. */
export function BreathMelon({ breathingIn, reducedMotion }: BreathMelonProps) {
  return (
    <div className="flex h-36 sm:h-44 items-center justify-center" aria-hidden="true">
      <svg
        viewBox="0 0 100 100"
        className={cn(
          'h-full w-auto',
          !reducedMotion && 'transition-transform duration-[2500ms] ease-in-out',
          breathingIn ? 'scale-100' : 'scale-[0.72]',
        )}
      >
        <circle cx="50" cy="50" r="46" className="fill-melon-green" />
        <circle cx="50" cy="50" r="40" className="fill-success" />
        <circle cx="50" cy="50" r="35" className="fill-melon-red" />
        <ellipse cx="38" cy="40" rx="2.4" ry="3.6" className="fill-foreground" />
        <ellipse cx="62" cy="40" rx="2.4" ry="3.6" className="fill-foreground" />
        <ellipse cx="50" cy="60" rx="2.4" ry="3.6" className="fill-foreground" />
        <ellipse cx="36" cy="62" rx="2.4" ry="3.6" className="fill-foreground" />
        <ellipse cx="64" cy="62" rx="2.4" ry="3.6" className="fill-foreground" />
      </svg>
    </div>
  )
}
