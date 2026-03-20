import { cn } from '@/utils/cn'

const sizes = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
}

const colors = [
  'bg-brand-50 text-brand-700',
  'bg-blue-50 text-blue-700',
  'bg-purple-50 text-purple-700',
  'bg-amber-50 text-amber-700',
  'bg-rose-50 text-rose-700',
  'bg-cyan-50 text-cyan-700',
  'bg-emerald-50 text-emerald-700',
]

function getColorFromName(name) {
  if (!name) return colors[0]
  const charCode = name.charCodeAt(0) + (name.charCodeAt(1) || 0)
  return colors[charCode % colors.length]
}

function getInitials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default function Avatar({
  name,
  src,
  size = 'md',
  className,
  status,
}) {
  const initials = getInitials(name)
  const color = getColorFromName(name)

  return (
    <div className={cn('relative flex-shrink-0', className)}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={cn(
            'rounded-full object-cover',
            sizes[size]
          )}
        />
      ) : (
        <div
          className={cn(
            'rounded-full flex items-center justify-center font-bold',
            sizes[size],
            color
          )}
        >
          {initials}
        </div>
      )}
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-white',
            size === 'xs' || size === 'sm' ? 'w-2 h-2' : 'w-3 h-3',
            status === 'online' && 'bg-emerald-500',
            status === 'offline' && 'bg-gray-300',
            status === 'busy' && 'bg-red-500'
          )}
        />
      )}
    </div>
  )
}
