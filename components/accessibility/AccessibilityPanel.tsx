'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useModalDialog } from '@/components/accessibility/useModalDialog'
import { IconStamp } from '@/components/seedpress/IconStamp'
import { Icon } from '@/components/seedpress/icons/Icon'
import { SenseDial, STOPS } from '@/components/seedpress/SenseDial'
import { Stamp } from '@/components/seedpress/Stamp'
import { isOwnMix } from '@/lib/accessibility/own-mix'
import { useAmbientControl } from '@/lib/audio/ambient-choice'
import { useAccessibility } from '@/lib/hooks/useAccessibility'
import type { AccessibilitySettings, ContrastMode, SpacingMode, TextSize, ThemeMode } from '@/types/accessibility'

interface AccessibilityPanelProps {
  isOpen: boolean
  onClose: () => void
}

interface ChoiceOption<T extends string> {
  value: T
  label: string
}

const THEME_OPTIONS: readonly ChoiceOption<ThemeMode>[] = [
  { value: 'light', label: 'Light' },
  { value: 'auto', label: 'Match device' },
  { value: 'dark', label: 'Dark' },
]

const TEXT_SIZE_OPTIONS: readonly ChoiceOption<TextSize>[] = [
  { value: 'default', label: 'Default' },
  { value: 'large', label: 'Large' },
  { value: 'larger', label: 'Larger' },
]

const SPACING_OPTIONS: readonly ChoiceOption<SpacingMode>[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'roomy', label: 'Roomy' },
]

const CONTRAST_OPTIONS: readonly ChoiceOption<ContrastMode>[] = [
  { value: 'normal', label: 'Standard' },
  { value: 'high', label: 'High' },
  { value: 'extra-high', label: 'Highest' },
]

function Choice<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string
  name: string
  value: T
  options: readonly ChoiceOption<T>[]
  onChange: (value: T) => void
}) {
  return (
    <fieldset className="sp-drawer__group">
      <legend className="sp-drawer__legend">{legend}</legend>
      <div className="sp-stamp-row">
        {options.map((option) => (
          <label key={option.value} className="sp-choice">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span className="sp-choice__face">
              {value === option.value && <Icon name="done" />}
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function Switch({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  const id = useId()
  return (
    <div className="sp-drawer__group">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={`${id}-description`}
        onClick={() => onChange(!checked)}
        className="sp-switch"
      >
        <span className="sp-switch__slot" aria-hidden="true">
          <span className="sp-switch__tab">{checked ? 'On' : 'Off'}</span>
        </span>
        {label}
      </button>
      <p id={`${id}-description`} className="sp-drawer__hint">
        {description}
      </p>
    </div>
  )
}

export function AccessibilityPanel({ isOpen, onClose }: AccessibilityPanelProps) {
  const { settings, baseline, updateSetting, resetToDefaults } = useAccessibility()
  const panelRef = useRef<HTMLDivElement>(null)
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const volumeId = useId()
  const ambient = useAmbientControl()

  const close = () => {
    setConfirmingReset(false)
    setAnnouncement('')
    onClose()
  }

  useModalDialog(isOpen, panelRef, close)

  // Asking moves focus to the safe answer; answering brings it back to the question
  const askedToReset = useRef(false)
  useEffect(() => {
    if (confirmingReset) {
      askedToReset.current = true
      panelRef.current?.querySelector<HTMLElement>('[data-reset-keep]')?.focus()
    } else if (askedToReset.current) {
      askedToReset.current = false
      panelRef.current?.querySelector<HTMLElement>('[data-reset-ask]')?.focus()
    }
  }, [confirmingReset])

  if (!isOpen) return null

  // A fine-tune control the dial speaks for moving off its default is announced as the dial's fourth label
  const change = <K extends keyof AccessibilitySettings>(key: K, value: AccessibilitySettings[K]) => {
    const before = isOwnMix(settings, baseline)
    const after = isOwnMix({ ...settings, [key]: value }, baseline)
    if (after && !before) setAnnouncement('The dial now reads Your own mix.')
    else if (before && !after) setAnnouncement(`The dial is back to ${STOPS[settings.sense].label}.`)
    updateSetting(key, value)
  }

  return (
    <>
      <div className="sp-scrim" aria-hidden="true" onClick={close} />

      <div
        ref={panelRef}
        id="accessibility-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="accessibility-panel-title"
        tabIndex={-1}
        className="sp-drawer"
      >
        <div className="sp-drawer__bar">
          <h2 id="accessibility-panel-title" className="sp-h3">
            <span className="sr-only">Accessibility </span>Settings
          </h2>
          <IconStamp icon="close" label="Close accessibility settings" onClick={close} />
        </div>

        <div className="sp-drawer__body">
          <p role="status" className="sr-only">
            {announcement}
          </p>

          <section aria-label="How it feels" className="sp-drawer__section">
            <SenseDial />
          </section>

          <section aria-labelledby="a11y-seeing" className="sp-drawer__section">
            <h3 id="a11y-seeing" className="sp-drawer__heading">
              Seeing
            </h3>
            <Choice legend="Theme" name="a11y-theme" value={settings.theme} options={THEME_OPTIONS} onChange={(value) => change('theme', value)} />
            <Choice legend="Text size" name="a11y-text-size" value={settings.textSize} options={TEXT_SIZE_OPTIONS} onChange={(value) => change('textSize', value)} />
            <Choice legend="Spacing" name="a11y-spacing" value={settings.spacing} options={SPACING_OPTIONS} onChange={(value) => change('spacing', value)} />
            <Choice legend="Contrast" name="a11y-contrast" value={settings.contrast} options={CONTRAST_OPTIONS} onChange={(value) => change('contrast', value)} />
            <Switch
              label="Greyscale"
              description="Shows the whole site without colour, for a quieter screen."
              checked={settings.greyscale}
              onChange={(value) => change('greyscale', value)}
            />
          </section>

          <section aria-labelledby="a11y-motion" className="sp-drawer__section">
            <h3 id="a11y-motion" className="sp-drawer__heading">
              Motion
            </h3>
            <Switch
              label="Reduce motion"
              description="Stops floating, fading and moving effects across the site and in games."
              checked={settings.reduceMotion}
              onChange={(value) => change('reduceMotion', value)}
            />
          </section>

          <section aria-labelledby="a11y-sound" className="sp-drawer__section">
            <h3 id="a11y-sound" className="sp-drawer__heading">
              Sound
            </h3>
            {ambient && (
              <Switch
                label="Ambient sound"
                description="A soft soundscape for this game. It stays off until you turn it on."
                checked={ambient.isPlaying}
                onChange={ambient.toggle}
              />
            )}
            <Switch
              label="Mute all sound"
              description="Games only play sound after you turn it on, and this silences it everywhere."
              checked={settings.muted}
              onChange={(value) => change('muted', value)}
            />
            <div className="sp-drawer__group">
              <div className="sp-drawer__volume">
                <label htmlFor={volumeId} className="sp-drawer__legend">
                  Volume
                </label>
                <span className="sp-soft" aria-hidden="true">
                  {settings.volume}%
                </span>
              </div>
              <input
                id={volumeId}
                type="range"
                min={0}
                max={100}
                step={5}
                value={settings.volume}
                aria-valuetext={`${settings.volume}%`}
                onChange={(event) => updateSetting('volume', Number(event.target.value))}
                className="sp-range"
              />
            </div>
          </section>

          <section aria-labelledby="a11y-keyboard" className="sp-drawer__section">
            <h3 id="a11y-keyboard" className="sp-drawer__heading">
              Keys
            </h3>
            <dl className="sp-drawer__keys">
              <div>
                <dt>
                  <kbd className="sp-keycap">Tab</kbd>
                </dt>
                <dd>Moves to the next control (Shift + Tab goes back)</dd>
              </div>
              <div>
                <dt>
                  <kbd className="sp-keycap">Esc</kbd>
                </dt>
                <dd>Closes this panel or the feedback form</dd>
              </div>
            </dl>
            <p className="sp-drawer__hint">Each game explains its own keys on its page.</p>
          </section>

          <section aria-labelledby="a11y-reset" className="sp-drawer__section">
            <h3 id="a11y-reset" className="sp-drawer__heading">
              Start over
            </h3>
            {confirmingReset ? (
              <div className="sp-drawer__confirm">
                <p>Put every setting back to how it was on your first visit?</p>
                <div className="sp-stamp-row">
                  <Stamp
                    onClick={() => {
                      resetToDefaults()
                      setConfirmingReset(false)
                      setAnnouncement('All settings are back to how they started.')
                    }}
                  >
                    Yes, reset
                  </Stamp>
                  <Stamp data-reset-keep="" onClick={() => setConfirmingReset(false)}>
                    Keep my settings
                  </Stamp>
                </div>
              </div>
            ) : (
              <div className="sp-drawer__group">
                <Stamp data-reset-ask="" onClick={() => setConfirmingReset(true)}>
                  Reset all settings
                </Stamp>
                <p className="sp-drawer__hint">Go back to how things looked at first</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
