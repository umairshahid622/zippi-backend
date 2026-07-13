import { Resend } from "resend";
import { env } from "../config/env.js";

const getResend = (): Resend => {
  if (!env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not set in .env");
  }
  return new Resend(env.RESEND_API_KEY);
};

export const sendOTPEmail = async (
  email: string,
  otp: string,
): Promise<void> => {
  if (env.NODE_ENV === "development") {
    console.log("─────────────────────────────────");
    console.log(`📧 OTP for ${email}: ${otp}`);
    console.log("─────────────────────────────────");
    return;
  }
  const resend = getResend();
  await resend.emails.send({
    from: "Zippi <noreply@zippi.app>",
    to: email,
    subject: "Your Zippi login code",
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
  });
};

// Add this function to your existing email.ts

export const sendWorkspaceInviteEmail = async (
  email: string,
  workspaceName: string,
  token: string,
): Promise<void> => {
  const inviteUrl = `${process.env.CLIENT_URL}/invite?token=${token}`;

  if (process.env.NODE_ENV === "development") {
    console.log("─────────────────────────────────");
    console.log(`📧 Workspace invite for ${email}`);
    console.log(`🔗 ${inviteUrl}`);
    console.log("─────────────────────────────────");
    return;
  }

  const resend = getResend();

  await resend.emails.send({
    from: "Floq <noreply@floq.app>",
    to: email,
    subject: `You've been invited to join ${workspaceName} on Floq`,
    html: `
      <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:24px">
        <h2 style="color:#3B9EFF">You're invited! 🎉</h2>
        <p style="color:#666;font-size:15px">
          You've been invited to join <strong>${workspaceName}</strong> on Floq.
        </p>
        <a href="${inviteUrl}" style="
          display:inline-block;
          background:linear-gradient(135deg,#3B9EFF,#00D4E8);
          color:#fff;
          padding:12px 24px;
          border-radius:100px;
          text-decoration:none;
          font-weight:700;
          margin:16px 0;
        ">
          Join workspace →
        </a>
        <p style="color:#999;font-size:13px">This invite expires in 7 days.</p>
      </div>
    `,
  });
};
