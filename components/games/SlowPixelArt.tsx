'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'

interface Pixel {
  x: number
  y: number
  color: string
  created_at: string | null
}

const CANVAS_SIZE = 32 // 32x32 grid
const PIXEL_SIZE = 16 // pixels
const COOLDOWN_SECONDS = 60 // 1 minute between placements

const PALETTE = [
  '#e63946', // Melon red
  '#1a4d2e', // Melon green (dark)
  '#74c69d', // Melon green (light)
  '#fafafa', // Background
  '#1a1a1a', // Black
  '#f6ad55', // Warm orange
  '#ffffff', // White
  '#2d3748', // Dark gray
]

export default function SlowPixelArt() {
  const [pixels, setPixels] = useState<Pixel[]>([])
  const [selectedColor, setSelectedColor] = useState(PALETTE[0])
  const [cooldownRemaining, setCooldownRemaining] = useState(0)
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null)
  const [totalContributors, setTotalContributors] = useState(0)
  const [loading, setLoading] = useState(true)
  const [placing, setPlacing] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Load canvas on mount
  useEffect(() => {
    loadCanvas()
    const lastPlacement = localStorage.getItem('slow_pixel_last_placement')
    if (lastPlacement) {
      const elapsed = Math.floor((Date.now() - parseInt(lastPlacement)) / 1000)
      const remaining = COOLDOWN_SECONDS - elapsed
      if (remaining > 0) {
        setCooldownRemaining(remaining)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cooldown timer
  useEffect(() => {
    if (cooldownRemaining > 0) {
      const timer = setTimeout(() => {
        setCooldownRemaining(cooldownRemaining - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldownRemaining])

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('pixel_art_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'slow_pixel_art'
        },
        (payload: { new: Pixel }) => {
          const newPixel = payload.new
          setPixels((prev) => {
            // Replace pixel at same position or add new
            const filtered = prev.filter(p => !(p.x === newPixel.x && p.y === newPixel.y))
            return [...filtered, newPixel]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const loadCanvas = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('slow_pixel_art')
        .select('x, y, color, created_at')
        .order('created_at', { ascending: false })
        .limit(CANVAS_SIZE * CANVAS_SIZE)

      if (error) throw error

      if (data) {
        setPixels(data)
        // Count unique contributors (rough estimate based on time clustering)
        const uniqueTimes = new Set(data.map((p: Pixel) => p.created_at?.split('T')[0] || '').filter(Boolean))
        setTotalContributors(Math.max(1, Math.floor(uniqueTimes.size * 1.5)))
      }
    } catch (error) {
      console.error('Error loading canvas:', error)
    } finally {
      setLoading(false)
    }
  }

  const placePixel = async (x: number, y: number) => {
    if (cooldownRemaining > 0 || placing) return

    setPlacing(true)

    try {
      const { error } = await supabase
        .from('slow_pixel_art')
        .insert([{ x, y, color: selectedColor }])

      if (error) throw error

      // Set cooldown
      localStorage.setItem('slow_pixel_last_placement', Date.now().toString())
      setCooldownRemaining(COOLDOWN_SECONDS)

      // Optimistically update local state (real-time will also update)
      setPixels((prev) => {
        const filtered = prev.filter(p => !(p.x === x && p.y === y))
        return [...filtered, { x, y, color: selectedColor, created_at: new Date().toISOString() }]
      })
    } catch (error) {
      console.error('Error placing pixel:', error)
      alert('Failed to place pixel. Please try again.')
    } finally {
      setPlacing(false)
    }
  }

  const handleCellClick = (x: number, y: number) => {
    if (cooldownRemaining === 0 && !placing) {
      placePixel(x, y)
    }
  }

  const handleCellKeyDown = (e: React.KeyboardEvent, x: number, y: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleCellClick(x, y)
    }
  }

  const getPixelColor = useCallback((x: number, y: number): string => {
    const pixel = pixels.find(p => p.x === x && p.y === y)
    return pixel ? pixel.color : '#f7f7f7'
  }, [pixels])

  const renderCanvas = () => {
    const cells = []

    for (let y = 0; y < CANVAS_SIZE; y++) {
      for (let x = 0; x < CANVAS_SIZE; x++) {
        const pixelColor = getPixelColor(x, y)
        const isHovered = hoveredCell?.x === x && hoveredCell?.y === y
        const canPlace = cooldownRemaining === 0 && !placing

        cells.push(
          <div
            key={`${x}-${y}`}
            onClick={() => handleCellClick(x, y)}
            onMouseEnter={() => setHoveredCell({ x, y })}
            onMouseLeave={() => setHoveredCell(null)}
            onKeyDown={(e) => handleCellKeyDown(e, x, y)}
            tabIndex={canPlace ? 0 : -1}
            role="button"
            aria-label={`Place ${selectedColor} pixel at row ${y + 1}, column ${x + 1}`}
            className={`
              border border-card-border/40
              transition-all duration-75
              ${canPlace ? 'cursor-pointer hover:border-accent' : 'cursor-not-allowed'}
              ${isHovered && canPlace ? 'ring-2 ring-accent ring-inset' : ''}
              focus:outline-none focus:ring-2 focus:ring-accent focus:ring-inset
            `}
            style={{
              backgroundColor: isHovered && canPlace ? selectedColor : pixelColor,
              width: PIXEL_SIZE,
              height: PIXEL_SIZE,
            }}
          />
        )
      }
    }

    return cells
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-primary-light">Loading collaborative canvas...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-card-bg border border-card-border rounded-lg p-6 sm:p-8">
        {/* Info */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-3" aria-hidden="true">
            🎨
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold mb-2 text-foreground">
            One Pixel at a Time
          </h2>
          <p className="text-sm sm:text-base text-primary-light">
            A collaborative canvas. Place one pixel every {COOLDOWN_SECONDS} seconds.
            <br />
            Watch art emerge slowly, together.
          </p>
        </div>

        {/* Canvas */}
        <div className="mb-6 flex justify-center">
          <div
            ref={canvasRef}
            className="inline-grid bg-hover-bg p-4 rounded-lg shadow-lg pixelated"
            style={{
              gridTemplateColumns: `repeat(${CANVAS_SIZE}, ${PIXEL_SIZE}px)`,
              gridTemplateRows: `repeat(${CANVAS_SIZE}, ${PIXEL_SIZE}px)`,
            }}
            role="grid"
            aria-label="Collaborative pixel art canvas"
          >
            {renderCanvas()}
          </div>
        </div>

        {/* Color palette */}
        <div className="mb-6">
          <div className="text-sm font-semibold mb-2 text-foreground text-center">
            Choose Color:
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {PALETTE.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`
                  w-12 h-12 rounded-lg border-2 transition-all
                  hover:scale-110 focus:outline-none focus:ring-2 focus:ring-accent
                  ${selectedColor === color ? 'border-accent scale-110' : 'border-card-border'}
                `}
                style={{ backgroundColor: color }}
                aria-label={`Select color ${color}`}
                aria-pressed={selectedColor === color}
              />
            ))}
          </div>
        </div>

        {/* Cooldown indicator */}
        {cooldownRemaining > 0 ? (
          <div className="bg-accent-soft border border-accent/20 rounded-lg p-4 text-center mb-6">
            <p className="text-foreground font-medium">
              Next pixel in: <span className="text-accent font-semibold tabular-nums">{cooldownRemaining}s</span>
            </p>
            <p className="text-sm text-primary-light mt-1">
              Slow down. Good art takes time.
            </p>
          </div>
        ) : (
          <div className="bg-success/10 border border-success/20 rounded-lg p-4 text-center mb-6">
            <p className="text-foreground font-medium">
              ✨ Ready to place a pixel!
            </p>
            <p className="text-sm text-primary-light mt-1">
              Click any cell on the canvas
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-hover-bg rounded-lg p-4 text-center">
            <div className="text-2xl font-semibold text-foreground">{pixels.length}</div>
            <div className="text-sm text-primary-light">Pixels Placed</div>
          </div>
          <div className="bg-hover-bg rounded-lg p-4 text-center">
            <div className="text-2xl font-semibold text-foreground">~{totalContributors}</div>
            <div className="text-sm text-primary-light">Contributors</div>
          </div>
        </div>

        {/* Reset button (admin only - hidden for now) */}
        <div className="text-center">
          <Button
            onClick={loadCanvas}
            variant="ghost"
            size="sm"
          >
            Refresh Canvas
          </Button>
        </div>

        {/* Philosophy */}
        <div className="mt-6 text-center text-sm text-primary-light max-w-2xl mx-auto">
          <p>
            In a world of instant gratification, this canvas asks for patience.
            <br />
            Every pixel is a small contribution to something bigger than yourself.
          </p>
        </div>
      </div>
    </div>
  )
}
