import { cn } from '@/utils/cn'
import { SearchX, FolderOpen, AlertCircle, Inbox } from 'lucide-react'

const icons = {
  search: SearchX,
  folder: FolderOpen,
  alert: AlertCircle,
  inbox: Inbox,
}

export default function EmptyState({
  icon = 'inbox',
  title = 'No data found',
  description,
  action,
  className,
}) {
  const Icon = icons[icon] || icons.inbox

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-12',
        className
      )}
    >
      <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-gray-300" strokeWidth={1.5} />
      </div>
      <h3 className="text-sm font-semibold text-gray-700 mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-gray-400 max-w-[280px]">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
