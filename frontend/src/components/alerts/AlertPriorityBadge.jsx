import Badge from '@/components/ui/Badge'

const priorityMap = {
  low: { variant: 'low', label: 'Low' },
  medium: { variant: 'medium', label: 'Medium' },
  high: { variant: 'high', label: 'High' },
  critical: { variant: 'critical', label: 'Critical' },
}

export default function AlertPriorityBadge({ priority }) {
  const config = priorityMap[priority] || priorityMap.low
  return (
    <Badge
      variant={config.variant}
      dot={priority === 'critical'}
      pulse={priority === 'critical'}
      size="sm"
    >
      {config.label}
    </Badge>
  )
}
