import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import { Footer } from '@/components/seedpress/Footer'
import { Header } from '@/components/seedpress/Header'
import { IconStamp } from '@/components/seedpress/IconStamp'
import { InkLink } from '@/components/seedpress/Link'
import { Packet } from '@/components/seedpress/Packet'
import { QuietButton } from '@/components/seedpress/QuietButton'
import { SenseDial } from '@/components/seedpress/SenseDial'
import { Stamp } from '@/components/seedpress/Stamp'
import { Icon } from '@/components/seedpress/icons/Icon'
import { GLYPHS, type IconName } from '@/components/seedpress/icons/glyphs'
import { contrast } from '@/lib/design/color'
import { COLOR_ROLES, PALETTES, SURFACES, type ColorRole, type PaletteName } from '@/lib/design/tokens'
import { SHOWCASE_GAMES } from '@/lib/games/config'
import { ProofBar } from './ProofBar'
import { ExampleStampRow, ExampleSwitch, LiveGo } from './SpecimenControls'

export const metadata: Metadata = { title: 'Specimen sheet - Seedpress proof' }

const PALETTE_NAMES: Readonly<Record<PaletteName, string>> = {
  light: 'Light',
  dark: 'Dark',
  lightQuiet: 'Light, Quiet',
  darkQuiet: 'Dark, Quiet',
  lightHigh: 'Light, high contrast',
  darkHigh: 'Dark, high contrast',
}

/** The worst case of each pair across the surfaces it can sit on, computed from the tokens. */
const SPECIMEN_PAIRS: readonly { fg: ColorRole; on: readonly ColorRole[]; min: number; label: string; text: boolean }[] = [
  { fg: 'ink', on: SURFACES, min: 4.5, label: 'Ink, body text', text: true },
  { fg: 'ink-soft', on: SURFACES, min: 4.5, label: 'Soft ink, hooks', text: true },
  { fg: 'rind', on: SURFACES, min: 4.5, label: 'Rind, links and chosen', text: true },
  { fg: 'moss', on: SURFACES, min: 4.5, label: 'Moss, Slow down', text: true },
  { fg: 'dusk', on: SURFACES, min: 4.5, label: 'Dusk, Reflect', text: true },
  { fg: 'clay', on: SURFACES, min: 4.5, label: 'Clay, Play', text: true },
  { fg: 'on-flesh', on: ['flesh'], min: 4.5, label: 'Words on the go', text: true },
  { fg: 'flesh', on: SURFACES, min: 3, label: 'The go fill', text: false },
  { fg: 'rule-strong', on: SURFACES, min: 3, label: 'Control edges', text: false },
]

function paletteStyle(name: PaletteName): CSSProperties {
  return Object.fromEntries(COLOR_ROLES.map((role) => [`--${role}`, PALETTES[name][role]])) as CSSProperties
}

function ratio(name: PaletteName, fg: ColorRole, on: readonly ColorRole[]) {
  const worst = on
    .map((bg) => ({ bg, value: contrast(PALETTES[name][fg], PALETTES[name][bg]) }))
    .sort((a, b) => a.value - b.value)[0]
  return worst
}

const TYPE_SCALE = [
  { name: 'Hero, Bricolage 800', className: 'sp-sign__title', sample: 'Small, quiet games' },
  { name: 'Title, Bricolage 800', className: 'sp-h1', sample: 'The Patient One' },
  { name: 'Shelf, Bricolage 700', className: 'sp-h2', sample: 'Slow down' },
  { name: 'Section, Atkinson 700', className: 'sp-h3', sample: 'What you do here' },
  { name: 'Lead, Atkinson 400', className: 'sp-lead', sample: 'Seeds that settle only while you stay still.' },
  { name: 'Body, Atkinson 400', className: '', sample: 'Il1 O0 bdpq: every letter is built to be told apart, at 18 px with room to breathe.' },
  { name: 'Small, Atkinson 400', className: 'sp-reason', sample: 'Hooks, helper lines and the footer.' },
] as const

/** The Seedpress specimen sheet: every Phase 1 part, in every state, under the dial. */
export default function PressSpecimen() {
  return (
    <>
      <ProofBar other={{ href: '/press/home', label: 'The seed rack', icon: 'back' }} />
      <Header home="/press/home" />
      <div className="sp-shop sp-specimen">
        <div className="sp-specimen__intro">
          <h1 className="sp-h1">Seedpress</h1>
          <p className="sp-lead">
            A small two-ink print shop that prints seed packets for your mind. The counter is plain paper and one dark
            ink; the packets carry the colour.
          </p>
          <p className="sp-soft">
            Flesh is the one ink that means go. Rind is structure: chosen, current, links. Seeds are the punctuation.
          </p>
        </div>

        <section className="sp-section" aria-labelledby="dial-heading">
          <h2 id="dial-heading" className="sp-h2">
            The sensory dial
          </h2>
          <p className="sp-soft">It changes this whole page. Reduced motion on your device stills it whatever it says.</p>
          <SenseDial />
        </section>

        <section className="sp-section" aria-labelledby="inks-heading">
          <h2 id="inks-heading" className="sp-h2">
            Inks
          </h2>
          <p className="sp-soft">Six palettes. Each ratio is computed from the tokens: the worst case across paper, sheet and well.</p>
          <div className="sp-palettes">
            {(Object.keys(PALETTE_NAMES) as PaletteName[]).map((name) => (
              <section key={name} className="sp-palette" style={paletteStyle(name)} aria-label={`${PALETTE_NAMES[name]} palette`}>
                <p className="sp-palette__name">{PALETTE_NAMES[name]}</p>
                <ul className="sp-swatches">
                  {COLOR_ROLES.map((role) => (
                    <li key={role} className="sp-swatch">
                      <span className="sp-swatch__chip" style={{ backgroundColor: `var(--${role})` }} />
                      <span>{role}</span>
                      <span>{PALETTES[name][role]}</span>
                    </li>
                  ))}
                </ul>
                <ul className="sp-pairs">
                  {SPECIMEN_PAIRS.map(({ fg, on, min, label, text }) => {
                    const worst = ratio(name, fg, on)
                    return (
                      <li
                        key={fg}
                        className="sp-pair"
                        style={
                          text
                            ? { color: `var(--${fg})`, backgroundColor: `var(--${worst.bg})` }
                            : { boxShadow: `inset 6px 0 0 var(--${fg})`, backgroundColor: `var(--${worst.bg})` }
                        }
                      >
                        <span>{label}</span>
                        <span>
                          {worst.value.toFixed(2)}:1, needs {min}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>
        </section>

        <section className="sp-section" aria-labelledby="type-heading">
          <h2 id="type-heading" className="sp-h2">
            Type
          </h2>
          <p className="sp-soft">
            Bricolage Grotesque for short titles, Atkinson Hyperlegible Next for everything you read. Left-aligned, no
            slanted or capitalised emphasis: weight does that.
          </p>
          <div className="sp-type">
            {TYPE_SCALE.map((row) => (
              <div key={row.name} className="sp-type__row">
                <span className="sp-type__name">{row.name}</span>
                <span className={row.className}>{row.sample}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="sp-section" aria-labelledby="buttons-heading">
          <h2 id="buttons-heading" className="sp-h2">
            Buttons
          </h2>
          <p className="sp-soft">One go per screen. Everything else is quieter.</p>
          <div className="sp-state-row">
            <LiveGo />
            <Stamp icon="play">Begin slowly</Stamp>
            <QuietButton>Not now</QuietButton>
            <IconStamp icon="close" label="Close (example)" />
          </div>
          <figure className="sp-states" inert>
            <figcaption className="sp-soft">Each state, printed still for comparison:</figcaption>
            <div className="sp-state-row">
              <span className="sp-state">
                <span className="sp-go">Open the packet</span>
                <span className="sp-state__label">Go, at rest</span>
              </span>
              <span className="sp-state">
                <span className="sp-go is-hover">Open the packet</span>
                <span className="sp-state__label">Hover</span>
              </span>
              <span className="sp-state">
                <span className="sp-go is-pressed">Open the packet</span>
                <span className="sp-state__label">Pressed</span>
              </span>
              <span className="sp-state">
                <span className="sp-go is-disabled">Seal the jar</span>
                <span className="sp-state__label">Not yet: write a few words first</span>
              </span>
              <span className="sp-state">
                <span className="sp-go">
                  <span>Sending</span>
                  <span className="sp-seeds">
                    <i />
                    <i />
                    <i />
                  </span>
                </span>
                <span className="sp-state__label">Getting it ready</span>
              </span>
            </div>
            <div className="sp-state-row">
              <span className="sp-state">
                <span className="sp-stamp">Try another</span>
                <span className="sp-state__label">Stamp, at rest</span>
              </span>
              <span className="sp-state">
                <span className="sp-stamp is-hover">Try another</span>
                <span className="sp-state__label">Hover</span>
              </span>
              <span className="sp-state">
                <span className="sp-stamp is-pressed">Try another</span>
                <span className="sp-state__label">Pressed</span>
              </span>
              <span className="sp-state">
                <span className="sp-stamp is-disabled">Try another</span>
                <span className="sp-state__label">Not available</span>
              </span>
              <span className="sp-state">
                <span className="sp-quiet is-hover">Skip this one</span>
                <span className="sp-state__label">Quiet, hover</span>
              </span>
            </div>
          </figure>
        </section>

        <section className="sp-section" aria-labelledby="links-heading">
          <h2 id="links-heading" className="sp-h2">
            Links
          </h2>
          <p style={{ maxWidth: '66ch' }}>
            A link is always underlined in rind and never flesh: read{' '}
            <InkLink href="/about">about the shop</InkLink>, or find{' '}
            <InkLink href="https://findahelpline.com">a helpline near you</InkLink>.
          </p>
        </section>

        <section className="sp-section" aria-labelledby="controls-heading">
          <h2 id="controls-heading" className="sp-h2">
            Writing slips, switches and stamp rows
          </h2>
          <div className="sp-sheet sp-states">
            <div className="sp-field">
              <label htmlFor="specimen-slip" className="sp-field__label">
                One small thing for tomorrow
              </label>
              <p id="specimen-slip-hint" className="sp-field__hint">
                <Icon name="note" /> A few words is plenty.
              </p>
              <input id="specimen-slip" className="sp-field__input" aria-describedby="specimen-slip-hint" />
            </div>
            <ExampleSwitch />
            <ExampleStampRow />
          </div>
        </section>

        <section className="sp-section" aria-labelledby="stamps-heading">
          <h2 id="stamps-heading" className="sp-h2">
            Seed stamps
          </h2>
          <p className="sp-soft">Drawn by hand on a 12 by 12 grid, each with one nicked cell, like a rubber stamp.</p>
          <ul className="sp-glyphs">
            {(Object.keys(GLYPHS) as IconName[]).map((name) => (
              <li key={name} className="sp-glyph">
                <Icon name={name} size={48} />
                <span>{name}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="sp-section" aria-labelledby="packets-heading">
          <h2 id="packets-heading" className="sp-h2">
            Packets
          </h2>
          <p className="sp-soft">
            Every game printed in two inks, a pixel out of register. Hover or focus one: it lifts and its second ink
            settles.
          </p>
          <ul className="sp-prints">
            {SHOWCASE_GAMES.map((game, order) => (
              <li key={game.id}>
                <Packet game={game} order={order} shelfTab />
              </li>
            ))}
          </ul>
        </section>
      </div>
      <Footer />
    </>
  )
}
