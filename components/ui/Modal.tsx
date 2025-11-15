'use client'

import { ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from './Button'
import { cn } from '@/lib/utils/cn'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  description?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showCloseButton?: boolean
  closeOnOverlayClick?: boolean
  className?: string
}

interface ModalHeaderProps {
  children: ReactNode
  onClose?: () => void
  showCloseButton?: boolean
}

interface ModalBodyProps {
  children: ReactNode
  className?: string
}

interface ModalFooterProps {
  children: ReactNode
  className?: string
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
  full: 'max-w-[95vw]'
}

export function Modal({
  isOpen,
  onClose,
  children,
  title,
  description,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  className
}: ModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[100] overflow-y-auto"
      onClick={closeOnOverlayClick ? onClose : undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      aria-describedby={description ? 'modal-description' : undefined}
    >
      <div className="min-h-screen px-4 py-8 flex items-center justify-center">
        <div
          className={cn(
            'bg-card-bg rounded-xl shadow-2xl w-full animate-fade my-8',
            sizeClasses[size],
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {(title || description || showCloseButton) && (
            <ModalHeader onClose={onClose} showCloseButton={showCloseButton}>
              {title && (
                <h2 id="modal-title" className="text-2xl font-semibold text-foreground">
                  {title}
                </h2>
              )}
              {description && (
                <p id="modal-description" className="text-sm text-foreground/70 mt-1">
                  {description}
                </p>
              )}
            </ModalHeader>
          )}
          {children}
        </div>
      </div>
    </div>
  )
}

export function ModalHeader({ children, onClose, showCloseButton = true }: ModalHeaderProps) {
  return (
    <div className="flex items-start justify-between p-6 border-b border-card-border">
      <div className="flex-1">{children}</div>
      {showCloseButton && onClose && (
        <button
          onClick={onClose}
          className="text-foreground/50 hover:text-foreground transition-colors ml-4"
          aria-label="Close modal"
        >
          <X size={24} />
        </button>
      )}
    </div>
  )
}

export function ModalBody({ children, className }: ModalBodyProps) {
  return (
    <div className={cn('p-6', className)}>
      {children}
    </div>
  )
}

export function ModalFooter({ children, className }: ModalFooterProps) {
  return (
    <div className={cn('flex gap-3 p-6 border-t border-card-border', className)}>
      {children}
    </div>
  )
}

// Convenience component for confirmation dialogs
interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'primary'
  isLoading?: boolean
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  isLoading = false
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" title={title} description={description}>
      <ModalFooter>
        <Button
          variant="secondary"
          onClick={onClose}
          disabled={isLoading}
          className="flex-1"
        >
          {cancelText}
        </Button>
        <Button
          variant={variant}
          onClick={onConfirm}
          disabled={isLoading}
          className="flex-1"
        >
          {confirmText}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
