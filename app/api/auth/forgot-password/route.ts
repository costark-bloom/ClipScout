import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email) return NextResponse.json({ error: 'Email is required.' }, { status: 400 })

    const normalizedEmail = email.toLowerCase().trim()

    const { data: user } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', normalizedEmail)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'No account found with this email address.' }, { status: 404 })
    }

    // Generate a secure token valid for 1 hour
    const token = crypto.randomBytes(32).toString('hex')
    const expires_at = new Date(Date.now() + 60 * 60 * 1000).toISOString()

    // Invalidate any existing tokens for this email
    await supabase
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('email', normalizedEmail)
      .eq('used', false)

    await supabase.from('password_reset_tokens').insert({ email: normalizedEmail, token, expires_at })

    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`

    await resend.emails.send({
      from: 'ClipScout <noreply@clipscout.app>',
      to: normalizedEmail,
      subject: 'Reset your ClipScout password',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
          <img src="https://www.clipscout.app/icon.svg" alt="ClipScout" width="48" style="margin-bottom:16px;" />
          <h2 style="color:#1e1b4b;margin:0 0 8px;">Reset your password</h2>
          <p style="color:#6b7280;margin:0 0 24px;">Click the button below to set a new password. This link expires in 1 hour.</p>
          <a href="${resetUrl}" style="display:inline-block;background:#7c3aed;color:#fff;font-weight:600;padding:12px 24px;border-radius:10px;text-decoration:none;">Reset password</a>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[forgot-password]', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
