export const getScoreColor = (score) => {
  if (score <= 25)
    return {
      text: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      hex: '#059669',
      ring: 'ring-emerald-200',
    }
  if (score <= 50)
    return {
      text: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      hex: '#D97706',
      ring: 'ring-amber-200',
    }
  if (score <= 75)
    return {
      text: 'text-orange-600',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      hex: '#EA580C',
      ring: 'ring-orange-200',
    }
  return {
    text: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    hex: '#DC2626',
    ring: 'ring-red-200',
  }
}

export const getScoreLabel = (score) => {
  if (score <= 25) return 'Low'
  if (score <= 50) return 'Medium'
  if (score <= 75) return 'High'
  return 'Critical'
}

export const getScoreLabelColor = (label) => {
  const map = {
    low: {
      text: 'text-emerald-700',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      hex: '#059669',
      dot: 'bg-emerald-500',
    },
    medium: {
      text: 'text-amber-700',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      hex: '#D97706',
      dot: 'bg-amber-500',
    },
    high: {
      text: 'text-orange-700',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      hex: '#EA580C',
      dot: 'bg-orange-500',
    },
    critical: {
      text: 'text-red-700',
      bg: 'bg-red-50',
      border: 'border-red-200',
      hex: '#DC2626',
      dot: 'bg-red-500',
    },
  }
  return map[label] || map.low
}

export const scoreComponents = [
  { key: 'water', label: 'Water Stress', icon: 'Droplets', weight: 25 },
  { key: 'weather', label: 'Heat Stress', icon: 'CloudSun', weight: 15 },
  { key: 'soil', label: 'Soil Risk', icon: 'Sprout', weight: 25 },
  { key: 'market', label: 'Market Volatility', icon: 'TrendingDown', weight: 20 },
  { key: 'pest', label: 'Pest Pressure', icon: 'Bug', weight: 15 },
]
