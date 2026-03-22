import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

const RISK_COLORS = {
  low: '#059669',
  medium: '#D97706',
  high: '#EA580C',
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="text-gray-500 mb-1 capitalize">{label} risk</p>
      <p className="font-semibold text-gray-900">{payload[0].value} farmers</p>
    </div>
  )
}

export default function FarmerDistributionBar({ data = [] }) {
  const chartData = data.length
    ? data.filter(d => ['low', 'medium', 'high'].includes(d.label?.toLowerCase() || d.name?.toLowerCase()))
    : [
        { label: 'Low', count: 320, color: RISK_COLORS.low },
        { label: 'Medium', count: 180, color: RISK_COLORS.medium },
        { label: 'High', count: 85, color: RISK_COLORS.high },
      ]

  const formatted = chartData.map((d) => ({
    name: d.label || d.name,
    value: d.count || d.value,
    color: d.color || RISK_COLORS[d.label?.toLowerCase()] || '#94A3B8',
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={formatted} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: '#94A3B8' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#94A3B8' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F8FAFC' }} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={50}>
          {formatted.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
