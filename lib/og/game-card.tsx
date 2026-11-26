import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Children, isValidElement, type ReactNode } from 'react'
import { PRINTS } from '@/components/seedpress/packets/art'
import { PACKET_INKS } from '@/components/seedpress/shelves'
import { PALETTES, type ColorRole } from '@/lib/design/tokens'

export const OG_SIZE = { width: 1200, height: 630 }

// ImageResponse reads ttf, not woff2, so the faces in app/fonts are cut again as static ttf instances (app/fonts/README).
const fonts = Promise.all(
  [
    ['AtkinsonHyperlegibleNext-Regular.ttf', 'Atkinson', 400],
    ['AtkinsonHyperlegibleNext-Bold.ttf', 'Atkinson', 700],
    ['BricolageGrotesque-ExtraBold.ttf', 'Bricolage', 800],
  ] as const,
).then((files) =>
  Promise.all(
    files.map(async ([file, name, weight]) => ({ name, weight, style: 'normal' as const, data: await readFile(join(process.cwd(), 'app/fonts/og', file)) })),
  ),
)

const P = PALETTES.light
const role = (name: string): string => P[name as ColorRole] ?? P.ink

const kebab = (name: string) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)

/** Writes a print's plain SVG elements out as markup: react-dom/server cannot be imported next to a route, and a print is only shapes. */
function toMarkup(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) => {
      if (!isValidElement(child)) return ''
      const { children, style, ...props } = child.props as Record<string, unknown> & { children?: ReactNode; style?: Record<string, string> }
      if (typeof child.type !== 'string') return toMarkup(children)
      const attrs = Object.entries({ ...props, ...style })
        .filter(([, value]) => typeof value === 'string' || typeof value === 'number')
        .map(([name, value]) => ` ${kebab(name)}="${value}"`)
        .join('')
      return `<${child.type}${attrs}>${toMarkup(children)}</${child.type}>`
    })
    .join('')
}

/** The game's packet print as a data-URI SVG, its inks resolved to the light palette: Satori cannot read CSS variables or blend modes. */
function printImage(gameId: string): string | null {
  const draw = PRINTS[gameId]
  if (!draw) return null
  const [a, b] = (PACKET_INKS[gameId] ?? ['ink', 'ink']).map(role)
  const print = draw({ a: 'url(#sa)', b: 'url(#sb)' })
  const body = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 320" width="240" height="320"><defs>
<pattern id="sa" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(15)"><circle cx="3" cy="3" r="1.7" fill="${a}"/></pattern>
<pattern id="sb" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(75)"><circle cx="3" cy="3" r="1.7" fill="${b}"/></pattern></defs>
<g color="${a}">${toMarkup(print.a)}</g><g color="${b}" transform="translate(1 -1)">${toMarkup(print.b)}</g></svg>`.replace(/var\(--([\w-]+)\)/g, (_, name: string) => role(name))
  return `data:image/svg+xml;base64,${Buffer.from(body).toString('base64')}`
}

interface GameCardProps {
  title: string
  description: string
  gameId?: string
}

/** A game's share image: the new paper, the title in Bricolage, the words in Atkinson and the game's two-ink packet print. */
export async function gameCardImage({ title, description, gameId }: GameCardProps) {
  const print = gameId ? printImage(gameId) : null
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: P.paper, fontFamily: 'Atkinson', padding: 56 }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, paddingRight: 48 }}>
          <div style={{ display: 'flex', fontFamily: 'Bricolage', fontWeight: 800, fontSize: 80, lineHeight: 1.05, color: P.ink }}>{title}</div>
          <div style={{ display: 'flex', fontSize: 34, lineHeight: 1.4, color: P['ink-soft'], marginTop: 28, maxWidth: 640 }}>{description}</div>
          <div style={{ display: 'flex', width: 96, height: 6, background: P.rind, marginTop: 44 }} />
          <div style={{ display: 'flex', fontWeight: 700, fontSize: 28, color: P.rind, marginTop: 28 }}>VeryGoodMelon.Fun</div>
        </div>
        {print && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div
              style={{
                display: 'flex',
                width: 360,
                height: 480,
                background: P.sheet,
                border: `3px solid ${P['rule-strong']}`,
                borderRadius: 14,
                boxShadow: `0 6px 0 ${P['rule-strong']}`,
                padding: 24,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={print} width={306} height={408} alt="" />
            </div>
          </div>
        )}
      </div>
    ),
    { ...OG_SIZE, fonts: await fonts },
  )
}
