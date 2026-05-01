'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'

const PAGE_NAMES: Record<string, string> = {
  '/':                 'Home',
  '/results':          'Results',
  '/settings':         'Settings',
  '/pricing':          'Pricing',
  '/pricing/success':  'Pricing — Success',
  '/privacy':          'Privacy Policy',
  '/terms':            'Terms of Service',
}

function getPageName(path: string): string {
  return PAGE_NAMES[path] ?? path
}

export default function MixpanelIdentify() {
  const { data: session } = useSession()
  const pathname = usePathname()

  // Identify / reset user when auth state changes
  useEffect(() => {
    if (typeof window === 'undefined') return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mp = (window as any).mixpanel
    if (!mp) return

    if (session?.user?.email) {
      mp.identify(session.user.email)
      mp.people.set({
        $email: session.user.email,
        $name: session.user.name ?? session.user.email,
        $avatar: session.user.image ?? undefined,
      })
    } else {
      mp.reset()
    }
  }, [session])

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

  // Track named page views on every route change
  useEffect(() => {
    if (typeof window === 'undefined') return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mp = (window as any).mixpanel
    if (!mp) return

    mp.track('Page View', {
      page_name: getPageName(pathname),
      page_path: pathname,
    })
  }, [pathname])

  return null
}
