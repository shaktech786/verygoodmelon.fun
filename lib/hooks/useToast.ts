/**
 * Toast Notification Hook
 * Global toast notification system using Zustand for state management
 */

import { create } from 'zustand'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
  duration?: number
}

interface ToastStore {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

export const useToast = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).slice(2)
    const newToast = { ...toast, id }
    set((state) => ({ toasts: [...state.toasts, newToast] }))

    // Auto-dismiss after duration
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id)
      }))
    }, toast.duration || 3000)
  },
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id)
  }))
}))

// Helper functions for quick access
export const toast = {
  success: (message: string, duration?: number) =>
    useToast.getState().addToast({ message, type: 'success', duration }),
  error: (message: string, duration?: number) =>
    useToast.getState().addToast({ message, type: 'error', duration }),
  info: (message: string, duration?: number) =>
    useToast.getState().addToast({ message, type: 'info', duration })
}
