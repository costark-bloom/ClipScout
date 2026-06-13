import { ValueScreenIcon } from '@/lib/onboarding-config'

interface Props {
  icon: ValueScreenIcon
}

/**
 * Decorative hero icon for value screens. Renders inside a soft circular
 * gradient backdrop sized for a centered, attention-grabbing layout.
 */
export default function ValueIcon({ icon }: Props) {
  return (
    <div className="w-28 h-28 mx-auto rounded-full bg-gradient-to-br from-indigo-100 to-purple-200 border border-purple-200 flex items-center justify-center shadow-inner">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-300/60">
        {renderInner(icon)}
      </div>
    </div>
  )
}

function renderInner(icon: ValueScreenIcon) {
  const common = 'w-9 h-9 text-white'
  switch (icon) {
    case 'search':
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 9.5 10 8l.5 1.5L12 10l-1.5.5L10 12l-.5-1.5L8 10l1.5-.5Z" />
        </svg>
      )
    case 'layers':
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0 4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0-5.571 3-5.571-3" />
        </svg>
      )
    case 'shield':
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 5.25-5.25 9.75-9 9.75S3 17.25 3 12V5.25l9-3 9 3V12Z" />
        </svg>
      )
    case 'clock':
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      )
  }
}
