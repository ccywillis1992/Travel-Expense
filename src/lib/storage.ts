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

export function getTrips(): Trip[] {
  const data = safeGetItem(TRIPS_KEY);
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
  const peopleCount = expenseData.peopleCount > 0 ? expenseData.peopleCount : 1;
  const splitAmount = expenseData.amount / peopleCount;

  const newExpense: Expense = {
    ...expenseData,
    peopleCount,
    splitAmount: isNaN(splitAmount) ? expenseData.amount : splitAmount,
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `exp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    created: now,
    modified: now,
  };

  expenses.push(newExpense);
  saveExpenses(expenses);
  return newExpense;
}

export function updateExpense(updatedExpense: Expense): void {
  const expenses = getExpenses();
  const index = expenses.findIndex((e) => e.id === updatedExpense.id);
  if (index !== -1) {
    const peopleCount = updatedExpense.peopleCount > 0 ? updatedExpense.peopleCount : 1;
    const splitAmount = updatedExpense.amount / peopleCount;

    expenses[index] = {
      ...updatedExpense,
      peopleCount,
      splitAmount: isNaN(splitAmount) ? updatedExpense.amount : splitAmount,
      modified: new Date().toISOString(),
    };
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
