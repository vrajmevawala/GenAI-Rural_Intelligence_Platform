import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/utils/cn'

export default function Tooltip({
  children,
  content,
  side = 'top',
  className,
  delay = 200,
}) {
  const [open, setOpen] = useState(false)
  const timeoutRef = useRef(null)

  const show = () => {
    timeoutRef.current = setTimeout(() => setOpen(true), delay)
  }

  const hide = () => {
    clearTimeout(timeoutRef.current)
    setOpen(false)
  }

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current)
  }, [])

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  const motionProps = {
    top: { initial: { opacity: 0, y: 4 }, animate: { opacity: 1, y: 0 } },
    bottom: { initial: { opacity: 0, y: -4 }, animate: { opacity: 1, y: 0 } },
    left: { initial: { opacity: 0, x: 4 }, animate: { opacity: 1, x: 0 } },
    right: { initial: { opacity: 0, x: -4 }, animate: { opacity: 1, x: 0 } },
  }

  return (
    <div className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      <AnimatePresence>
        {open && content && (
          <motion.div
            {...motionProps[side]}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute z-50 px-2.5 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg',
              'whitespace-nowrap pointer-events-none shadow-lg',
              positions[side],
              className
            )}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
