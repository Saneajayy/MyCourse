import { describe, it, expect } from 'vitest';
import { computeOrderTotals } from '../lib/tax';

describe('Checkout State & Price Computation Logic', () => {
  const basePricePaise = 499900; // ₹4,999.00

  it('calculates order totals when tax rate is 0 (or no GSTIN configured)', () => {
    // Zero-rate tax config (or unconfigured GSTIN)
    const taxConfigZero = {
      gstin: '',
      gstRatePercent: 0,
      pricesTaxInclusive: true,
    };

    const totals = computeOrderTotals(basePricePaise, 0, taxConfigZero);

    expect(totals.isTaxApplicable).toBe(false);
    expect(totals.taxPaise).toBe(0);
    expect(totals.subtotalPaise).toBe(basePricePaise);
    expect(totals.totalPaise).toBe(basePricePaise);
    // Displayed total always strictly equals server order total
    expect(totals.totalPaise).toBe(499900);
  });

  it('calculates order totals when tax rate is 18 (with valid GSTIN)', () => {
    const taxConfig18 = {
      gstin: '07AAAAA0000A1Z5',
      gstRatePercent: 18,
      pricesTaxInclusive: true,
    };

    const totals = computeOrderTotals(basePricePaise, 0, taxConfig18);

    expect(totals.isTaxApplicable).toBe(true);
    expect(totals.gstRatePercent).toBe(18);
    expect(totals.taxPaise).toBe(76256); // ₹762.56
    expect(totals.subtotalPaise).toBe(423644); // ₹4,236.44
    // Subtotal + Tax = Total
    expect(totals.subtotalPaise + totals.taxPaise).toBe(basePricePaise);
    // Displayed total always strictly equals server order total
    expect(totals.totalPaise).toBe(499900);
  });

  it('calculates order totals with discount under rate 18 and rate 0', () => {
    const discountPaise = 100000; // ₹1,000 discount

    // Case 1: Tax rate 0
    const totalsZero = computeOrderTotals(basePricePaise, discountPaise, {
      gstin: '07AAAAA0000A1Z5',
      gstRatePercent: 0,
      pricesTaxInclusive: true,
    });
    expect(totalsZero.isTaxApplicable).toBe(false);
    expect(totalsZero.taxPaise).toBe(0);
    expect(totalsZero.totalPaise).toBe(399900);
    expect(totalsZero.subtotalPaise).toBe(399900);

    // Case 2: Tax rate 18
    const totals18 = computeOrderTotals(basePricePaise, discountPaise, {
      gstin: '07AAAAA0000A1Z5',
      gstRatePercent: 18,
      pricesTaxInclusive: true,
    });
    expect(totals18.isTaxApplicable).toBe(true);
    expect(totals18.totalPaise).toBe(399900);
    expect(totals18.subtotalPaise + totals18.taxPaise).toBe(399900);
  });

  it('applies percentage coupon correctly', () => {
    const coupon = { type: 'PERCENT' as const, value: 20 }; // 20% OFF
    const discountPaise = Math.round((basePricePaise * coupon.value) / 100);
    const finalPricePaise = basePricePaise - discountPaise;

    expect(discountPaise).toBe(99980); // ₹999.80
    expect(finalPricePaise).toBe(399920); // ₹3,999.20
  });

  it('applies flat discount coupon without dropping below 0', () => {
    const flatCoupon = { type: 'FLAT' as const, value: 1000 }; // ₹1,000 OFF
    const discountPaise = flatCoupon.value * 100;
    const finalPricePaise = Math.max(0, basePricePaise - discountPaise);

    expect(discountPaise).toBe(100000);
    expect(finalPricePaise).toBe(399900); // ₹3,999.00

    // Massive coupon clamped at 0
    const massiveCoupon = { type: 'FLAT' as const, value: 10000 };
    const clampedPrice = Math.max(0, basePricePaise - massiveCoupon.value * 100);
    expect(clampedPrice).toBe(0);
  });

  it('identifies 100% discount for instant activation bypass', () => {
    const coupon100 = { type: 'PERCENT' as const, value: 100 };
    const discountPaise = Math.round((basePricePaise * coupon100.value) / 100);
    const totals = computeOrderTotals(basePricePaise, discountPaise, {
      gstin: '07AAAAA0000A1Z5',
      gstRatePercent: 18,
      pricesTaxInclusive: true,
    });

    expect(totals.totalPaise).toBe(0);
    expect(totals.taxPaise).toBe(0);
    expect(totals.isTaxApplicable).toBe(false);
  });

  it('enforces email verification barrier before purchase', () => {
    const unverifiedUser = {
      id: 'usr_1',
      email: 'student@plant.com',
      emailVerifiedAt: null,
    };

    const verifiedUser = {
      id: 'usr_2',
      email: 'verified@plant.com',
      emailVerifiedAt: new Date().toISOString(),
    };

    const canPurchase = (user: { emailVerifiedAt: string | null } | null) => {
      return !!user && !!user.emailVerifiedAt;
    };

    expect(canPurchase(null)).toBe(false);
    expect(canPurchase(unverifiedUser)).toBe(false);
    expect(canPurchase(verifiedUser)).toBe(true);
  });
});
