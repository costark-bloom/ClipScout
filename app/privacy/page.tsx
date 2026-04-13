import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy — ClipScout',
  description: 'Privacy Policy for ClipScout, an AI-powered B-roll video discovery tool.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-300">
      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-10">
          <Link href="/" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors mb-6 inline-block">
            ← Back to ClipScout
          </Link>
          <h1 className="text-3xl font-bold text-gray-100 mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-500">Last updated: April 12, 2026</p>
        </div>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-gray-300 leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">1. Introduction</h2>
            <p>
              ClipScout (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting your privacy.
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you
              visit our website at{' '}
              <a href="https://www.clipscout.app" className="text-indigo-400 hover:text-indigo-300">
                www.clipscout.app
              </a>{' '}
              and use our Service.
            </p>
            <p className="mt-3">
              Please read this Privacy Policy carefully. By using ClipScout, you consent to the data practices
              described in this policy. If you do not agree with the terms of this Privacy Policy, please do not
              access or use the Service.
            </p>
            <p className="mt-3">
              This Privacy Policy should be read alongside our{' '}
              <Link href="/terms" className="text-indigo-400 hover:text-indigo-300">Terms of Use</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">2. Information We Collect</h2>

            <h3 className="text-base font-medium text-gray-200 mt-4 mb-2">2.1 Information You Provide Directly</h3>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li><strong className="text-gray-200">Account information:</strong> When you create an account using Google OAuth, we receive your name, email address, and profile picture from Google.</li>
              <li><strong className="text-gray-200">Script content:</strong> When you paste a video script into ClipScout for analysis, that text is processed by our AI service. If you choose to save a script, it is stored in our database associated with your account.</li>
              <li><strong className="text-gray-200">Saved scripts and search results:</strong> If you use the save feature, we store your script text, identified segments, and associated video search results in our database.</li>
            </ul>

            <h3 className="text-base font-medium text-gray-200 mt-4 mb-2">2.2 Information Collected Automatically</h3>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li><strong className="text-gray-200">Usage data:</strong> We collect information about how you interact with the Service, including pages visited, features used, button clicks, and session duration, through Mixpanel analytics.</li>
              <li><strong className="text-gray-200">Session replays:</strong> With your consent (implied by use of the Service), Mixpanel may record anonymized session replays to help us understand how users navigate ClipScout.</li>
              <li><strong className="text-gray-200">Log data:</strong> Our servers automatically record information when you use the Service, including your IP address, browser type, operating system, referring URLs, and timestamps.</li>
              <li><strong className="text-gray-200">Cookies and session storage:</strong> We use browser session storage to maintain your application state (current script, segments, and search results) during your session. This data is cleared when you close your browser tab.</li>
            </ul>

            <h3 className="text-base font-medium text-gray-200 mt-4 mb-2">2.3 Information from Third-Party Platforms</h3>
            <p className="text-sm">
              When you use ClipScout to search for B-roll footage, we make API calls to YouTube, Pexels, and Pixabay
              on your behalf. These platforms may collect information about API requests made from our servers.
              Please refer to their respective privacy policies for details.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">3. YouTube API Data — Special Disclosures</h2>
            <p>
              ClipScout uses the <strong className="text-gray-200">YouTube Data API v3</strong> provided by Google.
              This section specifically addresses how we handle data obtained through the YouTube API, in compliance
              with YouTube&apos;s API Services Terms of Service and Developer Policies.
            </p>

            <h3 className="text-base font-medium text-gray-200 mt-4 mb-2">3.1 What YouTube API Data We Access</h3>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Video metadata: titles, descriptions, thumbnails, channel names, video IDs, duration</li>
              <li>Video embeddability status (we only surface embeddable videos)</li>
              <li>Video search results based on queries derived from user-provided scripts</li>
            </ul>

            <h3 className="text-base font-medium text-gray-200 mt-4 mb-2">3.2 How We Use YouTube API Data</h3>
            <p className="text-sm">
              YouTube API data is used exclusively to:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-2 text-sm">
              <li>Display video search results to the user who initiated the search</li>
              <li>Enable inline preview of YouTube videos through YouTube&apos;s official embed player</li>
              <li>Provide links back to the original YouTube video page</li>
            </ul>

            <h3 className="text-base font-medium text-gray-200 mt-4 mb-2">3.3 Storage and Retention of YouTube API Data</h3>
            <p className="text-sm">
              YouTube API data (video titles, thumbnails, descriptions, video IDs) may be stored in our database
              when a user chooses to save a script along with its search results. This storage is:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-2 text-sm">
              <li>Initiated only by explicit user action (clicking &quot;Save script&quot;)</li>
              <li>Stored in association with the user&apos;s account</li>
              <li>Deleted when the user deletes the saved script or requests account deletion</li>
              <li>Never sold, shared with third parties, or used for advertising purposes</li>
              <li>Never used for any purpose beyond restoring the user&apos;s saved session</li>
            </ul>
            <p className="mt-3 text-sm">
              YouTube API data that is <em>not</em> explicitly saved by the user is held only transiently in server
              memory during the duration of the API request and is not persisted to any database.
            </p>

            <h3 className="text-base font-medium text-gray-200 mt-4 mb-2">3.4 User Rights Regarding YouTube API Data</h3>
            <p className="text-sm">
              You may request deletion of all YouTube API data associated with your account at any time by deleting
              your saved scripts or by contacting us at{' '}
              <a href="mailto:privacy@clipscout.app" className="text-indigo-400 hover:text-indigo-300">
                privacy@clipscout.app
              </a>. We will process deletion requests within 30 days.
            </p>

            <h3 className="text-base font-medium text-gray-200 mt-4 mb-2">3.5 Compliance with YouTube Policies</h3>
            <p className="text-sm">
              ClipScout&apos;s use of the YouTube API is designed to comply with the following:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-2 text-sm">
              <li>
                <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">
                  YouTube Terms of Service
                </a>
              </li>
              <li>
                <a href="https://developers.google.com/youtube/terms/developer-policies" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">
                  YouTube API Services Developer Policies
                </a>
              </li>
              <li>
                <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">
                  Google Privacy Policy
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">4. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 text-sm">
              <li>Provide, operate, and improve the ClipScout Service</li>
              <li>Process and analyze your video script to identify visual moments and generate search queries</li>
              <li>Search for and display relevant B-roll footage from third-party platforms</li>
              <li>Authenticate your identity and manage your account</li>
              <li>Save and restore your scripts and search results when you choose to use that feature</li>
              <li>Analyze usage patterns to improve the Service through Mixpanel analytics</li>
              <li>Detect, prevent, and address technical issues, security incidents, and abuse</li>
              <li>Communicate with you about the Service, including updates and support</li>
              <li>Comply with legal obligations</li>
            </ul>
            <p className="mt-3">
              We do <strong className="text-gray-200">not</strong> sell your personal data to third parties.
              We do <strong className="text-gray-200">not</strong> use your script content to train AI models.
              We do <strong className="text-gray-200">not</strong> use YouTube API data for advertising or profiling.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">5. Third-Party Services</h2>
            <p>ClipScout integrates with the following third-party services. Each has its own privacy policy:</p>

            <div className="mt-4 space-y-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="font-medium text-gray-200 text-sm mb-1">Google / YouTube</p>
                <p className="text-xs text-gray-500 mb-2">Authentication (Google OAuth) and video search (YouTube Data API v3)</p>
                <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300">policies.google.com/privacy →</a>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="font-medium text-gray-200 text-sm mb-1">Anthropic</p>
                <p className="text-xs text-gray-500 mb-2">AI analysis of your script content via the Claude API. Script text is sent to Anthropic&apos;s servers for processing.</p>
                <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300">anthropic.com/privacy →</a>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="font-medium text-gray-200 text-sm mb-1">Pexels</p>
                <p className="text-xs text-gray-500 mb-2">Royalty-free video search results</p>
                <a href="https://www.pexels.com/privacy-policy/" target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300">pexels.com/privacy-policy →</a>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="font-medium text-gray-200 text-sm mb-1">Pixabay</p>
                <p className="text-xs text-gray-500 mb-2">Royalty-free video search results</p>
                <a href="https://pixabay.com/service/privacy/" target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300">pixabay.com/service/privacy →</a>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="font-medium text-gray-200 text-sm mb-1">Supabase</p>
                <p className="text-xs text-gray-500 mb-2">Database for storing user accounts and saved scripts</p>
                <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300">supabase.com/privacy →</a>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="font-medium text-gray-200 text-sm mb-1">Mixpanel</p>
                <p className="text-xs text-gray-500 mb-2">Analytics and session replay to help us improve the Service</p>
                <a href="https://mixpanel.com/legal/privacy-policy/" target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300">mixpanel.com/legal/privacy-policy →</a>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="font-medium text-gray-200 text-sm mb-1">Supadata</p>
                <p className="text-xs text-gray-500 mb-2">YouTube transcript retrieval for timestamp accuracy</p>
                <a href="https://supadata.ai/privacy" target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300">supadata.ai/privacy →</a>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="font-medium text-gray-200 text-sm mb-1">Render</p>
                <p className="text-xs text-gray-500 mb-2">Cloud hosting infrastructure for ClipScout</p>
                <a href="https://render.com/privacy" target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300">render.com/privacy →</a>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">6. Data Retention</h2>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li><strong className="text-gray-200">Account data:</strong> Retained for as long as your account is active or until you request deletion.</li>
              <li><strong className="text-gray-200">Saved scripts:</strong> Retained until you delete them or request account deletion.</li>
              <li><strong className="text-gray-200">Session data (browser storage):</strong> Cleared when you close your browser tab or click &quot;Start over.&quot;</li>
              <li><strong className="text-gray-200">Transient API data:</strong> YouTube, Pexels, and Pixabay search results that are not saved by the user are held only in server memory during the request and are not stored.</li>
              <li><strong className="text-gray-200">Analytics data:</strong> Usage data and session replays are retained by Mixpanel according to their data retention policies.</li>
              <li><strong className="text-gray-200">Server logs:</strong> Retained for up to 30 days for security and debugging purposes.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">7. Data Security</h2>
            <p>
              We implement reasonable technical and organizational measures to protect your personal information
              against unauthorized access, alteration, disclosure, or destruction. These measures include:
            </p>
            <ul className="list-disc list-inside mt-3 space-y-2 text-sm">
              <li>HTTPS encryption for all data in transit</li>
              <li>Secure storage of credentials and API keys using environment variables</li>
              <li>Authentication via industry-standard OAuth 2.0 (Google)</li>
              <li>Database access controls through Supabase Row Level Security</li>
            </ul>
            <p className="mt-3">
              However, no method of transmission over the internet or method of electronic storage is 100% secure.
              We cannot guarantee absolute security of your data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">8. Your Rights</h2>
            <p>Depending on your location, you may have the following rights regarding your personal data:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 text-sm">
              <li><strong className="text-gray-200">Access:</strong> Request a copy of the personal data we hold about you.</li>
              <li><strong className="text-gray-200">Correction:</strong> Request correction of inaccurate personal data.</li>
              <li><strong className="text-gray-200">Deletion:</strong> Request deletion of your personal data, including any saved scripts and associated YouTube API data.</li>
              <li><strong className="text-gray-200">Data portability:</strong> Request your data in a portable format.</li>
              <li><strong className="text-gray-200">Objection:</strong> Object to processing of your personal data for certain purposes.</li>
              <li><strong className="text-gray-200">Withdrawal of consent:</strong> Withdraw consent where processing is based on consent.</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, contact us at{' '}
              <a href="mailto:privacy@clipscout.app" className="text-indigo-400 hover:text-indigo-300">
                privacy@clipscout.app
              </a>. We will respond to requests within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">9. Children&apos;s Privacy</h2>
            <p>
              ClipScout is not directed at children under the age of 13. We do not knowingly collect personal
              information from children under 13. If we become aware that we have collected personal information from
              a child under 13 without parental consent, we will take steps to delete that information.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">10. International Data Transfers</h2>
            <p>
              ClipScout is operated from the United States. If you are located outside the United States, please be
              aware that your information may be transferred to, stored, and processed in the United States and other
              countries where our service providers operate. By using ClipScout, you consent to the transfer of your
              information to these countries.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">11. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by updating the
              &quot;Last updated&quot; date at the top of this page. We encourage you to review this Privacy Policy
              periodically. Your continued use of the Service after any changes constitutes your acceptance of the
              updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">12. Contact Us</h2>
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices,
              please contact us:
            </p>
            <div className="mt-3 bg-gray-900 border border-gray-800 rounded-xl p-4 text-sm space-y-1">
              <p className="text-gray-200 font-medium">ClipScout</p>
              <p>Email: <a href="mailto:privacy@clipscout.app" className="text-indigo-400 hover:text-indigo-300">privacy@clipscout.app</a></p>
              <p>Website: <a href="https://www.clipscout.app" className="text-indigo-400 hover:text-indigo-300">www.clipscout.app</a></p>
            </div>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 flex items-center gap-6 text-xs text-gray-600">
          <Link href="/" className="hover:text-gray-400 transition-colors">ClipScout</Link>
          <Link href="/terms" className="hover:text-gray-400 transition-colors">Terms of Use</Link>
        </div>
      </div>
    </div>
  )
}
