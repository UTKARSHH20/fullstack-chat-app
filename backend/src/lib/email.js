/**
 * email.js — Nodemailer email service (Feat #575: Password Recovery)
 *
 * Provides a reusable `sendEmail` helper that sends transactional emails
 * using a configurable SMTP transport (Gmail, SendGrid, Mailgun, etc.).
 *
 * Environment variables required:
 *   EMAIL_HOST     - SMTP host (e.g. "smtp.gmail.com")
 *   EMAIL_PORT     - SMTP port (e.g. 587 for TLS, 465 for SSL)
 *   EMAIL_USER     - SMTP username / sender email address
 *   EMAIL_PASSWORD - SMTP password / app password
 *   EMAIL_FROM     - "From" display name + address (e.g. "App Name <no-reply@example.com>")
 */

import nodemailer from "nodemailer";

/**
 * Creates a Nodemailer transport using SMTP environment config.
 * Falls back to Ethereal (fake SMTP) when EMAIL_HOST is not set,
 * so development works out-of-the-box without a real email account.
 */
const createTransport = async () => {
    if (!process.env.EMAIL_HOST) {
        // Ethereal fake SMTP for local development — emails are captured at ethereal.email
        const testAccount = await nodemailer.createTestAccount();
        console.log("[Email] Using Ethereal test account:", testAccount.user);

        return nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });
    }

    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || "587"),
        secure: parseInt(process.env.EMAIL_PORT || "587") === 465,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
        },
    });
};

/**
 * Sends a transactional email.
 * @param {Object} options
 * @param {string} options.to      - Recipient email address
 * @param {string} options.subject - Email subject line
 * @param {string} options.html    - HTML email body
 * @param {string} [options.text]  - Plain-text fallback (auto-generated if omitted)
 * @returns {Promise<void>}
 */
export const sendEmail = async ({ to, subject, html, text }) => {
    const transport = await createTransport();

    const info = await transport.sendMail({
        from: process.env.EMAIL_FROM || `"Chat App" <no-reply@chatapp.com>`,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ""),
    });

    if (!process.env.EMAIL_HOST) {
        // Log the Ethereal preview URL in development
        console.log("[Email] Preview URL:", nodemailer.getTestMessageUrl(info));
    }
};

/**
 * Sends a password reset email containing a one-time reset link.
 * @param {string} toEmail    - Recipient's email address
 * @param {string} resetToken - The raw (unhashed) reset token
 * @param {string} userName   - Recipient's display name (for personalisation)
 * @returns {Promise<void>}
 */
export const sendPasswordResetEmail = async (toEmail, resetToken, userName) => {
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const resetUrl = `${clientUrl}/reset-password/${resetToken}`;

    const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Reset Your Password</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                       background: #f9fafb; margin: 0; padding: 0; }
                .container { max-width: 520px; margin: 40px auto; background: #fff;
                             border-radius: 12px; overflow: hidden;
                             box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
                .header { background: linear-gradient(135deg, #6366f1, #8b5cf6);
                          padding: 32px; text-align: center; }
                .header h1 { color: #fff; margin: 0; font-size: 24px; font-weight: 700; }
                .body { padding: 32px; color: #374151; }
                .body p { line-height: 1.6; margin: 0 0 16px; }
                .btn { display: inline-block; padding: 14px 32px;
                       background: linear-gradient(135deg, #6366f1, #8b5cf6);
                       color: #fff !important; text-decoration: none;
                       border-radius: 8px; font-weight: 600; font-size: 15px;
                       margin: 8px 0 24px; }
                .warning { background: #fef3c7; border-left: 4px solid #f59e0b;
                           padding: 12px 16px; border-radius: 4px; font-size: 13px;
                           color: #92400e; margin-top: 16px; }
                .footer { background: #f3f4f6; padding: 20px 32px;
                          font-size: 12px; color: #9ca3af; text-align: center; }
                .url-fallback { font-size: 12px; color: #9ca3af; word-break: break-all; margin-top: 8px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔐 Reset Your Password</h1>
                </div>
                <div class="body">
                    <p>Hi <strong>${userName}</strong>,</p>
                    <p>We received a request to reset the password for your Chat App account. 
                       Click the button below to choose a new password:</p>
                    <div style="text-align: center; margin: 28px 0;">
                        <a href="${resetUrl}" class="btn">Reset My Password</a>
                    </div>
                    <p class="url-fallback">Or copy this link into your browser:<br/>${resetUrl}</p>
                    <div class="warning">
                        ⚠️ This link expires in <strong>1 hour</strong>. If you didn't request a 
                        password reset, you can safely ignore this email — your password won't change.
                    </div>
                </div>
                <div class="footer">
                    Chat App · This is an automated message, please do not reply.
                </div>
            </div>
        </body>
        </html>
    `;

    await sendEmail({
        to: toEmail,
        subject: "Reset your Chat App password",
        html,
    });
};
