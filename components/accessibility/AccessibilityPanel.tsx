'use client'

import { type ReactNode, useEffect, useId, useRef, useState } from 'react'
import { Moon, Sun, SunMoon, X } from 'lucide-react'
import { useAccessibility } from '@/lib/hooks/useAccessibility'
import { useModalDialog } from '@/components/accessibility/useModalDialog'
import {
  ACCESSIBILITY_PRESETS,
  type AccessibilityPreset,
  presetSummary,
  type ContrastMode,
  type TextSize,
  type ThemeMode,
} from '@/types/accessibility'

interface AccessibilityPanelProps {
  isOpen: boolean
  onClose: () => void
}

interface ChoiceOption<T extends string> {
  value: T
  label: string
  icon?: ReactNode
}

const THEME_OPTIONS: readonly ChoiceOption<ThemeMode>[] = [
  { value: 'light', label: 'Light', icon: <Sun size={18} aria-hidden="true" /> },
  { value: 'auto', label: 'Match device', icon: <SunMoon size={18} aria-hidden="true" /> },
  { value: 'dark', label: 'Dark', icon: <Moon size={18} aria-hidden="true" /> },
]

const TEXT_SIZE_OPTIONS: readonly ChoiceOption<TextSize>[] = [
  { value: 'default', label: 'Default', icon: <span aria-hidden="true" className="text-sm leading-none">A</span> },
  { value: 'large', label: 'Large', icon: <span aria-hidden="true" className="text-base leading-none">A</span> },
  { value: 'larger', label: 'Larger', icon: <span aria-hidden="true" className="text-lg leading-none">A</span> },
]

const CONTRAST_OPTIONS: readonly ChoiceOption<ContrastMode>[] = [
  { value: 'normal', label: 'Standard' },
  { value: 'high', label: 'High' },
  { value: 'extra-high', label: 'Highest' },
]

const SECTION = 'pt-6 border-t border-card-border'
const SECTION_HEADING = 'text-xs font-semibold uppercase tracking-wider text-primary-light mb-4'
const QUIET_BUTTON =
  'w-full min-h-11 px-4 py-2 rounded-lg border border-card-border bg-card-bg hover:bg-hover-bg text-foreground text-sm text-left transition-colors'

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
    <fieldset className="mb-5">
      <legend className="text-sm font-medium text-foreground mb-2">{legend}</legend>
      <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-hover-bg">
        {options.map((option) => (
          <label
            key={option.value}
            className="
              flex flex-col items-center justify-center gap-1 min-h-11 px-1 py-2
              rounded-md border-2 border-transparent cursor-pointer
              text-xs font-medium text-center text-primary-light
              hover:text-foreground transition-colors
              has-[:checked]:bg-card-bg has-[:checked]:text-foreground has-[:checked]:border-foreground
              has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent
            "
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.icon}
            {option.label}
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
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        <span id={`${id}-label`} className="block text-sm font-medium text-foreground">
          {label}
        </span>
        <span id={`${id}-description`} className="block text-xs text-primary-light mt-0.5">
          {description}
        </span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-description`}
        onClick={() => onChange(!checked)}
        className={`
          relative shrink-0 w-12 h-7 rounded-full border-2 transition-colors
          ${checked ? 'bg-accent border-accent' : 'bg-card-bg border-primary-light'}
        `}
      >
        <span
          aria-hidden="true"
          className={`
            absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform
            ${checked ? 'translate-x-5 bg-card-bg' : 'translate-x-0 bg-primary-light'}
          `}
        />
      </button>
    </div>
  )
}

export function AccessibilityPanel({ isOpen, onClose }: AccessibilityPanelProps) {
  const { settings, updateSetting, applyPreset, resetToDefaults } = useAccessibility()
  const panelRef = useRef<HTMLDivElement>(null)
  const resetRef = useRef<HTMLButtonElement>(null)
  const keepRef = useRef<HTMLButtonElement>(null)
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const volumeId = useId()

  const close = () => {
    setConfirmingReset(false)
    setAnnouncement('')
    onClose()
  }

  useModalDialog(isOpen, panelRef, close)

  const askedToReset = useRef(false)
  useEffect(() => {
    if (confirmingReset) {
      askedToReset.current = true
      keepRef.current?.focus()
    } else if (askedToReset.current) {
      askedToReset.current = false
      resetRef.current?.focus()
    }
  }, [confirmingReset])

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-[60]" aria-hidden="true" onClick={close} />

      <div
        ref={panelRef}
        id="accessibility-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="accessibility-panel-title"
        tabIndex={-1}
        className="fixed top-0 right-0 bottom-0 w-full sm:w-96 bg-card-bg text-foreground shadow-2xl z-[70] overflow-y-auto"
      >
        <div className="sticky top-0 z-10 bg-card-bg border-b border-card-border px-6 py-4 flex items-center justify-between">
          <h2 id="accessibility-panel-title" className="text-xl font-semibold text-foreground">
            Accessibility settings
          </h2>
          <button
            type="button"
            onClick={close}
            className="p-2.5 rounded-lg hover:bg-hover-bg transition-colors"
            aria-label="Close accessibility settings"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="px-6 py-6 space-y-6">
          <p role="status" className="sr-only">
            {announcement}
          </p>

          <section aria-labelledby="a11y-seeing">
            <h3 id="a11y-seeing" className={SECTION_HEADING}>
              Seeing
            </h3>
            <Choice
              legend="Theme"
              name="a11y-theme"
              value={settings.theme}
              options={THEME_OPTIONS}
              onChange={(value) => updateSetting('theme', value)}
            />
            <Choice
              legend="Text size"
              name="a11y-text-size"
              value={settings.textSize}
              options={TEXT_SIZE_OPTIONS}
              onChange={(value) => updateSetting('textSize', value)}
            />
            <Choice
              legend="Contrast"
              name="a11y-contrast"
              value={settings.contrast}
              options={CONTRAST_OPTIONS}
              onChange={(value) => updateSetting('contrast', value)}
            />
            <Switch
              label="Greyscale"
              description="Shows the whole site without colour, for a quieter screen."
              checked={settings.greyscale}
              onChange={(value) => updateSetting('greyscale', value)}
            />
          </section>

          <section aria-labelledby="a11y-motion" className={SECTION}>
            <h3 id="a11y-motion" className={SECTION_HEADING}>
              Motion
            </h3>
            <Switch
              label="Reduce motion"
              description="Stops floating, fading and moving effects across the site and in games."
              checked={settings.reduceMotion}
              onChange={(value) => updateSetting('reduceMotion', value)}
            />
          </section>

          <section aria-labelledby="a11y-sound" className={SECTION}>
            <h3 id="a11y-sound" className={SECTION_HEADING}>
              Sound
            </h3>
            <Switch
              label="Mute all sound"
              description="Games only play sound after you turn it on, and this silences it everywhere."
              checked={settings.muted}
              onChange={(value) => updateSetting('muted', value)}
            />
            <div className="flex items-center justify-between mb-2">
              <label htmlFor={volumeId} className="text-sm font-medium text-foreground">
                Volume
              </label>
              <span className="text-sm text-primary-light" aria-hidden="true">
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
              className="w-full accent-accent"
            />
          </section>

          <section aria-labelledby="a11y-presets" className={SECTION}>
            <h3 id="a11y-presets" className={SECTION_HEADING}>
              Quick presets
            </h3>
            <p className="text-xs text-primary-light mb-2">
              A preset sets motion, sound, contrast and colour together. Theme and text size stay as you chose.
            </p>
            <div className="space-y-2">
              {(Object.keys(ACCESSIBILITY_PRESETS) as AccessibilityPreset[]).map((key) => {
                const preset = ACCESSIBILITY_PRESETS[key]
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      applyPreset(key)
                      setAnnouncement(`${preset.name} preset applied.`)
                    }}
                    className={QUIET_BUTTON}
                  >
                    <span className="block font-medium">{preset.name}</span>
                    <span className="block text-xs text-primary-light mt-0.5">{presetSummary(preset.settings)}</span>
                  </button>
                )
              })}
            </div>
          </section>

          <section aria-labelledby="a11y-keyboard" className={SECTION}>
            <h3 id="a11y-keyboard" className={SECTION_HEADING}>
              Keyboard
            </h3>
            <dl className="text-sm text-primary-light space-y-2">
              <div className="flex gap-3">
                <dt>
                  <kbd className="px-2 py-0.5 rounded border border-card-border bg-hover-bg text-foreground font-sans text-xs">
                    Tab
                  </kbd>
                </dt>
                <dd>Moves to the next control (Shift + Tab goes back)</dd>
              </div>
              <div className="flex gap-3">
                <dt>
                  <kbd className="px-2 py-0.5 rounded border border-card-border bg-hover-bg text-foreground font-sans text-xs">
                    Esc
                  </kbd>
                </dt>
                <dd>Closes this panel, the feedback form or the menu</dd>
              </div>
            </dl>
            <p className="text-xs text-primary-light mt-3">Each game explains its own keys on its page.</p>
          </section>

          <section aria-labelledby="a11y-reset" className={SECTION}>
            <h3 id="a11y-reset" className="sr-only">
              Start over
            </h3>
            {confirmingReset ? (
              <div className="rounded-lg border border-card-border bg-hover-bg p-4">
                <p className="text-sm text-foreground">
                  Put every setting back to how it was on your first visit?
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      resetToDefaults()
                      setConfirmingReset(false)
                      setAnnouncement('All settings are back to how they started.')
                    }}
                    className="min-h-11 px-3 rounded-lg bg-foreground text-background text-sm font-medium"
                  >
                    Yes, reset
                  </button>
                  <button ref={keepRef} type="button" onClick={() => setConfirmingReset(false)} className={QUIET_BUTTON}>
                    Keep my settings
                  </button>
                </div>
              </div>
            ) : (
              <button ref={resetRef} type="button" onClick={() => setConfirmingReset(true)} className={QUIET_BUTTON}>
                <span className="block font-medium">Reset all settings</span>
                <span className="block text-xs text-primary-light mt-0.5">Go back to how things looked at first</span>
              </button>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
