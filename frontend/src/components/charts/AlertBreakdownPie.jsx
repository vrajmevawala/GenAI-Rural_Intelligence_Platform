import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

const COLORS = {
  weather: '#3B82F6',
  loan_repayment: '#EF4444',
  insurance_expiry: '#F59E0B',
  scheme_eligibility: '#10B981',
  crop_advisory: '#8B5CF6',
  market_price: '#EC4899',
}

const LABELS = {
  weather: 'Weather',
  loan_repayment: 'Loan repayment',
  insurance_expiry: 'Insurance expiry',
  scheme_eligibility: 'Scheme eligibility',
  crop_advisory: 'Crop advisory',
  market_price: 'Market price',
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

  const chartData = data.map((d) => ({
    name: LABELS[d.type] || d.type || d.name,
    value: d.count || d.value || 0,
    fill: COLORS[d.type] || d.color || '#94A3B8',
    total,
  }))

  if (!chartData.length) {
    const defaultData = [
      { name: 'Weather', value: 28, fill: COLORS.weather, total: 100 },
      { name: 'Loan repayment', value: 24, fill: COLORS.loan_repayment, total: 100 },
      { name: 'Insurance expiry', value: 18, fill: COLORS.insurance_expiry, total: 100 },
      { name: 'Scheme eligibility', value: 15, fill: COLORS.scheme_eligibility, total: 100 },
      { name: 'Crop advisory', value: 10, fill: COLORS.crop_advisory, total: 100 },
      { name: 'Market price', value: 5, fill: COLORS.market_price, total: 100 },
    ]
    chartData.push(...defaultData)
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
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
          formatter={(value) => (
            <span className="text-xs text-gray-600 ml-1">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
