import { Resend }  from 'resend'
import { env }     from '../config/env.js'

const getResend = (): Resend => {
  if (!env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not set in .env')
  }
  return new Resend(env.RESEND_API_KEY)
}




export const sendOTPEmail = async (
  email: string,
  otp:   string
): Promise<void> => {



  if (env.NODE_ENV === 'development') {
    console.log('─────────────────────────────────')
    console.log(`📧 OTP for ${email}: ${otp}`)
    console.log('─────────────────────────────────')
    return
  };
  const resend = getResend()
  await resend.emails.send({
    from:    'Zippi <noreply@zippi.app>',
    to:      email,
    subject: 'Your Zippi login code',
    html: `
      <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:24px">
        <h2 style="color:#3B9EFF">Your login code 🚀</h2>
        <p style="color:#666;font-size:15px">Use this code to sign in to Zippi:</p>
        <div style="
          background:#F0F7FF;
          border:2px solid #3B9EFF;
          border-radius:16px;
          padding:20px;
          text-align:center;
          margin:20px 0;
        ">
          <span style="font-size:36px;font-weight:800;letter-spacing:8px;color:#1A2744">
            ${otp}
          </span>
        </div>
        <p style="color:#999;font-size:13px">
          This code expires in <strong>15 minutes</strong>.
          If you didn't request this, ignore this email.
        </p>
      </div>
    `,
  })
}