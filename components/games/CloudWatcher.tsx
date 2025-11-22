'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'

interface Cloud {
  id: string
  x: number
  y: number
  width: number
  height: number
  speed: number
  shape: CloudShape[]
  names: CloudName[]
}

interface CloudShape {
  x: number
  y: number
  size: number
}

interface CloudName {
  name: string
  timestamp: number
}

// Generate a random cloud shape
const generateCloudShape = (): CloudShape[] => {
  const numCircles = Math.floor(Math.random() * 4) + 3 // 3-6 circles
  const shapes: CloudShape[] = []

  for (let i = 0; i < numCircles; i++) {
    shapes.push({
      x: Math.random() * 60 - 30,
      y: Math.random() * 30 - 15,
      size: Math.random() * 40 + 30 // 30-70px
    })
  }

  return shapes
}

// Generate a new cloud
const createCloud = (): Cloud => {
  return {
    id: `cloud-${Date.now()}-${Math.random()}`,
    x: -150,
    y: Math.random() * 40 + 10, // 10-50% from top
    width: 100,
    height: 60,
    speed: Math.random() * 0.3 + 0.2, // 0.2-0.5 pixels per frame
    shape: generateCloudShape(),
    names: []
  }
}

// Sample names that might appear (simulated community)
const SAMPLE_NAMES = [
  'A sleeping dragon',
  'Cotton candy mountain',
  'A dancing elephant',
  'A cozy pillow',
  'An old friend',
  'A happy turtle',
  'A floating island',
  'A gentle giant',
  'A dream I once had',
  'The future',
  'Peace itself',
  'A whispered secret',
  'Tomorrow\'s hope',
  'A soft landing',
  'My childhood dog',
  'A question mark',
  'Someone I miss',
  'A warm hug'
]

export default function CloudWatcher() {
  const [clouds, setClouds] = useState<Cloud[]>([])
  const [selectedCloud, setSelectedCloud] = useState<Cloud | null>(null)
  const [userInput, setUserInput] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [showOtherNames, setShowOtherNames] = useState(false)
  const [cloudsNamed, setCloudsNamed] = useState(0)
  const [mounted, setMounted] = useState(false)
  const animationRef = useRef<number | undefined>(undefined)
  const lastSpawnRef = useRef<number>(Date.now())

  // Handle mounting for SSR safety
  useEffect(() => {
    setMounted(true)
  }, [])

  // Animation loop
  useEffect(() => {
    if (!mounted) return

    const animate = () => {
      const now = Date.now()

      // Spawn new cloud every 8-12 seconds
      if (now - lastSpawnRef.current > (Math.random() * 4000 + 8000)) {
        setClouds(prev => [...prev, createCloud()])
        lastSpawnRef.current = now
      }

      // Move clouds (use window safely after mount)
      const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920
      setClouds(prev => prev.map(cloud => ({
        ...cloud,
        x: cloud.x + cloud.speed
      })).filter(cloud => cloud.x < screenWidth + 200))

      animationRef.current = requestAnimationFrame(animate)
    }

    // Start with 2 clouds
    setClouds([createCloud(), createCloud()])
    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [mounted])

  const handleCloudClick = (cloud: Cloud) => {
    if (selectedCloud?.id === cloud.id) {
      setSelectedCloud(null)
      setSubmitted(false)
      setShowOtherNames(false)
      setUserInput('')
    } else {
      setSelectedCloud(cloud)
      setSubmitted(false)
      setShowOtherNames(false)
      setUserInput('')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!userInput.trim() || !selectedCloud) return

    // Add user's name to the cloud
    const newName: CloudName = {
      name: userInput.trim(),
      timestamp: Date.now()
    }

    // Simulate 0-3 other people naming this cloud with random sample names
    const otherNamesCount = Math.floor(Math.random() * 4)
    const otherNames: CloudName[] = []

    for (let i = 0; i < otherNamesCount; i++) {
      const randomName = SAMPLE_NAMES[Math.floor(Math.random() * SAMPLE_NAMES.length)]
      otherNames.push({
        name: randomName,
        timestamp: Date.now() - Math.random() * 60000 // Random time in past minute
      })
    }

    setClouds(prev => prev.map(cloud =>
      cloud.id === selectedCloud.id
        ? { ...cloud, names: [...otherNames, newName] }
        : cloud
    ))

    setSubmitted(true)
    setCloudsNamed(prev => prev + 1)

    // Show other names after a delay
    setTimeout(() => setShowOtherNames(true), 800)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setSelectedCloud(null)
      setSubmitted(false)
      setShowOtherNames(false)
      setUserInput('')
    }
  }

  // Show loading during SSR
  if (!mounted) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="relative bg-gradient-to-b from-sky-200 to-sky-50 rounded-lg overflow-hidden mb-6 flex items-center justify-center" style={{ height: '400px' }}>
          <div className="text-sky-400 text-lg">Loading sky...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Sky view */}
      <div className="relative bg-gradient-to-b from-sky-200 to-sky-50 rounded-lg overflow-hidden mb-6" style={{ height: '400px' }}>
        {/* Clouds */}
        {clouds.map((cloud) => (
          <button
            key={cloud.id}
            className={`
              absolute cursor-pointer transition-all duration-300
              focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 rounded-full
              ${selectedCloud?.id === cloud.id ? 'scale-110 drop-shadow-lg' : 'hover:scale-105'}
            `}
            style={{
              left: `${cloud.x}px`,
              top: `${cloud.y}%`,
              width: `${cloud.width}px`,
              height: `${cloud.height}px`,
              transform: selectedCloud?.id === cloud.id ? 'scale(1.1)' : undefined
            }}
            onClick={() => handleCloudClick(cloud)}
            aria-label={`Cloud. ${selectedCloud?.id === cloud.id ? 'Selected. Press Escape to deselect.' : 'Click to name this cloud.'}`}
          >
            {/* Cloud shape using multiple circles */}
            {cloud.shape.map((shape, i) => (
              <div
                key={i}
                className="absolute bg-white rounded-full opacity-90"
                style={{
                  left: `${shape.x + 50}px`,
                  top: `${shape.y + 30}px`,
                  width: `${shape.size}px`,
                  height: `${shape.size}px`,
                  filter: selectedCloud?.id === cloud.id ? 'brightness(1.1)' : undefined
                }}
              />
            ))}

            {/* Show name count if cloud has been named */}
            {cloud.names.length > 0 && (
              <div className="absolute -top-2 -right-2 bg-accent text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-semibold">
                {cloud.names.length}
              </div>
            )}
          </button>
        ))}

        {/* Instructions overlay */}
        {!selectedCloud && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center bg-white/60 backdrop-blur-sm rounded-lg p-6 max-w-md">
              <div className="text-5xl mb-3" aria-hidden="true">☁️</div>
              <p className="text-lg text-foreground/80 mb-2">
                Click a cloud to name what you see
              </p>
              <p className="text-sm text-primary-light">
                Watch the sky. What shapes do you notice?
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Naming interface */}
      {selectedCloud && !submitted && (
        <div className="bg-card-bg border border-card-border rounded-lg p-6 mb-6 animate-fade">
          <h3 className="text-xl font-semibold mb-4 text-foreground">
            What do you see in this cloud?
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="A dragon? A mountain? A memory?"
              className="w-full px-4 py-3 bg-background border border-card-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-foreground"
              maxLength={60}
              autoFocus
              aria-label="Name what you see in the cloud"
            />
            <div className="flex gap-3">
              <Button
                type="submit"
                variant="primary"
                disabled={!userInput.trim()}
                className="flex-1"
              >
                Name This Cloud
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSelectedCloud(null)}
              >
                Cancel
              </Button>
            </div>
            <p className="text-xs text-primary-light">
              Press Escape to cancel
            </p>
          </form>
        </div>
      )}

      {/* Thank you / other names */}
      {selectedCloud && submitted && (
        <div className="bg-card-bg border border-success rounded-lg p-6 mb-6 animate-fade">
          <div className="text-center mb-4">
            <div className="text-5xl mb-3" aria-hidden="true">✨</div>
            <h3 className="text-xl font-semibold mb-2 text-foreground">
              Beautiful observation
            </h3>
            <p className="text-primary-light mb-4">
              You named it: <span className="italic font-medium text-foreground">&ldquo;{userInput}&rdquo;</span>
            </p>
          </div>

          {showOtherNames && selectedCloud.names.length > 1 && (
            <div className="border-t border-card-border pt-4 animate-fade">
              <p className="text-sm text-primary-light mb-3">
                Others also saw this cloud as:
              </p>
              <div className="space-y-2">
                {selectedCloud.names
                  .filter(n => n.name !== userInput.trim())
                  .map((name, i) => (
                    <div
                      key={i}
                      className="bg-background rounded-lg px-4 py-2 text-sm text-foreground"
                    >
                      &ldquo;{name.name}&rdquo;
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="mt-6 text-center">
            <Button
              variant="primary"
              onClick={() => {
                setSelectedCloud(null)
                setSubmitted(false)
                setShowOtherNames(false)
                setUserInput('')
              }}
            >
              Keep Watching
            </Button>
          </div>
        </div>
      )}

      {/* Stats */}
      {cloudsNamed > 0 && (
        <div className="text-center text-sm text-primary-light mb-4">
          <p>
            🌤️ You&rsquo;ve named {cloudsNamed} {cloudsNamed === 1 ? 'cloud' : 'clouds'} today
          </p>
        </div>
      )}

      {/* Philosophy */}
      <div className="mt-8 text-center text-sm text-primary-light max-w-2xl mx-auto">
        <p>
          Before smartphones, before schedules, before everything...
          <br />
          We laid in the grass and watched clouds drift by.
          <br />
          <span className="text-foreground/80 italic">What did we lose when we stopped looking up?</span>
        </p>
      </div>
    </div>
  )
}
