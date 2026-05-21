export function trackEvent(event, params = {}) {
  if (typeof window === 'undefined') return
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({
    event,
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
