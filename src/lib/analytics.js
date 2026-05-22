const FIRST_TOUCH_KEY = 'fan_arena_first_touch_attribution'
const SESSION_TOUCH_KEY = 'fan_arena_session_attribution'

const ATTRIBUTION_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'utm_source_platform',
  'utm_creative_format',
  'utm_marketing_tactic',
  'gclid',
  'gbraid',
  'wbraid',
  'fbclid',
  'msclkid',
  'ttclid',
  'li_fat_id',
  'twclid',
]

function readStored(key, storage) {
  try {
    const raw = storage?.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeStored(key, value, storage) {
  try {
    storage?.setItem(key, JSON.stringify(value))
  } catch {
    // Attribution should never block app behavior.
  }
}

export function captureAttribution() {
  if (typeof window === 'undefined') return {}

  const params = new URLSearchParams(window.location.search)
  const touch = {}

  ATTRIBUTION_KEYS.forEach((key) => {
    const value = params.get(key)
    if (value) touch[key] = value
  })

  touch.landing_page = window.location.href
  touch.referrer = document.referrer || ''
  touch.captured_at = new Date().toISOString()

  const existingFirstTouch = readStored(FIRST_TOUCH_KEY, window.localStorage)
  if (!existingFirstTouch) writeStored(FIRST_TOUCH_KEY, touch, window.localStorage)
  writeStored(SESSION_TOUCH_KEY, touch, window.sessionStorage)

  return touch
}

export function getAttributionParams() {
  if (typeof window === 'undefined') return {}

  const sessionTouch = readStored(SESSION_TOUCH_KEY, window.sessionStorage) || captureAttribution()
  const firstTouch = readStored(FIRST_TOUCH_KEY, window.localStorage) || sessionTouch

  return {
    ...Object.fromEntries(
      ATTRIBUTION_KEYS.map((key) => [`first_${key}`, firstTouch?.[key] || ''])
    ),
    ...Object.fromEntries(
      ATTRIBUTION_KEYS.map((key) => [`session_${key}`, sessionTouch?.[key] || ''])
    ),
    first_landing_page: firstTouch?.landing_page || '',
    first_referrer: firstTouch?.referrer || '',
    first_captured_at: firstTouch?.captured_at || '',
    session_landing_page: sessionTouch?.landing_page || '',
    session_referrer: sessionTouch?.referrer || '',
    session_captured_at: sessionTouch?.captured_at || '',
  }
}

export function trackEvent(event, params = {}) {
  if (typeof window === 'undefined') return
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({
    event,
    ...getAttributionParams(),
    ...params,
  })
}

export function matchAnalyticsParams(match, user) {
  return {
    match_id: match?.id,
    match_slug: match?.slug,
    match_status: match?.status,
    day_number: match?.day_number,
    match_number: match?.match_number,
    is_logged_in: !!user?.id,
  }
}
