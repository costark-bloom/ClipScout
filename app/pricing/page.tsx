'use client'

import Link from 'next/link'
import HomeHeader from '@/components/HomeHeader'
import PlanGrid from '@/components/PlanGrid'

export default function PricingPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ position: 'relative', zIndex: 1 }}>
      <HomeHeader />

      <main className="flex-1 px-6 py-16 max-w-5xl mx-auto w-full">
        {/* Heading */}
        <div className="text-center mb-10">
          <span className="inline-block mb-4 text-xs font-bold uppercase tracking-widest text-purple-500 bg-purple-100 border border-purple-200 px-3 py-1 rounded-full">
            Plans &amp; Pricing
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-purple-950 mb-4 tracking-tight leading-tight">
            The right plan for<br />
            <span className="bg-gradient-to-r from-purple-600 to-indigo-500 bg-clip-text text-transparent">
              every creator
            </span>
          </h1>
          <p className="text-purple-600 text-base max-w-md mx-auto">
            Pay only for the footage searches you run. No subscriptions that waste money when you&apos;re between projects.
          </p>

          {/* How credits work — anchors to explainer below */}
          <div className="mt-3">
            <a
              href="#credits"
              className="inline-flex items-center gap-1.5 text-sm text-purple-500 hover:text-purple-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              How do credits work?
            </a>
          </div>
        </div>

        {/* Plan grid (toggle + cards + checkout flow) */}
        <PlanGrid variant="full" analyticsContext="Pricing" />

        {/* Free trial note */}
        <p className="text-center text-sm text-purple-500 mt-8">
          Not ready to commit?{' '}
          <Link href="/" className="text-purple-700 font-medium hover:text-purple-950 underline underline-offset-2 transition-colors">
            Try ClipScout free
          </Link>{' '}
          — no credit card required.
        </p>

        {/* Credits explainer */}
        <div id="credits" className="mt-14 max-w-2xl mx-auto bg-white/70 border border-purple-200 rounded-2xl p-7 backdrop-blur-sm scroll-mt-24">
          <h3 className="text-base font-bold text-purple-950 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            How credits work
          </h3>
          <div className="space-y-2 text-sm text-purple-700 leading-relaxed">
            <p>
              <strong className="text-purple-950">1 credit = 1 chapter analyzed.</strong> ClipScout automatically breaks your script into ~400-word chapters.
              Each chapter costs 1 credit — AI analyzes the text, finds visual moments, and searches for matching b-roll footage.
            </p>
            <p>
              A typical 800-word YouTube script uses <strong className="text-purple-950">2 credits</strong>.
              A longer 2,000-word video essay uses <strong className="text-purple-950">~5 credits</strong>.
            </p>
            <p>
              Unused credits roll over to the next month (up to your plan&apos;s rollover limit), so you never lose what you&apos;ve paid for.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
