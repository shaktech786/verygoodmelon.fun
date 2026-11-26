'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import './globals.css'
import '@/components/seedpress/seedpress.css'
import { ErrorNote } from '@/components/seedpress/ErrorNote'
import { Go } from '@/components/seedpress/Go'
import { atkinson, bricolage } from '@/lib/design/fonts'

// This page replaces the root layout, so it brings its own fonts, tokens and the default settings
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en" className={`${atkinson.variable} ${bricolage.variable}`} data-theme="auto" data-sense="gentle" data-contrast="normal" data-text-size="default" data-spacing="standard">
      <body>
        <main>
          <ErrorNote title="Something went wrong" actions={<Go onClick={reset}>Try Again</Go>}>
            We&apos;ve been notified and are looking into it.
          </ErrorNote>
        </main>
      </body>
    </html>
  )
}
