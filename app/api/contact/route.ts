import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(req: NextRequest) {
  try {
    const { name, email, category, message } = await req.json()

    if (!message || typeof message !== 'string' || message.trim().length < 5) {
      return NextResponse.json({ error: 'Message is required.' }, { status: 400 })
    }

    const gmailUser = process.env.GMAIL_USER
    const gmailPassword = process.env.GMAIL_APP_PASSWORD

    if (!gmailUser || !gmailPassword) {
      console.error('[contact] GMAIL_USER or GMAIL_APP_PASSWORD not configured')
      return NextResponse.json({ error: 'Email service not configured.' }, { status: 500 })
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: gmailPassword },
    })

    const subject = `[ClipScout] ${category || 'Feedback'} from ${name || 'Anonymous'}`

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        <div style="background: #4f46e5; padding: 20px 24px;">
          <p style="margin: 0; color: #c7d2fe; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;">ClipScout</p>
          <h1 style="margin: 4px 0 0; color: #fff; font-size: 18px; font-weight: 700;">New ${category || 'Message'}</h1>
        </div>
        <div style="padding: 24px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="padding: 6px 0; color: #6b7280; width: 90px; vertical-align: top;">From</td>
              <td style="padding: 6px 0; color: #111827; font-weight: 600;">${name || 'Anonymous'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6b7280; vertical-align: top;">Email</td>
              <td style="padding: 6px 0; color: #111827;">${email ? `<a href="mailto:${email}" style="color: #4f46e5;">${email}</a>` : '—'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6b7280; vertical-align: top;">Category</td>
              <td style="padding: 6px 0; color: #111827;">${category || 'General'}</td>
            </tr>
          </table>
          <div style="margin-top: 16px; padding: 16px; background: #f9fafb; border-radius: 8px; border-left: 3px solid #4f46e5;">
            <p style="margin: 0 0 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #6b7280; letter-spacing: 0.05em;">Message</p>
            <p style="margin: 0; font-size: 14px; color: #111827; line-height: 1.6; white-space: pre-wrap;">${message.trim()}</p>
          </div>
          <p style="margin: 20px 0 0; font-size: 11px; color: #9ca3af;">Sent from clipscout.app · ${new Date().toUTCString()}</p>
        </div>
      </div>
    `

    await transporter.sendMail({
      from: `"ClipScout" <${gmailUser}>`,
      to: 'cole.stark9@gmail.com',
      replyTo: email || undefined,
      subject,
      html,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[contact] Failed to send email:', err)
    return NextResponse.json({ error: 'Failed to send message. Please try again.' }, { status: 500 })
  }
}
