import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-gray-800/60 bg-gray-950 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <p className="text-xs text-gray-300">
          © {new Date().getFullYear()} ClipScout. All rights reserved.
        </p>
        <div className="flex items-center gap-5 text-xs text-gray-300">
          <Link href="/terms" className="hover:text-white transition-colors">
            Terms of Use
          </Link>
          <Link href="/privacy" className="hover:text-white transition-colors">
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  )
}
