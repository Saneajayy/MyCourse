import { Router, Request, Response } from 'express';
import { env } from '../../config/env.js';
import {
  getEmailVerificationTemplate,
  getPasswordResetTemplate,
  getPasswordChangedTemplate,
  getOrderReceiptTemplate,
  getRefundConfirmationTemplate,
  getAdminAccessGrantedTemplate,
  getAccountExistsNoticeTemplate,
} from '../../common/email/email.templates.js';

export const emailPreviewsRouter = Router();

// Top-level guard: strictly refuse access in production or when dev routes are disabled
emailPreviewsRouter.use((_req, res, next) => {
  if (env.NODE_ENV === 'production' || !env.ENABLE_DEV_ROUTES) {
    res.status(404).send('Not Found');
    return;
  }
  next();
});

const SAMPLE_DATA = {
  verification: {
    name: 'Rajesh Sharma',
    token: 'sample_verification_token_77a9e10f',
  },
  reset: {
    name: 'Rajesh Sharma',
    token: 'sample_reset_token_33b8c21a',
  },
  passwordChanged: {
    name: 'Rajesh Sharma',
    changedAt: new Date(),
  },
  receipt: {
    name: 'Rajesh Sharma',
    courseTitle: 'Industrial Hydraulics & Proportional Valves Masterclass',
    invoiceNumber: 'INV/26-27/00001',
    amountPaise: 499900,
    orderId: '018f6c3a-9214-7e89-b14a-5c8e9f2a0001',
    expiresAt: null, // Lifetime access
  },
  refund: {
    name: 'Rajesh Sharma',
    courseTitle: 'Industrial Hydraulics & Proportional Valves Masterclass',
    orderId: '018f6c3a-9214-7e89-b14a-5c8e9f2a0001',
    amountPaise: 499900,
    reason: 'Student duplicate enrollment on separate email account.',
  },
  adminAccess: {
    name: 'Rajesh Sharma',
    courseTitle: 'Industrial Hydraulics & Proportional Valves Masterclass',
    slug: 'industrial-hydraulics-valves',
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year access
  },
  accountExists: {
    name: 'Rajesh Sharma',
  },
};

function getTemplateData(type: string): { subject: string; html: string; text: string } {
  switch (type) {
    case 'email-verification':
      return getEmailVerificationTemplate(SAMPLE_DATA.verification);
    case 'password-reset':
      return getPasswordResetTemplate(SAMPLE_DATA.reset);
    case 'password-changed':
      return getPasswordChangedTemplate(SAMPLE_DATA.passwordChanged);
    case 'order-receipt':
      return getOrderReceiptTemplate(SAMPLE_DATA.receipt);
    case 'refund-confirmation':
      return getRefundConfirmationTemplate(SAMPLE_DATA.refund);
    case 'admin-access-granted':
      return getAdminAccessGrantedTemplate(SAMPLE_DATA.adminAccess);
    case 'account-exists':
      return getAccountExistsNoticeTemplate(SAMPLE_DATA.accountExists);
    default:
      return getEmailVerificationTemplate(SAMPLE_DATA.verification);
  }
}

// Raw HTML view for iframe or direct inspection
emailPreviewsRouter.get('/raw', (req: Request, res: Response) => {
  const templateKey = (req.query.template as string) || 'email-verification';
  const rendered = getTemplateData(templateKey);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(rendered.html);
});

// Interactive UI with navigation bar and viewport toggle
emailPreviewsRouter.get('/', (req: Request, res: Response) => {
  const currentTemplate = (req.query.template as string) || 'email-verification';
  const currentView = (req.query.view as string) || 'html';
  const rendered = getTemplateData(currentTemplate);

  const templates = [
    { key: 'email-verification', label: '1. Email Verification' },
    { key: 'password-reset', label: '2. Password Reset' },
    { key: 'password-changed', label: '3. Password Changed' },
    { key: 'order-receipt', label: '4. Order Receipt & Invoice' },
    { key: 'refund-confirmation', label: '5. Refund Confirmation' },
    { key: 'admin-access-granted', label: '6. Admin Access Granted' },
    { key: 'account-exists', label: '7. Account Exists Notice' },
  ];

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Email Template Previews - Dev Mode</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0A192F; color: #F8FAFC; display: flex; height: 100vh; overflow: hidden; }
    .sidebar { width: 320px; background-color: #050E1D; border-right: 2px solid #1E293B; display: flex; flex-direction: column; }
    .sidebar-header { padding: 20px; border-bottom: 2px solid #E05305; background-color: #0A192F; }
    .sidebar-header h1 { font-size: 16px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; color: #FFFFFF; }
    .sidebar-header p { font-size: 12px; color: #94A3B8; margin-top: 4px; }
    .template-list { list-style: none; overflow-y: auto; flex: 1; padding: 12px; }
    .template-link { display: block; padding: 12px 14px; margin-bottom: 6px; border-radius: 4px; color: #CBD5E1; text-decoration: none; font-size: 13px; font-weight: 700; border: 1px solid transparent; transition: all 0.15s ease; }
    .template-link:hover { background-color: #1E293B; color: #FFFFFF; }
    .template-link.active { background-color: #E05305; color: #0A192F; font-weight: 900; border-color: #0A192F; }
    .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; background-color: #0F172A; }
    .topbar { padding: 14px 24px; background-color: #0A192F; border-bottom: 1px solid #1E293B; display: flex; justify-content: space-between; align-items: center; }
    .topbar-info { display: flex; flex-direction: column; gap: 4px; }
    .topbar-subject { font-size: 14px; font-weight: 800; color: #FFFFFF; }
    .topbar-actions { display: flex; gap: 10px; align-items: center; }
    .btn-tab { padding: 6px 14px; font-size: 12px; font-weight: 800; border: 1px solid #334155; background-color: #1E293B; color: #FFFFFF; text-decoration: none; border-radius: 4px; }
    .btn-tab.active { background-color: #E05305; color: #0A192F; border-color: #0A192F; }
    .btn-action { padding: 6px 14px; font-size: 12px; font-weight: 800; background-color: #38BDF8; color: #0A192F; text-decoration: none; border-radius: 4px; }
    .preview-container { flex: 1; display: flex; justify-content: center; align-items: flex-start; padding: 24px; overflow-y: auto; background-color: #0F172A; }
    .email-frame { width: 640px; height: 100%; min-height: 700px; border: 1px solid #334155; background: #FFFFFF; border-radius: 4px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .text-pre { width: 640px; background-color: #050E1D; border: 1px solid #334155; padding: 20px; font-family: monospace; font-size: 13px; color: #38BDF8; line-height: 1.6; white-space: pre-wrap; word-break: break-all; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="sidebar">
    <div class="sidebar-header">
      <h1>Email Design Previews</h1>
      <p>Phase 8 System Notifications (Dev Mode)</p>
    </div>
    <ul class="template-list">
      ${templates
        .map(
          (t) => `
        <li>
          <a class="template-link ${t.key === currentTemplate ? 'active' : ''}" href="/dev/email-previews?template=${t.key}&view=${currentView}">
            ${t.label}
          </a>
        </li>
      `,
        )
        .join('')}
    </ul>
  </div>

  <div class="main">
    <div class="topbar">
      <div class="topbar-info">
        <div class="topbar-subject">Subject: ${rendered.subject}</div>
        <div style="font-size: 12px; color: #94A3B8;">Template Key: <code>${currentTemplate}</code></div>
      </div>
      <div class="topbar-actions">
        <a class="btn-tab ${currentView === 'html' ? 'active' : ''}" href="/dev/email-previews?template=${currentTemplate}&view=html">HTML View</a>
        <a class="btn-tab ${currentView === 'text' ? 'active' : ''}" href="/dev/email-previews?template=${currentTemplate}&view=text">Plain Text</a>
        <a class="btn-action" href="/dev/email-previews/raw?template=${currentTemplate}" target="_blank">Open Raw HTML &#8599;</a>
      </div>
    </div>

    <div class="preview-container">
      ${
        currentView === 'text'
          ? `<pre class="text-pre">${rendered.text}</pre>`
          : `<iframe class="email-frame" src="/dev/email-previews/raw?template=${currentTemplate}" frameborder="0"></iframe>`
      }
    </div>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});
