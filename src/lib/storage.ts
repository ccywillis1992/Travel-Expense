import { Expense, Trip } from '../types';

const TRIPS_KEY = 'trips';
const EXPENSES_KEY = 'expenses';
const DRAFT_EXPENSE_KEY = 'draft_expense';

function safeGetItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch (err) {
    console.error(`Error reading key "${key}" from localStorage`, err);
  }
  return null;
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch (err) {
    console.error(`Error writing key "${key}" to localStorage`, err);
  }
}

function safeRemoveItem(key: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch (err) {
    console.error(`Error removing key "${key}" from localStorage`, err);
  }
}

export function seedDefaultDataIfEmpty(): void {
  const data = safeGetItem(TRIPS_KEY);
  if (!data) {
    const defaultTripId = 'trip_demo_japan_2026';
    const sampleTrips: Trip[] = [
      {
        id: defaultTripId,
        name: 'Tokyo & Kyoto 2026',
        destination: 'Japan',
        startDate: '2026-04-01',
        endDate: '2026-04-10',
        budget: 15000,
        defaultCurrency: 'JPY',
        summaryCurrency: 'JPY',
        participants: ['Me', 'Alex', 'Sam'],
        created: new Date().toISOString(),
      },
    ];

    const sampleExpenses: Expense[] = [
      {
        id: 'exp_demo_1',
        tripId: defaultTripId,
        date: '2026-04-02',
        description: 'Ichiran Ramen & Gyoza',
        category: 'Food',
        amount: 3200,
        currency: 'JPY',
        paidBy: 'Me',
        splitAmong: ['Me', 'Alex', 'Sam'],
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
      {
        id: 'exp_demo_2',
        tripId: defaultTripId,
        date: '2026-04-03',
        description: 'Shinkansen Bullet Train to Kyoto',
        category: 'Transport',
        amount: 28000,
        currency: 'JPY',
        paidBy: 'Alex',
        splitAmong: ['Me', 'Alex', 'Sam'],
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
      {
        id: 'exp_demo_3',
        tripId: defaultTripId,
        date: '2026-04-01',
        description: 'Shinjuku Granbell Hotel',
        category: 'Accommodation',
        amount: 54000,
        currency: 'JPY',
        paidBy: 'Me',
        splitAmong: ['Me', 'Alex', 'Sam'],
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
      {
        id: 'exp_demo_4',
        tripId: defaultTripId,
        date: '2026-04-04',
        description: 'Don Quijote Souvenirs',
        category: 'Shopping',
        amount: 12500,
        currency: 'JPY',
        paidBy: 'Sam',
        splitAmong: ['Me', 'Alex', 'Sam'],
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
      {
        id: 'exp_demo_5',
        tripId: defaultTripId,
        date: '2026-04-05',
        description: 'Ghibli Museum & Shrines',
        category: 'Attraction',
        amount: 6000,
        currency: 'JPY',
        paidBy: 'Me',
        splitAmong: ['Me', 'Alex', 'Sam'],
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
    ];

    saveTrips(sampleTrips);
    saveExpenses(sampleExpenses);
  }
}

export function getTrips(): Trip[] {
  let data = safeGetItem(TRIPS_KEY);
  if (!data) {
    seedDefaultDataIfEmpty();
    data = safeGetItem(TRIPS_KEY);
  }
  if (!data) return [];
  try {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to parse trips from localStorage', err);
    return [];
  }
}

export function saveTrips(trips: Trip[]): void {
  safeSetItem(TRIPS_KEY, JSON.stringify(trips));
}

export function getExpenses(): Expense[] {
  const data = safeGetItem(EXPENSES_KEY);
  if (!data) return [];
  try {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to parse expenses from localStorage', err);
    return [];
  }
}

export function saveExpenses(expenses: Expense[]): void {
  safeSetItem(EXPENSES_KEY, JSON.stringify(expenses));
}

export function getExpensesForTrip(tripId: string): Expense[] {
  const allExpenses = getExpenses();
  return allExpenses.filter((e) => e.tripId === tripId);
}

export function createTrip(tripData: Omit<Trip, 'id' | 'created'>): Trip {
  const trips = getTrips();
  const newTrip: Trip = {
    ...tripData,
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `trip_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    created: new Date().toISOString(),
  };
  trips.push(newTrip);
  saveTrips(trips);
  return newTrip;
}

export function updateTrip(updatedTrip: Trip): void {
  const trips = getTrips();
  const index = trips.findIndex((t) => t.id === updatedTrip.id);
  if (index !== -1) {
    trips[index] = updatedTrip;
    saveTrips(trips);
  }
}

export function deleteTrip(tripId: string): void {
  // Delete trip
  const trips = getTrips();
  const filteredTrips = trips.filter((t) => t.id !== tripId);
  saveTrips(filteredTrips);

  // Delete all associated expenses
  const expenses = getExpenses();
  const filteredExpenses = expenses.filter((e) => e.tripId !== tripId);
  saveExpenses(filteredExpenses);
}

export function createExpense(expenseData: Omit<Expense, 'id' | 'created' | 'modified'>): Expense {
  const expenses = getExpenses();
  const now = new Date().toISOString();

  const newExpense: Expense = {
    ...expenseData,
    paidBy: expenseData.paidBy || 'Me',
    splitAmong: expenseData.splitAmong && expenseData.splitAmong.length > 0 ? expenseData.splitAmong : ['Me'],
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `exp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    created: now,
    modified: now,
  };
  delete newExpense.exchangeRate;
  delete newExpense.convertedAmount;

  expenses.push(newExpense);
  saveExpenses(expenses);
  return newExpense;
}

export function updateExpense(updatedExpense: Expense): void {
  const expenses = getExpenses();
  const index = expenses.findIndex((e) => e.id === updatedExpense.id);
  if (index !== -1) {
    const cleaned = {
      ...updatedExpense,
      paidBy: updatedExpense.paidBy || 'Me',
      splitAmong: updatedExpense.splitAmong && updatedExpense.splitAmong.length > 0 ? updatedExpense.splitAmong : ['Me'],
      modified: new Date().toISOString(),
    };
    delete cleaned.exchangeRate;
    delete cleaned.convertedAmount;
    expenses[index] = cleaned;
    saveExpenses(expenses);
  }
}

export function deleteExpense(expenseId: string): void {
  const expenses = getExpenses();
  const filteredExpenses = expenses.filter((e) => e.id !== expenseId);
  saveExpenses(filteredExpenses);
}

export function duplicateExpense(expenseId: string): Expense | null {
  const expenses = getExpenses();
  const target = expenses.find((e) => e.id === expenseId);
  if (!target) return null;

  const now = new Date().toISOString();
  const today = now.split('T')[0];

  const duplicated: Expense = {
    ...target,
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `exp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    date: today,
    created: now,
    modified: now,
  };

  expenses.push(duplicated);
  saveExpenses(expenses);
  return duplicated;
}

export function getDraftExpense(): Partial<Expense> | null {
  const data = safeGetItem(DRAFT_EXPENSE_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to parse draft expense from localStorage', err);
    return null;
  }
}

export function saveDraftExpense(draft: Partial<Expense>): void {
  safeSetItem(DRAFT_EXPENSE_KEY, JSON.stringify(draft));
}

export function clearDraftExpense(): void {
  safeRemoveItem(DRAFT_EXPENSE_KEY);
}

export function getStorageUsageBytes(): number {
  let total = 0;
  const keys = [TRIPS_KEY, EXPENSES_KEY, DRAFT_EXPENSE_KEY];
  for (const key of keys) {
    const item = safeGetItem(key);
    if (item) {
      if (typeof Blob !== 'undefined') {
        total += new Blob([item]).size;
      } else {
        total += new TextEncoder().encode(item).length;
      }
    }
  }
  return total;
}
