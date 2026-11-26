import type { Metadata } from 'next'
import { Logo } from '@/components/seedpress/Logo'

export const metadata: Metadata = {
  title: 'Offline | VeryGoodMelon.Fun',
}

/*
 * Served by public/sw.js when a page can't be reached, so it must read well even if no stylesheet or font
 * was ever cached: system fonts, system colours as the fallback for every token, and its own critical CSS.
 */
const OFFLINE_CSS = `
.off { display: grid; justify-items: start; gap: 16px; max-width: 40rem; margin: 0 auto; padding: 64px 24px; color: var(--ink, CanvasText); font-family: var(--font-body, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif); font-size: 1.125rem; line-height: 1.6; }
.off svg { width: 96px; height: 64px; }
.off .sp-logo__flesh { color: var(--flesh, currentColor); }
.off .sp-logo__rind { color: var(--rind, currentColor); }
.off h1 { margin: 0; font-family: var(--font-display, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif); font-size: clamp(2rem, 1.6rem + 2vw, 3rem); font-weight: 800; line-height: 1.1; }
.off p { margin: 0; max-width: 66ch; }
`

export default function OfflinePage() {
  return (
    <div className="off">
      <style>{OFFLINE_CSS}</style>
      <Logo />
      <h1>The shop&apos;s lights are off</h1>
      <p>
        You&apos;re offline. Games you&apos;ve opened before may still work here. The rest will be back when you
        reconnect.
      </p>
    </div>
  )
}
