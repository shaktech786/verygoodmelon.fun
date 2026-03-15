import { ImageResponse } from 'next/og'
import { ALL_GAMES } from '@/lib/games/config'

export const runtime = 'edge'

export const alt = 'VeryGoodMelon.Fun Game'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const ACCENT_COLOR_MAP: Record<string, string> = {
  accent: '#e63946',
  success: '#74c69d',
  warning: '#f4a261',
  purple: '#7c3aed',
}

export default async function OGImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const game = ALL_GAMES.find((g) => g.slug === slug)

  const title = game?.title ?? 'VeryGoodMelon.Fun'
  const description = game?.description ?? 'Thoughtful games to reduce anxiety'
  const accentHex = game ? (ACCENT_COLOR_MAP[game.accentColor] ?? '#e63946') : '#e63946'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: `linear-gradient(135deg, #1a4d2e 0%, #0d2818 100%)`,
          fontFamily: 'sans-serif',
        }}
      >
        {/* Accent bar at top */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '6px',
            background: accentHex,
            display: 'flex',
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '60px 80px',
            textAlign: 'center',
          }}
        >
          {/* Game title */}
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.1,
              marginBottom: '24px',
              display: 'flex',
            }}
          >
            {title}
          </div>

          {/* Description */}
          <div
            style={{
              fontSize: 32,
              color: 'rgba(255, 255, 255, 0.75)',
              lineHeight: 1.4,
              maxWidth: '800px',
              marginBottom: '48px',
              display: 'flex',
            }}
          >
            {description}
          </div>

          {/* Divider */}
          <div
            style={{
              width: '80px',
              height: '4px',
              background: accentHex,
              borderRadius: '2px',
              marginBottom: '32px',
              display: 'flex',
            }}
          />

          {/* Branding */}
          <div
            style={{
              fontSize: 24,
              color: 'rgba(255, 255, 255, 0.5)',
              letterSpacing: '0.05em',
              display: 'flex',
            }}
          >
            VeryGoodMelon.Fun
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  )
}
