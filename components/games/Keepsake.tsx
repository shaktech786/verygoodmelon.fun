'use client'

import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import { useInks } from '@/lib/design/inks'
import { PrintTray } from '@/components/seedpress/PrintTray'
import { Stamp } from '@/components/seedpress/Stamp'
import { StatusLine } from '@/components/seedpress/StatusLine'
import type { KeepsakePlan } from '@/lib/keepsake/plan'
import { currentKeepsakeLook, loadKeepsakeFonts, renderKeepsake } from '@/lib/keepsake/render'
import { cn } from '@/lib/utils/cn'

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

const SAVED = 'Saved to your device.'
const NOT_SAVED = 'The picture could not be saved here. Copy as text keeps the same words.'

interface KeepsakeActionsProps {
  plan: KeepsakePlan
  /** The drawn picture, as a PNG. */
  picture: () => Promise<Blob | null>
  saveLabel: string
  className?: string
}

/** Save, share where the system can, and copy as text, with a quiet line saying what happened. */
function KeepsakeActions({ plan, picture, saveLabel, className }: KeepsakeActionsProps) {
  const shareable = useSyncExternalStore(noSubscription, canShareImages, () => false)
  const [status, setStatus] = useState('')

  async function save() {
    const blob = await picture()
    if (!blob) {
      setStatus(NOT_SAVED)
      return
    }
    saveBlob(blob, plan.fileName)
    setStatus(SAVED)
  }

  async function share() {
    const blob = await picture()
    if (!blob) return save()
    try {
      await navigator.share({ files: [new File([blob], plan.fileName, { type: 'image/png' })], text: plan.text })
      setStatus('')
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return
      saveBlob(blob, plan.fileName)
      setStatus(SAVED)
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

  return (
    <div className={cn('sp-printtray__actions', className)}>
      <div className="sp-stamp-row">
        <Stamp icon="save" onClick={save}>
          {saveLabel}
        </Stamp>
        {shareable && (
          <Stamp icon="share" onClick={share}>
            Share
          </Stamp>
        )}
        <Stamp icon="copy" onClick={copy}>
          Copy as text
        </Stamp>
      </div>
      <StatusLine>{status}</StatusLine>
    </div>
  )
}

/** Draws a plan onto a canvas that is never shown, in the look the page has now. */
async function offscreenPicture(plan: KeepsakePlan): Promise<Blob | null> {
  await loadKeepsakeFonts()
  const canvas = document.createElement('canvas')
  renderKeepsake(canvas, plan, currentKeepsakeLook())
  return canvasBlob(canvas)
}

/**
 * The keepsake's actions without a second copy of the picture, for a page whose own card already
 * is the picture: Save draws it there and then. Nothing is uploaded.
 */
export function KeepsakeSave({ plan, saveLabel, className }: { plan: KeepsakePlan; saveLabel: string; className?: string }) {
  return <KeepsakeActions plan={plan} picture={() => offscreenPicture(plan)} saveLabel={saveLabel} className={className} />
}

interface KeepsakeProps {
  plan: KeepsakePlan
  /** Heading read before the picture; visible unless `hideLabel`. */
  label?: string
  hideLabel?: boolean
  /** Draws the picture on screen without grain or offset, for an opening that fades into it; Save still prints the full picture. */
  flat?: boolean
  className?: string
}

/**
 * A picture of the visit drawn on the device, to save or share. Nothing is uploaded: the
 * image is made here and handed straight to the download or the system's share sheet.
 */
export function Keepsake({ plan, label = 'A keepsake of this visit', hideLabel = false, flat = false, className }: KeepsakeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const descriptionId = useId()
  // The palette is read only to redraw when the page's theme, sense or contrast changes
  const inks = useInks()

  useEffect(() => {
    let current = true
    const draw = () => {
      if (!current || !canvasRef.current) return
      const look = currentKeepsakeLook()
      renderKeepsake(canvasRef.current, plan, flat ? { ...look, plain: true } : look)
    }
    draw()
    // Draw again once the page's fonts have arrived, so the words use the site's typeface.
    loadKeepsakeFonts().then(draw)
    return () => {
      current = false
    }
  }, [plan, inks, flat])

  const picture = async () => (flat ? offscreenPicture(plan) : canvasRef.current ? canvasBlob(canvasRef.current) : null)

  return (
    <PrintTray label={label} hideLabel={hideLabel} className={className}>
      <canvas
        ref={canvasRef}
        width={plan.width}
        height={plan.height}
        role="img"
        aria-describedby={descriptionId}
        aria-label={`${plan.title}, a picture to keep`}
        data-testid="keepsake-canvas"
        className="sp-printtray__print"
        style={{ aspectRatio: `${plan.width} / ${plan.height}` }}
      />
      <p id={descriptionId} className="sr-only">
        {plan.alt}
      </p>
      <KeepsakeActions plan={plan} picture={picture} saveLabel="Save image" />
    </PrintTray>
  )
}
