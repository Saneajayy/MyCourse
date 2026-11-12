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
 * - Maximum email client compatibility (Outlook, Gmail, Apple Mail, Yahoo)
 * - Industrial Monochrome Design: Pure White (#FFFFFF), Pitch Black (#000000), Dark Neutral (#171717)
 * - Sharp corners throughout (zero rounded borders / border-radius: 0)
 * - Stacked wordmark header ("HYDRO BASICS")
 * - Highly readable with images blocked and in dark mode
 * - CTA buttons >= 44px tall with sharp edges and high-contrast styling
 * - Dynamic brand name, support email, and links from config / APP_URL
 */
export function buildEmailHtml(options: EmailLayoutOptions): string {
  const brandName = options.brandName || 'Hydro Basics';
  const supportEmail = options.supportEmail || 'support@hydrobasics.com';
  const year = new Date().getFullYear();

  const ctaButtonHtml = options.cta
    ? `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 28px 0 20px 0;">
        <tr>
          <td align="left">
            <a href="${options.cta.url}" target="_blank" style="display: inline-block; min-height: 44px; line-height: 44px; padding: 0 32px; background-color: #000000; color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; font-weight: 900; text-decoration: none; text-transform: uppercase; letter-spacing: 1px; border: 1px solid #000000; border-radius: 0;">
              ${options.cta.text} &rarr;
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
    body { margin: 0; padding: 0; min-width: 100%; width: 100% !important; background-color: #F4F4F5; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table { border-spacing: 0; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    td { padding: 0; }
    img { border: 0; -ms-interpolation-mode: bicubic; }
    a { color: #000000; text-decoration: underline; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .mobile-p-20 { padding: 24px 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 32px 0; background-color: #F4F4F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #171717;">
  ${preheaderHtml}
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center" style="padding: 0 12px;">
        <!-- Main Email Container with Sharp Edges -->
        <table role="presentation" class="email-container" border="0" cellpadding="0" cellspacing="0" width="580" style="max-width: 580px; width: 100%; background-color: #FFFFFF; border: 1px solid #000000; border-radius: 0; text-align: left;">
          
          <!-- Brand Header (Pitch Black with Two-Line Stacked Wordmark) -->
          <tr>
            <td style="background-color: #000000; padding: 20px 28px; border-bottom: 1px solid #000000; border-radius: 0;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="left" valign="middle">
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 900; letter-spacing: 0.6px; text-transform: uppercase; color: #FFFFFF; line-height: 0.95;">
                      HYDRO<br />BASICS
                    </div>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display: inline-block; padding: 4px 10px; background-color: #171717; border: 1px solid #333333; font-family: 'SF Mono', Monaco, Consolas, monospace; font-size: 10px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: #D4D4D4;">
                      OFFICIAL NOTICE
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Area -->
          <tr>
            <td class="mobile-p-20" style="padding: 34px 28px; background-color: #FFFFFF; border-radius: 0;">
              <h1 style="margin: 0 0 18px 0; font-size: 20px; font-weight: 900; line-height: 1.3; color: #000000; letter-spacing: -0.3px; text-transform: uppercase;">
                ${options.title}
              </h1>

              <div style="font-size: 14px; line-height: 1.6; color: #171717;">
                ${options.contentHtml}
              </div>

              ${ctaButtonHtml}

              ${options.footerHtml ? `<div style="margin-top: 24px; padding-top: 18px; border-top: 1px solid #E5E5E5; font-size: 13px; color: #737373; line-height: 1.6;">${options.footerHtml}</div>` : ''}
            </td>
          </tr>

          <!-- Footer Area -->
          <tr>
            <td style="background-color: #FAFAFA; padding: 22px 28px; border-top: 1px solid #000000; border-radius: 0; font-size: 12px; line-height: 1.6; color: #737373;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <!-- Quick Navigation Links -->
                    <div style="margin-bottom: 10px; font-size: 12px; font-weight: 700;">
                      <a href="${env.APP_URL}/my-courses" style="color: #000000; text-decoration: none; margin-right: 14px;">My Courses &rarr;</a>
                      <a href="${env.APP_URL}/terms" style="color: #737373; text-decoration: none; margin-right: 14px;">Terms</a>
                      <a href="${env.APP_URL}/privacy" style="color: #737373; text-decoration: none; margin-right: 14px;">Privacy</a>
                      <a href="${env.APP_URL}/refunds" style="color: #737373; text-decoration: none; margin-right: 14px;">Refunds</a>
                      <a href="${env.APP_URL}/contact" style="color: #737373; text-decoration: none;">Contact</a>
                    </div>
                    <p style="margin: 0 0 6px 0; color: #737373; font-size: 12px;">
                      Questions or billing assistance? Reply directly to this email or contact <a href="mailto:${supportEmail}" style="color: #000000; font-weight: 700; text-decoration: underline;">${supportEmail}</a>
                    </p>
                    <p style="margin: 0; color: #A3A3A3; font-size: 11px;">
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
  const brandName = data.brandName || 'Hydro Basics';
  const verifyUrl = `${env.APP_URL}/verify-email?token=${data.token}`;
  const subject = `Your verification code is ${data.token} - ${brandName}`;

  const text = `Hello ${data.name},

Thank you for registering at ${brandName}.

Your 6-digit verification code is:
${data.token}

Enter this verification code on the verification screen to activate your account. This code expires in 15 minutes.

Verification link:
${verifyUrl}

If you did not create an account, you can safely ignore this email.

Best regards,
${brandName} Team
Support: ${data.supportEmail || 'support@hydrobasics.com'}`;

  const contentHtml = `
    <p style="margin: 0 0 14px 0;">Hello <strong>${data.name}</strong>,</p>
    <p style="margin: 0 0 14px 0;">Thank you for registering at <strong>${brandName}</strong>.</p>
    <p style="margin: 0 0 14px 0;">Please use the 6-digit verification code below to activate your student account:</p>
    
    <div style="text-align: center; margin: 26px 0; padding: 22px 16px; background-color: #FAFAFA; border: 1px solid #000000; border-radius: 0;">
      <div style="font-size: 11px; font-family: monospace; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: #737373; margin-bottom: 10px;">Verification Code</div>
      <div style="display: inline-block; padding: 12px 28px; background-color: #FFFFFF; border: 2px solid #000000; border-radius: 0; font-family: 'SF Mono', Monaco, Consolas, 'Liberation Mono', monospace; font-size: 32px; font-weight: 900; letter-spacing: 10px; color: #000000;">
        ${data.token}
      </div>
      <p style="margin: 12px 0 0 0; font-size: 12px; color: #737373;">This code will expire in <strong style="color: #000000;">15 minutes</strong>.</p>
    </div>
  `;

  const footerHtml = `
    <p style="margin: 0 0 6px 0;">Enter this code on the verification screen to activate your account.</p>
    <p style="margin: 0;">Verification URL:<br /><span style="font-family: monospace; word-break: break-all; color: #000000;">${verifyUrl}</span></p>
  `;

  const html = buildEmailHtml({
    brandName,
    supportEmail: data.supportEmail,
    preheader: `Your verification code is ${data.token}`,
    title: 'Verify Your Email Address',
    contentHtml,
    cta: { text: 'Enter Verification Code', url: verifyUrl },
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
  const brandName = data.brandName || 'Hydro Basics';
  const resetUrl = `${env.APP_URL}/reset-password?token=${data.token}`;
  const isOtp = /^\d{6}$/.test(data.token);
  const subject = isOtp
    ? `Your password reset code is ${data.token} - ${brandName}`
    : `Password Reset Request - ${brandName}`;

  const text = `Hello ${data.name},

We received a request to reset the password for your ${brandName} account.

Your 6-digit password reset code is:
${data.token}

Enter this code on the reset password screen to create a new password. This code expires in 15 minutes.

If you did not request this password reset, please ignore this email. Your password will remain unchanged and your account is secure.

Best regards,
${brandName} Team
Support: ${data.supportEmail || 'support@hydrobasics.com'}`;

  const contentHtml = `
    <p style="margin: 0 0 14px 0;">Hello <strong>${data.name}</strong>,</p>
    <p style="margin: 0 0 14px 0;">We received a request to reset the password for your account at <strong>${brandName}</strong>.</p>
    <p style="margin: 0 0 14px 0;">Please use the 6-digit password reset code below to create your new password:</p>
    
    <div style="text-align: center; margin: 26px 0; padding: 22px 16px; background-color: #FAFAFA; border: 1px solid #000000; border-radius: 0;">
      <div style="font-size: 11px; font-family: monospace; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: #737373; margin-bottom: 10px;">Reset Code</div>
      <div style="display: inline-block; padding: 12px 28px; background-color: #FFFFFF; border: 2px solid #000000; border-radius: 0; font-family: 'SF Mono', Monaco, Consolas, 'Liberation Mono', monospace; font-size: 32px; font-weight: 900; letter-spacing: 10px; color: #000000;">
        ${data.token}
      </div>
      <p style="margin: 12px 0 0 0; font-size: 12px; color: #737373;">This code will expire in <strong style="color: #000000;">15 minutes</strong>.</p>
    </div>
  `;

  const footerHtml = `
    <p style="margin: 0 0 6px 0;">Enter this code on the password reset screen to create your new password.</p>
    <p style="margin: 0 0 6px 0;">If you did not request this, you can safely ignore this email. Your current password remains secure.</p>
    <p style="margin: 0;">Reset URL: <span style="font-family: monospace; word-break: break-all; color: #000000;">${resetUrl}</span></p>
  `;

  const html = buildEmailHtml({
    brandName,
    supportEmail: data.supportEmail,
    preheader: isOtp ? `Your password reset code is ${data.token}` : 'Reset your account password.',
    title: 'Reset Your Password',
    contentHtml,
    cta: { text: 'Enter Reset Code', url: `${env.APP_URL}/forgot-password?email=&step=otp` },
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
  const brandName = data.brandName || 'Hydro Basics';
  const supportEmail = data.supportEmail || 'support@hydrobasics.com';
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
    <div style="padding: 14px 18px; border: 1px solid #000000; background-color: #FAFAFA; border-radius: 0;">
      <p style="margin: 0; color: #000000; font-size: 13px; font-weight: 700; line-height: 1.5;">
        Did not make this change? If you suspect unauthorized access, contact our security desk immediately at <a href="mailto:${supportEmail}" style="color: #000000; text-decoration: underline; font-weight: 800;">${supportEmail}</a>.
      </p>
    </div>
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
  const brandName = data.brandName || 'Hydro Basics';
  const amountRupees = (data.amountPaise / 100).toFixed(2);
  const myCoursesUrl = `${env.APP_URL}/my-courses`;
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
Support: ${data.supportEmail || 'support@hydrobasics.com'}`;

  const contentHtml = `
    <p style="margin: 0 0 14px 0;">Hello <strong>${data.name}</strong>,</p>
    <p style="margin: 0 0 16px 0;">Thank you for enrolling in <strong>${data.courseTitle}</strong>. Your payment was processed successfully and your enrollment is active.</p>

    <!-- Order Summary Table with Sharp Corners and Border-Touching Lines -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0; border: 1px solid #000000; background-color: #FAFAFA; border-radius: 0;">
      <tr>
        <td style="padding: 13px 18px; border-bottom: 1px solid #E5E5E5; font-size: 12px; font-weight: 700; color: #737373; text-transform: uppercase; letter-spacing: 0.5px;">Enrolled Course</td>
        <td style="padding: 13px 18px; border-bottom: 1px solid #E5E5E5; font-size: 14px; font-weight: 800; color: #000000;" align="right">${data.courseTitle}</td>
      </tr>
      <tr>
        <td style="padding: 13px 18px; border-bottom: 1px solid #E5E5E5; font-size: 12px; font-weight: 700; color: #737373; text-transform: uppercase; letter-spacing: 0.5px;">Invoice Number</td>
        <td style="padding: 13px 18px; border-bottom: 1px solid #E5E5E5; font-size: 13px; font-family: monospace; font-weight: 700; color: #000000;" align="right">${data.invoiceNumber}</td>
      </tr>
      <tr>
        <td style="padding: 13px 18px; border-bottom: 1px solid #E5E5E5; font-size: 12px; font-weight: 700; color: #737373; text-transform: uppercase; letter-spacing: 0.5px;">Validity</td>
        <td style="padding: 13px 18px; border-bottom: 1px solid #E5E5E5; font-size: 13px; font-weight: 700; color: #000000;" align="right">${expiryText}</td>
      </tr>
      <tr>
        <td style="padding: 16px 18px; font-size: 13px; font-weight: 900; color: #000000; text-transform: uppercase; letter-spacing: 0.5px;">Total Paid (GST Incl.)</td>
        <td style="padding: 16px 18px; font-size: 18px; font-weight: 900; font-family: monospace; color: #000000;" align="right">₹${amountRupees}</td>
      </tr>
    </table>

    <p style="margin: 16px 0 6px 0;">
      <strong>Official Invoice:</strong> You can download your official GST Tax Invoice PDF anytime from your student dashboard or directly via:
      <br />
      <a href="${invoiceDownloadUrl}" style="color: #000000; font-weight: 800; text-decoration: underline;">Download Official Tax Invoice (PDF)</a>
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
  const brandName = data.brandName || 'Hydro Basics';
  const amountRupees = (data.amountPaise / 100).toFixed(2);
  const subject = `Refund Processed for Order #${data.orderId.slice(0, 8)} - ${brandName}`;

  // Razorpay standard refund timeline per official documentation (https://razorpay.com/docs/payments/refunds/):
  // "The refund will be credited to your original payment method usually within 5-7 working days, depending on your bank."
  const timelineNotice =
    'The refund will be credited to your original payment method usually within 5-7 working days, depending on your bank.';

  const text = `Hello ${data.name},

Your refund for "${data.courseTitle}" has been processed successfully.

Refund Details:
- Course: ${data.courseTitle}
- Refund Amount: ₹${amountRupees}
- Order ID: ${data.orderId}
${data.reason ? `- Reason: ${data.reason}\n` : ''}
Expected Timeline:
${timelineNotice}

If you do not see the credit in your account after 7 working days, please reply to this email with your Razorpay payment ID and our support desk will assist you immediately.

Best regards,
${brandName} Team
Support: ${data.supportEmail || 'support@hydrobasics.com'}`;

  const contentHtml = `
    <p style="margin: 0 0 14px 0;">Hello <strong>${data.name}</strong>,</p>
    <p style="margin: 0 0 14px 0;">We have processed a refund of <strong>₹${amountRupees}</strong> for your order of <strong>${data.courseTitle}</strong> (Order #${data.orderId.slice(0, 8)}).</p>
    ${data.reason ? `<p style="margin: 0 0 14px 0;"><strong>Reason:</strong> ${data.reason}</p>` : ''}

    <div style="margin: 24px 0; padding: 18px 20px; border: 1px solid #000000; background-color: #FAFAFA; border-radius: 0;">
      <h3 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 900; color: #000000; text-transform: uppercase; letter-spacing: 0.5px;">Expected Refund Timeline</h3>
      <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #262626;">
        ${timelineNotice}
      </p>
    </div>
  `;

  const footerHtml = `
    <p style="margin: 0;">If you have any questions regarding your refund, contact our support team at <a href="mailto:${data.supportEmail || 'support@hydrobasics.com'}" style="color: #000000; font-weight: 700; text-decoration: underline;">${data.supportEmail || 'support@hydrobasics.com'}</a>.</p>
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
  const brandName = data.brandName || 'Hydro Basics';
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
Support: ${data.supportEmail || 'support@hydrobasics.com'}`;

  const contentHtml = `
    <p style="margin: 0 0 14px 0;">Hello <strong>${data.name}</strong>,</p>
    <p style="margin: 0 0 14px 0;">You have been granted full access to <strong>${data.courseTitle}</strong> by course administration.</p>
    <p style="margin: 0 0 14px 0;"><strong>${expiryText}</strong></p>
    <p style="margin: 0 0 14px 0;">Click the button below to open the course player and begin learning immediately:</p>
  `;

  const footerHtml = `
    <p style="margin: 0;">You can also access this course anytime by logging into your student dashboard at <a href="${env.APP_URL}/my-courses" style="color: #000000; font-weight: 700; text-decoration: underline;">${env.APP_URL}/my-courses</a>.</p>
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
  const brandName = data.brandName || 'Hydro Basics';
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
Support: ${data.supportEmail || 'support@hydrobasics.com'}`;

  const contentHtml = `
    <p style="margin: 0 0 14px 0;">Hello <strong>${data.name}</strong>,</p>
    <p style="margin: 0 0 14px 0;">Someone recently entered this email address while attempting to register an account at <strong>${brandName}</strong>.</p>
    <p style="margin: 0 0 14px 0;">Since you already hold an account with us, no new account was created.</p>
    <p style="margin: 0 0 14px 0;">If this was you, you can log in directly or reset your password:</p>
  `;

  const footerHtml = `
    <p style="margin: 0 0 6px 0;"><strong>Need to reset your password?</strong> Visit <a href="${resetUrl}" style="color: #000000; font-weight: 700; text-decoration: underline;">${resetUrl}</a></p>
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
