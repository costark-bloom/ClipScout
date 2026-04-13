'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'

export default function MixpanelIdentify() {
  const { data: session } = useSession()

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
      // User signed out — reset to anonymous
      mp.reset()
    }
  }, [session])

  return null
}
