import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';
import { prisma } from '../../common/db/prisma.js';
import { emailService } from '../../common/email/email.service.js';
import { logger } from '../../common/logger/logger.js';
import { Prisma } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const INVOICES_DIR = path.resolve(__dirname, '../../../uploads/invoices');

// Ensure invoices directory exists
if (!fs.existsSync(INVOICES_DIR)) {
  fs.mkdirSync(INVOICES_DIR, { recursive: true });
}

export interface TaxConfig {
  gstin: string;
  gstRatePercent: number;
  pricesTaxInclusive: boolean;
}

export interface BusinessProfile {
  businessName: string;
  businessAddress: string;
  supportEmail: string;
}

export interface InvoiceConfig {
  invoicePrefix: string;
  financialYearFormat?: string;
  currentSequence: number;
  financialYear?: string;
}

export interface TaxCalculationResult {
  subtotalPaise: number;
  taxPaise: number;
  totalPaise: number;
  gstRatePercent: number;
  isTaxExemptOrZero: boolean;
  pricesTaxInclusive: boolean;
}

/**
 * Returns Indian Financial Year string (April 1 to March 31), e.g. "2026-2027"
 */
export function getFinancialYear(date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0 = Jan, 3 = April
  if (month >= 3) {
    return `${year}-${year + 1}`;
  } else {
    return `${year - 1}-${year}`;
  }
}

/**
 * Calculates tax and subtotal based on AppSetting rules and integer paise rounding.
 * Rounding Rule: Standard half-up integer rounding (Math.round) at the paise level.
 */
export async function calculateTaxAndTotals(
  totalOrBasePaise: number,
  discountPaise = 0,
): Promise<TaxCalculationResult> {
  const taxSetting = await prisma.appSetting.findUnique({
    where: { key: 'tax_config' },
  });

  const config: TaxConfig = (taxSetting?.value as unknown as TaxConfig) || {
    gstin: '',
    gstRatePercent: 0,
    pricesTaxInclusive: true,
  };

  const netPayable = Math.max(0, totalOrBasePaise - discountPaise);

  // If GSTIN is unset or gstRate is 0, no tax lines are applied
  if (!config.gstin || config.gstRatePercent <= 0) {
    return {
      subtotalPaise: netPayable,
      taxPaise: 0,
      totalPaise: netPayable,
      gstRatePercent: 0,
      isTaxExemptOrZero: true,
      pricesTaxInclusive: config.pricesTaxInclusive,
    };
  }

  if (config.pricesTaxInclusive) {
    // subtotal = round((total * 100) / (100 + gstRate))
    const subtotal = Math.round((netPayable * 10000) / (10000 + config.gstRatePercent * 100));
    const tax = netPayable - subtotal;
    return {
      subtotalPaise: subtotal,
      taxPaise: tax,
      totalPaise: netPayable,
      gstRatePercent: config.gstRatePercent,
      isTaxExemptOrZero: false,
      pricesTaxInclusive: true,
    };
  } else {
    const tax = Math.round((netPayable * config.gstRatePercent) / 100);
    return {
      subtotalPaise: netPayable,
      taxPaise: tax,
      totalPaise: netPayable + tax,
      gstRatePercent: config.gstRatePercent,
      isTaxExemptOrZero: false,
      pricesTaxInclusive: false,
    };
  }
}

export class InvoiceService {
  /**
   * Generates a sequential invoice number per financial year with no gaps,
   * safe under concurrent transactions using PostgreSQL row locking (FOR UPDATE).
   */
  public async generateInvoiceNumberUnderLock(
    tx: Prisma.TransactionClient,
    date = new Date(),
  ): Promise<{ invoiceNumber: string; financialYear: string; sequenceNumber: number }> {
    const fy = getFinancialYear(date);

    // Lock the AppSetting row for 'invoice_config'
    const lockedRows = await tx.$queryRaw<Array<{ id: string; key: string; value: any }>>`
      SELECT id, key, value FROM "AppSetting" WHERE key = 'invoice_config' FOR UPDATE
    `;

    let config: InvoiceConfig = lockedRows[0]?.value || {
      invoicePrefix: 'INV',
      currentSequence: 0,
      financialYear: fy,
    };

    let nextSequence = 1;
    if (config.financialYear === fy) {
      nextSequence = (config.currentSequence || 0) + 1;
    } else {
      nextSequence = 1; // reset on new financial year
    }

    const updatedConfig: InvoiceConfig = {
      ...config,
      financialYear: fy,
      currentSequence: nextSequence,
    };

    await tx.appSetting.update({
      where: { key: 'invoice_config' },
      data: { value: updatedConfig as any },
    });

    const prefix = config.invoicePrefix || 'INV';
    const seqPadded = String(nextSequence).padStart(5, '0');
    const invoiceNumber = `${prefix}/${fy}/${seqPadded}`;

    return {
      invoiceNumber,
      financialYear: fy,
      sequenceNumber: nextSequence,
    };
  }

  /**
   * Generates invoice PDF document on disk
   */
  public async generateInvoicePdf(
    _invoiceId: string,
    invoiceNumber: string,
    order: {
      id: string;
      totalPaise: number;
      subtotalPaise: number;
      taxPaise: number;
      product: { title: string };
      user: { name: string; email: string };
      paidAt: Date | null;
      billingDetails?: any;
    },
    business: BusinessProfile,
    taxConfig: TaxConfig,
  ): Promise<string> {
    const safeFileName = `invoice-${invoiceNumber.replace(/[\/\\]/g, '_')}.pdf`;
    const filePath = path.join(INVOICES_DIR, safeFileName);
    const relativeUrl = `/uploads/invoices/${safeFileName}`;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // Business Header
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .text(business.businessName || 'Hydraulic Engineering Academy', 50, 50);
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(business.businessAddress || '', 50, 75);
      if (taxConfig.gstin) {
        doc.text(`GSTIN: ${taxConfig.gstin}`, 50, 90);
      }
      doc.text(`Support: ${business.supportEmail || 'support@hydrauliccourse.com'}`, 50, 105);

      // Invoice Meta Header
      doc.fontSize(18).font('Helvetica-Bold').text('TAX INVOICE', 400, 50, { align: 'right' });
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(`Invoice No: ${invoiceNumber}`, 400, 75, { align: 'right' })
        .text(`Date: ${(order.paidAt ?? new Date()).toLocaleDateString('en-IN')}`, 400, 90, {
          align: 'right',
        })
        .text(`Order ID: ${order.id.slice(0, 8)}...`, 400, 105, { align: 'right' });

      doc.moveTo(50, 130).lineTo(550, 130).stroke('#cccccc');

      // Bill To Section
      const billing = order.billingDetails || {};
      doc.fontSize(12).font('Helvetica-Bold').text('Billed To:', 50, 145);
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(billing.name || order.user.name, 50, 165)
        .text(billing.email || order.user.email, 50, 180);
      if (billing.phone) doc.text(`Phone: ${billing.phone}`, 50, 195);
      if (billing.address) doc.text(billing.address, 50, 210);
      if (billing.gstin)
        doc.font('Helvetica-Bold').text(`Customer GSTIN: ${billing.gstin}`, 50, 225);

      // Table Header
      const tableTop = 250;
      doc.rect(50, tableTop, 500, 25).fill('#f5f5f5');
      doc
        .fillColor('#000000')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Item Description', 60, tableTop + 7)
        .text('Subtotal', 360, tableTop + 7, { width: 80, align: 'right' })
        .text('Total (INR)', 450, tableTop + 7, { width: 90, align: 'right' });

      // Item Row
      const itemY = tableTop + 35;
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(order.product.title, 60, itemY, { width: 280 })
        .text(`₹${(order.subtotalPaise / 100).toFixed(2)}`, 360, itemY, {
          width: 80,
          align: 'right',
        })
        .text(`₹${(order.totalPaise / 100).toFixed(2)}`, 450, itemY, { width: 90, align: 'right' });

      // Summary lines
      let summaryY = itemY + 40;
      doc.moveTo(50, summaryY).lineTo(550, summaryY).stroke('#cccccc');
      summaryY += 15;

      doc
        .font('Helvetica')
        .text('Subtotal:', 350, summaryY, { width: 90, align: 'right' })
        .text(`₹${(order.subtotalPaise / 100).toFixed(2)}`, 450, summaryY, {
          width: 90,
          align: 'right',
        });

      // Tax lines only if GSTIN is present and rate > 0
      if (taxConfig.gstin && taxConfig.gstRatePercent > 0) {
        summaryY += 18;
        const halfRate = (taxConfig.gstRatePercent / 2).toFixed(1);
        const halfTaxPaise = Math.round(order.taxPaise / 2);
        doc
          .text(`CGST (${halfRate}%):`, 350, summaryY, { width: 90, align: 'right' })
          .text(`₹${(halfTaxPaise / 100).toFixed(2)}`, 450, summaryY, {
            width: 90,
            align: 'right',
          });

        summaryY += 18;
        doc
          .text(`SGST (${halfRate}%):`, 350, summaryY, { width: 90, align: 'right' })
          .text(`₹${((order.taxPaise - halfTaxPaise) / 100).toFixed(2)}`, 450, summaryY, {
            width: 90,
            align: 'right',
          });
      }

      summaryY += 20;
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('Total Paid:', 350, summaryY, { width: 90, align: 'right' })
        .text(`₹${(order.totalPaise / 100).toFixed(2)}`, 450, summaryY, {
          width: 90,
          align: 'right',
        });

      // Footer
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#666666')
        .text(
          'This is a computer-generated invoice and does not require a physical signature.',
          50,
          720,
          { align: 'center', width: 500 },
        );

      doc.end();

      stream.on('finish', () => resolve(relativeUrl));
      stream.on('error', (err) => reject(err));
    });
  }

  /**
   * Sends invoice email to customer
   */
  public async sendInvoiceEmail(
    userEmail: string,
    userName: string,
    invoiceNumber: string,
    courseTitle: string,
    amountPaise: number,
    _pdfPath: string,
  ): Promise<void> {
    try {
      await emailService.dispatchEmail({
        to: userEmail,
        subject: `Payment Receipt & Invoice: ${invoiceNumber} - ${courseTitle}`,
        text: `Dear ${userName},\n\nThank you for enrolling in "${courseTitle}". Your payment of ₹${(amountPaise / 100).toFixed(2)} was received successfully.\n\nYour official Tax Invoice Number is ${invoiceNumber}.\nYou can download your PDF invoice from your student dashboard anytime.\n\nHappy Learning,\nHydraulic Engineering Academy Team`,
        html: `<p>Dear <strong>${userName}</strong>,</p><p>Thank you for enrolling in <strong>${courseTitle}</strong>. Your payment of <strong>₹${(amountPaise / 100).toFixed(2)}</strong> was received successfully.</p><p>Your official Tax Invoice Number is: <code>${invoiceNumber}</code></p><p>You can access your course materials and download your PDF invoice from your student account dashboard.</p>`,
      });
    } catch (err) {
      logger.error({ err, userEmail, invoiceNumber }, 'Failed to send invoice email');
    }
  }
}

export const invoiceService = new InvoiceService();
