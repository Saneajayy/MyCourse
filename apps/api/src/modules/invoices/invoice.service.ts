import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';
import { Queue, Worker } from 'bullmq';
import { env } from '../../config/env.js';
import { prisma } from '../../common/db/prisma.js';
import { emailService } from '../../common/email/email.service.js';
import { logger } from '../../common/logger/logger.js';
import { EmailLogStatus, OrderStatus, Prisma } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const INVOICES_DIR = path.resolve(__dirname, '../../../uploads/invoices');

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
  invoicePrefix?: string;
  yearFormat?: 'short' | 'long';
  sequencePadding?: number;
  currentSequence?: number;
  financialYear?: string;
  includeZeroValueInvoices?: boolean;
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
 * Returns Indian Financial Year string (April 1 to March 31).
 * Default format is 'short' (e.g. "26-27") to ensure invoice numbers remain <= 16 characters.
 */
export function getFinancialYear(date = new Date(), format: 'short' | 'long' = 'short'): string {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0 = Jan, 3 = April
  const startYear = month >= 3 ? year : year - 1;
  const endYear = startYear + 1;

  if (format === 'short') {
    const startYY = String(startYear).slice(-2);
    const endYY = String(endYear).slice(-2);
    return `${startYY}-${endYY}`;
  }
  return `${startYear}-${endYear}`;
}

/**
 * Calculates tax and subtotal based on AppSetting rules and integer paise rounding.
 * Rounding Rule: Standard half-up integer rounding (Math.round) at the paise level.
 */
export async function calculateTaxAndTotals(
  totalOrBasePaise: number,
  discountPaise = 0,
  tx?: Prisma.TransactionClient,
): Promise<TaxCalculationResult> {
  const client = tx || prisma;
  const taxSetting = await client.appSetting.findUnique({
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
  private receiptQueue: Queue<{ orderId: string }> | null = null;
  private receiptWorker: Worker<{ orderId: string }> | null = null;
  private sweeperInterval: NodeJS.Timeout | null = null;

  constructor() {
    try {
      const connection = { url: env.REDIS_URL };
      this.receiptQueue = new Queue<{ orderId: string }>('receipt_delivery', { connection });

      if (env.NODE_ENV !== 'test') {
        this.receiptWorker = new Worker<{ orderId: string }>(
          'receipt_delivery',
          async (job) => {
            await this.processReceiptJob(job.data.orderId);
          },
          {
            connection,
            concurrency: 5,
          },
        );

        this.receiptWorker.on('failed', (job, err) => {
          logger.error(
            { jobId: job?.id, orderId: job?.data?.orderId, error: err.message },
            'BullMQ receipt job failed attempt',
          );
        });
      }
    } catch (err) {
      logger.error({ err }, 'Failed to initialize BullMQ receipt queue');
    }
  }

  /**
   * Generates a sequential invoice number per financial year with no gaps,
   * safe under concurrent transactions using PostgreSQL row locking (FOR UPDATE).
   * Shortens format to <= 16 characters (e.g. INV/26-27/00001).
   */
  public async generateInvoiceNumberUnderLock(
    tx: Prisma.TransactionClient,
    date = new Date(),
  ): Promise<{ invoiceNumber: string; financialYear: string; sequenceNumber: number }> {
    // Lock the AppSetting row for 'invoice_config'
    const lockedRows = await tx.$queryRaw<Array<{ id: string; key: string; value: any }>>`
      SELECT id, key, value FROM "AppSetting" WHERE key = 'invoice_config' FOR UPDATE
    `;

    const config: InvoiceConfig = lockedRows[0]?.value || {
      invoicePrefix: 'INV',
      yearFormat: 'short',
      sequencePadding: 5,
      currentSequence: 0,
      includeZeroValueInvoices: true,
    };

    const yearFormat = config.yearFormat || 'short';
    const fy = getFinancialYear(date, yearFormat);

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
    const padding = config.sequencePadding ?? 5;
    const seqPadded = String(nextSequence).padStart(padding, '0');
    const invoiceNumber = `${prefix}/${fy}/${seqPadded}`;

    if (invoiceNumber.length > 16 || !/^[A-Za-z0-9\-\/]{1,16}$/.test(invoiceNumber)) {
      throw new Error(
        `Generated invoice number "${invoiceNumber}" violates constraints (max 16 chars, allowed letters/digits/hyphen/slash).`,
      );
    }

    return {
      invoiceNumber,
      financialYear: fy,
      sequenceNumber: nextSequence,
    };
  }

  public async shouldGenerateZeroValueInvoice(tx?: Prisma.TransactionClient): Promise<boolean> {
    const client = tx || prisma;
    const setting = await client.appSetting.findUnique({
      where: { key: 'invoice_config' },
    });
    const config = (setting?.value as unknown as InvoiceConfig) || {};
    return config.includeZeroValueInvoices !== false;
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
    pdfPath: string,
    orderId?: string,
    userId?: string,
    expiresAt?: Date | null,
  ): Promise<void> {
    try {
      let pdfBuffer: Buffer | undefined;
      if (pdfPath) {
        const fullPath = path.isAbsolute(pdfPath)
          ? pdfPath
          : path.join(__dirname, '../../../uploads/invoices', path.basename(pdfPath));
        if (fs.existsSync(fullPath)) {
          pdfBuffer = fs.readFileSync(fullPath);
        }
      }

      await emailService.sendOrderReceiptEmail({
        to: userEmail,
        name: userName,
        courseTitle,
        invoiceNumber,
        amountPaise,
        orderId: orderId || invoiceNumber,
        userId,
        expiresAt,
        pdfBuffer,
      });
    } catch (err) {
      logger.error({ err, userEmail, invoiceNumber }, 'Failed to send invoice email');
    }
  }

  public async enqueueReceiptJob(orderId: string): Promise<void> {
    if (!this.receiptQueue || env.NODE_ENV === 'test') {
      await this.processReceiptJob(orderId);
      return;
    }
    await this.receiptQueue.add(
      'process_receipt',
      { orderId },
      {
        jobId: `receipt_${orderId}`,
        attempts: 4,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    );
  }

  public async processReceiptJob(orderId: string): Promise<void> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        product: true,
        user: true,
        invoice: true,
      },
    });

    if (!order || order.status !== OrderStatus.PAID || !order.invoice) {
      logger.warn(
        { orderId },
        'Cannot process receipt: order not found, not PAID, or missing invoice',
      );
      return;
    }

    // Check if receipt email has already been sent (idempotency key: ORDER_RECEIPT:<orderId>)
    const receiptKey = `ORDER_RECEIPT:${order.id}`;
    const existingEmailLog = await prisma.emailLog.findUnique({
      where: { idempotencyKey: receiptKey },
    });

    if (existingEmailLog && existingEmailLog.status === EmailLogStatus.SENT) {
      logger.info({ orderId }, 'Receipt email already successfully sent for order; skipping');
      return;
    }

    // 1. Ensure PDF is generated on disk and pdfUrl is populated
    const safeFileName = `invoice-${order.invoice.invoiceNumber.replace(/[\/\\]/g, '_')}.pdf`;
    const fullFilePath = path.join(INVOICES_DIR, safeFileName);
    let pdfBuffer: Buffer | undefined;

    if (!order.invoice.pdfUrl || !fs.existsSync(fullFilePath)) {
      const businessSetting = await prisma.appSetting.findUnique({
        where: { key: 'business_profile' },
      });
      const taxSetting = await prisma.appSetting.findUnique({ where: { key: 'tax_config' } });

      const pdfUrl = await this.generateInvoicePdf(
        order.invoice.id,
        order.invoice.invoiceNumber,
        order,
        (businessSetting?.value as any) || {},
        (taxSetting?.value as any) || {},
      );

      await prisma.invoice.update({
        where: { id: order.invoice.id },
        data: { pdfUrl },
      });
    }

    if (fs.existsSync(fullFilePath)) {
      pdfBuffer = fs.readFileSync(fullFilePath);
    }

    // Find entitlement if any to get expiresAt
    const entitlement = await prisma.entitlement.findFirst({
      where: { orderId: order.id },
    });

    // 2. Dispatch order receipt email
    await emailService.sendOrderReceiptEmail({
      to: order.user.email,
      name: order.user.name,
      courseTitle: order.product.title,
      invoiceNumber: order.invoice.invoiceNumber,
      amountPaise: order.totalPaise,
      orderId: order.id,
      userId: order.userId,
      expiresAt: entitlement?.expiresAt,
      pdfBuffer,
    });
  }

  public async sweepUnemailedPaidOrders(): Promise<number> {
    const paidOrders = await prisma.order.findMany({
      where: {
        status: OrderStatus.PAID,
      },
      select: {
        id: true,
      },
    });

    let enqueuedCount = 0;
    for (const order of paidOrders) {
      const receiptKey = `ORDER_RECEIPT:${order.id}`;
      const sentReceipt = await prisma.emailLog.findUnique({
        where: { idempotencyKey: receiptKey },
      });

      if (!sentReceipt || sentReceipt.status !== EmailLogStatus.SENT) {
        await this.enqueueReceiptJob(order.id);
        enqueuedCount++;
      }
    }

    logger.info({ enqueuedCount }, 'Sweeper finished checking PAID orders without receipt email');
    return enqueuedCount;
  }

  public startReceiptSweeper(intervalMs = 60000): void {
    if (this.sweeperInterval) return;
    this.sweeperInterval = setInterval(() => {
      this.sweepUnemailedPaidOrders().catch((err) => {
        logger.error({ err }, 'Error running receipt sweeper job');
      });
    }, intervalMs);
  }

  public stopReceiptSweeper(): void {
    if (this.sweeperInterval) {
      clearInterval(this.sweeperInterval);
      this.sweeperInterval = null;
    }
  }

  public async stopWorker(): Promise<void> {
    this.stopReceiptSweeper();
    if (this.receiptWorker) {
      await this.receiptWorker.close();
      this.receiptWorker = null;
    }
  }
}

export const invoiceService = new InvoiceService();
