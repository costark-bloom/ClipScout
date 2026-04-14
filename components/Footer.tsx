import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-purple-200 bg-white/20 backdrop-blur-sm px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <p className="text-xs text-purple-700">
          © {new Date().getFullYear()} ClipScout. All rights reserved.
        </p>
        <div className="flex items-center gap-5 text-xs text-purple-700">
          <Link href="/terms" className="hover:text-purple-950 transition-colors">
            Terms of Use
          </Link>
          <Link href="/privacy" className="hover:text-purple-950 transition-colors">
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  )
}
