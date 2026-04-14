'use client'

import { useState } from 'react'
import Link from 'next/link'
import HomeHeader from '@/components/HomeHeader'

const CATEGORIES = ['Question', 'Feedback', 'Bug Report', 'Feature Request', 'Other']

export default function ContactPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    category: 'Feedback',
    message: '',
  })
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.message.trim()) return
    setStatus('sending')
    setErrorMsg('')

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong.')
      setStatus('success')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.')
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen flex flex-col text-purple-950" style={{ position: 'relative', zIndex: 1 }}>
      <HomeHeader />

      <main className="flex-1 flex items-start justify-center px-4 py-12">
        <div className="w-full max-w-lg">

          {status === 'success' ? (
            /* ── Success state ── */
            <div className="text-center py-16 space-y-5">
              <div className="w-16 h-16 rounded-full bg-green-100 border border-green-300 flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-purple-950">Message sent!</h1>
                <p className="text-purple-600 mt-2 text-sm leading-relaxed">
                  Thanks for reaching out. We&apos;ll get back to you soon
                  {form.email ? ` at ${form.email}` : ''}.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => { setStatus('idle'); setForm({ name: '', email: '', category: 'Feedback', message: '' }) }}
                  className="text-sm text-purple-600 hover:text-purple-950 border border-purple-200 hover:border-purple-400 bg-white px-4 py-2 rounded-lg transition-all"
                >
                  Send another
                </button>
                <Link
                  href="/"
                  className="text-sm text-white bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors"
                >
                  Back to ClipScout
                </Link>
              </div>
            </div>
          ) : (
            /* ── Form ── */
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-purple-950">Get in touch</h1>
                <p className="text-purple-600 mt-2 text-sm leading-relaxed">
                  Have a question, spotted a bug, or want to share feedback? We&apos;d love to hear from you.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Name + Email row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-xs font-medium text-purple-700 mb-1.5">
                      Name <span className="text-purple-400">(optional)</span>
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Your name"
                      className="w-full bg-white border border-purple-200 rounded-xl px-3.5 py-2.5 text-sm text-purple-950 placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-colors"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-xs font-medium text-purple-700 mb-1.5">
                      Email <span className="text-purple-400">(optional)</span>
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="For replies"
                      className="w-full bg-white border border-purple-200 rounded-xl px-3.5 py-2.5 text-sm text-purple-950 placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-colors"
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label htmlFor="category" className="block text-xs font-medium text-purple-700 mb-1.5">
                    Category
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, category: cat }))}
                        className={[
                          'text-xs font-medium px-3.5 py-1.5 rounded-full border transition-all',
                          form.category === cat
                            ? 'bg-purple-600 border-purple-600 text-white'
                            : 'bg-white border-purple-200 text-purple-600 hover:border-purple-400 hover:text-purple-950',
                        ].join(' ')}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label htmlFor="message" className="block text-xs font-medium text-purple-700 mb-1.5">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={6}
                    value={form.message}
                    onChange={handleChange}
                    placeholder="Tell us what's on your mind…"
                    required
                    className="w-full bg-white border border-purple-200 rounded-xl px-3.5 py-2.5 text-sm text-purple-950 placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent resize-none transition-colors"
                  />
                </div>

                {/* Error */}
                {status === 'error' && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                    </svg>
                    {errorMsg}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={status === 'sending' || !form.message.trim()}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl py-3 transition-colors flex items-center justify-center gap-2"
                >
                  {status === 'sending' ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Sending…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                      </svg>
                      Send message
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
