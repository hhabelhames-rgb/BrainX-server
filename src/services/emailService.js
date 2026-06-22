const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async ({ to, subject, html }) => {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not set. Email skipped.');
    return;
  }

  await resend.emails.send({
    from: process.env.EMAIL_FROM || 'BrainX <onboarding@resend.dev>',
    to,
    subject,
    html,
  });
};

const emailVerificationTemplate = (name, token) => {
  const url = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
  return {
    subject: '✅ Verify your BrainX account',
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 16px;">
        <h1 style="color: #6366f1; font-size: 28px; margin-bottom: 8px;">🧠 BrainX</h1>
        <h2 style="color: #f1f5f9;">Welcome, ${name}!</h2>
        <p style="color: #94a3b8; line-height: 1.6;">
          You're just one click away from joining the world's best skill-exchange community.
          Please verify your email address to activate your account.
        </p>
        <a href="${url}" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 24px 0;">
          Verify Email Address
        </a>
        <p style="color: #64748b; font-size: 14px;">This link expires in 24 hours.</p>
        <p style="color: #64748b; font-size: 12px;">If you didn't create a BrainX account, please ignore this email.</p>
      </div>
    `,
  };
};

const passwordResetTemplate = (name, token) => {
  const url = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
  return {
    subject: '🔒 Reset your BrainX password',
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 16px;">
        <h1 style="color: #6366f1; font-size: 28px; margin-bottom: 8px;">🧠 BrainX</h1>
        <h2 style="color: #f1f5f9;">Password Reset</h2>
        <p style="color: #94a3b8; line-height: 1.6;">Hi ${name}, we received a request to reset your password.</p>
        <a href="${url}" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 24px 0;">
          Reset Password
        </a>
        <p style="color: #64748b; font-size: 14px;">This link expires in 1 hour.</p>
        <p style="color: #64748b; font-size: 12px;">If you didn't request a password reset, please ignore this email.</p>
      </div>
    `,
  };
};

const sessionConfirmationTemplate = (name, session, otherUser) => {
  return {
    subject: '📅 Session Confirmed — BrainX',
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 16px;">
        <h1 style="color: #6366f1; font-size: 28px; margin-bottom: 8px;">🧠 BrainX</h1>
        <h2 style="color: #f1f5f9;">Session Confirmed!</h2>
        <p style="color: #94a3b8;">Hi ${name}, your session has been confirmed.</p>
        <div style="background: #1e293b; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <p><strong>Skill:</strong> ${session.skill}</p>
          <p><strong>With:</strong> ${otherUser.fullName}</p>
          <p><strong>Date:</strong> ${new Date(session.date).toLocaleString()}</p>
          <p><strong>Duration:</strong> ${session.duration} minutes</p>
          ${session.meetingLink ? `<p><strong>Meeting Link:</strong> <a href="${session.meetingLink}" style="color: #6366f1;">${session.meetingLink}</a></p>` : ''}
        </div>
      </div>
    `,
  };
};

module.exports = { sendEmail, emailVerificationTemplate, passwordResetTemplate, sessionConfirmationTemplate };
