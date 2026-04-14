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
    .select('freepik_api_key, subscription_plan, subscription_interval, subscription_status, subscription_period_end, credits_remaining, credits_used')
    .eq('user_email', session.user.email)
    .single()

  return NextResponse.json({
    freepikApiKey: data?.freepik_api_key
      ? `${data.freepik_api_key.slice(0, 6)}${'•'.repeat(20)}`
      : null,
    hasFreepikKey: !!data?.freepik_api_key,
    subscription_plan: data?.subscription_plan ?? null,
    subscription_interval: data?.subscription_interval ?? null,
    subscription_status: data?.subscription_status ?? null,
    subscription_period_end: data?.subscription_period_end ?? null,
    credits_remaining: data?.credits_remaining ?? 3,
    credits_used: data?.credits_used ?? 0,
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
