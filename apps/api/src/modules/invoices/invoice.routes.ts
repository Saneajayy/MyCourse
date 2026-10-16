import { Router } from 'express';
import { invoiceController } from './invoice.controller.js';
import { requireAuth } from '../../common/middleware/auth.js';

export const invoiceRouter = Router();

invoiceRouter.get('/invoices', requireAuth, (req, res, next) =>
  invoiceController.listUserInvoices(req, res, next),
);

invoiceRouter.get('/invoices/:id', requireAuth, (req, res, next) =>
  invoiceController.getInvoiceById(req, res, next),
);

invoiceRouter.get('/invoices/:id/download', requireAuth, (req, res, next) =>
  invoiceController.downloadInvoicePdf(req, res, next),
);
