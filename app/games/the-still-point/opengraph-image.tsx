import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'The Harmonist - VeryGoodMelon.Fun'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage() {
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
          background: 'linear-gradient(135deg, #1a4d2e 0%, #0d2818 100%)',
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
            background: '#74c69d',
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
            The Harmonist
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
            Guided breathing patterns to calm your nervous system
          </div>

          {/* Divider */}
          <div
            style={{
              width: '80px',
              height: '4px',
              background: '#74c69d',
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
