export const APP_NAME = 'KhedutMitra'

export const ROLES = {
  SUPERADMIN: 'superadmin',
  ORG_ADMIN: 'org_admin',
  FIELD_OFFICER: 'field_officer',
}

export const VULNERABILITY_LABELS = ['low', 'medium', 'high', 'critical']

export const ALERT_PRIORITIES = ['low', 'medium', 'high', 'critical']

export const ALERT_TYPES = [
  'weather',
  'loan_repayment',
  'insurance_expiry',
  'scheme_eligibility',
  'crop_advisory',
  'market_price',
]

export const ALERT_STATUSES = ['pending', 'sent']

export const ALERT_DOMAINS = ['financial', 'agriculture']

export const LANGUAGES = [
  { value: 'gu', label: 'ગુજરાતી (Gujarati)' },
  { value: 'hi', label: 'हिन्दी (Hindi)' },
  { value: 'en', label: 'English' },
]

export const CROP_TYPES = [
  'Cotton', 'Groundnut', 'Wheat', 'Rice', 'Castor', 'Bajra',
  'Cumin', 'Mustard', 'Sugarcane', 'Tobacco', 'Banana',
  'Mango', 'Onion', 'Potato', 'Tomato', 'Chilli',
]

export const SOIL_TYPES = [
  'Black', 'Red', 'Alluvial', 'Laterite', 'Sandy', 'Clayey', 'Loamy',
]

export const IRRIGATION_TYPES = [
  'Canal', 'Tube well', 'Open well', 'Drip', 'Sprinkler', 'Rainfed', 'None',
]

export const LOAN_TYPES = [
  'Crop loan', 'Term loan', 'KCC', 'SHG loan', 'Gold loan', 'None',
]

export const GUJARAT_DISTRICTS = [
  'Ahmedabad', 'Amreli', 'Anand', 'Aravalli', 'Banaskantha',
  'Bharuch', 'Bhavnagar', 'Botad', 'Chhota Udaipur', 'Dahod',
  'Dang', 'Devbhoomi Dwarka', 'Gandhinagar', 'Gir Somnath',
  'Jamnagar', 'Junagadh', 'Kheda', 'Kutch', 'Mahisagar',
  'Mehsana', 'Morbi', 'Narmada', 'Navsari', 'Panchmahal',
  'Patan', 'Porbandar', 'Rajkot', 'Sabarkantha', 'Surat',
  'Surendranagar', 'Tapi', 'Vadodara', 'Valsad',
]

export const SCHEME_STATUSES = ['eligible', 'applied', 'approved', 'rejected', 'disbursed']

export const NAV_ITEMS = [
  { label: 'Dashboard', icon: 'LayoutDashboard', path: '/dashboard' },
  { label: 'Farmers', icon: 'Users', path: '/farmers' },
  { label: 'Vulnerability Map', icon: 'Map', path: '/vulnerability' },
  { label: 'Alerts', icon: 'Bell', path: '/alerts', badge: true },
  { label: 'Schemes', icon: 'FileText', path: '/schemes' },
  { label: 'Users', icon: 'UserCog', path: '/users', roles: ['superadmin', 'org_admin'] },
  { label: 'Settings', icon: 'Settings', path: '/settings' },
]

export const PAGE_SIZE = 20
