import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { useQuery } from '@tanstack/react-query'
import { getDistrictHeatmap } from '@/api/vulnerability.api'
import { getScoreColor } from '@/utils/scoreUtils'
import DistrictTooltip from './DistrictTooltip'
import MapLegend from './MapLegend'

const GEOJSON_URL =
  'https://cdn.jsdelivr.net/gh/udit-001/india-maps-data@main/geojson/states/gujarat.geojson'

export default function GujaratDistrictMap({ onDistrictClick, selectedDistrict }) {
  const svgRef = useRef(null)
  const containerRef = useRef(null)
  const zoomRef = useRef(null)
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, data: null })
  const [geoData, setGeoData] = useState(null)
  const [geoError, setGeoError] = useState(false)

  const { data: heatmapData, isLoading } = useQuery({
    queryKey: ['district-heatmap'],
    queryFn: () => getDistrictHeatmap().then((r) => r.data?.data || r.data || []),
    staleTime: 60_000,
    placeholderData: [],
  })

  useEffect(() => {
    fetch(GEOJSON_URL)
      .then((r) => {
        if (!r.ok) throw new Error('GeoJSON fetch failed')
        return r.json()
      })
      .then((data) => setGeoData(data))
      .catch((err) => {
        console.error('GeoJSON fetch failed:', err)
        setGeoError(true)
      })
  }, [])

  useEffect(() => {
    if (!geoData || !svgRef.current || !containerRef.current) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight || 500

    const districtLookup = {}
    if (Array.isArray(heatmapData)) {
      heatmapData.forEach((d) => {
        const key = (d.district || '').toLowerCase()
        if (key) districtLookup[key] = d
      })
    }

    const colorScale = d3
      .scaleLinear()
      .domain([0, 25, 50, 75, 100])
      .range(['#059669', '#10B981', '#F59E0B', '#F97316', '#EF4444'])
      .clamp(true)

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', width).attr('height', height)

    const projection = d3
      .geoMercator()
      .fitSize([width - 40, height - 40], geoData)

    const center = projection.translate()
    projection.translate([center[0] + 20, center[1] + 20])

    const pathGenerator = d3.geoPath().projection(projection)

    const g = svg.append('g')

    g.selectAll('path')
      .data(geoData.features)
      .join('path')
      .attr('d', pathGenerator)
      .attr('fill', (feature) => {
        const name = (feature.properties.district || feature.properties.name || '').toLowerCase()
        const districtData = districtLookup[name]
        return districtData ? colorScale(districtData.avg_score) : '#E5E7EB'
      })
      .attr('stroke', (feature) => {
        const name = (feature.properties.district || feature.properties.name || '').toLowerCase()
        return selectedDistrict && selectedDistrict.toLowerCase() === name
          ? '#0F4C35'
          : '#ffffff'
      })
      .attr('stroke-width', (feature) => {
        const name = (feature.properties.district || feature.properties.name || '').toLowerCase()
        return selectedDistrict && selectedDistrict.toLowerCase() === name ? 3 : 1
      })
      .style('cursor', 'pointer')
      .style('transition', 'fill 0.2s ease, stroke-width 0.15s ease')
      .on('mousemove', (event, feature) => {
        const name = (feature.properties.district || feature.properties.name || '').toLowerCase()
        const displayName = feature.properties.district || feature.properties.name || 'Unknown'
        const districtData = districtLookup[name]
        const [mx, my] = d3.pointer(event, container)
        setTooltip({
          visible: true,
          x: mx,
          y: my,
          data: {
            name: displayName,
            avgScore: districtData?.avg_score ?? null,
            farmerCount: districtData?.farmer_count ?? 0,
            criticalCount: districtData?.critical_count ?? 0,
          },
        })
      })
      .on('mouseleave', () => setTooltip((t) => ({ ...t, visible: false })))
      .on('click', (event, feature) => {
        const name = feature.properties.district || feature.properties.name
        if (onDistrictClick) onDistrictClick(name)
      })

    g.selectAll('text')
      .data(geoData.features)
      .join('text')
      .attr('transform', (feature) => {
        const centroid = pathGenerator.centroid(feature)
        return `translate(${centroid[0]}, ${centroid[1]})`
      })
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', '8px')
      .attr('font-family', 'Inter, sans-serif')
      .attr('font-weight', '500')
      .attr('fill', (feature) => {
        const name = (feature.properties.district || feature.properties.name || '').toLowerCase()
        const districtData = districtLookup[name]
        if (!districtData) return '#6B7280'
        return districtData.avg_score > 50 ? '#fff' : '#374151'
      })
      .attr('pointer-events', 'none')
      .text((feature) => feature.properties.district || feature.properties.name || '')

    const zoom = d3
      .zoom()
      .scaleExtent([1, 6])
      .on('zoom', (event) => g.attr('transform', event.transform))

    zoomRef.current = zoom
    svg.call(zoom)
  }, [geoData, heatmapData, selectedDistrict, onDistrictClick])

  const handleResetZoom = () => {
    if (svgRef.current && zoomRef.current) {
      const svg = d3.select(svgRef.current)
      svg.transition().duration(300).call(zoomRef.current.transform, d3.zoomIdentity)
    }
  }

  if (geoError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-xl">
        <div className="text-center">
          <p className="text-sm text-gray-500">Failed to load map data</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 text-xs text-[#0F4C35] hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (isLoading || !geoData) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-xl">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#0F4C35] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading Gujarat map...</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <svg ref={svgRef} className="w-full h-full rounded-xl" />

      {tooltip.visible && tooltip.data && (
        <DistrictTooltip x={tooltip.x} y={tooltip.y} data={tooltip.data} />
      )}

      <MapLegend />

      <div className="absolute top-3 right-3 flex gap-1">
        <button
          className="bg-white border border-gray-200 rounded-lg p-2 shadow-sm
                     hover:bg-gray-50 transition text-gray-600 text-xs font-medium"
          onClick={handleResetZoom}
        >
          Reset zoom
        </button>
      </div>
    </div>
  )
}
