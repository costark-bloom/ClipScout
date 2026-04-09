'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { VideoResult } from '@/lib/types'
import VideoPreview from './VideoPreview'

interface VideoCardProps {
  video: VideoResult
}

const PLATFORM_CONFIG = {
  youtube: {
    label: 'YouTube',
    color: 'bg-red-600',
    textColor: 'text-red-400',
    borderColor: 'border-red-800/50',
  },
  pexels: {
    label: 'Pexels',
    color: 'bg-green-600',
    textColor: 'text-green-400',
    borderColor: 'border-green-800/50',
  },
  pixabay: {
    label: 'Pixabay',
    color: 'bg-blue-600',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-800/50',
  },
}

export default function VideoCard({ video }: VideoCardProps) {
  const [showPreview, setShowPreview] = useState(false)
  const [imgError, setImgError] = useState(false)

  const config = PLATFORM_CONFIG[video.platform]

  return (
    <>
      <div className="shrink-0 w-52 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-all duration-200 group flex flex-col">
        {/* Thumbnail — clicking anywhere on it opens preview */}
        <button
          onClick={() => setShowPreview(true)}
          className="relative aspect-video bg-gray-800 overflow-hidden w-full block focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          aria-label={`Preview ${video.title}`}
        >
          {!imgError && video.thumbnailUrl ? (
            <Image
              src={video.thumbnailUrl}
              alt={video.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              onError={() => setImgError(true)}
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-700">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
          )}

          {/* Platform badge */}
          <span
            className={`absolute top-1.5 left-1.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${config.color} text-white`}
          >
            {config.label}
          </span>

          {/* Duration badge */}
          {video.duration && (
            <span className="absolute bottom-1.5 right-1.5 text-[10px] bg-black/70 text-white px-1.5 py-0.5 rounded font-mono">
              {video.duration}
            </span>
          )}

          {/* Play overlay — always visible, pulses on hover */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors duration-200">
            <div className="w-10 h-10 rounded-full bg-black/50 group-hover:bg-black/70 backdrop-blur-sm flex items-center justify-center transition-all duration-200 group-hover:scale-110">
              <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </button>

        {/* Info */}
        <div className="p-2.5 flex flex-col gap-1.5 flex-1">
          <p className="text-xs font-medium text-gray-200 line-clamp-2 leading-relaxed">
            {video.title}
          </p>
          {video.channelOrAuthor && (
            <p className={`text-[10px] truncate ${config.textColor}`}>{video.channelOrAuthor}</p>
          )}

          {/* Transcript-based relevance info */}
          {video.transcriptReason && (
            <div className="bg-indigo-950/40 border border-indigo-900/40 rounded-md px-2 py-1.5 space-y-1">
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-400">Transcript match</span>
                {video.relevanceScore !== undefined && (
                  <span className={`text-[9px] font-bold ml-auto ${
                    video.relevanceScore >= 0.7 ? 'text-green-400' :
                    video.relevanceScore >= 0.4 ? 'text-yellow-400' : 'text-gray-500'
                  }`}>
                    {Math.round(video.relevanceScore * 100)}%
                  </span>
                )}
              </div>
              <p className="text-[10px] text-gray-400 leading-relaxed line-clamp-2">
                {video.transcriptReason}
              </p>
              {video.transcriptSnippet && (
                <p className="text-[9px] text-indigo-400/80 italic line-clamp-1">
                  &ldquo;{video.transcriptSnippet}&rdquo;
                </p>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-1.5 mt-auto pt-1">
            <button
              onClick={() => setShowPreview(true)}
              className="flex-1 text-[10px] font-medium bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 rounded-md py-1 px-2 transition-colors duration-150 flex items-center justify-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
              </svg>
              Preview
            </button>
            <a
              href={video.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-[10px] font-medium bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 rounded-md py-1 px-2 transition-colors duration-150 flex items-center justify-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              Source
            </a>
          </div>
        </div>
      </div>

      {showPreview && <VideoPreview video={video} onClose={() => setShowPreview(false)} />}
    </>
  )
}
