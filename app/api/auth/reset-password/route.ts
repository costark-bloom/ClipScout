import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json()
    if (!token || !password) return NextResponse.json({ error: 'Token and password are required.' }, { status: 400 })
    if (password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 })

    const { data: resetToken } = await supabase
      .from('password_reset_tokens')
      .select('email, expires_at, used')
      .eq('token', token)
      .single()

    if (!resetToken) return NextResponse.json({ error: 'Invalid or expired reset link.' }, { status: 400 })
    if (resetToken.used) return NextResponse.json({ error: 'This reset link has already been used.' }, { status: 400 })
    if (new Date(resetToken.expires_at) < new Date()) return NextResponse.json({ error: 'This reset link has expired. Please request a new one.' }, { status: 400 })

    const password_hash = await bcrypt.hash(password, 12)

    await supabase.from('users').update({ password_hash }).eq('email', resetToken.email)
    await supabase.from('password_reset_tokens').update({ used: true }).eq('token', token)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[reset-password]', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
