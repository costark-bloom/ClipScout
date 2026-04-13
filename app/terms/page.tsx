import Link from 'next/link'

export const metadata = {
  title: 'Terms of Use — ClipScout',
  description: 'Terms of Use for ClipScout, an AI-powered B-roll video discovery tool.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-300">
      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-10">
          <Link href="/" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors mb-6 inline-block">
            ← Back to ClipScout
          </Link>
          <h1 className="text-3xl font-bold text-gray-100 mb-2">Terms of Use</h1>
          <p className="text-sm text-gray-500">Last updated: April 12, 2026</p>
        </div>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-gray-300 leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using ClipScout (&quot;the Service,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), located at{' '}
              <a href="https://www.clipscout.app" className="text-indigo-400 hover:text-indigo-300">www.clipscout.app</a>,
              you agree to be bound by these Terms of Use and all applicable laws and regulations. If you do not agree
              with any of these terms, you are prohibited from using this Service. These Terms of Use, together with our{' '}
              <Link href="/privacy" className="text-indigo-400 hover:text-indigo-300">Privacy Policy</Link>, constitute
              the entire agreement between you and ClipScout.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">2. Description of Service</h2>
            <p>
              ClipScout is an AI-powered video discovery tool that helps content creators find relevant B-roll footage.
              Users paste a video script, and the Service uses artificial intelligence to identify visual moments and
              search for matching video clips across third-party platforms including YouTube, Pexels, and Pixabay.
            </p>
            <p className="mt-3">
              ClipScout is a <strong className="text-gray-200">discovery and preview tool only</strong>. It does not
              download, host, store, redistribute, or provide direct access to any video files. All video content
              displayed within the Service remains hosted on and served by the original third-party platforms. Users
              are directed to the original source for any actual use of footage.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">3. YouTube API Services</h2>
            <p>
              ClipScout uses the <strong className="text-gray-200">YouTube Data API v3</strong> to search for and
              display publicly available YouTube videos. By using ClipScout, you also agree to be bound by:
            </p>
            <ul className="list-disc list-inside mt-3 space-y-2 text-sm">
              <li>
                <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">
                  YouTube Terms of Service
                </a>
              </li>
              <li>
                <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">
                  Google Privacy Policy
                </a>
              </li>
            </ul>
            <p className="mt-3">
              ClipScout only surfaces YouTube videos where the creator has enabled embedding (embeddable: true).
              Videos are displayed using YouTube&apos;s official iframe embed player and are subject to YouTube&apos;s
              terms and advertising policies. ClipScout does not circumvent, interfere with, or attempt to bypass any
              YouTube access controls, monetization systems, or API rate limits beyond standard API usage.
            </p>
            <p className="mt-3">
              YouTube API data retrieved through ClipScout is used solely to display search results and enable preview
              functionality within the Service. We do not store, index, or resell YouTube API data. Data retrieved from
              the YouTube API is held only transiently in server memory during active requests and is not persisted to
              any database.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">4. Third-Party Content and Platforms</h2>
            <p>
              The Service aggregates and displays video search results from the following third-party platforms:
            </p>
            <ul className="list-disc list-inside mt-3 space-y-2 text-sm">
              <li><strong className="text-gray-200">YouTube</strong> — subject to YouTube Terms of Service and Google Privacy Policy</li>
              <li><strong className="text-gray-200">Pexels</strong> — royalty-free stock footage subject to the Pexels License</li>
              <li><strong className="text-gray-200">Pixabay</strong> — royalty-free content subject to the Pixabay Content License</li>
            </ul>
            <p className="mt-3">
              ClipScout makes no representations or warranties regarding the accuracy, completeness, legality, or
              fitness for purpose of any third-party content. You are solely responsible for verifying the licensing
              terms of any footage before using it in your own productions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">5. Copyright and Intellectual Property</h2>
            <p>
              ClipScout is a <strong className="text-gray-200">discovery tool only</strong>. We do not grant any
              rights, licenses, or permissions to use, reproduce, distribute, or create derivative works from any
              third-party video content surfaced through the Service.
            </p>
            <p className="mt-3">
              All video content displayed through ClipScout remains the intellectual property of its respective owners.
              YouTube videos are subject to copyright held by their creators and/or YouTube. Pexels and Pixabay videos
              are licensed under their respective royalty-free licenses — you must review and comply with those
              individual licenses before incorporating any footage into your own work.
            </p>
            <p className="mt-3">
              ClipScout, its name, logo, software, and all associated content are the intellectual property of
              ClipScout. You may not copy, modify, distribute, or create derivative works based on our proprietary
              materials without express written permission.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">6. User Responsibilities</h2>
            <p>By using ClipScout, you agree that you will:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 text-sm">
              <li>Use the Service only for lawful purposes and in compliance with all applicable laws and regulations</li>
              <li>Verify the licensing terms of any footage before incorporating it into your projects</li>
              <li>Not use the Service to infringe upon the intellectual property rights of any third party</li>
              <li>Not attempt to download, scrape, cache, or otherwise extract video content from the Service or any third-party platforms accessed through the Service</li>
              <li>Not use the Service to circumvent, disable, or interfere with security-related features of any platform</li>
              <li>Not use the Service to violate YouTube&apos;s Terms of Service, Community Guidelines, or Developer Policies</li>
              <li>Not engage in any conduct that could damage, disable, overburden, or impair the Service or its underlying infrastructure</li>
              <li>Not use automated scripts, bots, or other automated means to access the Service beyond what is permitted</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">7. Prohibited Uses</h2>
            <p>You are expressly prohibited from:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 text-sm">
              <li>Downloading or attempting to download any video content surfaced through the Service</li>
              <li>Using the Service to build a competing product that accesses YouTube, Pexels, or Pixabay APIs in violation of their terms</li>
              <li>Reverse engineering, decompiling, or attempting to extract the source code of the Service</li>
              <li>Using the Service for any commercial purpose that violates these Terms</li>
              <li>Accessing the Service through unauthorized means, including bypassing authentication</li>
              <li>Using the Service to distribute malware, spam, or other harmful content</li>
              <li>Misrepresenting your identity or affiliation when using the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">8. User Accounts</h2>
            <p>
              To access certain features of the Service, you must create an account. You are responsible for
              maintaining the confidentiality of your account credentials and for all activity that occurs under your
              account. You agree to notify us immediately of any unauthorized use of your account.
            </p>
            <p className="mt-3">
              We reserve the right to suspend or terminate accounts that violate these Terms of Use or that we
              determine, in our sole discretion, are being used in a manner that is harmful to the Service, other
              users, or third-party platforms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">9. Copyright Disclaimer</h2>
            <p>
              ClipScout displays publicly available video content solely for the purpose of discovery and preview.
              This use is intended to be consistent with the principles of fair use and the explicit embedding
              permissions granted by content owners and platforms. However, ClipScout makes no warranty that any
              particular use of footage discovered through the Service will constitute fair use or otherwise be
              permissible under applicable copyright law.
            </p>
            <p className="mt-3">
              <strong className="text-gray-200">You are solely responsible</strong> for obtaining any necessary
              rights, licenses, or permissions before using any footage in your own productions. ClipScout expressly
              disclaims any liability arising from your use or misuse of third-party video content.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">10. Disclaimers and Limitation of Liability</h2>
            <p>
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND,
              EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
              PURPOSE, OR NON-INFRINGEMENT.
            </p>
            <p className="mt-3">
              ClipScout does not warrant that the Service will be uninterrupted, error-free, or free of harmful
              components. We do not warrant the accuracy, completeness, or usefulness of any information or content
              provided through the Service.
            </p>
            <p className="mt-3">
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, CLIPSCOUT SHALL NOT BE LIABLE FOR ANY INDIRECT,
              INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS,
              DATA, OR GOODWILL, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE SERVICE.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">11. Privacy</h2>
            <p>
              Your use of ClipScout is also governed by our{' '}
              <Link href="/privacy" className="text-indigo-400 hover:text-indigo-300">Privacy Policy</Link>, which
              is incorporated into these Terms of Use by reference. The Privacy Policy describes how we collect, use,
              and share information about you when you use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">12. Modifications to Terms</h2>
            <p>
              We reserve the right to modify these Terms of Use at any time. We will notify users of material changes
              by updating the &quot;Last updated&quot; date at the top of this page. Your continued use of the Service
              after any modifications constitutes your acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">13. Governing Law</h2>
            <p>
              These Terms of Use shall be governed by and construed in accordance with the laws of the United States,
              without regard to its conflict of law provisions. Any disputes arising under these Terms shall be subject
              to the exclusive jurisdiction of the courts located within the United States.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-100 mb-3">14. Contact</h2>
            <p>
              If you have any questions about these Terms of Use, please contact us at{' '}
              <a href="mailto:legal@clipscout.app" className="text-indigo-400 hover:text-indigo-300">
                legal@clipscout.app
              </a>.
            </p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 flex items-center gap-6 text-xs text-gray-600">
          <Link href="/" className="hover:text-gray-400 transition-colors">ClipScout</Link>
          <Link href="/privacy" className="hover:text-gray-400 transition-colors">Privacy Policy</Link>
        </div>
      </div>
    </div>
  )
}
