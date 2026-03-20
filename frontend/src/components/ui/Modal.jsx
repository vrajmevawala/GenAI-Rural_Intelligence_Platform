import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'
import Button from './Button'

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[90vw]',
}

export default function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  children,
  footer,
  className,
}) {
  const overlayRef = useRef(null)

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    if (open) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            ref={overlayRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === overlayRef.current) onClose?.()
            }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'relative w-full bg-white rounded-xl shadow-2xl z-10',
              'max-h-[85vh] flex flex-col',
              sizes[size],
              className
            )}
          >
            {(title || onClose) && (
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <div>
                  {title && (
                    <h2 className="text-lg font-semibold text-gray-900">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p className="text-sm text-gray-500 mt-0.5">
                      {description}
                    </p>
                  )}
                </div>
                {onClose && (
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-5">{children}</div>
            {footer && (
              <div className="flex items-center justify-end gap-2 p-5 border-t border-gray-100">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
