import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  if (currency === 'KHR') {
    // Manual format to avoid server/client hydration mismatch with km-KH locale
    return `${Math.round(amount).toLocaleString('en-US')}៛`
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

/**
 * Format amount in both USD and KHR
 * @param amountUsd - amount in USD (base currency)
 * @param exchangeRate - USD to KHR rate (e.g. 4100)
 */
export function formatDualCurrency(amountUsd: number, exchangeRate: number): string {
  const usd = formatCurrency(amountUsd, 'USD')
  const khr = formatCurrency(Math.round(amountUsd * exchangeRate), 'KHR')
  return `${usd} / ${khr}`
}

/**
 * Format KHR equivalent as a secondary display
 */
export function toKHR(amountUsd: number, exchangeRate: number): string {
  return formatCurrency(Math.round(amountUsd * exchangeRate), 'KHR')
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}
