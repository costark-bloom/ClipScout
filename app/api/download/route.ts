import { NextRequest, NextResponse } from 'next/server'

// Allow only Pexels & Pixabay CDN hosts. Stops anyone from using this endpoint
// as an open URL proxy (SSRF protection).
function isAllowedHost(hostname: string): boolean {
  const h = hostname.toLowerCase()
  return (
    h === 'pexels.com' ||
    h.endsWith('.pexels.com') ||
    h === 'pixabay.com' ||
    h.endsWith('.pixabay.com')
  )
}

// Strip anything that could break the Content-Disposition header, then cap length.
function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_')
  const trimmed = cleaned.slice(0, 80) || 'clipscout-video'
  return trimmed.endsWith('.mp4') ? trimmed : `${trimmed}.mp4`
}

export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get('url')
  const rawFilename = req.nextUrl.searchParams.get('filename') ?? 'clipscout-video.mp4'

  if (!rawUrl) {
    return NextResponse.json({ error: 'missing url' }, { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return NextResponse.json({ error: 'invalid url' }, { status: 400 })
  }

  if (parsed.protocol !== 'https:' || !isAllowedHost(parsed.hostname)) {
    return NextResponse.json({ error: 'host not allowed' }, { status: 403 })
  }

  const filename = sanitizeFilename(rawFilename)

  let upstream: Response
  try {
    upstream = await fetch(parsed.toString())
  } catch (err) {
    console.error('[download] upstream fetch failed', err)
    return NextResponse.json({ error: 'upstream fetch failed' }, { status: 502 })
  }

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: `upstream returned ${upstream.status}` },
      { status: 502 }
    )
  }

  const headers = new Headers({
    'Content-Type': upstream.headers.get('content-type') ?? 'video/mp4',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'no-store',
  })
  const len = upstream.headers.get('content-length')
  if (len) headers.set('Content-Length', len)

  return new NextResponse(upstream.body, { status: 200, headers })
}
