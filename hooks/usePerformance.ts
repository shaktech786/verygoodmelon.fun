'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Performance metrics interface
 */
interface PerformanceMetrics {
  fps: number
  renderTime: number
  memoryUsage?: number
}

/**
 * Hook to monitor FPS (frames per second)
 * Useful for detecting performance issues
 */
export function useFPS() {
  const [fps, setFps] = useState(60)
  const frameCountRef = useRef(0)
  const lastTimeRef = useRef(performance.now())
  const requestRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    const measureFPS = () => {
      frameCountRef.current++
      const currentTime = performance.now()
      const delta = currentTime - lastTimeRef.current

      if (delta >= 1000) {
        const currentFPS = Math.round((frameCountRef.current * 1000) / delta)
        setFps(currentFPS)
        frameCountRef.current = 0
        lastTimeRef.current = currentTime
      }

      requestRef.current = requestAnimationFrame(measureFPS)
    }

    requestRef.current = requestAnimationFrame(measureFPS)

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current)
      }
    }
  }, [])

  return fps
}

/**
 * Hook to measure component render time
 */
export function useRenderTime(componentName: string) {
  const renderStartRef = useRef(performance.now())
  const [renderTime, setRenderTime] = useState(0)

  useEffect(() => {
    const renderEnd = performance.now()
    const duration = renderEnd - renderStartRef.current
    setRenderTime(duration)

    if (duration > 16) {
      // Log slow renders (> 1 frame at 60fps)
      console.warn(`[Performance] ${componentName} took ${duration.toFixed(2)}ms to render`)
    }

    renderStartRef.current = performance.now()
  })

  return renderTime
}

/**
 * Hook to monitor memory usage (Chrome only)
 */
export function useMemoryUsage() {
  const [memoryUsage, setMemoryUsage] = useState<number | null>(null)

  useEffect(() => {
    // @ts-ignore - Chrome-specific API
    if (!performance.memory) {
      return
    }

    const checkMemory = () => {
      // @ts-ignore
      const used = performance.memory.usedJSHeapSize
      // @ts-ignore
      const total = performance.memory.totalJSHeapSize
      const usagePercent = (used / total) * 100

      setMemoryUsage(usagePercent)

      if (usagePercent > 90) {
        console.warn(`[Performance] High memory usage: ${usagePercent.toFixed(2)}%`)
      }
    }

    const intervalId = setInterval(checkMemory, 5000) // Check every 5s
    checkMemory() // Initial check

    return () => clearInterval(intervalId)
  }, [])

  return memoryUsage
}

/**
 * Hook to measure page load performance
 */
export function usePageLoadMetrics() {
  const [metrics, setMetrics] = useState<{
    domContentLoaded: number | null
    loadComplete: number | null
    firstPaint: number | null
    firstContentfulPaint: number | null
  }>({
    domContentLoaded: null,
    loadComplete: null,
    firstPaint: null,
    firstContentfulPaint: null
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const collectMetrics = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const paintEntries = performance.getEntriesByType('paint')

      setMetrics({
        domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.fetchStart,
        loadComplete: navigation?.loadEventEnd - navigation?.fetchStart,
        firstPaint: paintEntries.find(e => e.name === 'first-paint')?.startTime || null,
        firstContentfulPaint: paintEntries.find(e => e.name === 'first-contentful-paint')?.startTime || null
      })
    }

    if (document.readyState === 'complete') {
      collectMetrics()
    } else {
      window.addEventListener('load', collectMetrics)
      return () => window.removeEventListener('load', collectMetrics)
    }
  }, [])

  return metrics
}

/**
 * Hook to track Core Web Vitals
 */
export function useWebVitals() {
  const [vitals, setVitals] = useState<{
    lcp: number | null // Largest Contentful Paint
    fid: number | null // First Input Delay
    cls: number | null // Cumulative Layout Shift
    ttfb: number | null // Time to First Byte
  }>({
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    // TTFB
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    if (navigation) {
      setVitals(prev => ({
        ...prev,
        ttfb: navigation.responseStart - navigation.requestStart
      }))
    }

    // LCP
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1] as any
      setVitals(prev => ({ ...prev, lcp: lastEntry.renderTime || lastEntry.loadTime }))
    })

    try {
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })
    } catch (e) {
      // Not supported
    }

    // FID
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry: any) => {
        setVitals(prev => ({ ...prev, fid: entry.processingStart - entry.startTime }))
      })
    })

    try {
      fidObserver.observe({ type: 'first-input', buffered: true })
    } catch (e) {
      // Not supported
    }

    // CLS
    let clsValue = 0
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value
          setVitals(prev => ({ ...prev, cls: clsValue }))
        }
      }
    })

    try {
      clsObserver.observe({ type: 'layout-shift', buffered: true })
    } catch (e) {
      // Not supported
    }

    return () => {
      lcpObserver.disconnect()
      fidObserver.disconnect()
      clsObserver.disconnect()
    }
  }, [])

  return vitals
}

/**
 * Hook to detect slow network conditions
 */
export function useNetworkStatus() {
  const [status, setStatus] = useState<{
    type: string | null
    effectiveType: string | null
    downlink: number | null
    rtt: number | null
    saveData: boolean
  }>({
    type: null,
    effectiveType: null,
    downlink: null,
    rtt: null,
    saveData: false
  })

  useEffect(() => {
    // @ts-ignore - Navigator connection API
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection

    if (!connection) return

    const updateStatus = () => {
      setStatus({
        type: connection.type || null,
        effectiveType: connection.effectiveType || null,
        downlink: connection.downlink || null,
        rtt: connection.rtt || null,
        saveData: connection.saveData || false
      })
    }

    updateStatus()
    connection.addEventListener('change', updateStatus)

    return () => connection.removeEventListener('change', updateStatus)
  }, [])

  return status
}

/**
 * Hook to measure API call performance
 */
export function useAPIPerformance(apiName: string) {
  const startTimeRef = useRef<number | null>(null)

  const startMeasure = () => {
    startTimeRef.current = performance.now()
  }

  const endMeasure = () => {
    if (startTimeRef.current === null) return 0

    const duration = performance.now() - startTimeRef.current

    if (duration > 1000) {
      console.warn(`[Performance] ${apiName} API call took ${duration.toFixed(2)}ms`)
    }

    startTimeRef.current = null
    return duration
  }

  return { startMeasure, endMeasure }
}

/**
 * Hook to track long tasks (tasks > 50ms)
 */
export function useLongTasks() {
  const [longTasks, setLongTasks] = useState<number>(0)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      setLongTasks(prev => prev + entries.length)

      entries.forEach((entry) => {
        console.warn(`[Performance] Long task detected: ${entry.duration.toFixed(2)}ms`)
      })
    })

    try {
      observer.observe({ type: 'longtask', buffered: true })
    } catch (e) {
      // Not supported
    }

    return () => observer.disconnect()
  }, [])

  return longTasks
}

/**
 * Comprehensive performance monitor hook
 */
export function usePerformanceMonitor() {
  const fps = useFPS()
  const memoryUsage = useMemoryUsage()
  const pageLoadMetrics = usePageLoadMetrics()
  const webVitals = useWebVitals()
  const networkStatus = useNetworkStatus()
  const longTasks = useLongTasks()

  return {
    fps,
    memoryUsage,
    pageLoadMetrics,
    webVitals,
    networkStatus,
    longTasks
  }
}
