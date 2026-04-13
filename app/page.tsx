import ScriptInput from '@/components/ScriptInput'
import DisclaimerBanner from '@/components/DisclaimerBanner'
import HomeHeader from '@/components/HomeHeader'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <DisclaimerBanner />
      <HomeHeader />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        {/* Logo / Hero */}
        <div className="text-center mb-12 space-y-4 animate-fade-in">
          <div className="flex flex-col items-center gap-4 mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="ClipScout" className="w-16 h-16" />
            <span className="text-6xl md:text-7xl font-bold tracking-tight bg-gradient-to-br from-white via-gray-100 to-gray-400 bg-clip-text text-transparent">
              ClipScout
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-gray-100 tracking-tight text-balance">
            Find the perfect clip for{' '}
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              every moment
            </span>{' '}
            in your script
          </h1>

          <p className="text-lg text-gray-400 max-w-xl text-balance text-center mx-auto">
            Paste your script. AI identifies every visual moment to discover matching b-roll footage from across the web.
          </p>

        </div>

        {/* Script Input */}
        <div className="w-full max-w-3xl animate-slide-up">
          <ScriptInput />
        </div>

        {/* How it works */}
        <div className="mt-20 w-full max-w-3xl animate-fade-in">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-600 text-center mb-8">
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                title: 'Paste your script',
                description:
                  'Drop in any video script — narration, documentary, YouTube video, podcast script.',
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                  />
                ),
              },
              {
                step: '02',
                title: 'AI finds visual moments',
                description:
                  'AI identifies every phrase that would benefit from B-roll and generates optimized search queries.',
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"
                  />
                ),
              },
              {
                step: '03',
                title: 'Preview and source',
                description:
                  'Browse matched clips, preview inline, and click through to the original source to license.',
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
                  />
                ),
              },
            ].map((item) => (
              <div
                key={item.step}
                className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5 space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-950/60 border border-indigo-900/50 flex items-center justify-center">
                    <svg
                      className="w-4.5 h-4.5 text-indigo-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      {item.icon}
                    </svg>
                  </div>
                  <span className="text-xs font-mono text-gray-700">{item.step}</span>
                </div>
                <h3 className="text-sm font-semibold text-gray-200">{item.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-gray-700 border-t border-gray-900">
        ClipScout is a discovery tool only. All video content remains on its original platform.
      </footer>
    </div>
  )
}
