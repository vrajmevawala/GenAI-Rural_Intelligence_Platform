import { cn } from '@/utils/cn'

export default function SchemeEligibilityBar({ eligible = 0, total = 0, className }) {
  const pct = total > 0 ? (eligible / total) * 100 : 0

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {eligible} of {total} schemes matched
        </span>
        <span className="text-xs font-bold text-[#0F4C35]">
          {Math.round(pct)}%
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className="h-2 bg-gradient-to-r from-[#0F4C35] to-[#10B981] rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
