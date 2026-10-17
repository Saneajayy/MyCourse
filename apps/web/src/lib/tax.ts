export interface TaxConfig {
  gstin: string;
  gstRatePercent: number;
  pricesTaxInclusive: boolean;
}

export interface OrderTotals {
  basePricePaise: number;
  discountPaise: number;
  subtotalPaise: number;
  taxPaise: number;
  totalPaise: number;
  gstRatePercent: number;
  isTaxApplicable: boolean;
}

/**
 * Calculates order subtotal, discount, tax, and total strictly matching server-side rules.
 * If GSTIN is unset or gstRatePercent <= 0, no tax lines are applied.
 * Integer half-up rounding (Math.round) at the paise level.
 */
export function computeOrderTotals(
  basePricePaise: number,
  discountPaise = 0,
  taxConfig?: TaxConfig | null,
): OrderTotals {
  const netPayable = Math.max(0, basePricePaise - discountPaise);
  const gstin = taxConfig?.gstin?.trim() || '';
  const rate = Number(taxConfig?.gstRatePercent) || 0;
  const isInclusive = taxConfig?.pricesTaxInclusive !== false;

  // If GSTIN is unset or rate is 0 or price is 0, no tax lines are applied
  if (!gstin || rate <= 0 || netPayable === 0) {
    return {
      basePricePaise,
      discountPaise,
      subtotalPaise: netPayable,
      taxPaise: 0,
      totalPaise: netPayable,
      gstRatePercent: 0,
      isTaxApplicable: false,
    };
  }

  if (isInclusive) {
    // subtotal = round((total * 100) / (100 + gstRate))
    const subtotal = Math.round((netPayable * 10000) / (10000 + rate * 100));
    const tax = netPayable - subtotal;
    return {
      basePricePaise,
      discountPaise,
      subtotalPaise: subtotal,
      taxPaise: tax,
      totalPaise: netPayable,
      gstRatePercent: rate,
      isTaxApplicable: true,
    };
  } else {
    const tax = Math.round((netPayable * rate) / 100);
    return {
      basePricePaise,
      discountPaise,
      subtotalPaise: netPayable,
      taxPaise: tax,
      totalPaise: netPayable + tax,
      gstRatePercent: rate,
      isTaxApplicable: true,
    };
  }
}
