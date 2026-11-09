import 'dotenv/config';
import { ResendEmailProvider } from '../common/email/resend-email.provider.js';
import { getOrderReceiptTemplate } from '../common/email/email.templates.js';

async function main() {
  const recipient = process.argv[2];
  if (!recipient) {
    console.log('\nUsage: npx tsx src/scripts/test-send-email.ts <your-email@example.com>\n');
    process.exit(1);
  }

  const apiKey = process.env.EMAIL_API_KEY;
  const from = process.env.EMAIL_FROM || 'onboarding@resend.dev';

  if (!apiKey || !apiKey.startsWith('re_')) {
    console.error('❌ Error: EMAIL_API_KEY is not set or invalid in .env');
    process.exit(1);
  }

  console.log(`\n📨 Sending test order receipt email via Resend...`);
  console.log(`• From:    ${from}`);
  console.log(`• To:      ${recipient}`);
  console.log(`• Key:     ${apiKey.slice(0, 7)}...`);

  const provider = new ResendEmailProvider({ apiKey, fromAddress: from });
  const template = getOrderReceiptTemplate({
    name: 'Hydraulic Student',
    courseTitle: 'Hydraulic System Basics Course',
    invoiceNumber: 'INV-2026-0001',
    amountPaise: 499900,
    orderId: 'ord_test_12345',
  });

  const result = await provider.sendEmail({
    to: recipient,
    subject: template.subject,
    html: template.html,
    text: template.text,
    template: 'order_receipt',
  });

  console.log(`\n✅ Email sent successfully!`);
  console.log(`• Message ID: ${result.messageId}`);
  console.log(`• Check your inbox at: ${recipient}\n`);
}

main().catch((err) => {
  console.error('\n❌ Failed to send email:');
  if (err.message && err.message.includes('validation_error')) {
    console.error('Note: When using onboarding@resend.dev, Resend only allows sending to the email you used to register your Resend account.\n');
  }
  console.error(err.message || err);
  process.exit(1);
});
