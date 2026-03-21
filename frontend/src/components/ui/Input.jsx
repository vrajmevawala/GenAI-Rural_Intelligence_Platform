import { forwardRef, useState } from 'react'
import { cn } from '@/utils/cn'

const Input = forwardRef(
  (
    {
      label,
      error,
      icon: Icon,
      className,
      containerClassName,
      type = 'text',
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = useState(props.defaultValue || props.value || '')
    const [focused, setFocused] = useState(false)
    const hasValue = props.value !== undefined ? !!props.value : !!internalValue

    return (
      <div className={cn('flex flex-col', containerClassName)}>
        {label && (
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <Icon
              className={cn(
                'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors',
                focused ? 'text-[#0F4C35]' : 'text-gray-400'
              )}
            />
          )}
          <input
            ref={ref}
            type={type}
            onFocus={(e) => {
              setFocused(true)
              props.onFocus?.(e)
            }}
            onBlur={(e) => {
              setFocused(false)
              props.onBlur?.(e)
            }}
            onChange={(e) => {
              setInternalValue(e.target.value)
              props.onChange?.(e)
            }}
            className={cn(
              'w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-gray-900',
              'transition-all duration-150 outline-none cursor-text',
              'placeholder:text-gray-400',
              'focus:ring-2 focus:ring-[#0F4C35]/20 focus:border-[#0F4C35]',
              'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
              Icon ? 'pl-10' : 'pl-3',
              error
                ? 'border-red-300 focus:ring-red-200 focus:border-red-500 animate-shake'
                : 'border-gray-200 hover:border-gray-300',
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1 text-xs text-red-500 animate-slide-down">
            {error}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input
