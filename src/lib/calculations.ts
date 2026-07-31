import { Expense, Trip } from '../types';

export function splitAmount(amount: number, peopleCount: number): number {
  const count = peopleCount <= 0 || isNaN(peopleCount) ? 1 : peopleCount;
  return amount / count;
}

export function personSplitAmount(amount: number, splitCount: number): number {
  const count = splitCount <= 0 || isNaN(splitCount) ? 1 : splitCount;
  return amount / count;
}

export function tripSpent(trip: Trip, expenses: Expense[]): number {
  return expenses
    .filter((e) => e.tripId === trip.id)
    .reduce((sum, e) => sum + (e.convertedAmount || 0), 0);
}

export function tripRemaining(trip: Trip, expenses: Expense[]): number | null {
  if (trip.budget === null || trip.budget === undefined) {
    return null;
  }
  return trip.budget - tripSpent(trip, expenses);
}
