export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  flag: string;
  rateToINR: number; // 1 unit of this currency = X INR
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  INR: {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    flag: '🇮🇳',
    rateToINR: 1,
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    flag: '🇺🇸',
    rateToINR: 86.5,
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    flag: '🇪🇺',
    rateToINR: 93.2,
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    flag: '🇬🇧',
    rateToINR: 110.0,
  },
};

/**
 * Converts an amount from one currency to another using established exchange rates.
 */
export function convertPrice(
  amount: number,
  fromCurrency: string = 'INR',
  toCurrency: string = 'INR'
): number {
  if (fromCurrency === toCurrency) return amount;

  const fromCode = (fromCurrency.toUpperCase() as CurrencyCode) in CURRENCIES
    ? (fromCurrency.toUpperCase() as CurrencyCode)
    : 'INR';

  const toCode = (toCurrency.toUpperCase() as CurrencyCode) in CURRENCIES
    ? (toCurrency.toUpperCase() as CurrencyCode)
    : 'INR';

  const fromRateToINR = CURRENCIES[fromCode]?.rateToINR || 1;
  const toRateToINR = CURRENCIES[toCode]?.rateToINR || 1;

  // Convert to INR first, then convert from INR to target currency
  const inrValue = amount * fromRateToINR;
  const targetValue = inrValue / toRateToINR;

  // Round smartly: INR to nearest 10 or 50, USD/EUR/GBP to nearest 1
  if (toCode === 'INR') {
    return Math.round(targetValue / 10) * 10;
  }
  return Math.round(targetValue);
}

/**
 * Formats a numeric price into a localized currency string with proper symbols.
 * (e.g. ₹8,500 or $110)
 */
export function formatCurrency(
  amount: number,
  currency: string = 'INR',
  compact: boolean = false
): string {
  const code = (currency.toUpperCase() as CurrencyCode) in CURRENCIES
    ? (currency.toUpperCase() as CurrencyCode)
    : 'INR';

  const symbol = CURRENCIES[code]?.symbol || '₹';

  if (code === 'INR') {
    try {
      const formattedNumber = new Intl.NumberFormat('en-IN', {
        maximumFractionDigits: 0,
      }).format(amount);
      return `₹${formattedNumber}`;
    } catch {
      return `₹${amount.toLocaleString()}`;
    }
  }

  try {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(amount);
    return formatted;
  } catch {
    return `${symbol}${amount.toLocaleString()}`;
  }
}

/**
 * Returns the currency symbol for a given currency code.
 */
export function getCurrencySymbol(currency: string = 'INR'): string {
  const code = (currency.toUpperCase() as CurrencyCode) in CURRENCIES
    ? (currency.toUpperCase() as CurrencyCode)
    : 'INR';
  return CURRENCIES[code]?.symbol || '₹';
}
