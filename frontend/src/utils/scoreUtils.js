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
  { key: 'rainfall_deviation', label: 'Rainfall deviation', icon: 'CloudRain', weight: 20 },
  { key: 'days_to_loan_due', label: 'Loan due proximity', icon: 'Calendar', weight: 15 },
  { key: 'crop_failure_probability', label: 'Crop failure risk', icon: 'AlertTriangle', weight: 20 },
  { key: 'market_price_drop', label: 'Market price drop', icon: 'TrendingDown', weight: 15 },
  { key: 'insurance_gap', label: 'Insurance gap', icon: 'Shield', weight: 10 },
  { key: 'income_to_debt_ratio', label: 'Income-to-debt', icon: 'Wallet', weight: 10 },
  { key: 'historical_default', label: 'Historical default', icon: 'History', weight: 10 },
]
