import { ExpenseCategory } from '../types';

export const SUPPORTED_CURRENCIES: string[] = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'AUD',
  'CAD',
  'CHF',
  'CNY',
  'INR',
  'THB',
  'SGD',
  'MYR',
  'IDR',
  'VND',
  'KRW',
  'MXN',
  'NZD',
  'BRL',
  'SEK',
  'NOK',
];

export const CATEGORIES: ExpenseCategory[] = [
  'Food',
  'Transport',
  'Accommodation',
  'Shopping',
  'Entertainment',
  'Attraction',
  'Groceries',
  'Others',
];

export async function fetchExchangeRate(from: string, to: string): Promise<number> {
  const cleanFrom = from.trim().toUpperCase();
  const cleanTo = to.trim().toUpperCase();

  if (cleanFrom === cleanTo) {
    return 1;
  }

  try {
    const response = await fetch(
      `https://api.frankfurter.app/latest?amount=1&from=${cleanFrom}&to=${cleanTo}`
    );

    if (!response.ok) {
      throw new Error(`Exchange rate API responded with status ${response.status}`);
    }

    const data = await response.json();

    if (data && data.rates && typeof data.rates[cleanTo] === 'number') {
      return data.rates[cleanTo];
    } else {
      throw new Error(`Invalid response format for exchange rate ${cleanFrom} to ${cleanTo}`);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown network error';
    throw new Error(`Failed to fetch exchange rate (${cleanFrom} -> ${cleanTo}): ${msg}`);
  }
}
