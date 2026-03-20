import CountUp from 'react-countup'
import { motion } from 'framer-motion'
import * as LucideIcons from 'lucide-react'
import { cn } from '@/utils/cn'

const colorConfigs = {
  green: {
    bg: 'bg-emerald-50',
    icon: 'text-emerald-600',
    text: 'text-emerald-700',
  },
  red: {
    bg: 'bg-red-50',
    icon: 'text-red-600',
    text: 'text-red-700',
  },
  amber: {
    bg: 'bg-amber-50',
    icon: 'text-amber-600',
    text: 'text-amber-700',
  },
  blue: {
    bg: 'bg-blue-50',
    icon: 'text-blue-600',
    text: 'text-blue-700',
  },
  purple: {
    bg: 'bg-purple-50',
    icon: 'text-purple-600',
    text: 'text-purple-700',
  },
}

export default function StatCard({
  label,
  value,
  icon,
  color = 'green',
  suffix = '',
  prefix = '',
  pulse = false,
  trend,
  index = 0,
}) {
  const config = colorConfigs[color] || colorConfigs.green
  const Icon = LucideIcons[icon] || LucideIcons.Activity

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.3 }}
      className="bg-white rounded-xl border border-gray-100 shadow-card hover:shadow-card-hover
                 transition-all duration-200 p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            config.bg
          )}
        >
          <Icon className={cn('w-5 h-5', config.icon)} />
        </div>
        {pulse && (
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
        )}
      </div>

      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-gray-900">
          {prefix}
          <CountUp end={typeof value === 'number' ? value : 0} duration={1.5} separator="," />
          {suffix}
        </span>
        {trend && (
          <span
            className={cn(
              'text-xs font-medium ml-1',
              trend > 0 ? 'text-red-500' : 'text-emerald-500'
            )}
          >
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
    </motion.div>
  )
}
