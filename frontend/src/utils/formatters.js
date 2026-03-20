import { format, formatDistanceToNow, differenceInDays } from 'date-fns'

export const formatCurrency = (v) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(v)

export const formatNumber = (v) =>
  new Intl.NumberFormat('en-IN').format(v)

export const formatDate = (d) => format(new Date(d), 'dd MMM yyyy')

export const formatDateTime = (d) => format(new Date(d), 'dd MMM yyyy, hh:mm a')

export const formatRelative = (d) =>
  formatDistanceToNow(new Date(d), { addSuffix: true })

export const formatDaysRemaining = (date) => {
  const days = differenceInDays(new Date(date), new Date())
  if (days < 0) return `Overdue ${Math.abs(days)} days`
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  return `In ${days} days`
}

export const formatPhone = (phone) => {
  if (!phone) return ''
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`
  }
  return phone
}

export const truncate = (str, len = 50) => {
  if (!str) return ''
  return str.length > len ? str.slice(0, len) + '...' : str
}
