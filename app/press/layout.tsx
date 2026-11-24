import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { SenseScope } from '@/components/seedpress/SenseContext'
import '../styles/tokens.css'
import '@/components/seedpress/seedpress.css'
import { atkinson, bricolage } from './fonts'

// The Seedpress proof (docs/design-system/PLAN.md §11, Phase 1): not for search, linked from nowhere.
export const metadata: Metadata = {
  title: 'Seedpress proof - VeryGoodMelon.Fun',
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
}

export default function PressLayout({ children }: { children: ReactNode }) {
  return <SenseScope className={`press ${atkinson.variable} ${bricolage.variable}`}>{children}</SenseScope>
}
