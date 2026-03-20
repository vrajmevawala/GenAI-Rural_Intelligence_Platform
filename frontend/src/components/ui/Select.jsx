import { forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'

const Select = forwardRef(
  ({ label, error, options = [], placeholder, className, containerClassName, ...props }, ref) => {
    return (
      <div className={cn('relative', containerClassName)}>
        {label && (
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={cn(
              'w-full appearance-none rounded-lg border bg-white px-3 py-2.5 pr-10 text-sm text-gray-900',
              'transition-all duration-150 outline-none cursor-pointer',
              'focus:ring-2 focus:ring-[#0F4C35]/20 focus:border-[#0F4C35]',
              'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
              error
                ? 'border-red-300 focus:ring-red-200 focus:border-red-500'
                : 'border-gray-200 hover:border-gray-300',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => {
              const value = typeof opt === 'string' ? opt : opt.value
              const label = typeof opt === 'string' ? opt : opt.label
              return (
                <option key={value} value={value}>
                  {label}
                </option>
              )
            })}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
        {error && (
          <p className="mt-1 text-xs text-red-500 animate-slide-down">{error}</p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'
export default Select
