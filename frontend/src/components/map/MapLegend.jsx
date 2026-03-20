export default function MapLegend() {
  const items = [
    { label: 'Low (0\u201325)', color: '#059669' },
    { label: 'Medium (26\u201350)', color: '#F59E0B' },
    { label: 'High (51\u201375)', color: '#F97316' },
    { label: 'Critical (76\u2013100)', color: '#EF4444' },
    { label: 'No data', color: '#E5E7EB' },
  ]

  return (
    <div
      className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm border
                    border-gray-200 rounded-xl shadow-sm p-3"
    >
      <p className="text-xs font-semibold text-gray-600 mb-2">
        Vulnerability score
      </p>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ background: item.color }}
            />
            <span className="text-xs text-gray-600">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
