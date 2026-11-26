import { EnemyTier } from '@/types/thought-pockets'

/**
 * Each bias is a 16x16 pixel emblem of the habit it stands for, drawn in the site's melon palette.
 * Letters map to theme colours, so every emblem follows light and dark mode.
 */
const INK: Record<string, string> = {
  k: 'var(--tp-text)',
  w: 'var(--tp-paper)',
  r: 'var(--clay)',
  g: 'var(--moss)',
  l: 'var(--rind)',
  y: 'var(--brass)',
  b: 'var(--dusk)',
}

export const EMBLEMS: Record<string, string[]> = {
  // A frog mid-leap, landing before it has looked.
  jumping_to_conclusions: [
    '................',
    '................',
    '..........kk.kk.',
    '.........kwkkwk.',
    '.........kkkkkk.',
    '........kggggggk',
    '...r....kggrrggk',
    '..r....kgggggggk',
    '.r....kggggggk..',
    'r....kgglllggk..',
    '....kgglllggk...',
    '...kgggggggk....',
    '..kgk.kgk.......',
    '.kgk...kgk......',
    '.kk.....kk......',
    '................',
  ],
  // A thought going round and round its loop, with the worry at its centre.
  rumination: [
    '................',
    '.....kkkkk......',
    '...kkbbbbbkk....',
    '..kbbkkkkkbbk...',
    '.kbbk.....kbbk..',
    '.kbk.......kbk..',
    'kbbk...y...kbbk.',
    'kbk...yyy...kbk.',
    'kbk...yyy...kbk.',
    'kbbk...y...kbbk.',
    '.kbk.......kbk..',
    '.kbbk.....kbbkk.',
    '..kbbkkkkkbbkbbk',
    '...kkbbbbbkkbbk.',
    '.....kkkkk..kk..',
    '................',
  ],
  // A molehill, and the mountain it is imagined to be looming over it.
  catastrophizing: [
    '................',
    '.......k........',
    '......kwk.......',
    '.....kwwwk......',
    '....kbbbbbk.....',
    '...kbbbbbbbk....',
    '..kbbbbbbbbbk...',
    '.kbbbbbbbbbbbk..',
    'kbbbbbbbbbbbbbk.',
    '................',
    '................',
    '................',
    '.......kk.......',
    '......kggk......',
    'kkkkkkkkkkkkkkkk',
    '................',
  ],
  // A coin still sinking: what is spent is already gone.
  sunk_cost: [
    '................',
    'b.b.b.b.b.b.b.b.',
    '.b.b.b.b.b.b.b.b',
    '................',
    '......b.........',
    '.........b......',
    '.....b..........',
    '......kkkk......',
    '.....kyyyyk.....',
    '....kyykkyyk....',
    '....kyykyyyk....',
    '....kyyykkyk....',
    '....kyykkyyk....',
    '.....kyyyyk.....',
    '......kkkk......',
    '................',
  ],
  // A crown far too big for the head under it.
  dunning_kruger: [
    '................',
    '.y....y..y....y.',
    '.yy..yyyyyy..yy.',
    '.yyyyyyyyyyyyyy.',
    '.yryyyyryyyyyry.',
    '.kkkkkkkkkkkkkk.',
    '......kwwk......',
    '.....kwwwwk.....',
    '.....kwkwkk.....',
    '.....kwwwwk.....',
    '......kkkk......',
    '.....kggggk.....',
    '....kggggggk....',
    '....kggggggk....',
    '.....k....k.....',
    '................',
  ],
  // A magnifying glass that only ever finds a tick.
  confirmation_bias: [
    '................',
    '....kkkkkk......',
    '...kwwwwwwk.....',
    '..kwwwwwwwwk....',
    '.kwwwwwwwwgwk...',
    '.kwwwwwwwggwk...',
    '.kwwgwwwggwwk...',
    '.kwwggwggwwwk...',
    '.kwwwgggwwwwk...',
    '..kwwwgwwwwk....',
    '...kwwwwwwkk....',
    '....kkkkkkkkk...',
    '...........kkk..',
    '............kkk.',
    '.............kk.',
    '................',
  ],
  // The sun on the horizon: it rose every day so far.
  problem_of_induction: [
    '................',
    '.......yy.......',
    '..y....yy....y..',
    '...y........y...',
    '................',
    '......yyyy......',
    '.y..yyyyyyyy..y.',
    '....yyyyyyyy....',
    '...yyyyyyyyyy...',
    'kkkkkkkkkkkkkkkk',
    '................',
    '.bbbb..bbbb..bb.',
    '................',
    '...bbb...bbbb...',
    '................',
    '.....bb...bb....',
  ],
  // An arrow caught at every instant of its flight.
  zenos_arrow: [
    '................',
    '................',
    '..w...w...w.....',
    '..w...w...w.....',
    '...........k....',
    '...........kk...',
    'r.r........kyk..',
    '.rrkkkkkkkkkyyk.',
    '.rrkkkkkkkkkyyk.',
    'r.r........kyk..',
    '...........kk...',
    '...........k....',
    '..w...w...w.....',
    '..w...w...w.....',
    '................',
    '................',
  ],
  // An anchor: the first number drags the rest.
  anchoring: [
    '................',
    '.......kk.......',
    '......k..k......',
    '......k..k......',
    '.......kk.......',
    '....kkkkkkkk....',
    '.......kk.......',
    '.......kk.......',
    '.......kk.......',
    '.......kk.......',
    '.k.....kk.....k.',
    '.kk....kk....kk.',
    '..kk...kk...kk..',
    '...kkk.kk.kkk...',
    '.....kkkkkk.....',
    '................',
  ],
  // A wagon with every flag flying the same way.
  bandwagon: [
    '................',
    '..rr....rr....rr',
    '..rrr...rrr...rr',
    '..k.....k.....k.',
    '..k.....k.....k.',
    '.kkkkkkkkkkkkkk.',
    '.kyyyyyyyyyyyyk.',
    '.kyykyykyykyyyk.',
    '.kyyyyyyyyyyyyk.',
    '.kkkkkkkkkkkkkk.',
    '...kkk....kkk...',
    '..kwkwk..kwkwk..',
    '..kkwkk..kkwkk..',
    '...kkk....kkk...',
    '................',
    '................',
  ],
  // A lightning bolt in a thought: vivid, not likely.
  availability: [
    '................',
    '....kkk..kkk....',
    '..kkwwwkkwwwkk..',
    '.kwwwwwwwyywwwk.',
    '.kwwwwwwyywwwwk.',
    '.kwwwwwyyyyywwk.',
    '..kwwwwwwyywwk..',
    '.kwwwwwwyywwwwk.',
    '.kwwwwwyywwwwwk.',
    '..kkwwwwwwwwkk..',
    '....kkkkkkkk....',
    '................',
    '...kk...........',
    '...kk...........',
    '.kk.............',
    '.kk.............',
  ],
  // A boomerang on its way back.
  backfire: [
    '................',
    '.kk.............',
    '.kyk............',
    '.kyyk...........',
    '..kyyk..........',
    '...kyyk.........',
    '....kyyk........',
    '.....kyyk.......',
    '......kyykkkkkk.',
    '.......kyyyyyyk.',
    '........kkkkkkk.',
    '................',
    '..rrrr..........',
    '.r....r.........',
    '.r......r.......',
    '..r...rrrr......',
  ],
  // A heap of sand, still falling one grain at a time.
  sorites: [
    '................',
    '.......y........',
    '................',
    '.......y........',
    '................',
    '.......y........',
    '.......yy.......',
    '......yyyy......',
    '.....yyykyy.....',
    '....yyyyyyyy....',
    '...yyykyyyyyy...',
    '..yyyyyyyykyyy..',
    '.yyykyyyyyyyyyy.',
    'kkkkkkkkkkkkkkkk',
    '................',
    '................',
  ],
  // A donkey between two haystacks, unable to pick either.
  buridans_ass: [
    '................',
    '......k....k....',
    '......kk..kk....',
    '......kwk.kwk...',
    '.......kkkkk....',
    '......kwwwwwk...',
    '......kwkwkwk...',
    '......kwwwwwk...',
    '.......kwwwk....',
    '.......kwkwk....',
    '........kkk.....',
    '................',
    '.yy..........yy.',
    'yyyy........yyyy',
    'yyyyy......yyyyy',
    'kkkkkkkkkkkkkkkk',
  ],
  // A die that has no memory of its last roll.
  gamblers_fallacy: [
    '................',
    '.kkkkkkkkkkkkkk.',
    '.kwwwwwwwwwwwwk.',
    '.kwrrwwwwwwrrwk.',
    '.kwrrwwwwwwrrwk.',
    '.kwwwwwwwwwwwwk.',
    '.kwwwwwwwwwwwwk.',
    '.kwwwwwrrwwwwwk.',
    '.kwwwwwrrwwwwwk.',
    '.kwwwwwwwwwwwwk.',
    '.kwwwwwwwwwwwwk.',
    '.kwrrwwwwwwrrwk.',
    '.kwrrwwwwwwrrwk.',
    '.kwwwwwwwwwwwwk.',
    '.kkkkkkkkkkkkkk.',
    '................',
  ],
  // A wall, and a sprout waiting on the other side of it.
  status_quo: [
    '................',
    'kkkkkkkkkkkkkkkk',
    'kwwwwwkwwwwwkwwk',
    'kkkkkkkkkkkkkkkk',
    'kwwkwwwwwkwwwwwk',
    'kkkkkkkkkkkkkkkk',
    'kwwwwwkwwwwwkwwk',
    'kkkkkkkkkkkkkkkk',
    'kwwkwwwwwkwwwwwk',
    'kkkkkkkkkkkkkkkk',
    '................',
    '.....l..........',
    '....lgl.........',
    '.....g..........',
    '.....g..........',
    'gggggggggggggggg',
  ],
  // A halo so bright you stop looking at the face.
  halo_effect: [
    '................',
    '....yyyyyyyy....',
    '...y........y...',
    '....yyyyyyyy....',
    '................',
    '.....kkkkkk.....',
    '....kwwwwwwk....',
    '....kwkwwkwk....',
    '....kwwwwwwk....',
    '....kwrwwrwk....',
    '....kwwrrwwk....',
    '.....kkkkkk.....',
    '......kwwk......',
    '....kkwwwwkk....',
    '...kwwwwwwwwk...',
    '...kkkkkkkkkk...',
  ],
  // A heart with the arrow already chosen.
  motivated_reasoning: [
    '................',
    '................',
    '...rrr...rrr....',
    '..rrrrr.rrrrr...',
    '..rrwrrrrrrrr...',
    '..rrrrrrrrrrr...',
    '...rrrrrrrrr....',
    '....rrrrrrr.....',
    '.....rrrrrk.....',
    '......rrrk......',
    '.......rk.......',
    '........k.......',
    '.........k......',
    '..........k.kk..',
    '...........kk...',
    '..........k.k...',
  ],
  // A slice of melon and the biggest question of all.
  meaning_of_life: [
    '......kkk.......',
    '.....k...k......',
    '.........k......',
    '........k.......',
    '.......k........',
    '................',
    '.......k........',
    'rrrrrrrrrrrrrrrr',
    'rrrkrrrrrrrrkrrr',
    '.rrrrrrkrrrrrrr.',
    '.rrkrrrrrrrkrrr.',
    '..rrrrrkrrrrrr..',
    '...rrrrrrrrrr...',
    '....llllllll....',
    '.....gggggg.....',
    '................',
  ],
  // The predictor's eye over two boxes: one open, one that may hold everything.
  newcomb: [
    '................',
    '.....kkkkkk.....',
    '....kwwkkwwk....',
    '.....kkkkkk.....',
    '................',
    '.kkkkkk..kkkkkk.',
    '.kwwwwk..kbbbbk.',
    '.kwyywk..kbkkbk.',
    '.kwyywk..kkbbkk.',
    '.kwwwwk..kbbkbk.',
    '.kwyywk..kbkbbk.',
    '.kwyywk..kbbbbk.',
    '.kwwwwk..kbkbbk.',
    '.kwwwwk..kbbbbk.',
    '.kkkkkk..kkkkkk.',
    '................',
  ],
}

/** One rect per run of same-coloured pixels keeps the SVG small. */
function runs(rows: string[]): { x: number; y: number; w: number; fill: string }[] {
  const out: { x: number; y: number; w: number; fill: string }[] = []
  rows.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const ch = row[x]
      let end = x + 1
      while (end < row.length && row[end] === ch) end++
      if (INK[ch]) out.push({ x, y, w: end - x, fill: INK[ch] })
      x = end
    }
  })
  return out
}

const FRAME: Record<EnemyTier, { outer: string; inner: string }> = {
  normal: { outer: 'var(--tp-line)', inner: 'var(--tp-line)' },
  elite: { outer: 'var(--clay)', inner: 'var(--tp-line)' },
  boss: { outer: 'var(--moss)', inner: 'var(--rind)' },
}

/**
 * How a bias holds up: idle; shaken (doubled a pixel to each side, as if trembling); or giving way
 * (sunk two pixels, with a sigh rising from it). Every state is a still frame, so reduced motion keeps it.
 */
export type Mood = 'idle' | 'shaken' | 'gives'

/**
 * Cracks across the whole portrait, one more for each quarter of its Resolve lost: pixel lines in portrait coordinates, each running
 * in from the frame. Over the emblem's ink a crack is a paper-coloured split; over paper and frame it is a dark line.
 */
const CRACKS: [number, number][][] = [
  [
    [16, 0],
    [16, 1],
    [15, 2],
    [15, 3],
    [14, 4],
    [14, 5],
    [13, 6],
    [13, 7],
    [12, 8],
    [12, 9],
    [11, 10],
  ],
  [
    [0, 12],
    [1, 12],
    [2, 11],
    [3, 11],
    [4, 12],
    [5, 12],
    [6, 11],
    [7, 11],
    [8, 12],
    [9, 12],
  ],
  [
    [9, 21],
    [9, 20],
    [10, 19],
    [10, 18],
    [9, 17],
    [10, 16],
    [11, 15],
    [12, 14],
    [13, 14],
  ],
]

/** How many cracks show: one for each quarter of its Resolve it has lost, at most three. */
export function crackCount(health: number, maxHealth: number): number {
  return Math.min(CRACKS.length, Math.floor((4 * (maxHealth - health)) / maxHealth))
}

/** How hard a hit lands on the portrait: the share of its whole Resolve one round took, as 0 to 3 lines of shake to each side. */
export function impactLines(damage: number, maxHealth: number): number {
  if (damage <= 0) return 0
  const share = damage / maxHealth
  return share < 0.1 ? 1 : share < 0.25 ? 2 : 3
}

const SHAKE_ROWS = [9, 5, 13]

const SINK = 2
const SIGH = [
  [15, 1],
  [17, 0],
  [13, 0],
]

function Pixels({ rows, x, y, opacity }: { rows: string[]; x: number; y: number; opacity?: number }) {
  return (
    <g transform={`translate(${x} ${y})`} opacity={opacity}>
      {runs(rows).map((p) => (
        <rect key={`${p.x}-${p.y}`} x={p.x} y={p.y} width={p.w} height="1" fill={p.fill} />
      ))}
    </g>
  )
}

/** Whether the emblem has ink at this pixel, in its own coordinates. */
function onInk(rows: string[], x: number, y: number): boolean {
  return (rows[y]?.[x] ?? '.') !== '.'
}

interface PortraitProps {
  enemyId: string
  tier: EnemyTier
  className?: string
  mood?: Mood
  /** Cracks for the Resolve it has lost, from crackCount. */
  cracks?: number
  /** Shake lines either side while a hit lands, from impactLines. */
  impact?: number
}

/** The emblem in a pixel frame: a plain frame for a bias, red corners for a stubborn one, a melon rind for a problem. */
export function BiasPortrait({ enemyId, tier, className, mood = 'idle', cracks = 0, impact = 0 }: PortraitProps) {
  const frame = FRAME[tier]
  const rows = EMBLEMS[enemyId] ?? []
  const sunk = mood === 'gives' ? SINK : 0
  const drawn = rows.slice(0, rows.length - sunk)
  return (
    <svg viewBox="0 0 22 22" className={className ?? 'h-16 w-16'} shapeRendering="crispEdges" aria-hidden="true" focusable="false" data-mood={mood}>
      <rect x="0" y="0" width="22" height="22" fill="var(--tp-paper)" />
      <rect x="0.5" y="0.5" width="21" height="21" fill="none" stroke={frame.outer} strokeWidth="1" />
      <rect x="1.5" y="1.5" width="19" height="19" fill="none" stroke={frame.inner} strokeWidth="1" />
      {tier === 'elite' &&
        [
          [0, 0],
          [19, 0],
          [0, 19],
          [19, 19],
        ].map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="3" height="3" fill="var(--clay)" />)}
      {mood === 'idle' && <Pixels rows={rows} x={3} y={3} />}
      {mood === 'shaken' && (
        <>
          <Pixels rows={rows} x={2} y={3} opacity={0.35} />
          <Pixels rows={rows} x={4} y={3} opacity={0.35} />
          <Pixels rows={rows} x={3} y={3} />
        </>
      )}
      {mood === 'gives' && (
        <>
          <Pixels rows={drawn} x={3} y={3 + SINK} opacity={0.8} />
          <g transform="translate(3 3)">
            {SIGH.map(([x, y]) => (
              <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="var(--tp-muted)" />
            ))}
          </g>
        </>
      )}
      {cracks > 0 && (
        <g data-testid="cracks" data-cracks={cracks}>
          {CRACKS.slice(0, cracks)
            .flat()
            .map(([x, y]) => (
              <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={onInk(drawn, x - 3, y - 3 - sunk) ? 'var(--tp-paper)' : 'var(--tp-text)'} />
            ))}
        </g>
      )}
      {impact > 0 && (
        <g className="tp-shake-lines" data-impact={impact}>
          {SHAKE_ROWS.slice(0, impact).flatMap((y) => [
            <rect key={`l${y}`} x="0" y={y} width="1" height="3" fill="var(--tp-text)" />,
            <rect key={`r${y}`} x="21" y={y} width="1" height="3" fill="var(--tp-text)" />,
          ])}
        </g>
      )}
    </svg>
  )
}
