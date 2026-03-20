import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'

const variants = {
  primary:
    'bg-[#0F4C35] hover:bg-[#0a3526] text-white shadow-sm hover:shadow-md',
  secondary:
    'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300',
  danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm',
  ghost: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
  link: 'text-[#0F4C35] hover:text-[#0a3526] underline-offset-4 hover:underline p-0 h-auto',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-md gap-1.5',
  md: 'px-4 py-2.5 text-sm rounded-lg gap-2',
  lg: 'px-6 py-3 text-base rounded-lg gap-2.5',
}

const Button = forwardRef(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      className,
      children,
      icon: Icon,
      iconRight: IconRight,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-150',
          'active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F4C35]/20 focus-visible:ring-offset-2',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : Icon ? (
          <Icon className={cn('flex-shrink-0', size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
        ) : null}
        {children}
        {IconRight && !loading && (
          <IconRight className={cn('flex-shrink-0', size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'
export default Button
