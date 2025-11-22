'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'

interface Node {
  id: number
  x: number
  y: number
}

interface Edge {
  from: number
  to: number
}

interface Puzzle {
  id: string
  nodes: Node[]
  startNodes: Node[] // Tangled starting positions
  edges: Edge[]
  quote: string
  author: string
  difficulty: 'easy' | 'medium' | 'hard'
}

const PUZZLES: Puzzle[] = [
  {
    id: 'triangle',
    nodes: [
      { id: 0, x: 150, y: 50 },
      { id: 1, x: 50, y: 200 },
      { id: 2, x: 250, y: 200 },
    ],
    startNodes: [
      { id: 0, x: 50, y: 200 },   // Swap positions to create crossings
      { id: 1, x: 250, y: 200 },
      { id: 2, x: 150, y: 50 },
    ],
    edges: [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 2, to: 0 },
    ],
    quote: 'The simplest problems often have the most elegant solutions.',
    author: 'Ancient wisdom',
    difficulty: 'easy'
  },
  {
    id: 'square',
    nodes: [
      { id: 0, x: 50, y: 50 },
      { id: 1, x: 250, y: 50 },
      { id: 2, x: 250, y: 250 },
      { id: 3, x: 50, y: 250 },
    ],
    startNodes: [
      { id: 0, x: 250, y: 250 },  // Swap to create diagonal crossing
      { id: 1, x: 50, y: 250 },
      { id: 2, x: 50, y: 50 },
      { id: 3, x: 250, y: 50 },
    ],
    edges: [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 2, to: 3 },
      { from: 3, to: 0 },
      { from: 0, to: 2 },
    ],
    quote: 'When paths cross, step back and see the bigger picture.',
    author: 'Zen proverb',
    difficulty: 'easy'
  },
  {
    id: 'pentagon',
    nodes: [
      { id: 0, x: 150, y: 30 },
      { id: 1, x: 50, y: 100 },
      { id: 2, x: 80, y: 200 },
      { id: 3, x: 220, y: 200 },
      { id: 4, x: 250, y: 100 },
    ],
    startNodes: [
      { id: 0, x: 220, y: 200 },  // Swap multiple nodes
      { id: 1, x: 150, y: 30 },
      { id: 2, x: 250, y: 100 },
      { id: 3, x: 80, y: 200 },
      { id: 4, x: 50, y: 100 },
    ],
    edges: [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 2, to: 3 },
      { from: 3, to: 4 },
      { from: 4, to: 0 },
      { from: 0, to: 2 },
      { from: 1, to: 3 },
    ],
    quote: 'Complexity is just simplicity that hasn\'t found its shape yet.',
    author: 'Modern philosophy',
    difficulty: 'medium'
  },
  {
    id: 'web',
    nodes: [
      { id: 0, x: 150, y: 100 },
      { id: 1, x: 80, y: 50 },
      { id: 2, x: 220, y: 50 },
      { id: 3, x: 50, y: 150 },
      { id: 4, x: 250, y: 150 },
      { id: 5, x: 100, y: 220 },
      { id: 6, x: 200, y: 220 },
    ],
    startNodes: [
      { id: 0, x: 50, y: 150 },   // Move center far from optimal
      { id: 1, x: 200, y: 220 },
      { id: 2, x: 100, y: 220 },
      { id: 3, x: 220, y: 50 },
      { id: 4, x: 80, y: 50 },
      { id: 5, x: 250, y: 150 },
      { id: 6, x: 150, y: 100 },
    ],
    edges: [
      { from: 0, to: 1 },
      { from: 0, to: 2 },
      { from: 0, to: 3 },
      { from: 0, to: 4 },
      { from: 0, to: 5 },
      { from: 0, to: 6 },
      { from: 1, to: 3 },
      { from: 2, to: 4 },
      { from: 3, to: 5 },
      { from: 4, to: 6 },
    ],
    quote: 'Sometimes the center must move for everything else to align.',
    author: 'Systems thinking',
    difficulty: 'medium'
  },
  {
    id: 'star',
    nodes: [
      { id: 0, x: 150, y: 30 },
      { id: 1, x: 220, y: 100 },
      { id: 2, x: 200, y: 180 },
      { id: 3, x: 100, y: 180 },
      { id: 4, x: 80, y: 100 },
    ],
    startNodes: [
      { id: 0, x: 200, y: 180 },  // Rotate star positions to tangle
      { id: 1, x: 100, y: 180 },
      { id: 2, x: 80, y: 100 },
      { id: 3, x: 150, y: 30 },
      { id: 4, x: 220, y: 100 },
    ],
    edges: [
      { from: 0, to: 2 },
      { from: 2, to: 4 },
      { from: 4, to: 1 },
      { from: 1, to: 3 },
      { from: 3, to: 0 },
    ],
    quote: 'In chaos, there is always a hidden pattern waiting to emerge.',
    author: 'Chaos theory',
    difficulty: 'hard'
  }
]

export default function TheUntangler() {
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0)
  const [nodes, setNodes] = useState<Node[]>([])
  const [draggedNode, setDraggedNode] = useState<number | null>(null)
  const [solved, setSolved] = useState(false)
  const [showQuote, setShowQuote] = useState(false)
  const [selectedNode, setSelectedNode] = useState<number | null>(null)
  const [initializing, setInitializing] = useState(true)
  const canvasRef = useRef<HTMLDivElement>(null)

  const currentPuzzle = PUZZLES[currentPuzzleIndex]

  // Initialize puzzle
  useEffect(() => {
    // Use pre-defined tangled starting positions
    setInitializing(true)
    setNodes([...currentPuzzle.startNodes])
    setSolved(false)
    setShowQuote(false)
    setSelectedNode(null)

    // Delay before allowing solved checks
    const timer = setTimeout(() => setInitializing(false), 100)
    return () => clearTimeout(timer)
  }, [currentPuzzleIndex, currentPuzzle.startNodes])

  // Check if puzzle is solved (no edge intersections)
  useEffect(() => {
    if (nodes.length === 0 || initializing) return

    const isSolved = !hasIntersections()
    if (isSolved && !solved) {
      setSolved(true)
      setTimeout(() => setShowQuote(true), 300)
    }
  }, [nodes, initializing])

  // Check for edge intersections
  const hasIntersections = (): boolean => {
    const { edges } = currentPuzzle

    for (let i = 0; i < edges.length; i++) {
      for (let j = i + 1; j < edges.length; j++) {
        const edge1 = edges[i]
        const edge2 = edges[j]

        // Skip if edges share a node
        if (
          edge1.from === edge2.from ||
          edge1.from === edge2.to ||
          edge1.to === edge2.from ||
          edge1.to === edge2.to
        ) {
          continue
        }

        const p1 = nodes[edge1.from]
        const p2 = nodes[edge1.to]
        const p3 = nodes[edge2.from]
        const p4 = nodes[edge2.to]

        if (doLinesIntersect(p1, p2, p3, p4)) {
          return true
        }
      }
    }

    return false
  }

  // Line intersection algorithm
  const doLinesIntersect = (p1: Node, p2: Node, p3: Node, p4: Node): boolean => {
    const det = (p2.x - p1.x) * (p4.y - p3.y) - (p4.x - p3.x) * (p2.y - p1.y)

    if (det === 0) return false

    const lambda = ((p4.y - p3.y) * (p4.x - p1.x) + (p3.x - p4.x) * (p4.y - p1.y)) / det
    const gamma = ((p1.y - p2.y) * (p4.x - p1.x) + (p2.x - p1.x) * (p4.y - p1.y)) / det

    return lambda > 0 && lambda < 1 && gamma > 0 && gamma < 1
  }

  // Mouse/touch drag handlers
  const handlePointerDown = (nodeId: number, e: React.PointerEvent) => {
    e.preventDefault()
    setDraggedNode(nodeId)
    setSelectedNode(nodeId)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (draggedNode === null || !canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = Math.max(10, Math.min(290, e.clientX - rect.left))
    const y = Math.max(10, Math.min(290, e.clientY - rect.top))

    setNodes(prev => prev.map(node =>
      node.id === draggedNode ? { ...node, x, y } : node
    ))
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    setDraggedNode(null)
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent, nodeId: number) => {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return

    e.preventDefault()
    const step = e.shiftKey ? 10 : 5

    setNodes(prev => prev.map(node => {
      if (node.id !== nodeId) return node

      let { x, y } = node
      if (e.key === 'ArrowLeft') x = Math.max(10, x - step)
      if (e.key === 'ArrowRight') x = Math.min(290, x + step)
      if (e.key === 'ArrowUp') y = Math.max(10, y - step)
      if (e.key === 'ArrowDown') y = Math.min(290, y + step)

      return { ...node, x, y }
    }))
  }

  const nextPuzzle = () => {
    setCurrentPuzzleIndex((prev) => (prev + 1) % PUZZLES.length)
  }

  const resetPuzzle = () => {
    setNodes([...currentPuzzle.startNodes])
    setSolved(false)
    setShowQuote(false)
  }

  // Render quote screen
  if (showQuote) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-card-bg border border-success rounded-lg p-8 sm:p-12 text-center min-h-[500px] flex flex-col justify-center">
          <div className="animate-fade">
            <div className="text-7xl mb-6" aria-hidden="true">
              ✨
            </div>
            <h2 className="text-3xl font-semibold mb-4 text-foreground">
              Untangled
            </h2>
            <p className="text-xl italic text-primary-light mb-2 max-w-md mx-auto">
              &ldquo;{currentPuzzle.quote}&rdquo;
            </p>
            <p className="text-sm text-primary-light mb-8">
              — {currentPuzzle.author}
            </p>

            <div className="space-y-4">
              <Button
                variant="primary"
                onClick={nextPuzzle}
                className="w-full sm:w-auto"
              >
                Next Puzzle
              </Button>
              <div className="text-sm text-primary-light">
                Puzzle {currentPuzzleIndex + 1} of {PUZZLES.length}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Render puzzle
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <div className="text-5xl mb-4" aria-hidden="true">
          🪢
        </div>
        <h2 className="text-2xl sm:text-3xl font-semibold mb-3 text-foreground">
          Untangle the Knot
        </h2>
        <p className="text-base sm:text-lg text-primary-light max-w-2xl mx-auto">
          Move the nodes so no lines cross. Sometimes solving problems is about finding the right perspective.
        </p>
      </div>

      {/* Canvas */}
      <div className="bg-card-bg border border-card-border rounded-lg p-4 sm:p-8 mb-6">
        <div
          ref={canvasRef}
          className="relative bg-background rounded-lg mx-auto"
          style={{ width: '300px', height: '300px' }}
          role="application"
          aria-label="Graph untangling puzzle"
          onPointerMove={handlePointerMove}
        >
          {/* Draw edges */}
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{ width: '100%', height: '100%' }}
            aria-hidden="true"
          >
            {currentPuzzle.edges.map((edge, i) => {
              const from = nodes[edge.from]
              const to = nodes[edge.to]
              if (!from || !to) return null

              return (
                <line
                  key={i}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-primary-light opacity-60"
                />
              )
            })}
          </svg>

          {/* Draw nodes */}
          {nodes.map((node) => (
            <div
              key={node.id}
              className={`
                absolute w-8 h-8 -ml-4 -mt-4 rounded-full
                bg-accent border-2 border-accent-dark
                cursor-move select-none
                transition-shadow duration-75
                hover:shadow-lg hover:scale-110
                focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2
                ${selectedNode === node.id ? 'ring-2 ring-accent ring-offset-2' : ''}
                ${draggedNode === node.id ? 'scale-110 shadow-lg' : ''}
              `}
              style={{
                left: `${node.x}px`,
                top: `${node.y}px`,
                touchAction: 'none'
              }}
              role="button"
              tabIndex={0}
              aria-label={`Node ${node.id + 1}. Use arrow keys to move. ${selectedNode === node.id ? 'Selected.' : ''}`}
              onPointerDown={(e) => handlePointerDown(node.id, e)}
              onPointerUp={handlePointerUp}
              onKeyDown={(e) => handleKeyDown(e, node.id)}
            >
              <div className="w-full h-full rounded-full bg-accent flex items-center justify-center text-white text-xs font-bold">
                {node.id + 1}
              </div>
            </div>
          ))}
        </div>

        {/* Controls help */}
        <div className="mt-4 text-center text-xs text-primary-light">
          <p>Drag nodes with mouse/touch • Use arrow keys to move • Shift + arrows for faster movement</p>
        </div>
      </div>

      {/* Puzzle info */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-primary-light">
          Puzzle {currentPuzzleIndex + 1} of {PUZZLES.length}
          <span className="ml-2 px-2 py-1 bg-card-bg rounded text-xs">
            {currentPuzzle.difficulty}
          </span>
        </div>
        <div className="space-x-2">
          <Button variant="ghost" onClick={resetPuzzle} size="sm">
            Reset
          </Button>
          <Button variant="ghost" onClick={nextPuzzle} size="sm">
            Skip
          </Button>
        </div>
      </div>

      {/* Philosophy */}
      <div className="mt-8 text-center text-sm text-primary-light max-w-2xl mx-auto">
        <p>
          Life&rsquo;s problems are like tangled knots.
          <br />
          Sometimes you just need to shift perspective to see the solution.
        </p>
      </div>
    </div>
  )
}
