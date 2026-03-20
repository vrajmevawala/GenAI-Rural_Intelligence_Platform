import { Search, X, SlidersHorizontal } from 'lucide-react'
import Select from '@/components/ui/Select'
import { GUJARAT_DISTRICTS, VULNERABILITY_LABELS, CROP_TYPES } from '@/utils/constants'
import { cn } from '@/utils/cn'

export default function FarmerFilters({ filters, onChange, onReset }) {
  const activeCount = Object.values(filters).filter((v) => v && v !== '').length

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-700">Filters</span>
          {activeCount > 0 && (
            <span className="px-1.5 py-0.5 bg-[#0F4C35] text-white text-[10px] font-bold rounded-full">
              {activeCount}
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <button
            onClick={onReset}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={filters.search || ''}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Search by name, phone..."
          className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-200 text-sm
                     placeholder:text-gray-400 focus:outline-none focus:ring-2
                     focus:ring-[#0F4C35]/20 focus:border-[#0F4C35] transition"
        />
      </div>

      {/* District */}
      <Select
        label="District"
        value={filters.district || ''}
        onChange={(e) => onChange({ ...filters, district: e.target.value })}
        placeholder="All districts"
        options={[{ value: '', label: 'All districts' }, ...GUJARAT_DISTRICTS.map((d) => ({ value: d, label: d }))]}
      />

      {/* Vulnerability */}
      <Select
        label="Vulnerability"
        value={filters.vulnerability_label || ''}
        onChange={(e) => onChange({ ...filters, vulnerability_label: e.target.value })}
        placeholder="All levels"
        options={[
          { value: '', label: 'All levels' },
          ...VULNERABILITY_LABELS.map((l) => ({ value: l, label: l.charAt(0).toUpperCase() + l.slice(1) })),
        ]}
      />

      {/* Crop */}
      <Select
        label="Primary crop"
        value={filters.primary_crop || ''}
        onChange={(e) => onChange({ ...filters, primary_crop: e.target.value })}
        placeholder="All crops"
        options={[{ value: '', label: 'All crops' }, ...CROP_TYPES.map((c) => ({ value: c, label: c }))]}
      />
    </div>
  )
}
