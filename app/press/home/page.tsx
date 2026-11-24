import type { Metadata } from 'next'
import { CounterPacket } from '@/components/seedpress/CounterPacket'
import { Footer } from '@/components/seedpress/Footer'
import { Header } from '@/components/seedpress/Header'
import { MoodStamps } from '@/components/seedpress/MoodStamps'
import { Rack } from '@/components/seedpress/Rack'
import { ProofBar } from '../ProofBar'

export const metadata: Metadata = { title: 'The seed rack - Seedpress proof' }

/** The homepage as Seedpress draws it (PLAN.md §8.1): the sign, today's packet, the moods, then the rack. */
export default function PressHome() {
  return (
    <>
      <ProofBar other={{ href: '/press', label: 'The specimen sheet', icon: 'next' }} />
      <Header home="/press/home" />
      <div className="sp-shop sp-home">
        <div className="sp-band">
          <div className="sp-sign">
            <h1 className="sp-sign__title">Small, quiet games for a busy mind</h1>
            <p className="sp-sign__motto">Think deeply, feel lighter.</p>
          </div>
          <CounterPacket />
          <MoodStamps />
        </div>
        <Rack />
      </div>
      <Footer />
    </>
  )
}
