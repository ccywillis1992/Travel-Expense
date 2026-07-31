import { Settings, BaseCurrency } from '../types';

const SETTINGS_KEY = 'settings';

export const BASE_CURRENCIES: BaseCurrency[] = ['HKD', 'USD', 'EUR'];

export function getSettings(): Settings {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const data = window.localStorage.getItem(SETTINGS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (
          parsed &&
          (parsed.baseCurrency === 'HKD' ||
            parsed.baseCurrency === 'USD' ||
            parsed.baseCurrency === 'EUR')
        ) {
          return parsed;
        }
      }
    }
  } catch (err) {
    console.error('Error reading settings from localStorage', err);
  }
  return { baseCurrency: 'HKD' };
}

export function saveSettings(settings: Settings): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }
  } catch (err) {
    console.error('Error saving settings to localStorage', err);
  }
}
