import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data } = await supabase
    .from('user_settings')
    .select('freepik_api_key')
    .eq('user_email', session.user.email)
    .single()

  return NextResponse.json({
    freepikApiKey: data?.freepik_api_key
      ? `${data.freepik_api_key.slice(0, 6)}${'•'.repeat(20)}`
      : null,
    hasFreepikKey: !!data?.freepik_api_key,
  })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { freepikApiKey } = await req.json()

  const { error } = await supabase.from('user_settings').upsert(
    {
      user_email: session.user.email,
      freepik_api_key: freepikApiKey || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_email' }
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
