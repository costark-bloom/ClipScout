'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'

interface CreditsState {
  credits: number | null   // null = unauthenticated or not yet loaded
  isLoading: boolean
  refresh: () => void
}

export function useCredits(): CreditsState {
  const { status } = useSession()
  const [credits, setCredits] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetch_ = useCallback(() => {
    if (status !== 'authenticated') {
      setCredits(null)
      return
    }
    setIsLoading(true)
    fetch('/api/user/settings')
      .then((r) => r.json())
      .then((d) => setCredits(d.credits_remaining ?? 0))
      .catch(() => setCredits(null))
      .finally(() => setIsLoading(false))
  }, [status])

  useEffect(() => {
    fetch_()
  }, [fetch_])

  return { credits, isLoading, refresh: fetch_ }
}
