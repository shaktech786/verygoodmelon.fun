/**
 * Accessibility Control Panel
 * Slide-out panel with all accessibility controls
 */

'use client'

import { useEffect, useRef } from 'react'
import { X, Volume2, VolumeX, Pause, Play, Eye, Palette, Moon, Sun } from 'lucide-react'
import { useAccessibility } from '@/lib/hooks/useAccessibility'
import { AccessibilityPreset, ACCESSIBILITY_PRESETS } from '@/types/accessibility'

interface AccessibilityPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function AccessibilityPanel({ isOpen, onClose }: AccessibilityPanelProps) {
  const {
    settings,
    updateSetting,
    applyPreset,
    toggleReduceMotion,
    toggleMute,
    setVolume,
  } = useAccessibility()

  const panelRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Focus trap
  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      closeButtonRef.current.focus()
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isOpen &&
        panelRef.current &&
        !panelRef.current.contains(e.target as Node)
      ) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-[60]"
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        id="accessibility-panel"
        role="dialog"
        aria-labelledby="accessibility-panel-title"
        aria-modal="true"
        className="
          fixed top-0 right-0 bottom-0
          w-full sm:w-96
          bg-white
          shadow-2xl
          z-[70]
          overflow-y-auto
        "
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-card-border px-6 py-4 flex items-center justify-between">
          <h2
            id="accessibility-panel-title"
            className="text-xl font-semibold text-foreground"
          >
            Accessibility Settings
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="
              p-2 rounded
              hover:bg-gray-100
              transition-colors
              focus:outline-none focus:ring-2 focus:ring-accent
            "
            aria-label="Close accessibility settings"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Visual Controls */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Eye size={16} aria-hidden="true" />
              Visual
            </h3>

            {/* Reduce Motion */}
            <div className="mb-4">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-primary">Reduce Motion</span>
                <button
                  role="switch"
                  aria-checked={settings.reduceMotion}
                  onClick={toggleReduceMotion}
                  className={`
                    relative w-11 h-6 rounded-full transition-colors
                    focus:outline-none focus:ring-2 focus:ring-accent
                    ${settings.reduceMotion ? 'bg-accent' : 'bg-gray-300'}
                  `}
                >
                  <span
                    className={`
                      absolute top-0.5 left-0.5
                      w-5 h-5 bg-white rounded-full
                      transition-transform
                      ${settings.reduceMotion ? 'translate-x-5' : 'translate-x-0'}
                    `}
                  />
                </button>
              </label>
            </div>

            {/* Contrast */}
            <div className="mb-4">
              <label className="block text-sm text-primary mb-2">Contrast</label>
              <select
                value={settings.contrast}
                onChange={(e) =>
                  updateSetting('contrast', e.target.value as 'normal' | 'high' | 'extra-high')
                }
                className="
                  w-full px-3 py-2
                  border border-card-border rounded
                  bg-white text-foreground
                  focus:outline-none focus:ring-2 focus:ring-accent
                "
              >
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="extra-high">Extra High</option>
              </select>
            </div>

            {/* Animation Speed */}
            {!settings.reduceMotion && (
              <div className="mb-4">
                <label className="block text-sm text-primary mb-2">
                  Animation Speed: {settings.animationSpeed}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.5"
                  value={settings.animationSpeed}
                  onChange={(e) =>
                    updateSetting('animationSpeed', Number(e.target.value) as 0.5 | 1 | 1.5 | 2)
                  }
                  className="w-full accent-accent"
                />
              </div>
            )}

            {/* Colorblind Mode */}
            <div className="mb-4">
              <label className="block text-sm text-primary mb-2 flex items-center gap-2">
                <Palette size={14} aria-hidden="true" />
                Colorblind Mode
              </label>
              <select
                value={settings.colorblindMode}
                onChange={(e) =>
                  updateSetting('colorblindMode', e.target.value as 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia' | 'monochrome')
                }
                className="
                  w-full px-3 py-2
                  border border-card-border rounded
                  bg-white text-foreground
                  focus:outline-none focus:ring-2 focus:ring-accent
                "
              >
                <option value="none">None</option>
                <option value="deuteranopia">Deuteranopia (Red-Green)</option>
                <option value="protanopia">Protanopia (Red-Green)</option>
                <option value="tritanopia">Tritanopia (Blue-Yellow)</option>
                <option value="monochrome">Monochrome</option>
              </select>
            </div>

            {/* Theme Mode */}
            <div className="mb-4">
              <label className="block text-sm text-primary mb-2 flex items-center gap-2">
                {settings.theme === 'dark' ? (
                  <Moon size={14} aria-hidden="true" />
                ) : (
                  <Sun size={14} aria-hidden="true" />
                )}
                Theme
              </label>
              <select
                value={settings.theme}
                onChange={(e) =>
                  updateSetting('theme', e.target.value as 'light' | 'dark' | 'auto')
                }
                className="
                  w-full px-3 py-2
                  border border-card-border rounded
                  bg-white text-foreground
                  focus:outline-none focus:ring-2 focus:ring-accent
                "
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="auto">Auto (System)</option>
              </select>
            </div>
          </section>

          {/* Audio Controls */}
          <section className="pt-6 border-t border-card-border">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              {settings.muted ? (
                <VolumeX size={16} aria-hidden="true" />
              ) : (
                <Volume2 size={16} aria-hidden="true" />
              )}
              Audio
            </h3>

            {/* Mute Toggle */}
            <div className="mb-4">
              <button
                onClick={toggleMute}
                className="
                  w-full px-4 py-2
                  border border-card-border rounded
                  bg-white hover:bg-gray-50
                  text-foreground text-sm
                  transition-colors
                  focus:outline-none focus:ring-2 focus:ring-accent
                  flex items-center justify-center gap-2
                "
              >
                {settings.muted ? (
                  <>
                    <VolumeX size={16} aria-hidden="true" />
                    Unmute
                  </>
                ) : (
                  <>
                    <Volume2 size={16} aria-hidden="true" />
                    Mute
                  </>
                )}
              </button>
            </div>

            {/* Volume Slider */}
            {!settings.muted && (
              <div className="mb-4">
                <label className="block text-sm text-primary mb-2">
                  Volume: {settings.volume}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-full accent-accent"
                  aria-label="Volume level"
                />
              </div>
            )}
          </section>

          {/* Interaction Controls */}
          <section className="pt-6 border-t border-card-border">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Interaction
            </h3>

            {/* Pause Animations */}
            <div className="mb-4">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-primary flex items-center gap-2">
                  {settings.pauseAnimations ? (
                    <Pause size={14} aria-hidden="true" />
                  ) : (
                    <Play size={14} aria-hidden="true" />
                  )}
                  Pause Animations
                </span>
                <button
                  role="switch"
                  aria-checked={settings.pauseAnimations}
                  onClick={() =>
                    updateSetting('pauseAnimations', !settings.pauseAnimations)
                  }
                  className={`
                    relative w-11 h-6 rounded-full transition-colors
                    focus:outline-none focus:ring-2 focus:ring-accent
                    ${settings.pauseAnimations ? 'bg-accent' : 'bg-gray-300'}
                  `}
                >
                  <span
                    className={`
                      absolute top-0.5 left-0.5
                      w-5 h-5 bg-white rounded-full
                      transition-transform
                      ${settings.pauseAnimations ? 'translate-x-5' : 'translate-x-0'}
                    `}
                  />
                </button>
              </label>
            </div>
          </section>

          {/* Presets */}
          <section className="pt-6 border-t border-card-border">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Quick Presets
            </h3>
            <div className="space-y-2">
              {(Object.keys(ACCESSIBILITY_PRESETS) as AccessibilityPreset[]).map(
                (presetKey) => {
                  const preset = ACCESSIBILITY_PRESETS[presetKey]
                  return (
                    <button
                      key={presetKey}
                      onClick={() => applyPreset(presetKey)}
                      className="
                        w-full px-4 py-3
                        border border-card-border rounded
                        bg-white hover:bg-gray-50
                        text-left
                        transition-colors
                        focus:outline-none focus:ring-2 focus:ring-accent
                      "
                    >
                      <div className="font-medium text-sm text-foreground">
                        {preset.name}
                      </div>
                      <div className="text-xs text-primary-light mt-1">
                        {preset.description}
                      </div>
                    </button>
                  )
                }
              )}
            </div>
          </section>

          {/* Reset Settings */}
          <section className="pt-6 border-t border-card-border">
            <button
              onClick={() => {
                if (confirm('Reset all accessibility settings to defaults? This will clear your saved preferences.')) {
                  // Clear localStorage
                  try {
                    localStorage.removeItem('verygoodmelon:accessibility:settings')
                  } catch (e) {
                    console.error('Failed to clear settings:', e)
                  }
                  // Apply defaults
                  window.location.reload()
                }
              }}
              className="
                w-full px-4 py-3
                border-2 border-danger rounded
                bg-white hover:bg-red-50
                text-danger font-medium text-sm
                transition-colors
                focus:outline-none focus:ring-2 focus:ring-danger
              "
            >
              Reset All Settings
            </button>
            <p className="text-xs text-primary-light mt-2 text-center">
              Use this if settings stop working or to start fresh
            </p>
          </section>

          {/* Keyboard Shortcuts Info */}
          <section className="pt-6 border-t border-card-border">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Keyboard Shortcuts
            </h3>
            <div className="text-xs text-primary-light space-y-1">
              <div>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-foreground">ESC</kbd> - Close
                this panel
              </div>
              <div>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-foreground">M</kbd> - Mute/Unmute
              </div>
              <div>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-foreground">SPACE</kbd> - Pause
                (in games)
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
