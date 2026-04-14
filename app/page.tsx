import ScriptInput from '@/components/ScriptInput'
import DisclaimerBanner from '@/components/DisclaimerBanner'
import HomeHeader from '@/components/HomeHeader'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-transparent flex flex-col relative overflow-hidden">
      {/* Lava lamp blobs — nested X/Y bounce for true lava-lamp paths */}
      <div className="pointer-events-none absolute inset-0" style={{zIndex:0}}>
        {/* outer = X bounce, inner = Y bounce + morph */}
        <div className="lx-a absolute" style={{top:'15%', left:'8%', animationDelay:'0s'}}>
          <div className="ly-b" style={{width:230, height:270, background:'rgba(139,92,246,0.38)', animationDelay:'-3s', borderRadius:'40% 60% 60% 40% / 40% 40% 60% 60%'}} />
        </div>
        <div className="lx-c absolute" style={{top:'10%', left:'60%', animationDelay:'-4s'}}>
          <div className="ly-a" style={{width:180, height:220, background:'rgba(99,102,241,0.32)', animationDelay:'-1s', borderRadius:'60% 40% 30% 70% / 60% 30% 70% 40%'}} />
        </div>
        <div className="lx-b absolute" style={{top:'55%', left:'20%', animationDelay:'-6s'}}>
          <div className="ly-c" style={{width:260, height:200, background:'rgba(167,139,250,0.30)', animationDelay:'-5s', borderRadius:'50% 50% 70% 30% / 45% 55% 30% 70%'}} />
        </div>
        <div className="lx-d absolute" style={{top:'65%', left:'55%', animationDelay:'-2s'}}>
          <div className="ly-d" style={{width:150, height:190, background:'rgba(124,58,237,0.28)', animationDelay:'-7s', borderRadius:'65% 35% 50% 50% / 35% 65% 40% 60%'}} />
        </div>
        <div className="lx-a absolute" style={{top:'35%', left:'75%', animationDelay:'-8s'}}>
          <div className="ly-b" style={{width:200, height:160, background:'rgba(196,181,253,0.32)', animationDelay:'-2s', borderRadius:'40% 60% 60% 40% / 40% 40% 60% 60%'}} />
        </div>
      </div>

      <div className="relative" style={{zIndex:50}}>
        <DisclaimerBanner />
        <HomeHeader />
      </div>

      <main className="relative flex-1 flex flex-col items-center justify-center px-4 py-16" style={{zIndex:1}}>
        {/* Logo / Hero */}
        <div className="text-center mb-12 space-y-4 animate-fade-in">
          <div className="flex flex-col items-center gap-4 mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="ClipScout" className="w-16 h-16" />
            <span className="text-6xl md:text-7xl font-bold tracking-tight bg-gradient-to-br from-purple-900 via-purple-800 to-purple-600 bg-clip-text text-transparent">
              ClipScout
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-purple-950 tracking-tight text-balance">
            Find the perfect clip for{' '}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              every moment
            </span>{' '}
            in your script
          </h1>

          <p className="text-lg text-purple-700 max-w-xl text-balance text-center mx-auto">
            Paste your script. AI identifies every visual moment to discover matching b-roll footage from across the web.
          </p>

        </div>

        {/* Script Input */}
        <div className="w-full max-w-3xl animate-slide-up">
          <ScriptInput />
        </div>

        {/* How it works */}
        <div className="mt-20 w-full max-w-3xl animate-fade-in">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-purple-500 text-center mb-8">
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
                className="bg-white/40 border border-purple-200 rounded-2xl p-5 space-y-3 backdrop-blur-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-100 border border-purple-200 flex items-center justify-center">
                    <svg
                      className="w-4.5 h-4.5 text-purple-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      {item.icon}
                    </svg>
                  </div>
                  <span className="text-xs font-mono text-purple-400">{item.step}</span>
                </div>
                <h3 className="text-sm font-semibold text-purple-950">{item.title}</h3>
                <p className="text-xs text-purple-600 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="relative py-6 text-center text-xs text-purple-600 border-t border-purple-200" style={{zIndex:1}}>
        ClipScout is a discovery tool only. All video content remains on its original platform.
      </footer>
    </div>
  )
}
