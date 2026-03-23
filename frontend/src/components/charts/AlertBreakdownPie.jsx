import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

const COLORS = {
  agriculture: '#3B82F6',
  financial: '#10B981',
}

const LABELS = {
  agriculture: '🌾 Agriculture Alerts',
  financial: '💰 Financial Alerts',
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.payload.fill }} />
        <span className="font-medium text-gray-700">{d.name}</span>
      </div>
      <p className="text-gray-500">
        {d.value} alerts ({((d.value / d.payload.total) * 100).toFixed(0)}%)
      </p>
    </div>
  )
}

export default function AlertBreakdownPie({ data = [] }) {
  const total = data.reduce((sum, d) => sum + (d.count || d.value || 0), 0)

  // Group alerts into 2 domain categories
  const grouped = data.reduce((acc, d) => {
    const category = (d.type || d.name || '').toLowerCase() === 'financial'
      ? 'financial'
      : 'agriculture'
    
    const existing = acc.find(item => item.type === category)
    if (existing) {
      existing.count += d.count || d.value || 0
    } else {
      acc.push({ type: category, count: d.count || d.value || 0 })
    }
    return acc
  }, [])

  const chartData = grouped.length 
    ? grouped.map((d) => ({
        name: LABELS[d.type],
        value: d.count,
        fill: COLORS[d.type],
        total,
      }))
    : [
        { name: '🌾 Agriculture Alerts', value: 60, fill: COLORS.agriculture, total: 100 },
        { name: '💰 Financial Alerts', value: 40, fill: COLORS.financial, total: 100 },
      ]

  return (
    <ResponsiveContainer width="100%" height={320}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="45%"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
          stroke="none"
        >
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          verticalAlign="bottom"
          height={50}
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ paddingTop: '8px' }}
          formatter={(value) => (
            <span className="text-xs text-gray-600 ml-1 inline-block max-w-[110px] truncate align-middle" title={value}>
              {value}
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
