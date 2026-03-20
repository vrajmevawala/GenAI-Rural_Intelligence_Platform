import { cn } from '@/utils/cn'

const variants = {
  low: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  medium: 'bg-amber-50 text-amber-700 border border-amber-200',
  high: 'bg-orange-50 text-orange-700 border border-orange-200',
  critical: 'bg-red-50 text-red-700 border border-red-200',
  default: 'bg-gray-50 text-gray-700 border border-gray-200',
  success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border border-amber-200',
  info: 'bg-blue-50 text-blue-700 border border-blue-200',
}

const sizes = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2 py-0.5 text-xs',
  lg: 'px-2.5 py-1 text-sm',
}

export default function Badge({
  variant = 'default',
  size = 'md',
  dot = false,
  pulse = false,
  className,
  children,
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-full whitespace-nowrap',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5">
          {pulse && (
            <span
              className={cn(
                'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                variant === 'critical' ? 'bg-red-400' : 'bg-current'
              )}
            />
          )}
          <span className={cn('relative inline-flex rounded-full h-1.5 w-1.5 bg-current')} />
        </span>
      )}
      {children}
    </span>
  )
}
