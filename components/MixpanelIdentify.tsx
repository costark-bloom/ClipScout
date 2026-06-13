'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'

const PAGE_NAMES: Record<string, string> = {
  '/':                 'Home',
  '/results':          'Results',
  '/settings':         'Settings',
  '/pricing':          'Pricing',
  '/pricing/success':  'Pricing Success',
  '/privacy':          'Privacy Policy',
  '/terms':            'Terms of Service',
  '/scripts':          'Saved Scripts',
  '/contact':          'Contact',
  '/reset-password':   'Reset Password',
  '/onboarding':       'Onboarding',
}

function getPageName(path: string): string {
  return PAGE_NAMES[path] ?? path
}

export default function MixpanelIdentify() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  // Track the previous authenticated email so we only reset on actual sign-out
  const prevEmailRef = useRef<string | null | undefined>(undefined)

  // Identify / reset user when auth state changes
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (status === 'loading') return // wait until auth is resolved
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mp = (window as any).mixpanel
    if (!mp) return

    const email = session?.user?.email ?? null

    if (email) {
      mp.identify(email)
      mp.people.set({
        $email: email,
        $name: session?.user?.name ?? email,
        $avatar: session?.user?.image ?? undefined,
      })
    } else if (prevEmailRef.current) {
      // Only reset when transitioning from authenticated → unauthenticated (sign-out)
      mp.reset()
    }
    // For unauthenticated users on first load, do nothing — preserve their anonymous distinct_id

    prevEmailRef.current = email
  }, [session, status])

  // Detect Google Ads traffic and register as a super property (runs once on mount)
  useEffect(() => {
    if (typeof window === 'undefined') return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mp = (window as any).mixpanel
    if (!mp) return

    const params = new URLSearchParams(window.location.search)

    let source: string | null = null
    if (params.has('gad_source') || params.has('gclid')) {
      source = 'Google Ad'
    } else if (params.get('utm_source') === 'facebook' || params.get('utm_source') === 'instagram' || params.has('fbclid')) {
      source = 'Facebook / Instagram Ad'
    } else if (params.get('utm_source') === 'tiktok' || params.has('ttclid')) {
      source = 'TikTok Ad'
    }

    if (source) {
      mp.register_once({ referrer_source: source })
      mp.people.set_once({ first_referrer_source: source })
    }
  }, [])

  // Track named page views on every route change.
  // On the very first load Mixpanel may not have initialised yet (afterInteractive),
  // so we poll until the stub appears, then hand off to mp.ready() which queues the
  // call and replays it once the real library loads.
  useEffect(() => {
    if (typeof window === 'undefined') return

    const pageName = getPageName(pathname)
    const trackPageView = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mp = (window as any).mixpanel
      mp.track(`${pageName} Page Viewed`, {
        page_name: pageName,
        page_path: pathname,
      })
    }

    let attempts = 0
    const MAX_ATTEMPTS = 40 // 40 × 50 ms = 2 s
    const poll = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mp = (window as any).mixpanel
      if (!mp) {
        if (++attempts < MAX_ATTEMPTS) setTimeout(poll, 50)
        return
      }
      if (typeof mp.ready === 'function') {
        mp.ready(trackPageView)
      } else {
        trackPageView()
      }
    }

    poll()
  }, [pathname])

  return null
}
