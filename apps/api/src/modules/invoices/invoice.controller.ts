import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { prisma } from '../../common/db/prisma.js';
import { ForbiddenError, NotFoundError } from '../../common/errors/app-error.js';
import { invoiceService } from './invoice.service.js';
import { logger } from '../../common/logger/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const INVOICES_DIR = path.resolve(__dirname, '../../../uploads/invoices');

export class InvoiceController {
  public async getInvoiceById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id: req.params.id as string },
        include: {
          order: {
            include: {
              product: true,
              user: true,
            },
          },
        },
      });

      if (!invoice) {
        throw new NotFoundError('Invoice not found');
      }

      if (invoice.order.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
        throw new ForbiddenError('You do not have permission to view this invoice.');
      }

      res.status(200).json({
        success: true,
        data: invoice,
      });
    } catch (err) {
      next(err);
    }
  }

  public async downloadInvoicePdf(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id: req.params.id as string },
        include: {
          order: {
            include: {
              product: true,
              user: true,
            },
          },
        },
      });

      if (!invoice) {
        throw new NotFoundError('Invoice not found');
      }

      if (invoice.order.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
        throw new ForbiddenError('You do not have permission to download this invoice.');
      }

      const safeFileName = `invoice-${invoice.invoiceNumber.replace(/[\/\\]/g, '_')}.pdf`;
      const filePath = path.join(INVOICES_DIR, safeFileName);

      // On-demand regeneration if pdfUrl is missing or file is gone from disk (A2)
      if (!invoice.pdfUrl || !fs.existsSync(filePath)) {
        logger.info(
          { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber },
          'Invoice PDF missing on disk or pdfUrl null; regenerating on demand',
        );
        const businessSetting = await prisma.appSetting.findUnique({
          where: { key: 'business_profile' },
        });
        const taxSetting = await prisma.appSetting.findUnique({ where: { key: 'tax_config' } });

        const pdfUrl = await invoiceService.generateInvoicePdf(
          invoice.id,
          invoice.invoiceNumber,
          invoice.order,
          (businessSetting?.value as any) || {},
          (taxSetting?.value as any) || {},
        );

        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { pdfUrl },
        });
      }

      if (!fs.existsSync(filePath)) {
        throw new NotFoundError('Invoice PDF file not found on disk.');
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);
      fs.createReadStream(filePath).pipe(res);
    } catch (err) {
      next(err);
    }
  }

  public async listUserInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const invoices = await prisma.invoice.findMany({
        where: {
          order: {
            userId: req.user!.id,
          },
        },
        orderBy: { issuedAt: 'desc' },
        include: {
          order: {
            select: {
              id: true,
              totalPaise: true,
              status: true,
              product: { select: { title: true, slug: true } },
            },
          },
        },
      });

      res.status(200).json({
        success: true,
        data: invoices,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const invoiceController = new InvoiceController();
