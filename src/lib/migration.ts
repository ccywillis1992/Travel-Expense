import { getTrips, saveTrips, getExpenses, saveExpenses } from './storage';
import { Trip, Expense, Settings } from '../types';

export const SCHEMA_VERSION_KEY = 'schemaVersion';
export const CURRENT_SCHEMA_VERSION = 3;

export function migrateImportedData(rawTrips: any[], rawExpenses: any[], rawSettings: any): {
  trips: Trip[];
  expenses: Expense[];
  settings: Settings;
} {
  // 1. Settings
  const baseCurrency =
    rawSettings &&
    typeof rawSettings.baseCurrency === 'string' &&
    ['HKD', 'USD', 'EUR'].includes(rawSettings.baseCurrency)
      ? (rawSettings.baseCurrency as 'HKD' | 'USD' | 'EUR')
      : 'HKD';

  const settings: Settings = { baseCurrency };

  // 2. Trips
  const migratedTrips: Trip[] = (Array.isArray(rawTrips) ? rawTrips : []).map((trip: any) => {
    const t: Trip = {
      id: trip.id || `trip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: trip.name || 'Untitled Trip',
      destination: trip.destination || '',
      startDate: trip.startDate || '',
      endDate: trip.endDate || '',
      budget: trip.budget !== undefined ? trip.budget : null,
      defaultCurrency: trip.defaultCurrency || trip.summaryCurrency || 'HKD',
      participants:
        Array.isArray(trip.participants) && trip.participants.length > 0
          ? trip.participants
          : ['Me'],
      created: trip.created || new Date().toISOString(),
    };
    if (trip.viewCurrency) {
      t.viewCurrency = trip.viewCurrency;
    }
    return t;
  });

  const tripParticipantsMap = new Map<string, string[]>();
  migratedTrips.forEach((t) => {
    tripParticipantsMap.set(t.id, t.participants || ['Me']);
  });

  // 3. Expenses
  const migratedExpenses: Expense[] = (Array.isArray(rawExpenses) ? rawExpenses : []).map((exp: any) => {
    const tripParticipants = tripParticipantsMap.get(exp.tripId) || ['Me'];
    const e: Expense = {
      id: exp.id || `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tripId: exp.tripId || '',
      date: exp.date || new Date().toISOString().split('T')[0],
      description: exp.description || 'Expense',
      category: exp.category || 'Other',
      amount: typeof exp.amount === 'number' && !isNaN(exp.amount) ? exp.amount : 0,
      currency: exp.currency || 'HKD',
      paidBy: exp.paidBy || tripParticipants[0] || 'Me',
      splitAmong:
        Array.isArray(exp.splitAmong) && exp.splitAmong.length > 0
          ? exp.splitAmong
          : [...tripParticipants],
      created: exp.created || new Date().toISOString(),
      modified: exp.modified || new Date().toISOString(),
    };
    delete (e as any).exchangeRate;
    delete (e as any).convertedAmount;
    return e;
  });

  return { trips: migratedTrips, expenses: migratedExpenses, settings };
}

export function runMigrationsIfNeeded(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const version = window.localStorage.getItem(SCHEMA_VERSION_KEY);
    if (version === String(CURRENT_SCHEMA_VERSION)) return;

    const rawTrips = getTrips();
    const rawExpenses = getExpenses();
    const rawSettings = window.localStorage.getItem('settings');
    const parsedSettings = rawSettings ? JSON.parse(rawSettings) : null;

    const migrated = migrateImportedData(rawTrips, rawExpenses, parsedSettings);

    saveTrips(migrated.trips);
    saveExpenses(migrated.expenses);

    window.localStorage.setItem(SCHEMA_VERSION_KEY, String(CURRENT_SCHEMA_VERSION));
  } catch (err) {
    console.warn('Data migration warning:', err);
  }
}

