import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('saved_scripts')
    .select('id, title, segment_count, created_at')
    .eq('user_email', session.user.email)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ scripts: data })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { title, content, segment_count } = await req.json()
  if (!content) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('saved_scripts')
    .insert({
      user_email: session.user.email,
      title: title || 'Untitled script',
      content,
      segment_count: segment_count ?? 0,
    })
    .select('id, title, segment_count, created_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ script: data })
}
