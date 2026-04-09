'use client'

interface LoadingStateProps {
  stage: 'analyzing' | 'searching'
  segmentCount?: number
}

export default function LoadingState({ stage, segmentCount }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 animate-fade-in">
      {/* Animated orb */}
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 opacity-20 animate-ping absolute inset-0" />
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center relative">
          {stage === 'analyzing' ? (
            <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          ) : (
            <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          )}
        </div>
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-gray-100">
          {stage === 'analyzing' ? 'Analyzing your script…' : 'Searching for footage…'}
        </h2>
        <p className="text-sm text-gray-400 max-w-sm text-balance">
          {stage === 'analyzing'
            ? 'Claude is identifying visual moments and generating search queries for each segment.'
            : segmentCount
            ? `Finding B-roll across YouTube, Pexels, and Pixabay for ${segmentCount} segment${segmentCount !== 1 ? 's' : ''}…`
            : 'Searching YouTube, Pexels, and Pixabay in parallel…'}
        </p>
      </div>

      {/* Skeleton cards */}
      <div className="w-full max-w-2xl space-y-4 px-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl bg-gray-900 border border-gray-800 p-4 space-y-3 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-md bg-gray-800" />
              <div className="h-4 bg-gray-800 rounded w-32" />
            </div>
            <div className="h-3 bg-gray-800 rounded w-full" />
            <div className="h-3 bg-gray-800 rounded w-4/5" />
            <div className="flex gap-3 overflow-hidden">
              {[1, 2, 3].map((j) => (
                <div key={j} className="shrink-0 w-48 h-28 rounded-lg bg-gray-800" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
