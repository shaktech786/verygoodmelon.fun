'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { Ball, Pin } from '@/lib/games/bowling/physics'
import { Button } from '@/components/ui/Button'
import {
  updateBall,
  updatePin,
  checkCollision,
  resolveBallPinCollision,
  resolvePinPinCollision,
  initializePins
} from '@/lib/games/bowling/physics'
import {
  drawLane,
  drawWatermelonBall,
  drawPin,
  drawAimingLine,
  drawScore,
  drawMessage
} from '@/lib/games/bowling/graphics'
import { soundManager } from '@/lib/games/bowling/sounds'

type GameState = 'aiming' | 'rolling' | 'settling' | 'finished'

export default function WatermelonBowling() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>(0)

  // Use refs for game state to avoid re-renders during game loop
  const gameStateRef = useRef<GameState>('aiming')
  const scoreRef = useRef<number>(0)
  const ballRef = useRef<Ball | null>(null)
  const pinsRef = useRef<Pin[]>([])
  const aimStartRef = useRef<{ x: number; y: number } | null>(null)
  const aimEndRef = useRef<{ x: number; y: number } | null>(null)
  const messageRef = useRef<string>('')
  const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [soundEnabled, setSoundEnabled] = useState(false)
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 })

  const BALL_RADIUS = 20
  const BALL_START_Y_RATIO = 0.9

  // Handle responsive canvas sizing
  useEffect(() => {
    const updateCanvasSize = () => {
      if (!containerRef.current) return

      const containerWidth = containerRef.current.clientWidth
      const maxWidth = 800
      const width = Math.min(containerWidth - 32, maxWidth) // 32px for padding
      const height = (width / 4) * 3 // 4:3 aspect ratio

      setCanvasSize({ width, height })
    }

    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)
    return () => window.removeEventListener('resize', updateCanvasSize)
  }, [])

  // Initialize game
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Initialize pins
    const newPins = initializePins(canvasSize.width / 2, canvasSize.height * 0.2, 40)
    pinsRef.current = newPins

    // Initialize ball at starting position
    const newBall: Ball = {
      x: canvasSize.width / 2,
      y: canvasSize.height * BALL_START_Y_RATIO,
      vx: 0,
      vy: 0,
      radius: BALL_RADIUS,
      rotation: 0
    }
    ballRef.current = newBall

    soundManager.setEnabled(soundEnabled)
  }, [soundEnabled, canvasSize])

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let lastTime = performance.now()

    const gameLoop = (currentTime: number) => {
      // Calculate delta time in milliseconds, cap to prevent huge jumps
      const deltaTime = Math.min(currentTime - lastTime, 100)
      lastTime = currentTime

      const ball = ballRef.current
      const pins = pinsRef.current
      const gameState = gameStateRef.current
      const aimStart = aimStartRef.current
      const aimEnd = aimEndRef.current
      const message = messageRef.current
      const score = scoreRef.current

      // Clear canvas
      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height)

      // Draw lane
      drawLane(ctx, canvasSize.width, canvasSize.height)

      // Draw pins
      pins.forEach(pin => drawPin(ctx, pin))

      // Draw ball
      if (ball) {
        drawWatermelonBall(ctx, ball)
      }

      // Draw aiming line when aiming
      if (gameState === 'aiming' && aimStart && aimEnd) {
        const dx = aimEnd.x - aimStart.x
        const dy = aimEnd.y - aimStart.y
        const power = Math.sqrt(dx * dx + dy * dy)
        drawAimingLine(ctx, aimStart.x, aimStart.y, aimEnd.x, aimEnd.y, power)
      }

      // Draw score
      drawScore(ctx, score, canvasSize.width / 2, 20)

      // Draw message
      if (message) {
        drawMessage(ctx, message, canvasSize.width / 2, canvasSize.height / 2)
      }

      // Update game state
      if ((gameState === 'rolling' || gameState === 'settling') && ball) {
        // Update ball
        let newBall = updateBall(ball, deltaTime)

        // Update pins
        let newPins = [...pins]

        // Check ball-pin collisions
        let hasCollision = false
        newPins = newPins.map(pin => {
          if (checkCollision(newBall, pin)) {
            const result = resolveBallPinCollision(newBall, pin)
            newBall = result.ball
            if (!hasCollision) {
              soundManager.play('pin-hit')
              hasCollision = true
            }
            return result.pin
          }
          return updatePin(pin, deltaTime)
        })

        // Check pin-pin collisions (multiple iterations for stability)
        for (let iteration = 0; iteration < 2; iteration++) {
          for (let i = 0; i < newPins.length; i++) {
            for (let j = i + 1; j < newPins.length; j++) {
              if (checkCollision(newPins[i], newPins[j])) {
                const result = resolvePinPinCollision(newPins[i], newPins[j])
                newPins[i] = result.pin1
                newPins[j] = result.pin2
              }
            }
          }
        }

        // Update refs
        ballRef.current = newBall
        pinsRef.current = newPins

        // Check if ball has stopped or gone off screen
        const ballSpeed = Math.sqrt(newBall.vx * newBall.vx + newBall.vy * newBall.vy)
        const ballOffScreen = newBall.y < -100 || newBall.y > canvasSize.height + 100

        if (gameState === 'rolling' && (ballSpeed < 0.5 || ballOffScreen)) {
          gameStateRef.current = 'settling'

          // Wait for pins to settle
          setTimeout(() => {
            calculateScore()
            gameStateRef.current = 'finished'
          }, 2000)
        }
      }

      animationRef.current = requestAnimationFrame(gameLoop)
    }

    animationRef.current = requestAnimationFrame(gameLoop)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasSize]) // calculateScore is defined with useCallback, stable reference

  const calculateScore = useCallback(() => {
    const pins = pinsRef.current
    const fallenPins = pins.filter(p => p.fallen).length
    const newScore = scoreRef.current + fallenPins * 10

    scoreRef.current = newScore

    if (fallenPins === 10) {
      messageRef.current = 'STRIKE! 🍉'
      soundManager.play('strike')
    } else if (fallenPins > 0) {
      messageRef.current = `${fallenPins} pins!`
      soundManager.play('spare')
    } else {
      messageRef.current = 'Gutter ball!'
      soundManager.play('gutter')
    }

    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current)
    }
    messageTimeoutRef.current = setTimeout(() => {
      messageRef.current = ''
    }, 2000)
  }, [])

  const getCanvasCoordinates = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    }
  }

  const handlePointerStart = (clientX: number, clientY: number) => {
    if (gameStateRef.current !== 'aiming' || !ballRef.current) return

    const coords = getCanvasCoordinates(clientX, clientY)
    if (!coords) return

    // Start aiming from where user clicks
    aimStartRef.current = coords
    aimEndRef.current = coords
  }

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (gameStateRef.current !== 'aiming' || !aimStartRef.current) return

    const coords = getCanvasCoordinates(clientX, clientY)
    if (!coords) return

    aimEndRef.current = coords
  }

  const handlePointerEnd = () => {
    const aimStart = aimStartRef.current
    const aimEnd = aimEndRef.current
    const ball = ballRef.current

    if (gameStateRef.current !== 'aiming' || !aimStart || !aimEnd || !ball) return

    // Calculate velocity: drag in direction you want ball to go
    const dx = aimEnd.x - aimStart.x
    const dy = aimEnd.y - aimStart.y

    const distance = Math.sqrt(dx * dx + dy * dy)

    // Require minimum drag distance
    if (distance < 10) {
      aimStartRef.current = null
      aimEndRef.current = null
      return
    }

    // Scale power based on drag distance
    const power = Math.min(distance / 10, 15)
    const angle = Math.atan2(dy, dx)

    ballRef.current = {
      ...ball,
      vx: Math.cos(angle) * power,
      vy: Math.sin(angle) * power
    }

    gameStateRef.current = 'rolling'
    aimStartRef.current = null
    aimEndRef.current = null

    soundManager.play('roll')
  }

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    handlePointerStart(e.clientX, e.clientY)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    handlePointerMove(e.clientX, e.clientY)
  }

  const handleMouseUp = () => {
    handlePointerEnd()
  }

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (e.touches.length > 0) {
      handlePointerStart(e.touches[0].clientX, e.touches[0].clientY)
    }
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (e.touches.length > 0) {
      handlePointerMove(e.touches[0].clientX, e.touches[0].clientY)
    }
  }

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    handlePointerEnd()
  }

  const handleReset = () => {
    // Reset pins
    const newPins = initializePins(canvasSize.width / 2, canvasSize.height * 0.2, 40)
    pinsRef.current = newPins

    // Reset ball
    const newBall: Ball = {
      x: canvasSize.width / 2,
      y: canvasSize.height * BALL_START_Y_RATIO,
      vx: 0,
      vy: 0,
      radius: BALL_RADIUS,
      rotation: 0
    }
    ballRef.current = newBall

    gameStateRef.current = 'aiming'
    messageRef.current = ''
    scoreRef.current = 0
  }

  const toggleSound = () => {
    const newState = !soundEnabled
    setSoundEnabled(newState)
    soundManager.setEnabled(newState)
  }

  return (
    <div ref={containerRef} className="flex flex-col items-center gap-3 sm:gap-4 w-full">
      <div className="relative w-full max-w-4xl">
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className="border-2 border-accent rounded-lg cursor-crosshair pixelated w-full touch-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            aimStartRef.current = null
            aimEndRef.current = null
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          aria-label="Watermelon bowling game canvas"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-center w-full max-w-md px-4">
        <Button
          onClick={handleReset}
          variant="primary"
          className="w-full sm:w-auto px-4 py-2 sm:px-6 sm:py-3 font-medium text-sm sm:text-base"
          aria-label="Reset game"
        >
          New Game
        </Button>

        <Button
          onClick={toggleSound}
          variant="primary"
          className="w-full sm:w-auto px-4 py-2 sm:px-6 sm:py-3 font-medium text-sm sm:text-base"
          aria-label={soundEnabled ? 'Disable sound' : 'Enable sound'}
        >
          Sound: {soundEnabled ? 'ON' : 'OFF'}
        </Button>
      </div>

      <div className="text-xs sm:text-sm text-foreground/60 text-center max-w-md px-4">
        <p className="mb-1">
          <strong>How to play:</strong> Drag to aim, release to bowl!
        </p>
        <p className="text-[10px] sm:text-xs">
          Knock down all 10 pins for a STRIKE! Each pin is worth 10 points.
        </p>
      </div>
    </div>
  )
}
