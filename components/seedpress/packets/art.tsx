import type { ReactNode } from 'react'

/**
 * Two-ink packet prints, one per game (docs/design-system/PLAN.md §6.2 and §9), drawn by hand on a
 * 240×320 canvas. Ink A is the game's spot ink and ink B the second ink; both are set by the packet,
 * so every print follows the theme, Quiet, high contrast and greyscale. Mid-tones are the halftone
 * screens `a` and `b`; there are no gradients and no words in the art.
 */
export interface Screens {
  a: string
  b: string
}

export interface PacketPrint {
  a: ReactNode
  b: ReactNode
}

const ROUND = { strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none', stroke: 'currentColor' } as const

function patientOne(s: Screens): PacketPrint {
  return {
    a: (
      <>
        <circle cx="120" cy="140" r="78" fill={s.a} />
        <path d="M34 168 C60 262 180 262 206 168 C176 196 150 206 120 206 C90 206 64 196 34 168 Z" fill="currentColor" />
        <path d="M120 206 L120 250" {...ROUND} strokeWidth="8" />
      </>
    ),
    b: (
      <>
        <ellipse cx="92" cy="186" rx="11" ry="16" transform="rotate(-24 92 186)" fill="currentColor" />
        <ellipse cx="120" cy="192" rx="11" ry="16" fill="currentColor" />
        <ellipse cx="148" cy="186" rx="11" ry="16" transform="rotate(24 148 186)" fill="currentColor" />
        <path d="M52 182 C80 226 160 226 188 182" {...ROUND} strokeWidth="4" strokeDasharray="2 9" />
      </>
    ),
  }
}

function harmonist(s: Screens): PacketPrint {
  return {
    a: (
      <>
        <path d="M48 160 A72 72 0 0 0 192 160 Z" fill={s.a} />
        <path d="M48 160 A72 72 0 0 0 192 160" {...ROUND} strokeWidth="14" />
        <path d="M48 160 L192 160" {...ROUND} strokeWidth="5" />
        <ellipse cx="96" cy="182" rx="5" ry="8" fill="currentColor" />
        <ellipse cx="120" cy="196" rx="5" ry="8" fill="currentColor" />
        <ellipse cx="144" cy="182" rx="5" ry="8" fill="currentColor" />
      </>
    ),
    b: (
      <>
        <ellipse cx="120" cy="170" rx="100" ry="96" {...ROUND} strokeWidth="6" strokeDasharray="1 14" />
        <circle cx="120" cy="74" r="11" fill="currentColor" />
        <path d="M120 54 L120 40 M104 60 L96 50 M136 60 L144 50" {...ROUND} strokeWidth="5" />
      </>
    ),
  }
}

function gardener(s: Screens): PacketPrint {
  return {
    a: (
      <>
        <rect x="0" y="262" width="240" height="58" fill={s.a} />
        <path d="M118 266 C112 220 132 190 122 140" {...ROUND} strokeWidth="7" />
        <path d="M120 232 C92 230 74 212 70 190 C96 190 114 204 120 232 Z" fill="currentColor" />
        <path d="M122 210 C146 204 164 186 168 166 C144 168 126 184 122 210 Z" fill="currentColor" />
        <circle cx="122" cy="112" r="14" fill="currentColor" />
      </>
    ),
    b: (
      <>
        <circle cx="96" cy="100" r="30" fill="currentColor" />
        <circle cx="148" cy="100" r="30" fill="currentColor" />
        <circle cx="104" cy="126" r="28" fill="currentColor" />
        <circle cx="142" cy="126" r="28" fill="currentColor" />
      </>
    ),
  }
}

function sage(s: Screens): PacketPrint {
  return {
    a: (
      <>
        <path d="M26 128 Q74 112 120 134 L120 246 Q74 226 26 242 Z" fill={s.a} />
        <path d="M214 128 Q166 112 120 134 L120 246 Q166 226 214 242 Z" fill={s.a} />
        <path d="M26 128 Q74 112 120 134 Q166 112 214 128 L214 242 Q166 226 120 246 Q74 226 26 242 Z" {...ROUND} strokeWidth="7" />
        <path d="M120 134 L120 246" {...ROUND} strokeWidth="5" />
        <path d="M44 150 Q74 140 104 152 M44 170 Q74 160 104 172 M44 190 Q74 180 104 192" {...ROUND} strokeWidth="4" />
      </>
    ),
    b: (
      <>
        <path d="M138 214 C140 170 168 142 200 132 C202 170 178 202 138 214 Z" fill="currentColor" />
        <path d="M138 214 L192 142" {...ROUND} strokeWidth="3" style={{ stroke: 'var(--sheet)' }} />
        <path d="M128 226 L140 210" {...ROUND} strokeWidth="5" />
      </>
    ),
  }
}

function dilemma(s: Screens): PacketPrint {
  return {
    a: (
      <>
        <ellipse cx="120" cy="282" rx="96" ry="18" fill={s.a} />
        <path d="M120 276 L120 180 L70 104" {...ROUND} strokeWidth="18" />
        <path d="M44 112 L58 76 L92 94 Z" fill="currentColor" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" />
      </>
    ),
    b: (
      <>
        <path d="M120 222 L120 180 L170 104" {...ROUND} strokeWidth="18" />
        <path d="M196 112 L182 76 L148 94 Z" fill="currentColor" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" />
      </>
    ),
  }
}

function finalWord(s: Screens): PacketPrint {
  return {
    a: (
      <>
        <circle cx="120" cy="118" r="88" fill={s.a} />
        <path d="M96 150 L144 150 L144 254 L96 254 Z" fill="currentColor" />
        <path d="M144 150 L144 176 Q138 186 134 174 L134 150" fill="currentColor" />
        <path d="M58 262 Q120 248 182 262 L174 274 Q120 264 66 274 Z" fill="currentColor" />
      </>
    ),
    b: (
      <>
        <rect x="114" y="132" width="12" height="16" fill="currentColor" />
        <rect x="108" y="116" width="24" height="16" fill="currentColor" />
        <rect x="114" y="100" width="18" height="16" fill="currentColor" />
        <rect x="120" y="88" width="10" height="12" fill="currentColor" />
        <rect x="118" y="138" width="4" height="14" style={{ fill: 'var(--sheet)' }} />
      </>
    ),
  }
}

function awakening(s: Screens): PacketPrint {
  return {
    a: (
      <>
        <path d="M58 196 A62 62 0 0 1 182 196 Z" fill="currentColor" />
        <path d="M120 112 L120 92 M70 132 L56 118 M170 132 L184 118 M46 168 L28 164 M194 168 L212 164" {...ROUND} strokeWidth="7" />
        <path d="M84 220 L156 220 M100 240 L140 240 M112 258 L128 258" {...ROUND} strokeWidth="6" />
      </>
    ),
    b: (
      <>
        <rect x="0" y="198" width="240" height="122" fill={s.b} />
        <path d="M14 198 L226 198" {...ROUND} strokeWidth="6" />
      </>
    ),
  }
}

const PROFILE = 'M36 236 L36 128 C36 82 92 62 122 96 L134 128 L126 134 L132 148 L124 154 L128 170 C120 186 100 180 96 192 L96 236 Z'

function arena(s: Screens): PacketPrint {
  return {
    a: (
      <>
        <path d={PROFILE} fill="currentColor" />
        <rect x="20" y="246" width="200" height="40" fill={s.a} />
      </>
    ),
    b: (
      <>
        <path d={PROFILE} transform="translate(240 0) scale(-1 1)" fill="currentColor" />
        <circle cx="120" cy="58" r="10" fill="currentColor" />
      </>
    ),
  }
}

function plainSpeaker(s: Screens): PacketPrint {
  return {
    a: (
      <>
        <path d="M62 266 L62 60 L178 60 L178 266" {...ROUND} strokeWidth="12" />
        <path d="M74 70 L124 70 L124 260 L74 260 Z" fill="currentColor" />
        <path d="M134 70 L168 70 L168 260 L134 260 Z" fill={s.a} />
      </>
    ),
    b: (
      <>
        <path d="M20 268 L220 268" {...ROUND} strokeWidth="6" />
        <path d="M129 268 L118 312 M129 268 L142 312" {...ROUND} strokeWidth="3" strokeDasharray="2 7" />
        <circle cx="114" cy="168" r="6" fill="currentColor" />
      </>
    ),
  }
}

function keeper(s: Screens): PacketPrint {
  return {
    a: (
      <>
        <path d="M74 156 L166 156 L166 222 L74 222 Z" fill="currentColor" />
        <path d="M86 176 L154 176 M86 192 L138 192" {...ROUND} strokeWidth="5" style={{ stroke: 'var(--sheet)' }} />
      </>
    ),
    b: (
      <>
        <path d="M80 104 C60 116 56 140 56 168 L56 246 Q56 266 76 266 L164 266 Q184 266 184 246 L184 168 C184 140 180 116 160 104 Z" fill={s.b} />
        <path d="M80 104 C60 116 56 140 56 168 L56 246 Q56 266 76 266 L164 266 Q184 266 184 246 L184 168 C184 140 180 116 160 104" {...ROUND} strokeWidth="7" />
        <rect x="72" y="72" width="96" height="32" rx="6" fill="currentColor" />
        <path d="M88 80 L88 96 M104 80 L104 96 M120 80 L120 96 M136 80 L136 96 M152 80 L152 96" {...ROUND} strokeWidth="4" style={{ stroke: 'var(--sheet)' }} />
      </>
    ),
  }
}

/** A folded morning paper with the sun rising out of it. */
function optimist(s: Screens): PacketPrint {
  return {
    a: (
      <>
        <path d="M64 176 A56 56 0 0 1 176 176 Z" fill={s.a} />
        <path d="M64 176 A56 56 0 0 1 176 176" {...ROUND} strokeWidth="7" />
        <path d="M120 100 L120 78 M78 116 L64 100 M162 116 L176 100 M54 150 L34 144 M186 150 L206 144" {...ROUND} strokeWidth="7" />
        <circle cx="120" cy="150" r="9" fill="currentColor" />
      </>
    ),
    b: (
      <>
        <path d="M36 176 L204 168 L210 270 L42 282 Z" fill={s.b} />
        <path d="M36 176 L204 168 L210 270 L42 282 Z" {...ROUND} strokeWidth="7" />
        <path d="M120 172 L126 276" {...ROUND} strokeWidth="4" strokeDasharray="3 7" />
        <path d="M54 194 L104 191" {...ROUND} strokeWidth="10" />
        <path d="M56 214 L106 211 M57 230 L107 227 M58 246 L94 244 M140 188 L190 185 M141 206 L191 203 M142 222 L192 219 M143 238 L178 236" {...ROUND} strokeWidth="5" />
      </>
    ),
  }
}

function alchemist(s: Screens): PacketPrint {
  return {
    a: (
      <>
        <path d="M70 214 L170 214 L188 252 Q192 264 178 264 L62 264 Q48 264 52 252 Z" fill="currentColor" />
        <path d="M80 196 L160 196 L170 214 L70 214 Z" fill={s.a} />
      </>
    ),
    b: (
      <>
        <path d="M100 76 L100 146 L52 252 Q48 264 62 264 L178 264 Q192 264 188 252 L140 146 L140 76" {...ROUND} strokeWidth="8" />
        <path d="M90 76 L150 76" {...ROUND} strokeWidth="8" />
        <circle cx="132" cy="46" r="14" {...ROUND} strokeWidth="6" />
        <circle cx="114" cy="236" r="7" style={{ fill: 'var(--sheet)' }} />
      </>
    ),
  }
}

/** A fanned hand of argument cards, held up to a small horned bias creature. */
function philosopher(s: Screens): PacketPrint {
  const card = 'M66 168 L126 168 Q132 168 132 174 L132 262 Q132 268 126 268 L66 268 Q60 268 60 262 L60 174 Q60 168 66 168 Z'
  return {
    a: (
      <>
        <path d={card} transform="rotate(-22 96 300)" fill={s.a} />
        <path d={card} transform="rotate(-22 96 300)" {...ROUND} strokeWidth="5" />
        <path d={card} transform="rotate(0 96 300)" fill={s.a} />
        <path d={card} transform="rotate(0 96 300)" {...ROUND} strokeWidth="5" />
        <g transform="rotate(22 96 300)">
          <path d={card} style={{ fill: 'var(--sheet)' }} />
          <path d={card} {...ROUND} strokeWidth="6" />
          <path d="M96 196 L110 218 L96 240 L82 218 Z" fill="currentColor" />
        </g>
        <circle cx="160" cy="98" r="4.5" fill="currentColor" />
        <circle cx="184" cy="98" r="4.5" fill="currentColor" />
      </>
    ),
    b: (
      <>
        <path d="M134 110 C134 80 150 66 172 66 C194 66 210 80 210 110 C210 134 196 146 172 146 C148 146 134 134 134 110 Z" fill="currentColor" />
        <path d="M150 72 Q140 56 146 46 Q156 56 162 67 Z M194 72 Q204 56 198 46 Q188 56 182 67 Z" fill="currentColor" />
        <circle cx="160" cy="98" r="9" style={{ fill: 'var(--sheet)' }} />
        <circle cx="184" cy="98" r="9" style={{ fill: 'var(--sheet)' }} />
        <path d="M162 122 L182 122" {...ROUND} strokeWidth="4" style={{ stroke: 'var(--sheet)' }} />
        <path d="M154 146 L150 162 M190 146 L194 162" {...ROUND} strokeWidth="7" />
      </>
    ),
  }
}

/** A little arcade toy: an orb on a glowing screen, with the rules it keeps rewriting around it. */
function shapeshifter(s: Screens): PacketPrint {
  return {
    a: (
      <>
        <rect x="40" y="56" width="160" height="150" rx="20" {...ROUND} strokeWidth="12" />
        <circle cx="120" cy="131" r="54" fill={s.a} />
        <path d="M56 214 L184 214 L200 274 Q202 282 194 282 L46 282 Q38 282 40 274 Z" fill="currentColor" />
        <circle cx="96" cy="248" r="10" style={{ fill: 'var(--sheet)' }} />
        <circle cx="140" cy="248" r="10" style={{ fill: 'var(--sheet)' }} />
      </>
    ),
    b: (
      <>
        <circle cx="120" cy="131" r="26" fill="currentColor" />
        <circle cx="111" cy="122" r="7" style={{ fill: 'var(--sheet)' }} />
        <circle cx="120" cy="131" r="40" {...ROUND} strokeWidth="4" strokeDasharray="3 9" />
        <path d="M60 96 L70 78 L80 96 Z" fill="currentColor" />
        <rect x="162" y="80" width="16" height="16" rx="2" fill="currentColor" />
        <path d="M170 168 L170 188 M160 178 L180 178" {...ROUND} strokeWidth="5" />
        <path d="M60 182 Q70 166 80 182" {...ROUND} strokeWidth="5" />
        <circle cx="118" cy="248" r="4" fill="currentColor" />
      </>
    ),
  }
}

export const PRINTS: Readonly<Record<string, (screens: Screens) => PacketPrint>> = {
  'the-unrusher': patientOne,
  'breathing-patterns': harmonist,
  'calm-garden': gardener,
  'timeless-minds': sage,
  'hard-choices': dilemma,
  'last-words': finalWord,
  'first-words': awakening,
  'mind-debate': arena,
  'hard-talk': plainSpeaker,
  'worry-capsule': keeper,
  'hope-daily': optimist,
  'idea-lab': alchemist,
  'thought-pockets': philosopher,
  cascade: shapeshifter,
}
