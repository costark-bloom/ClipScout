'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signIn, useSession } from 'next-auth/react'

interface AuthGateProps {
  onAuthenticated: () => void
}

type Mode = 'signup' | 'signin' | 'forgot'

export function useAuthGate() {
  const { data: session, status } = useSession()
  const isAuthenticated = status === 'authenticated' && !!session
  const isLoading = status === 'loading'
  return { isAuthenticated, isLoading }
}

export default function AuthGate({ onAuthenticated }: AuthGateProps) {
  const [mode, setMode] = useState<Mode>('signup')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isEmailLoading, setIsEmailLoading] = useState(false)
  const [error, setError] = useState('')
  const [forgotSent, setForgotSent] = useState(false)

  const handleGoogle = async () => {
    setIsGoogleLoading(true)
    await signIn('google', { callbackUrl: '/results' })
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Please fill in all fields.'); return }
    if (mode === 'signup' && !name) { setError('Please enter your name.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }

    setIsEmailLoading(true)
    try {
      if (mode === 'signup') {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? 'Sign up failed.'); setIsEmailLoading(false); return }
      } else {
        // For sign-in, check if the email exists first to give a better error message
        const checkRes = await fetch('/api/auth/check-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        })
        if (checkRes.status === 404) {
          setError('No account found with this email address.')
          setIsEmailLoading(false)
          return
        }
      }

      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError(mode === 'signup' ? 'Account created but sign-in failed. Please try signing in.' : 'Incorrect password.')
        setIsEmailLoading(false)
        return
      }

      onAuthenticated()
    } catch {
      setError('Something went wrong. Please try again.')
      setIsEmailLoading(false)
    }
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email) { setError('Please enter your email address.'); return }
    setIsEmailLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); setIsEmailLoading(false); return }
      setForgotSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    }
    setIsEmailLoading(false)
  }

  const switchMode = (m: Mode) => { setMode(m); setError(''); setForgotSent(false) }

  /* ── Forgot password panel ── */
  if (mode === 'forgot') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-gray-950/60 backdrop-blur-md" />
        <div className="relative w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl shadow-black/50 animate-slide-up overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />
          <div className="px-8 py-7">
            <div className="flex flex-col items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-950/50">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
              </div>
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-100 tracking-tight">Reset password</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {forgotSent ? 'Check your inbox' : "We'll send you a reset link"}
                </p>
              </div>
            </div>

            {forgotSent ? (
              <div className="text-center space-y-3">
                <div className="text-4xl">📬</div>
                <p className="text-sm text-gray-300">
                  A reset link was sent to <span className="text-indigo-400 font-medium">{email}</span>.
                </p>
                <p className="text-xs text-gray-500">Didn&apos;t get it? Check your spam folder or try again.</p>
                <button
                  onClick={() => setForgotSent(false)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Resend email
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgot} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoFocus
                  className="w-full bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-600 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
                {error && (
                  <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={isEmailLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition-all flex items-center justify-center gap-2"
                >
                  {isEmailLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Sending…
                    </>
                  ) : 'Send reset link'}
                </button>
              </form>
            )}

            <div className="mt-5 pt-4 border-t border-gray-800 text-center">
              <button onClick={() => switchMode('signin')} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                ← Back to sign in
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ── Sign up / Sign in panel ── */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-950/60 backdrop-blur-md" />

      <div className="relative w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl shadow-black/50 animate-slide-up overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />

        <div className="px-8 py-7">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-950/50">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-100 tracking-tight">
                {mode === 'signup' ? 'Your clips are ready' : 'Welcome back'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {mode === 'signup' ? 'Create a free account to see your footage' : 'Sign in to see your matched footage'}
              </p>
            </div>
          </div>

          {/* Benefit callout — signup only */}
          {mode === 'signup' && (
            <div className="mb-5 bg-indigo-950/40 border border-indigo-900/50 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <p className="text-xs text-indigo-300 leading-relaxed">
                Free account · No credit card · Instant access to all matched clips
              </p>
            </div>
          )}

          {/* Google button */}
          <button
            onClick={handleGoogle}
            disabled={isGoogleLoading || isEmailLoading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-800 font-medium py-2.5 px-4 rounded-xl text-sm transition-all duration-150 border border-gray-200 shadow-sm mb-4"
          >
            {isGoogleLoading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Redirecting to Google…
              </>
            ) : (
              <>
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-800" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-gray-900 px-3 text-[11px] text-gray-600">or continue with email</span>
            </div>
          </div>

          {/* Email / password form */}
          <form onSubmit={handleEmailSubmit} className="space-y-3">
            {mode === 'signup' && (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-600 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            )}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus
              className="w-full bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-600 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-600 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              {mode === 'signin' && (
                <div className="text-right mt-1.5">
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-[11px] text-gray-500 hover:text-indigo-400 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isEmailLoading || isGoogleLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition-all flex items-center justify-center gap-2"
            >
              {isEmailLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {mode === 'signup' ? 'Creating account…' : 'Signing in…'}
                </>
              ) : mode === 'signup' ? 'Create free account →' : 'Sign in →'}
            </button>
          </form>

          {/* Toggle */}
          <div className="mt-5 pt-4 border-t border-gray-800 text-center">
            {mode === 'signup' ? (
              <p className="text-xs text-gray-500">
                Already have an account?{' '}
                <button onClick={() => switchMode('signin')} className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                  Sign in
                </button>
              </p>
            ) : (
              <p className="text-xs text-gray-500">
                Don&apos;t have an account?{' '}
                <button onClick={() => switchMode('signup')} className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                  Sign up free
                </button>
              </p>
            )}
          </div>

          {/* Legal links */}
          <p className="mt-4 text-center text-[10px] text-gray-700 leading-relaxed">
            By continuing, you agree to our{' '}
            <Link href="/terms" target="_blank" className="text-gray-600 hover:text-gray-400 underline underline-offset-2 transition-colors">
              Terms of Use
            </Link>{' '}
            and{' '}
            <Link href="/privacy" target="_blank" className="text-gray-600 hover:text-gray-400 underline underline-offset-2 transition-colors">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
