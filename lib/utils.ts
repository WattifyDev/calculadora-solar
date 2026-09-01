import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | null | undefined, currency: string = 'EUR') {
  if (amount === null || typeof amount === 'undefined') return 'N/A';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatNumber(num: number | null | undefined) {
  if (num === null || typeof num === 'undefined') return 'N/A';
  return new Intl.NumberFormat('es-ES').format(num);
}

export function getPaybackDisplay(paybackYears: number | null | undefined, firstYearSavings: number | null | undefined, lifetimeSavings: number | null | undefined): string {
  if (
    paybackYears === null ||
    paybackYears === undefined ||
    paybackYears === 0 ||
    (typeof firstYearSavings === 'number' && firstYearSavings <= 0) ||
    (typeof lifetimeSavings === 'number' && lifetimeSavings <= 0)
  ) {
    return 'No se amortiza';
  }
  return `${Math.round(paybackYears)} años`;
}
