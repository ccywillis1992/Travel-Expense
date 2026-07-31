import { getTrips, saveTrips, getExpenses, saveExpenses } from './storage';
import { Trip, Expense } from '../types';

const SCHEMA_VERSION_KEY = 'schemaVersion';
const CURRENT_SCHEMA_VERSION = '3';

export function runMigrationsIfNeeded(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const version = window.localStorage.getItem(SCHEMA_VERSION_KEY);
    if (version === CURRENT_SCHEMA_VERSION) return;

    const rawTrips = getTrips();
    const rawExpenses = getExpenses();

    let tripsChanged = false;
    let expensesChanged = false;

    const migratedTrips: Trip[] = rawTrips.map((trip: any) => {
      let t = { ...trip };
      if (!t.defaultCurrency) {
        t.defaultCurrency = t.summaryCurrency || 'HKD';
        tripsChanged = true;
      }
      if (!t.participants || !Array.isArray(t.participants) || t.participants.length === 0) {
        t.participants = ['Me'];
        tripsChanged = true;
      }
      if (t.budget === undefined) {
        t.budget = null;
        tripsChanged = true;
      }
      return t;
    });

    const tripParticipantsMap = new Map<string, string[]>();
    migratedTrips.forEach((t) => {
      tripParticipantsMap.set(t.id, t.participants || ['Me']);
    });

    const migratedExpenses: Expense[] = rawExpenses.map((exp: any) => {
      let e = { ...exp };
      const tripParticipants = tripParticipantsMap.get(e.tripId) || ['Me'];
      if (!e.paidBy) {
        e.paidBy = tripParticipants[0] || 'Me';
        expensesChanged = true;
      }
      if (!e.splitAmong || !Array.isArray(e.splitAmong) || e.splitAmong.length === 0) {
        e.splitAmong = [...tripParticipants];
        expensesChanged = true;
      }
      if ('exchangeRate' in e) {
        delete e.exchangeRate;
        expensesChanged = true;
      }
      if ('convertedAmount' in e) {
        delete e.convertedAmount;
        expensesChanged = true;
      }
      return e;
    });

    if (tripsChanged) {
      saveTrips(migratedTrips);
    }
    if (expensesChanged) {
      saveExpenses(migratedExpenses);
    }

    window.localStorage.setItem(SCHEMA_VERSION_KEY, CURRENT_SCHEMA_VERSION);
  } catch (err) {
    console.warn('Data migration warning:', err);
  }
}
