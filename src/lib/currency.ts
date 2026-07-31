import { ExpenseCategory } from '../types';

export const SUPPORTED_CURRENCIES: string[] = [
  'HKD',
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

  const providers = [
    async () => {
      const response = await fetch(`https://open.er-api.com/v6/latest/${cleanFrom}`);
      if (!response.ok) throw new Error(`open.er-api status ${response.status}`);
      const data = await response.json();
      if (data && data.rates && typeof data.rates[cleanTo] === 'number') {
        return data.rates[cleanTo];
      }
      throw new Error(`Invalid rates structure from open.er-api`);
    },
    async () => {
      const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${cleanFrom}`);
      if (!response.ok) throw new Error(`exchangerate-api status ${response.status}`);
      const data = await response.json();
      if (data && data.rates && typeof data.rates[cleanTo] === 'number') {
        return data.rates[cleanTo];
      }
      throw new Error(`Invalid rates structure from exchangerate-api`);
    },
    async () => {
      const response = await fetch(
        `https://api.frankfurter.dev/v1/latest?amount=1&from=${cleanFrom}&to=${cleanTo}`
      );
      if (!response.ok) throw new Error(`frankfurter status ${response.status}`);
      const data = await response.json();
      if (data && data.rates && typeof data.rates[cleanTo] === 'number') {
        return data.rates[cleanTo];
      }
      throw new Error(`Invalid rates structure from frankfurter`);
    },
  ];

  let lastError: Error | null = null;
  for (const provider of providers) {
    try {
      return await provider();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw new Error(`Failed to fetch exchange rate (${cleanFrom} -> ${cleanTo}): ${lastError?.message || 'All rate providers failed'}`);
}
