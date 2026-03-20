import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { LayoutGrid, List, Plus, Download } from 'lucide-react'
import { motion } from 'framer-motion'
import { useFarmers, useDeleteFarmer, useRecalculateScore } from '@/hooks/useFarmers'
import { useDebounce } from '@/hooks/useDebounce'
import useAuthStore from '@/store/authStore'
import useLanguage from '@/hooks/useLanguage'
import FarmerCard from '@/components/farmers/FarmerCard'
import FarmerTable from '@/components/farmers/FarmerTable'
import FarmerFilters from '@/components/farmers/FarmerFilters'
import FarmerForm from '@/components/farmers/FarmerForm'
import { useCreateFarmer } from '@/hooks/useFarmers'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import Skeleton, { SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton'
import { PAGE_SIZE } from '@/utils/constants'
import { cn } from '@/utils/cn'

export default function FarmersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [view, setView] = useState('grid')
  const [showForm, setShowForm] = useState(false)
  const [sortConfig, setSortConfig] = useState({ key: 'vulnerability_score', direction: 'desc' })
  const [page, setPage] = useState(1)
  const { user } = useAuthStore()
  const { t } = useLanguage()
  const canDelete = ['superadmin', 'org_admin'].includes(user?.role)

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    district: searchParams.get('district') || '',
    vulnerability_label: searchParams.get('vulnerability_label') || '',
    primary_crop: searchParams.get('primary_crop') || '',
  })

  const debouncedSearch = useDebounce(filters.search, 300)

  useEffect(() => {
    const params = {}
    Object.entries(filters).forEach(([key, val]) => {
      if (val) params[key] = val
    })
    // Only update if different to avoid potential loops
    const currentParams = Object.fromEntries(searchParams.entries())
    if (JSON.stringify(params) !== JSON.stringify(currentParams)) {
      setSearchParams(params, { replace: true })
    }
  }, [filters, searchParams, setSearchParams])

  const queryParams = {
    ...filters,
    search: debouncedSearch,
    page,
    limit: PAGE_SIZE,
    sort_by: sortConfig.key,
    sort_order: sortConfig.direction,
  }

  const { data, isLoading } = useFarmers(queryParams)
  const deleteFarmer = useDeleteFarmer()
  const recalculate = useRecalculateScore()
  const createFarmer = useCreateFarmer()

  // Ultra-defensive farmer extraction
  const rawFarmers = Array.isArray(data) ? data : data?.farmers || []
  const farmers = rawFarmers.filter(f => f && f.id)
  
  const totalCount = data?.total || data?.pagination?.total || farmers.length
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const handleResetFilters = () => {
    setFilters({ search: '', district: '', vulnerability_label: '', primary_crop: '' })
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('farmers.title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalCount} {t('farmers.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setView('grid')}
              className={cn(
                'p-1.5 rounded-md transition',
                view === 'grid' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('table')}
              className={cn(
                'p-1.5 rounded-md transition',
                view === 'table' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <Button variant="secondary" icon={Download} size="sm">
            {t('common.export')}
          </Button>
          <Button icon={Plus} onClick={() => setShowForm(true)}>
            {t('farmers.add_farmer')}
          </Button>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Filter sidebar */}
        <div className="w-64 flex-shrink-0">
          <FarmerFilters
            filters={filters}
            onChange={setFilters}
            onReset={handleResetFilters}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 overflow-y-auto pr-1">
          {isLoading ? (
            view === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : (
              <SkeletonTable rows={8} cols={6} />
            )
          ) : farmers.length === 0 ? (
            <EmptyState
              icon="search"
              title="No farmers found"
              description="Try adjusting your filters or add a new farmer"
              action={
                <Button icon={Plus} onClick={() => setShowForm(true)}>
                  Add farmer
                </Button>
              }
            />
          ) : view === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-6">
              {farmers.map((farmer, i) => (
                <FarmerCard key={farmer.id} farmer={farmer} index={i} />
              ))}
            </div>
          ) : (
            <div className="pb-6">
              <FarmerTable
                farmers={farmers}
                sortConfig={sortConfig}
                onSort={handleSort}
                onDelete={canDelete ? (id) => deleteFarmer.mutate(id) : undefined}
                onRecalculate={(id) => recalculate.mutate(id)}
              />
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-auto pt-4 pb-8">
              <p className="text-xs text-gray-500">
                {t('common.page_info').replace('{page}', page).replace('{total}', totalPages)} · {totalCount} total
              </p>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                >
                  {t('common.previous')}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                >
                  {t('common.next')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create farmer modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Add new farmer"
        description="Register a new farmer in 3 easy steps"
        size="lg"
      >
        <FarmerForm
          onSubmit={(data) => {
            createFarmer.mutate(data, {
              onSuccess: () => setShowForm(false),
            })
          }}
          loading={createFarmer.isPending}
        />
      </Modal>
    </div>
  )
}
