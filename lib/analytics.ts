/**
 * Fire a named Mixpanel event.
 * Safe to call server-side or before Mixpanel has loaded — it no-ops silently.
 */
export function trackEvent(
  eventName: string,
  properties?: Record<string, string | number | boolean | null>
) {
  if (typeof window === 'undefined') return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mp = (window as any).mixpanel
  if (!mp) return
  mp.track(eventName, properties)
}
