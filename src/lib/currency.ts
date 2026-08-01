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
      const response = await fetch(
        `https://api.frankfurter.app/latest?amount=1&from=${cleanFrom}&to=${cleanTo}`
      );
      if (!response.ok) throw new Error(`frankfurter status ${response.status}`);
      const data = await response.json();
      if (data && data.rates && typeof data.rates[cleanTo] === 'number') {
        return data.rates[cleanTo];
      }
      throw new Error(`Invalid rates structure from frankfurter`);
    },
    async () => {
      const response = await fetch(
        `https://api.frankfurter.dev/v1/latest?amount=1&from=${cleanFrom}&to=${cleanTo}`
      );
      if (!response.ok) throw new Error(`frankfurter dev status ${response.status}`);
      const data = await response.json();
      if (data && data.rates && typeof data.rates[cleanTo] === 'number') {
        return data.rates[cleanTo];
      }
      throw new Error(`Invalid rates structure from frankfurter dev`);
    },
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

export interface RateCacheEntry {
  rate: number;
  fetchedAt: string;
}

export function getRateCache(): Record<string, RateCacheEntry> {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return {};
    const raw = localStorage.getItem('rate_cache');
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveRateCacheEntry(currency: string, rate: number, fetchedAt?: string): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const cache = getRateCache();
    const dateStr = fetchedAt || new Date().toISOString().split('T')[0];
    cache[currency.toUpperCase()] = { rate, fetchedAt: dateStr };
    localStorage.setItem('rate_cache', JSON.stringify(cache));
  } catch (err) {
    console.warn('Failed to save rate_cache:', err);
  }
}

export async function fetchRatesForCurrencies(
  baseCurrency: string,
  currencies: string[]
): Promise<Record<string, number>> {
  const cleanBase = baseCurrency.trim().toUpperCase();
  const distinct = Array.from(new Set(currencies.map((c) => c.trim().toUpperCase())));

  const results: Record<string, number> = {};
  const promises = distinct.map(async (curr) => {
    if (curr === cleanBase) {
      return { curr, rate: 1 };
    }
    const rate = await fetchExchangeRate(curr, cleanBase);
    return { curr, rate };
  });

  const settled = await Promise.allSettled(promises);
  settled.forEach((res) => {
    if (res.status === 'fulfilled') {
      results[res.value.curr] = res.value.rate;
    }
  });

  return results;
}

export interface ResolvedCurrencyRate {
  currency: string;
  rate: number | null;
  status: 'live' | 'cached' | 'unavailable';
  fetchedAt?: string;
}

export async function resolveRatesForTrip(
  baseCurrency: string,
  currencies: string[]
): Promise<Record<string, ResolvedCurrencyRate>> {
  const cleanBase = baseCurrency.trim().toUpperCase();
  const distinct = Array.from(new Set(currencies.map((c) => c.trim().toUpperCase())));

  let liveRates: Record<string, number> = {};
  try {
    liveRates = await fetchRatesForCurrencies(cleanBase, distinct);
  } catch (err) {
    console.warn('Failed to fetch live rates:', err);
  }

  const cache = getRateCache();
  const result: Record<string, ResolvedCurrencyRate> = {};

  for (const curr of distinct) {
    if (curr === cleanBase) {
      result[curr] = { currency: curr, rate: 1, status: 'live' };
      continue;
    }

    if (typeof liveRates[curr] === 'number') {
      const rate = liveRates[curr];
      const todayStr = new Date().toISOString().split('T')[0];
      saveRateCacheEntry(curr, rate, todayStr);
      result[curr] = { currency: curr, rate, status: 'live', fetchedAt: todayStr };
    } else if (cache[curr] && typeof cache[curr].rate === 'number') {
      result[curr] = {
        currency: curr,
        rate: cache[curr].rate,
        status: 'cached',
        fetchedAt: cache[curr].fetchedAt,
      };
    } else {
      result[curr] = {
        currency: curr,
        rate: null,
        status: 'unavailable',
      };
    }
  }

  return result;
}

export function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency || ''} ${amount.toFixed(2)}`;
  }
}

