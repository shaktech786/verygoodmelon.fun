'use client'

import { useEffect, useRef, useState, RefObject } from 'react'

interface SwipeHandlers {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
}

interface SwipeOptions extends SwipeHandlers {
  threshold?: number // Minimum distance for swipe detection (px)
  velocity?: number // Minimum velocity for swipe detection (px/ms)
}

/**
 * Hook to detect swipe gestures on touch devices
 *
 * @example
 * const swipeRef = useSwipe({
 *   onSwipeLeft: () => console.log('Swiped left'),
 *   onSwipeRight: () => console.log('Swiped right'),
 *   threshold: 50
 * })
 *
 * <div ref={swipeRef}>Swipeable content</div>
 */
export function useSwipe<T extends HTMLElement = HTMLDivElement>(
  options: SwipeOptions = {}
) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    velocity = 0.3
  } = options

  const ref = useRef<T | null>(null)
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return

      const touch = e.changedTouches[0]
      const deltaX = touch.clientX - touchStartRef.current.x
      const deltaY = touch.clientY - touchStartRef.current.y
      const deltaTime = Date.now() - touchStartRef.current.time
      const absX = Math.abs(deltaX)
      const absY = Math.abs(deltaY)

      // Calculate velocity
      const velocityX = absX / deltaTime
      const velocityY = absY / deltaTime

      // Determine swipe direction
      if (absX > absY && absX > threshold && velocityX > velocity) {
        // Horizontal swipe
        if (deltaX > 0) {
          onSwipeRight?.()
        } else {
          onSwipeLeft?.()
        }
      } else if (absY > absX && absY > threshold && velocityY > velocity) {
        // Vertical swipe
        if (deltaY > 0) {
          onSwipeDown?.()
        } else {
          onSwipeUp?.()
        }
      }

      touchStartRef.current = null
    }

    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold, velocity])

  return ref
}

interface DragState {
  isDragging: boolean
  position: { x: number; y: number }
  delta: { x: number; y: number }
}

interface DragOptions {
  onDragStart?: (position: { x: number; y: number }) => void
  onDrag?: (delta: { x: number; y: number }) => void
  onDragEnd?: (delta: { x: number; y: number }) => void
  axis?: 'both' | 'x' | 'y'
}

/**
 * Hook to handle drag gestures
 *
 * @example
 * const { ref, isDragging, position } = useDrag({
 *   onDrag: (delta) => console.log('Dragging', delta),
 *   axis: 'x'
 * })
 *
 * <div ref={ref} style={{ transform: `translateX(${position.x}px)` }}>
 *   Draggable element
 * </div>
 */
export function useDrag<T extends HTMLElement = HTMLDivElement>(
  options: DragOptions = {}
): { ref: RefObject<T | null> } & DragState {
  const { onDragStart, onDrag, onDragEnd, axis = 'both' } = options
  const ref = useRef<T | null>(null)
  const [state, setState] = useState<DragState>({
    isDragging: false,
    position: { x: 0, y: 0 },
    delta: { x: 0, y: 0 }
  })

  const startPosRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const handleStart = (clientX: number, clientY: number) => {
      startPosRef.current = { x: clientX, y: clientY }
      setState(prev => ({ ...prev, isDragging: true }))
      onDragStart?.({ x: clientX, y: clientY })
    }

    const handleMove = (clientX: number, clientY: number) => {
      if (!startPosRef.current) return

      const deltaX = clientX - startPosRef.current.x
      const deltaY = clientY - startPosRef.current.y

      const newDelta = {
        x: axis === 'y' ? 0 : deltaX,
        y: axis === 'x' ? 0 : deltaY
      }

      setState(prev => ({
        ...prev,
        position: {
          x: prev.position.x + newDelta.x,
          y: prev.position.y + newDelta.y
        },
        delta: newDelta
      }))

      onDrag?.(newDelta)
      startPosRef.current = { x: clientX, y: clientY }
    }

    const handleEnd = () => {
      if (!state.isDragging) return

      setState(prev => ({ ...prev, isDragging: false }))
      onDragEnd?.(state.delta)
      startPosRef.current = null
    }

    // Mouse events
    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault()
      handleStart(e.clientX, e.clientY)
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!state.isDragging) return
      handleMove(e.clientX, e.clientY)
    }

    const handleMouseUp = () => {
      handleEnd()
    }

    // Touch events
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      handleStart(touch.clientX, touch.clientY)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!state.isDragging) return
      const touch = e.touches[0]
      handleMove(touch.clientX, touch.clientY)
    }

    const handleTouchEnd = () => {
      handleEnd()
    }

    element.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: true })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      element.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      element.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [state.isDragging, onDragStart, onDrag, onDragEnd, axis])

  return { ref, ...state }
}

interface LongPressOptions {
  onLongPress: () => void
  delay?: number
  onCancel?: () => void
}

/**
 * Hook to detect long press gestures
 *
 * @example
 * const longPressRef = useLongPress({
 *   onLongPress: () => console.log('Long pressed!'),
 *   delay: 500
 * })
 *
 * <button ref={longPressRef}>Long press me</button>
 */
export function useLongPress<T extends HTMLElement = HTMLDivElement>(
  options: LongPressOptions
) {
  const { onLongPress, delay = 500, onCancel } = options
  const ref = useRef<T | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const startPress = () => {
      timerRef.current = setTimeout(() => {
        onLongPress()
      }, delay)
    }

    const cancelPress = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
        onCancel?.()
      }
    }

    element.addEventListener('mousedown', startPress)
    element.addEventListener('mouseup', cancelPress)
    element.addEventListener('mouseleave', cancelPress)
    element.addEventListener('touchstart', startPress, { passive: true })
    element.addEventListener('touchend', cancelPress, { passive: true })

    return () => {
      element.removeEventListener('mousedown', startPress)
      element.removeEventListener('mouseup', cancelPress)
      element.removeEventListener('mouseleave', cancelPress)
      element.removeEventListener('touchstart', startPress)
      element.removeEventListener('touchend', cancelPress)
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [onLongPress, delay, onCancel])

  return ref
}
