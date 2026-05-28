export const CURRENCY_SYMBOL = '₹';
export const CURRENCY_LOCALE = 'en-IN';
export const CURRENCY_CODE   = 'INR';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style:                 'currency',
    currency:              'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Short version: ₹1.5L / ₹12.3K / -₹1.5K (sign always before ₹)
export function formatCurrencyShort(amount: number): string {
  const abs  = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 10_00_000) return `${sign}₹${(abs / 10_00_000).toFixed(1)}L`;
  if (abs >= 1_000)     return `${sign}₹${(abs / 1_000).toFixed(1)}K`;
  return formatCurrency(amount); // uses Intl which handles sign correctly
}
