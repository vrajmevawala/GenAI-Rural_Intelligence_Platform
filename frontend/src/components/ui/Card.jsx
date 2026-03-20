import { cn } from '@/utils/cn'

export default function Card({
  className,
  children,
  hover = true,
  padding = true,
  ...props
}) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-gray-100 shadow-card',
        hover && 'hover:shadow-card-hover transition-shadow duration-200',
        padding && 'p-5',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children }) {
  return (
    <div
      className={cn(
        'flex items-center justify-between pb-4 border-b border-gray-100',
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardTitle({ className, children }) {
  return (
    <h3 className={cn('text-base font-semibold text-gray-900', className)}>
      {children}
    </h3>
  )
}

export function CardDescription({ className, children }) {
  return (
    <p className={cn('text-xs text-gray-500 mt-0.5', className)}>
      {children}
    </p>
  )
}

export function CardContent({ className, children }) {
  return <div className={cn('pt-4', className)}>{children}</div>
}
