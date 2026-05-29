'use client'

import { useState } from 'react'
import type { VideoResult } from '@/lib/types'
import { trackEvent } from '@/lib/analytics'
import YouTubeDownloadWarningModal, {
  buildYtDownloaderUrl,
  shouldSkipYtWarning,
  setSkipYtWarning,
} from './YouTubeDownloadWarningModal'

type VideoSource = 'YouTube Protected' | 'YouTube Commons' | 'Pexels' | 'Pixabay' | 'Freepik'

function getVideoSource(video: VideoResult): VideoSource {
  if (video.platform === 'youtube') {
    return video.license === 'creative-commons' ? 'YouTube Commons' : 'YouTube Protected'
  }
  if (video.platform === 'pexels') return 'Pexels'
  if (video.platform === 'pixabay') return 'Pixabay'
  return 'Freepik'
}

interface Props {
  video: VideoResult
  /** 'icon' = compact square (used in VideoCard); 'pill' = labeled pill (used in VideoPreview footer) */
  variant?: 'icon' | 'pill'
}

const DOWNLOAD_ICON = (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
)

const DOWNLOAD_ICON_LG = (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
)

export default function DownloadButton({ video, variant = 'icon' }: Props) {
  const [showYtWarning, setShowYtWarning] = useState(false)

  // Direct MP4 downloads via our proxy are only legally + technically possible
  // for royalty-free stock libraries that expose CDN URLs. Freepik has mixed
  // licensing so we leave it out for now.
  const canDirectDownload =
    (video.platform === 'pexels' || video.platform === 'pixabay') && !!video.embedUrl
  const canYouTubeDownload = video.platform === 'youtube'
  const isCreativeCommons = video.license === 'creative-commons'

  if (!canDirectDownload && !canYouTubeDownload) return null

  const directDownloadHref = canDirectDownload
    ? `/api/download?url=${encodeURIComponent(video.embedUrl!)}&filename=${encodeURIComponent(
        `clipscout-${video.platform}-${video.id}.mp4`
      )}`
    : ''

  const trackDownloadClick = () => {
    trackEvent('Download Video Clicked', {
      'Video Source': getVideoSource(video),
    })
  }

  const trackModalShown = (dontShowAgain: boolean) => {
    trackEvent('Copyright Warning Modal Shown', {
      "Don't show modal again checkbox selected": dontShowAgain ? 'Y' : 'N',
    })
  }

  const openYtDownloader = () => {
    window.open(buildYtDownloaderUrl(video.sourceUrl), '_blank', 'noopener,noreferrer')
  }

  const handleYtDownloadClick = () => {
    trackDownloadClick()
    if (isCreativeCommons || shouldSkipYtWarning()) {
      openYtDownloader()
      return
    }
    setShowYtWarning(true)
  }

  const handleYtWarningContinue = (dontShowAgain: boolean) => {
    if (dontShowAgain) setSkipYtWarning(true)
    trackModalShown(dontShowAgain)
    openYtDownloader()
    setShowYtWarning(false)
  }

  const handleYtWarningCancel = (dontShowAgain: boolean) => {
    if (dontShowAgain) setSkipYtWarning(true)
    trackModalShown(dontShowAgain)
    setShowYtWarning(false)
  }

  const platformLabel = video.platform.charAt(0).toUpperCase() + video.platform.slice(1)
  const ytTitle = isCreativeCommons ? 'Download YouTube clip (Creative Commons)' : 'Download YouTube clip'
  const ytAria = isCreativeCommons
    ? 'Download Creative Commons YouTube clip'
    : 'Download YouTube clip — copyright warning will be shown'

  // ICON VARIANT (VideoCard)
  if (variant === 'icon') {
    return (
      <>
        {canDirectDownload && (
          <a
            href={directDownloadHref}
            onClick={trackDownloadClick}
            title={`Download ${platformLabel} clip`}
            aria-label={`Download ${platformLabel} clip`}
            className="shrink-0 text-[10px] font-medium bg-purple-600 hover:bg-purple-700 text-white border border-purple-700 rounded-md py-1 px-2 transition-colors duration-150 flex items-center justify-center"
          >
            {DOWNLOAD_ICON}
          </a>
        )}
        {canYouTubeDownload && (
          <button
            onClick={handleYtDownloadClick}
            title={ytTitle}
            aria-label={ytAria}
            className="shrink-0 text-[10px] font-medium bg-purple-600 hover:bg-purple-700 text-white border border-purple-700 rounded-md py-1 px-2 transition-colors duration-150 flex items-center justify-center"
          >
            {DOWNLOAD_ICON}
          </button>
        )}
        {showYtWarning && (
          <YouTubeDownloadWarningModal
            youtubeUrl={video.sourceUrl}
            videoTitle={video.title}
            onClose={handleYtWarningCancel}
            onContinue={handleYtWarningContinue}
          />
        )}
      </>
    )
  }

  // PILL VARIANT (VideoPreview)
  return (
    <>
      {canDirectDownload && (
        <a
          href={directDownloadHref}
          onClick={trackDownloadClick}
          className="inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors"
        >
          {DOWNLOAD_ICON_LG}
          Download clip
        </a>
      )}
      {canYouTubeDownload && (
        <button
          onClick={handleYtDownloadClick}
          className="inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors"
        >
          {DOWNLOAD_ICON_LG}
          Download clip
        </button>
      )}
      {showYtWarning && (
        <YouTubeDownloadWarningModal
          youtubeUrl={video.sourceUrl}
          videoTitle={video.title}
          onClose={handleYtWarningCancel}
          onContinue={handleYtWarningContinue}
        />
      )}
    </>
  )
}
