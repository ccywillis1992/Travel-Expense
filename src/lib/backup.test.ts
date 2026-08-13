import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateBackupJson,
  validateAndParseBackup,
  applyImport,
} from './backup';
import { CURRENT_SCHEMA_VERSION } from './migration';
import { saveTrips, saveExpenses, getTrips, getExpenses } from './storage';
import { saveSettings, getSettings } from './settings';
import { Trip, Expense } from '../types';

// Mock localStorage for node test environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, 'window', {
  value: {
    localStorage: localStorageMock,
  },
  writable: true,
});

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('Backup Export & Import', () => {
  beforeEach(() => {
    localStorage.clear();
  });


  it('generates a valid backup JSON with expected top-level fields', () => {
    saveSettings({ baseCurrency: 'USD' });
    const sampleTrip: Trip = {
      id: 'trip-1',
      name: 'Paris Trip',
      destination: 'France',
      startDate: '2026-05-01',
      endDate: '2026-05-07',
      budget: 2000,
      defaultCurrency: 'EUR',
      participants: ['Me', 'Alice'],
      created: '2026-05-01T00:00:00.000Z',
    };
    saveTrips([sampleTrip]);

    const sampleExpense: Expense = {
      id: 'exp-1',
      tripId: 'trip-1',
      date: '2026-05-02',
      description: 'Croissant & Coffee',
      category: 'Food',
      amount: 15,
      currency: 'EUR',
      paidBy: 'Me',
      splitAmong: ['Me', 'Alice'],
      created: '2026-05-02T00:00:00.000Z',
      modified: '2026-05-02T00:00:00.000Z',
    };
    saveExpenses([sampleExpense]);

    const json = generateBackupJson();
    const parsed = JSON.parse(json);

    expect(parsed.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(parsed.exportedAt).toBeDefined();
    expect(parsed.settings.baseCurrency).toBe('USD');
    expect(parsed.trips).toHaveLength(1);
    expect(parsed.trips[0].name).toBe('Paris Trip');
    expect(parsed.expenses).toHaveLength(1);
    expect(parsed.expenses[0].description).toBe('Croissant & Coffee');
  });

  it('rejects invalid JSON files', () => {
    const res = validateAndParseBackup('{ bad json ');
    expect(res.valid).toBe(false);
    expect(res.error).toContain('Invalid JSON file format');
  });

  it('rejects backup missing top-level keys', () => {
    const res = validateAndParseBackup(JSON.stringify({ schemaVersion: 3, trips: [] }));
    expect(res.valid).toBe(false);
    expect(res.error).toContain('Invalid backup file structure');
  });

  it('rejects backup with newer schemaVersion', () => {
    const futureBackup = {
      schemaVersion: 99,
      settings: { baseCurrency: 'HKD' },
      trips: [],
      expenses: [],
    };
    const res = validateAndParseBackup(JSON.stringify(futureBackup));
    expect(res.valid).toBe(false);
    expect(res.error).toContain('newer version of the app');
  });

  it('migrates older schemaVersion backup cleanly', () => {
    const oldBackup = {
      schemaVersion: 1,
      settings: { baseCurrency: 'EUR' },
      trips: [
        {
          id: 'trip-old',
          name: 'Old Trip',
          destination: 'Italy',
          startDate: '2025-01-01',
          endDate: '2025-01-05',
          summaryCurrency: 'EUR',
          // missing defaultCurrency, participants, budget
        },
      ],
      expenses: [
        {
          id: 'exp-old',
          tripId: 'trip-old',
          description: 'Pizza',
          amount: 20,
          currency: 'EUR',
          // missing paidBy, splitAmong
        },
      ],
    };

    const res = validateAndParseBackup(JSON.stringify(oldBackup));
    expect(res.valid).toBe(true);
    expect(res.migratedData).toBeDefined();

    const data = res.migratedData!;
    expect(data.settings.baseCurrency).toBe('EUR');
    expect(data.trips[0].defaultCurrency).toBe('EUR');
    expect(data.trips[0].participants).toEqual(['Me']);
    expect(data.expenses[0].paidBy).toBe('Me');
    expect(data.expenses[0].splitAmong).toEqual(['Me']);
  });

  it('applies import and overwrites current data', () => {
    // Current state before import
    saveTrips([{ id: 'old-1', name: 'Trash Trip', destination: '', startDate: '', endDate: '', budget: null, defaultCurrency: 'HKD', participants: ['Me'], created: '' }]);
    saveExpenses([{ id: 'exp-trash', tripId: 'old-1', date: '', description: '', category: 'Food', amount: 10, currency: 'HKD', paidBy: 'Me', splitAmong: ['Me'], created: '', modified: '' }]);
    saveSettings({ baseCurrency: 'HKD' });

    const newBackup = {
      settings: { baseCurrency: 'USD' as const },
      trips: [{ id: 'restored-1', name: 'Restored Trip', destination: 'Hawaii', startDate: '2026-06-01', endDate: '2026-06-10', budget: 3000, defaultCurrency: 'USD', participants: ['Me', 'Bob'], created: '' }],
      expenses: [{ id: 'exp-restored', tripId: 'restored-1', date: '2026-06-02', description: 'Luau', category: 'Attraction' as const, amount: 150, currency: 'USD', paidBy: 'Bob', splitAmong: ['Me', 'Bob'], created: '', modified: '' }],
    };

    applyImport(newBackup);

    expect(getSettings().baseCurrency).toBe('USD');
    const trips = getTrips();
    expect(trips).toHaveLength(1);
    expect(trips[0].name).toBe('Restored Trip');

    const expenses = getExpenses();
    expect(expenses).toHaveLength(1);
    expect(expenses[0].description).toBe('Luau');
  });
});
