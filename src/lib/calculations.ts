import { Expense, Trip } from '../types';

export function splitAmount(amount: number, peopleCount: number): number {
  const count = peopleCount <= 0 || isNaN(peopleCount) ? 1 : peopleCount;
  return amount / count;
}

export function tripSpent(trip: Trip, expenses: Expense[]): number {
  return expenses
    .filter((e) => e.tripId === trip.id)
    .reduce((sum, e) => sum + (e.convertedAmount || 0), 0);
}

export function tripRemaining(trip: Trip, expenses: Expense[]): number {
  return trip.budget - tripSpent(trip, expenses);
}
