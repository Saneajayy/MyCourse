import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getEmailVerificationTemplate,
  getPasswordResetTemplate,
  getPasswordChangedTemplate,
  getOrderReceiptTemplate,
  getRefundConfirmationTemplate,
  getAdminAccessGrantedTemplate,
  getAccountExistsNoticeTemplate,
  assertNoTodoMarkers,
} from '../common/email/email.templates.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PREVIEWS_DIR = path.resolve(__dirname, '../../../../docs/email-previews');

if (!fs.existsSync(PREVIEWS_DIR)) {
  fs.mkdirSync(PREVIEWS_DIR, { recursive: true });
}

const SAMPLE_RECIPIENT = {
  name: 'Rajesh Sharma',
  email: 'rajesh.sharma@example.com',
};

const templates = [
  {
    fileName: '01-email-verification.html',
    title: 'Email Verification',
    generator: () =>
      getEmailVerificationTemplate({
        name: SAMPLE_RECIPIENT.name,
        token: 'sample_verification_token_77a9e10f',
      }),
  },
  {
    fileName: '02-password-reset.html',
    title: 'Password Reset Request',
    generator: () =>
      getPasswordResetTemplate({
        name: SAMPLE_RECIPIENT.name,
        token: 'sample_reset_token_33b8c21a',
      }),
  },
  {
    fileName: '03-password-changed.html',
    title: 'Password Changed Security Notice',
    generator: () =>
      getPasswordChangedTemplate({
        name: SAMPLE_RECIPIENT.name,
        changedAt: new Date(),
      }),
  },
  {
    fileName: '04-order-receipt.html',
    title: 'Order Receipt & Invoice',
    generator: () =>
      getOrderReceiptTemplate({
        name: SAMPLE_RECIPIENT.name,
        courseTitle: 'Industrial Hydraulics & Proportional Valves Masterclass',
        invoiceNumber: 'INV/26-27/00001',
        amountPaise: 499900,
        orderId: '018f6c3a-9214-7e89-b14a-5c8e9f2a0001',
        expiresAt: null,
      }),
  },
  {
    fileName: '05-refund-confirmation.html',
    title: 'Refund Confirmation',
    generator: () =>
      getRefundConfirmationTemplate({
        name: SAMPLE_RECIPIENT.name,
        courseTitle: 'Industrial Hydraulics & Proportional Valves Masterclass',
        orderId: '018f6c3a-9214-7e89-b14a-5c8e9f2a0001',
        amountPaise: 499900,
        reason: 'Student duplicate enrollment on separate email account.',
      }),
  },
  {
    fileName: '06-admin-access-granted.html',
    title: 'Admin Access Granted',
    generator: () =>
      getAdminAccessGrantedTemplate({
        name: SAMPLE_RECIPIENT.name,
        courseTitle: 'Industrial Hydraulics & Proportional Valves Masterclass',
        slug: 'industrial-hydraulics-valves',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      }),
  },
  {
    fileName: '07-account-exists.html',
    title: 'Account Exists Registration Notice',
    generator: () =>
      getAccountExistsNoticeTemplate({
        name: SAMPLE_RECIPIENT.name,
      }),
  },
];

console.log('Generating Phase 8 email previews in docs/email-previews/ ...');

for (const item of templates) {
  const result = item.generator();
  assertNoTodoMarkers(result.html);
  assertNoTodoMarkers(result.text);

  const targetPath = path.join(PREVIEWS_DIR, item.fileName);
  fs.writeFileSync(targetPath, result.html, 'utf8');
  console.log(`✓ Generated ${item.fileName} (${item.title}) - Subject: "${result.subject}"`);
}

// Generate an index.html navigation page for convenient offline viewing
const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Course Platform - Email Previews Directory</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0A192F; color: #FFFFFF; padding: 40px; margin: 0; }
    h1 { color: #E05305; font-size: 24px; text-transform: uppercase; margin-bottom: 8px; }
    p { color: #94A3B8; font-size: 14px; margin-bottom: 24px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; max-width: 1000px; }
    .card { background: #050E1D; border: 2px solid #1E293B; padding: 20px; border-radius: 4px; text-decoration: none; color: inherit; transition: border-color 0.2s; }
    .card:hover { border-color: #E05305; }
    .card h3 { margin: 0 0 8px 0; font-size: 16px; color: #FFFFFF; }
    .card span { font-size: 12px; color: #38BDF8; font-family: monospace; }
  </style>
</head>
<body>
  <h1>Transactional Email Previews (Phase 8)</h1>
  <p>Flat design email templates for Hydraulic Engineering Academy. HTML4/XHTML table layout, zero external image dependencies, AA+ contrast.</p>
  <div class="grid">
    ${templates
      .map(
        (t) => `
      <a class="card" href="./${t.fileName}">
        <h3>${t.title}</h3>
        <span>${t.fileName}</span>
      </a>
    `,
      )
      .join('')}
  </div>
</body>
</html>`;

fs.writeFileSync(path.join(PREVIEWS_DIR, 'index.html'), indexHtml, 'utf8');
console.log('✓ Generated index.html gallery');
console.log('All 7 email previews generated successfully in docs/email-previews/!');
