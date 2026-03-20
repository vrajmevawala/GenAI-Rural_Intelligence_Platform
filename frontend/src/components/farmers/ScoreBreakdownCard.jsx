import { cn } from '@/utils/cn'
import { getScoreColor, scoreComponents } from '@/utils/scoreUtils'
import * as LucideIcons from 'lucide-react'
import useLanguage from '@/hooks/useLanguage'

export default function ScoreBreakdownCard({ breakdown = {} }) {
  const { t } = useLanguage()

  return (
    <div className="space-y-3">
      {scoreComponents.map((comp) => {
        const value = breakdown[comp.key] ?? 0
        const color = getScoreColor(value)
        const Icon = LucideIcons[comp.icon] || LucideIcons.HelpCircle
        const label = t(`fvi.${comp.key}`) || comp.label

        return (
          <div key={comp.key} className="group">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Icon className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-medium text-gray-700">
                  {label}
                </span>
                <span className="text-[10px] text-gray-400">
                  ({comp.weight}% weight)
                </span>
              </div>
              <span className={cn('text-xs font-bold', color.text)}>
                {Math.round(value)}/100
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${value}%`, backgroundColor: color.hex }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
