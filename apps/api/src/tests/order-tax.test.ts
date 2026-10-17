import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../common/db/prisma.js';
import { calculateTaxAndTotals } from '../modules/invoices/invoice.service.js';
import { uuidv7 } from 'uuidv7';

describe('Order & Tax Configuration Integration Tests', () => {
  const app = createApp();
  const originalTaxConfigKey = 'tax_config';
  let initialSetting: any = null;

  beforeAll(async () => {
    initialSetting = await prisma.appSetting.findUnique({
      where: { key: originalTaxConfigKey },
    });
  });

  afterAll(async () => {
    if (initialSetting) {
      await prisma.appSetting.update({
        where: { key: originalTaxConfigKey },
        data: { value: initialSetting.value },
      });
    }
  });

  it('GET /api/v1/orders/tax-config returns public tax configuration without authentication', async () => {
    const res = await request(app).get('/api/v1/orders/tax-config');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(typeof res.body.data.gstRatePercent).toBe('number');
    expect(typeof res.body.data.pricesTaxInclusive).toBe('boolean');
  });

  it('calculates 0 tax and total equals base price when tax rate is 0', async () => {
    await prisma.appSetting.upsert({
      where: { key: originalTaxConfigKey },
      create: {
        id: uuidv7(),
        key: originalTaxConfigKey,
        value: {
          gstin: '',
          gstRatePercent: 0,
          pricesTaxInclusive: true,
        },
      },
      update: {
        value: {
          gstin: '',
          gstRatePercent: 0,
          pricesTaxInclusive: true,
        },
      },
    });

    const basePricePaise = 499900;
    const result = await calculateTaxAndTotals(basePricePaise, 0);

    expect(result.isTaxExemptOrZero).toBe(true);
    expect(result.taxPaise).toBe(0);
    expect(result.subtotalPaise).toBe(basePricePaise);
    expect(result.totalPaise).toBe(basePricePaise);
  });

  it('calculates inclusive 18% tax correctly when tax rate is 18 with valid GSTIN', async () => {
    await prisma.appSetting.upsert({
      where: { key: originalTaxConfigKey },
      create: {
        id: uuidv7(),
        key: originalTaxConfigKey,
        value: {
          gstin: '07AAAAA0000A1Z5',
          gstRatePercent: 18,
          pricesTaxInclusive: true,
        },
      },
      update: {
        value: {
          gstin: '07AAAAA0000A1Z5',
          gstRatePercent: 18,
          pricesTaxInclusive: true,
        },
      },
    });

    const basePricePaise = 499900;
    const result = await calculateTaxAndTotals(basePricePaise, 0);

    expect(result.isTaxExemptOrZero).toBe(false);
    expect(result.gstRatePercent).toBe(18);
    expect(result.taxPaise).toBe(76256);
    expect(result.subtotalPaise).toBe(423644);
    expect(result.subtotalPaise + result.taxPaise).toBe(basePricePaise);
    expect(result.totalPaise).toBe(basePricePaise);
  });
});
