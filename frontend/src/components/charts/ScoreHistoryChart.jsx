import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { format } from 'date-fns'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="text-gray-500 mb-1">{label}</p>
      <p className="font-semibold text-gray-900">
        Score: <span className="text-[#0F4C35]">{payload[0].value}</span>
      </p>
    </div>
  )
}

export default function ScoreHistoryChart({ data = [], height = 260 }) {
  const formatted = data.map((d) => ({
    ...d,
    date: format(new Date(d.calculated_at || d.date), 'dd MMM'),
    score: d.total_score ?? d.score,
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={formatted} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0F4C35" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#0F4C35" stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#94A3B8' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: '#94A3B8' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="score"
          stroke="#0F4C35"
          strokeWidth={2}
          fill="url(#scoreGrad)"
          dot={{ fill: '#0F4C35', strokeWidth: 0, r: 3 }}
          activeDot={{ r: 5, stroke: '#0F4C35', strokeWidth: 2, fill: '#fff' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
