import { env } from '../../config/env.js';

export interface EmailLayoutOptions {
  preheader?: string;
  title: string;
  contentHtml: string;
  cta?: {
    text: string;
    url: string;
  };
  footerHtml?: string;
  brandName?: string;
  supportEmail?: string;
}

/**
 * Asserts that no leftover [TODO_REPLACE] placeholders exist in email content.
 * Guarantees zero placeholder leaks in production builds and test runs.
 */
export function assertNoTodoMarkers(content: string): void {
  const marker = '[TODO_REPLACE';
  if (content.includes(marker)) {
    throw new Error(
      `Email template assertion failed: found leftover placeholder "${marker}" in content.`,
    );
  }
}

/**
 * Shared Table-Based Responsive Email Layout
 * - Maximum email client compatibility (Outlook, Gmail, iOS Mail, Yahoo)
 * - Flat design: White (#FFFFFF), Dark Blue (#0A192F), Orange (#E05305)
 * - No gradients, no drop shadows
 * - Text wordmark header (zero external image dependencies)
 * - Readable with images blocked and in dark mode
 * - Buttons >= 44px tall
 * - Orange used ONLY as fill (dark blue #0A192F text on orange #E05305), NEVER small text on white
 * - Dynamic brand name, support email, and links from config / APP_URL
 */
export function buildEmailHtml(options: EmailLayoutOptions): string {
  const brandName = options.brandName || 'Hydraulic Engineering Academy';
  const supportEmail = options.supportEmail || 'support@hydrauliccourse.com';
  const year = new Date().getFullYear();

  const ctaButtonHtml = options.cta
    ? `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
        <tr>
          <td align="left">
            <a href="${options.cta.url}" target="_blank" style="display: inline-block; min-height: 44px; line-height: 44px; padding: 0 28px; background-color: #E05305; color: #0A192F; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 800; text-decoration: none; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #0A192F;">
              ${options.cta.text}
            </a>
          </td>
        </tr>
      </table>
    `
    : '';

  const preheaderHtml = options.preheader
    ? `<div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; color: #ffffff;">${options.preheader}</div>`
    : '';

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>${options.title}</title>
  <style type="text/css">
    body { margin: 0; padding: 0; min-width: 100%; width: 100% !important; background-color: #f1f5f9; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table { border-spacing: 0; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    td { padding: 0; }
    img { border: 0; -ms-interpolation-mode: bicubic; }
    a { color: #0A192F; text-decoration: underline; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .mobile-p-20 { padding: 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0A192F;">
  ${preheaderHtml}
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table role="presentation" class="email-container" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; width: 100%; background-color: #ffffff; border: 2px solid #0A192F; text-align: left;">
          
          <!-- Brand Header (Flat Dark Blue with Text Wordmark) -->
          <tr>
            <td style="background-color: #0A192F; padding: 20px 28px; border-bottom: 3px solid #E05305;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <span style="color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 17px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase;">
                      ${brandName}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Area -->
          <tr>
            <td class="mobile-p-20" style="padding: 32px 28px; background-color: #ffffff;">
              <h1 style="margin: 0 0 18px 0; font-size: 20px; font-weight: 900; line-height: 1.3; color: #0A192F; letter-spacing: -0.3px;">
                ${options.title}
              </h1>

              <div style="font-size: 15px; line-height: 1.6; color: #0A192F;">
                ${options.contentHtml}
              </div>

              ${ctaButtonHtml}

              ${options.footerHtml ? `<div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #E2E8F0; font-size: 13px; color: #64748B; line-height: 1.5;">${options.footerHtml}</div>` : ''}
            </td>
          </tr>

          <!-- Footer Area -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 20px 28px; border-top: 1px solid #0A192F; font-size: 12px; line-height: 1.5; color: #64748B;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <p style="margin: 0 0 6px 0; font-weight: 700; color: #0A192F;">
                      ${brandName}
                    </p>
                    <p style="margin: 0 0 6px 0;">
                      Questions or billing support? Reply directly to this email or contact <a href="mailto:${supportEmail}" style="color: #0A192F; font-weight: 700; text-decoration: underline;">${supportEmail}</a>
                    </p>
                    <p style="margin: 0; color: #94A3B8;">
                      &copy; ${year} ${brandName}. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  assertNoTodoMarkers(html);
  return html;
}

// ---------------------------------------------------------------------------
// 1. Email Verification Template
// ---------------------------------------------------------------------------
export function getEmailVerificationTemplate(data: {
  name: string;
  token: string;
  brandName?: string;
  supportEmail?: string;
}): { subject: string; html: string; text: string } {
  const brandName = data.brandName || 'Hydraulic Engineering Academy';
  const verifyUrl = `${env.APP_URL}/verify-email?token=${data.token}`;
  const subject = `Verify your email address - ${brandName}`;

  const text = `Hello ${data.name},

Thank you for registering at ${brandName}.

Please verify your email address to activate your account and access your courses by clicking the link below:
${verifyUrl}

This verification link will expire in 24 hours.

If you did not create an account, you can safely ignore this email.

Best regards,
${brandName} Team
Support: ${data.supportEmail || 'support@hydrauliccourse.com'}`;

  const contentHtml = `
    <p style="margin: 0 0 14px 0;">Hello <strong>${data.name}</strong>,</p>
    <p style="margin: 0 0 14px 0;">Thank you for registering at <strong>${brandName}</strong>.</p>
    <p style="margin: 0 0 14px 0;">Please verify your email address to activate your account and proceed with secure course access:</p>
  `;

  const footerHtml = `
    <p style="margin: 0 0 6px 0;">This verification link expires in <strong>24 hours</strong>.</p>
    <p style="margin: 0;">If button clicking does not work, copy and paste this URL into your browser:<br /><span style="font-family: monospace; word-break: break-all; color: #0A192F;">${verifyUrl}</span></p>
  `;

  const html = buildEmailHtml({
    brandName,
    supportEmail: data.supportEmail,
    preheader: 'Verify your email address to activate your course account.',
    title: 'Verify Your Email Address',
    contentHtml,
    cta: { text: 'Verify Email Address', url: verifyUrl },
    footerHtml,
  });

  assertNoTodoMarkers(text);
  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// 2. Password Reset Template
// ---------------------------------------------------------------------------
export function getPasswordResetTemplate(data: {
  name: string;
  token: string;
  brandName?: string;
  supportEmail?: string;
}): { subject: string; html: string; text: string } {
  const brandName = data.brandName || 'Hydraulic Engineering Academy';
  const resetUrl = `${env.APP_URL}/reset-password?token=${data.token}`;
  const subject = `Password Reset Request - ${brandName}`;

  const text = `Hello ${data.name},

We received a request to reset the password for your ${brandName} account.

Click the link below to choose a new password:
${resetUrl}

This link expires in 30 minutes.

If you did not request this password reset, please ignore this email. Your password will remain unchanged and your account is secure.

Best regards,
${brandName} Team
Support: ${data.supportEmail || 'support@hydrauliccourse.com'}`;

  const contentHtml = `
    <p style="margin: 0 0 14px 0;">Hello <strong>${data.name}</strong>,</p>
    <p style="margin: 0 0 14px 0;">We received a request to reset the password for your account at <strong>${brandName}</strong>.</p>
    <p style="margin: 0 0 14px 0;">Click the button below to set a new password:</p>
  `;

  const footerHtml = `
    <p style="margin: 0 0 6px 0;">This password reset link expires in <strong>30 minutes</strong>.</p>
    <p style="margin: 0 0 6px 0;">If you did not request this, you can safely ignore this email. Your current password remains secure.</p>
    <p style="margin: 0;">Direct URL: <span style="font-family: monospace; word-break: break-all; color: #0A192F;">${resetUrl}</span></p>
  `;

  const html = buildEmailHtml({
    brandName,
    supportEmail: data.supportEmail,
    preheader: 'Reset your account password.',
    title: 'Reset Your Password',
    contentHtml,
    cta: { text: 'Reset Password', url: resetUrl },
    footerHtml,
  });

  assertNoTodoMarkers(text);
  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// 3. Password Changed Notice (Security) Template
// ---------------------------------------------------------------------------
export function getPasswordChangedTemplate(data: {
  name: string;
  changedAt?: Date;
  brandName?: string;
  supportEmail?: string;
}): { subject: string; html: string; text: string } {
  const brandName = data.brandName || 'Hydraulic Engineering Academy';
  const supportEmail = data.supportEmail || 'support@hydrauliccourse.com';
  const formattedDate = (data.changedAt || new Date()).toUTCString();
  const loginUrl = `${env.APP_URL}/login`;
  const subject = `Security Notice: Your password was changed - ${brandName}`;

  const text = `Hello ${data.name},

This is an automated security notice to confirm that the password for your ${brandName} account was successfully changed on ${formattedDate}.

If you made this change, no further action is required.

IMPORTANT: If you did NOT change your password, your account may be compromised. Please reset your password immediately at ${env.APP_URL}/forgot-password and contact our support team at ${supportEmail}.

Best regards,
${brandName} Security Team`;

  const contentHtml = `
    <p style="margin: 0 0 14px 0;">Hello <strong>${data.name}</strong>,</p>
    <p style="margin: 0 0 14px 0;">This is an automated security confirmation that the password for your <strong>${brandName}</strong> account was updated successfully on <strong>${formattedDate}</strong>.</p>
    <p style="margin: 0 0 14px 0;">If you performed this change, you can log in below with your new password.</p>
  `;

  const footerHtml = `
    <p style="margin: 0; color: #DC2626; font-weight: 700;">
      Did not make this change? If you suspect unauthorized access, contact us immediately at <a href="mailto:${supportEmail}" style="color: #DC2626; text-decoration: underline;">${supportEmail}</a>.
    </p>
  `;

  const html = buildEmailHtml({
    brandName,
    supportEmail,
    preheader: 'Security Notice: Your account password was changed.',
    title: 'Password Successfully Changed',
    contentHtml,
    cta: { text: 'Log In To Account', url: loginUrl },
    footerHtml,
  });

  assertNoTodoMarkers(text);
  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// 4. Purchase Receipt & Invoice Template
// ---------------------------------------------------------------------------
export function getOrderReceiptTemplate(data: {
  name: string;
  courseTitle: string;
  invoiceNumber: string;
  amountPaise: number;
  orderId: string;
  expiresAt?: Date | null;
  brandName?: string;
  supportEmail?: string;
}): { subject: string; html: string; text: string } {
  const brandName = data.brandName || 'Hydraulic Engineering Academy';
  const amountRupees = (data.amountPaise / 100).toFixed(2);
  const myCoursesUrl = `${env.APP_URL}/account`;
  const invoiceDownloadUrl = `${env.APP_URL}/api/v1/orders/${data.orderId}/invoice`;
  const expiryText = data.expiresAt
    ? `Access Valid Until: ${data.expiresAt.toLocaleDateString('en-IN')}`
    : 'Access Validity: Lifetime Access';

  const subject = `Payment Receipt & Invoice: ${data.invoiceNumber} - ${data.courseTitle}`;

  const text = `Hello ${data.name},

Thank you for enrolling in "${data.courseTitle}". Your payment has been received and confirmed.

Payment Details:
- Course: ${data.courseTitle}
- Total Paid: ₹${amountRupees}
- Tax Invoice Number: ${data.invoiceNumber}
- Order ID: ${data.orderId}
- ${expiryText}

You can access your course materials now at:
${myCoursesUrl}

Download your official PDF Tax Invoice here:
${invoiceDownloadUrl}

Happy Learning,
${brandName} Team
Support: ${data.supportEmail || 'support@hydrauliccourse.com'}`;

  const contentHtml = `
    <p style="margin: 0 0 14px 0;">Hello <strong>${data.name}</strong>,</p>
    <p style="margin: 0 0 16px 0;">Thank you for enrolling in <strong>${data.courseTitle}</strong>. Your payment was processed successfully.</p>

    <!-- Order Summary Table -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0; border: 1px solid #0A192F; background-color: #F8FAFC;">
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0; font-size: 13px; font-weight: 700; color: #64748B;">Course</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0; font-size: 14px; font-weight: 800; color: #0A192F;" align="right">${data.courseTitle}</td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0; font-size: 13px; font-weight: 700; color: #64748B;">Invoice Number</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0; font-size: 13px; font-family: monospace; font-weight: 700; color: #0A192F;" align="right">${data.invoiceNumber}</td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0; font-size: 13px; font-weight: 700; color: #64748B;">Validity</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0; font-size: 13px; font-weight: 700; color: #0A192F;" align="right">${expiryText}</td>
      </tr>
      <tr>
        <td style="padding: 14px 16px; font-size: 14px; font-weight: 800; color: #0A192F;">Total Amount Paid</td>
        <td style="padding: 14px 16px; font-size: 16px; font-weight: 900; color: #0A192F;" align="right">₹${amountRupees}</td>
      </tr>
    </table>

    <p style="margin: 16px 0 6px 0;">
      <strong>Official Invoice:</strong> You can download your official GST Tax Invoice PDF anytime from your account dashboard or directly via:
      <br />
      <a href="${invoiceDownloadUrl}" style="color: #0A192F; font-weight: 800; text-decoration: underline;">Download Official Tax Invoice (PDF)</a>
    </p>
  `;

  const footerHtml = `
    <p style="margin: 0;">You can stream lessons on any authorized browser. If you have any questions or need corporate billing support, reply directly to this email.</p>
  `;

  const html = buildEmailHtml({
    brandName,
    supportEmail: data.supportEmail,
    preheader: `Payment confirmed for ${data.courseTitle}. Tax Invoice #${data.invoiceNumber}`,
    title: 'Payment Confirmed & Course Activated',
    contentHtml,
    cta: { text: 'Open My Courses', url: myCoursesUrl },
    footerHtml,
  });

  assertNoTodoMarkers(text);
  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// 5. Refund Confirmation Template
// ---------------------------------------------------------------------------
export function getRefundConfirmationTemplate(data: {
  name: string;
  courseTitle: string;
  orderId: string;
  amountPaise: number;
  reason?: string;
  brandName?: string;
  supportEmail?: string;
}): { subject: string; html: string; text: string } {
  const brandName = data.brandName || 'Hydraulic Engineering Academy';
  const amountRupees = (data.amountPaise / 100).toFixed(2);
  const subject = `Refund Processed for Order #${data.orderId.slice(0, 8)} - ${brandName}`;

  // Razorpay standard refund timeline per official Razorpay documentation:
  // UPI: instant to 24 hours. Netbanking / Credit Card / Debit Card: 5-7 working days.
  const timelineNotice =
    'Per payment gateway standards (Razorpay), UPI refunds are credited within instant to 24 hours. Credit/Debit card and net banking refunds reflect in your bank statement within 5–7 business days depending on your issuing bank.';

  const text = `Hello ${data.name},

Your refund for "${data.courseTitle}" has been processed successfully.

Refund Details:
- Course: ${data.courseTitle}
- Refund Amount: ₹${amountRupees}
- Order ID: ${data.orderId}
${data.reason ? `- Reason: ${data.reason}\n` : ''}
Expected Timeline:
${timelineNotice}

If you do not see the credit in your account after 7 business days, please reply to this email with your Razorpay payment ID and our support desk will assist you immediately.

Best regards,
${brandName} Team
Support: ${data.supportEmail || 'support@hydrauliccourse.com'}`;

  const contentHtml = `
    <p style="margin: 0 0 14px 0;">Hello <strong>${data.name}</strong>,</p>
    <p style="margin: 0 0 14px 0;">We have processed a refund of <strong>₹${amountRupees}</strong> for your order of <strong>${data.courseTitle}</strong> (Order #${data.orderId.slice(0, 8)}).</p>
    ${data.reason ? `<p style="margin: 0 0 14px 0;"><strong>Reason:</strong> ${data.reason}</p>` : ''}

    <div style="margin: 20px 0; padding: 16px; border: 1px solid #0A192F; background-color: #F8FAFC;">
      <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 800; color: #0A192F; text-transform: uppercase;">Expected Refund Timeline</h3>
      <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #334155;">
        ${timelineNotice}
      </p>
    </div>
  `;

  const footerHtml = `
    <p style="margin: 0;">If you have any questions regarding your refund, contact our support team at <a href="mailto:${data.supportEmail || 'support@hydrauliccourse.com'}">${data.supportEmail || 'support@hydrauliccourse.com'}</a>.</p>
  `;

  const html = buildEmailHtml({
    brandName,
    supportEmail: data.supportEmail,
    preheader: `Refund of ₹${amountRupees} processed for ${data.courseTitle}.`,
    title: 'Refund Processed Successfully',
    contentHtml,
    footerHtml,
  });

  assertNoTodoMarkers(text);
  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// 6. Access Granted by Admin Template
// ---------------------------------------------------------------------------
export function getAdminAccessGrantedTemplate(data: {
  name: string;
  courseTitle: string;
  slug: string;
  expiresAt?: Date | null;
  brandName?: string;
  supportEmail?: string;
}): { subject: string; html: string; text: string } {
  const brandName = data.brandName || 'Hydraulic Engineering Academy';
  const courseUrl = `${env.APP_URL}/learn/${data.slug}`;
  const subject = `Course Access Granted: ${data.courseTitle} - ${brandName}`;
  const expiryText = data.expiresAt
    ? `Access Valid Until: ${data.expiresAt.toLocaleDateString('en-IN')}`
    : 'Access Validity: Lifetime Access';

  const text = `Hello ${data.name},

You have been granted full access to "${data.courseTitle}" by an administrator at ${brandName}.

Access Details:
- Course: ${data.courseTitle}
- ${expiryText}

You can begin streaming lessons immediately at:
${courseUrl}

Happy Learning,
${brandName} Team
Support: ${data.supportEmail || 'support@hydrauliccourse.com'}`;

  const contentHtml = `
    <p style="margin: 0 0 14px 0;">Hello <strong>${data.name}</strong>,</p>
    <p style="margin: 0 0 14px 0;">You have been granted full access to <strong>${data.courseTitle}</strong> by course administration.</p>
    <p style="margin: 0 0 14px 0;"><strong>${expiryText}</strong></p>
    <p style="margin: 0 0 14px 0;">Click the button below to open the course player and begin learning immediately:</p>
  `;

  const footerHtml = `
    <p style="margin: 0;">You can also access this course anytime by logging into your student dashboard at <a href="${env.APP_URL}/account">${env.APP_URL}/account</a>.</p>
  `;

  const html = buildEmailHtml({
    brandName,
    supportEmail: data.supportEmail,
    preheader: `You have been granted access to ${data.courseTitle}.`,
    title: 'Course Access Granted',
    contentHtml,
    cta: { text: 'Start Learning Now', url: courseUrl },
    footerHtml,
  });

  assertNoTodoMarkers(text);
  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// 7. Account Exists Security Notice Template
// ---------------------------------------------------------------------------
export function getAccountExistsNoticeTemplate(data: {
  name: string;
  brandName?: string;
  supportEmail?: string;
}): { subject: string; html: string; text: string } {
  const brandName = data.brandName || 'Hydraulic Engineering Academy';
  const loginUrl = `${env.APP_URL}/login`;
  const resetUrl = `${env.APP_URL}/forgot-password`;
  const subject = `Account Registration Attempt - ${brandName}`;

  const text = `Hello ${data.name},

Someone recently attempted to create a new account at ${brandName} using this email address.

If this was you, you already have an account! You can log in directly at:
${loginUrl}

Or reset your password if you have forgotten it:
${resetUrl}

If you did NOT attempt this, you can safely ignore this email. Your existing account and password remain fully protected.

Best regards,
${brandName} Security Team
Support: ${data.supportEmail || 'support@hydrauliccourse.com'}`;

  const contentHtml = `
    <p style="margin: 0 0 14px 0;">Hello <strong>${data.name}</strong>,</p>
    <p style="margin: 0 0 14px 0;">Someone recently entered this email address while attempting to register an account at <strong>${brandName}</strong>.</p>
    <p style="margin: 0 0 14px 0;">Since you already hold an account with us, no new account was created.</p>
    <p style="margin: 0 0 14px 0;">If this was you, you can log in directly or reset your password:</p>
  `;

  const footerHtml = `
    <p style="margin: 0 0 6px 0;"><strong>Need to reset your password?</strong> Visit <a href="${resetUrl}">${resetUrl}</a></p>
    <p style="margin: 0;">If you did not attempt this registration, no action is needed. Your account remains completely secure.</p>
  `;

  const html = buildEmailHtml({
    brandName,
    supportEmail: data.supportEmail,
    preheader: 'Notice regarding an account registration attempt.',
    title: 'Account Registration Notice',
    contentHtml,
    cta: { text: 'Log In To Account', url: loginUrl },
    footerHtml,
  });

  assertNoTodoMarkers(text);
  return { subject, html, text };
}
