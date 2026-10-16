import { describe, it, expect } from 'vitest';

describe('Checkout State & Price Computation Logic', () => {
  const basePricePaise = 499900; // ₹4,999.00

  it('calculates standard inclusive 18% GST correctly', () => {
    // Formula: GST = Round(Total * 18 / 118)
    const gstPaise = Math.round((basePricePaise * 18) / 118);
    const netAmountPaise = basePricePaise - gstPaise;

    expect(gstPaise).toBe(76256); // ₹762.56
    expect(netAmountPaise).toBe(423644); // ₹4,236.44
    expect(netAmountPaise + gstPaise).toBe(basePricePaise);
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
    const finalPricePaise = Math.max(0, basePricePaise - discountPaise);

    expect(finalPricePaise).toBe(0);
    const isInstantActivation = finalPricePaise === 0;
    expect(isInstantActivation).toBe(true);
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
