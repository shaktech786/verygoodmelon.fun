'use client'

import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import { Copy, Download, Share } from 'lucide-react'
import { buttonClassName } from '@/components/ui/Button'
import type { KeepsakePlan } from '@/lib/keepsake/plan'
import { renderKeepsake, type KeepsakeTheme } from '@/lib/keepsake/render'
import { cn } from '@/lib/utils/cn'

const DARK_QUERY = '(prefers-color-scheme: dark)'

function subscribeTheme(onChange: () => void): () => void {
  const media = window.matchMedia(DARK_QUERY)
  media.addEventListener('change', onChange)
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  return () => {
    media.removeEventListener('change', onChange)
    observer.disconnect()
  }
}

function themeSnapshot(): KeepsakeTheme {
  const chosen = document.documentElement.getAttribute('data-theme')
  if (chosen === 'dark' || chosen === 'light') return chosen
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

const noSubscription = () => () => {}

function canShareImages(): boolean {
  if (typeof navigator.canShare !== 'function') return false
  try {
    return navigator.canShare({ files: [new File([''], 'keepsake.png', { type: 'image/png' })] })
  } catch {
    return false
  }
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
}

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Revoking straight away can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

interface KeepsakeProps {
  plan: KeepsakePlan
  /** Heading read before the picture; visible unless `hideLabel`. */
  label?: string
  hideLabel?: boolean
  className?: string
}

/**
 * A picture of the visit drawn on the device, to save or share. Nothing is uploaded: the
 * image is made here and handed straight to the download or the system's share sheet.
 */
export function Keepsake({ plan, label = 'A keepsake of this visit', hideLabel = false, className }: KeepsakeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const descriptionId = useId()
  const headingId = useId()
  const theme = useSyncExternalStore(subscribeTheme, themeSnapshot, () => 'light' as const)
  const shareable = useSyncExternalStore(noSubscription, canShareImages, () => false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    let current = true
    const draw = () => {
      if (current && canvasRef.current) renderKeepsake(canvasRef.current, plan, theme)
    }
    draw()
    // Draw again once the page's fonts have arrived, so the words use the site's typeface.
    document.fonts?.ready.then(draw).catch(() => {})
    return () => {
      current = false
    }
  }, [plan, theme])

  async function save() {
    const canvas = canvasRef.current
    const blob = canvas && (await canvasBlob(canvas))
    if (!blob) {
      setStatus('The picture could not be saved here. Copy as text keeps the same words.')
      return
    }
    saveBlob(blob, plan.fileName)
    setStatus('Saved to your device.')
  }

  async function share() {
    const canvas = canvasRef.current
    const blob = canvas && (await canvasBlob(canvas))
    if (!blob) return save()
    try {
      await navigator.share({ files: [new File([blob], plan.fileName, { type: 'image/png' })], text: plan.text })
      setStatus('')
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return
      saveBlob(blob, plan.fileName)
      setStatus('Saved to your device.')
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(plan.text)
      setStatus('Copied. The words are on your clipboard.')
    } catch {
      setStatus('Copying is not available here.')
    }
  }

  const action = buttonClassName('secondary', 'sm', 'inline-flex items-center gap-2 min-h-11')

  return (
    <section aria-labelledby={headingId} className={cn('flex flex-col items-center', className)}>
      <h3 id={headingId} className={hideLabel ? 'sr-only' : 'text-sm text-foreground/70 mb-3'}>
        {label}
      </h3>
      <canvas
        ref={canvasRef}
        width={plan.width}
        height={plan.height}
        role="img"
        aria-describedby={descriptionId}
        aria-label={label}
        data-testid="keepsake-canvas"
        className="w-full max-w-[22rem] h-auto rounded-lg soft-shadow-md bg-card-bg"
        style={{ aspectRatio: `${plan.width} / ${plan.height}` }}
      />
      <p id={descriptionId} className="sr-only">
        {plan.alt}
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={save} className={action}>
          <Download size={16} aria-hidden="true" />
          Save image
        </button>
        {shareable && (
          <button type="button" onClick={share} className={action}>
            <Share size={16} aria-hidden="true" />
            Share
          </button>
        )}
        <button type="button" onClick={copy} className={action}>
          <Copy size={16} aria-hidden="true" />
          Copy as text
        </button>
      </div>
      <p role="status" className="mt-2 min-h-5 text-sm text-foreground/70">
        {status}
      </p>
    </section>
  )
}
