import { describe, it, expect } from 'vitest';
import {
  splitAmount,
  tripSpent,
  tripRemaining,
  calculateTripSpent,
  calculateParticipantBalances,
  simplifyDebts,
} from './calculations';
import { Trip, Expense } from '../types';

describe('calculations', () => {
  describe('splitAmount', () => {
    it('calculates normal split correctly', () => {
      expect(splitAmount(100, 4)).toBe(25);
      expect(splitAmount(50, 2)).toBe(25);
    });

    it('handles peopleCount of 1 correctly', () => {
      expect(splitAmount(100, 1)).toBe(100);
    });

    it('guards against non-positive or invalid peopleCount by treating it as 1', () => {
      expect(splitAmount(100, 0)).toBe(100);
      expect(splitAmount(100, -2)).toBe(100);
      expect(splitAmount(100, NaN)).toBe(100);
    });
  });

  describe('tripSpent and tripRemaining', () => {
    const mockTrip: Trip = {
      id: 'trip-1',
      name: 'Japan 2026',
      destination: 'Tokyo',
      startDate: '2026-04-01',
      endDate: '2026-04-10',
      budget: 2000,
      defaultCurrency: 'USD',
      participants: ['Me'],
      summaryCurrency: 'USD',
      created: '2026-03-01T00:00:00.000Z',
    };

    it('returns 0 spent and full budget remaining when there are zero expenses', () => {
      expect(tripSpent(mockTrip, [], {}, 'HKD')).toBe(0);
      expect(tripRemaining(mockTrip, [], {}, 'HKD')).toBe(2000);
    });

    it('calculates spent using ratesMap correctly', () => {
      const expenses: Expense[] = [
        {
          id: 'exp-1',
          tripId: 'trip-1',
          date: '2026-04-01',
          description: 'Ramen',
          category: 'Food',
          amount: 1000,
          currency: 'JPY',
          paidBy: 'Me',
          splitAmong: ['Me'],
          created: '2026-04-01T10:00:00.000Z',
          modified: '2026-04-01T10:00:00.000Z',
        },
        {
          id: 'exp-2',
          tripId: 'trip-1',
          date: '2026-04-02',
          description: 'Hotel',
          category: 'Accommodation',
          amount: 100,
          currency: 'USD',
          paidBy: 'Me',
          splitAmong: ['Me'],
          created: '2026-04-02T10:00:00.000Z',
          modified: '2026-04-02T10:00:00.000Z',
        },
      ];

      const ratesMap = {
        JPY: 0.05,
        USD: 7.8,
        HKD: 1,
      };

      const summary = calculateTripSpent(mockTrip, expenses, ratesMap, 'HKD');
      expect(summary.rawDefaultSpent).toBe(100); // USD expense matches defaultCurrency (USD)
      expect(summary.baseSpent).toBe(1000 * 0.05 + 100 * 7.8); // 50 + 780 = 830 HKD
      expect(summary.otherCurrenciesCount).toBe(1); // JPY is not USD
    });
  });

  describe('settle-up and debt simplification', () => {
    const baseTrip: Trip = {
      id: 'trip-settle',
      name: 'Group Trip',
      destination: 'Paris',
      startDate: '2026-06-01',
      endDate: '2026-06-07',
      budget: null,
      defaultCurrency: 'USD',
      participants: ['Alice', 'Bob', 'Charlie'],
      created: '2026-05-01T00:00:00.000Z',
    };

    it('calculates balances and settlements for an even 3-way split with one payer', () => {
      const expenses: Expense[] = [
        {
          id: 'e1',
          tripId: 'trip-settle',
          date: '2026-06-01',
          description: 'Dinner',
          category: 'Food',
          amount: 90,
          currency: 'USD',
          paidBy: 'Alice',
          splitAmong: ['Alice', 'Bob', 'Charlie'],
          created: '2026-06-01T00:00:00.000Z',
          modified: '2026-06-01T00:00:00.000Z',
        },
      ];

      const result = calculateParticipantBalances(baseTrip, expenses, { USD: 1 }, 'USD');

      expect(result.details.Alice).toEqual({ totalPaid: 90, totalOwed: 30, balance: 60 });
      expect(result.details.Bob).toEqual({ totalPaid: 0, totalOwed: 30, balance: -30 });
      expect(result.details.Charlie).toEqual({ totalPaid: 0, totalOwed: 30, balance: -30 });

      expect(result.settlements).toHaveLength(2);
      expect(result.settlements).toContainEqual({ from: 'Bob', to: 'Alice', amount: 30 });
      expect(result.settlements).toContainEqual({ from: 'Charlie', to: 'Alice', amount: 30 });
    });

    it('handles an uneven split where someone is excluded from some expenses', () => {
      const expenses: Expense[] = [
        {
          id: 'e1',
          tripId: 'trip-settle',
          date: '2026-06-01',
          description: 'Dinner',
          category: 'Food',
          amount: 90,
          currency: 'USD',
          paidBy: 'Alice',
          splitAmong: ['Alice', 'Bob', 'Charlie'],
          created: '2026-06-01T00:00:00.000Z',
          modified: '2026-06-01T00:00:00.000Z',
        },
        {
          id: 'e2',
          tripId: 'trip-settle',
          date: '2026-06-02',
          description: 'Taxi for Bob & Charlie',
          category: 'Transport',
          amount: 60,
          currency: 'USD',
          paidBy: 'Bob',
          splitAmong: ['Bob', 'Charlie'],
          created: '2026-06-02T00:00:00.000Z',
          modified: '2026-06-02T00:00:00.000Z',
        },
      ];

      const result = calculateParticipantBalances(baseTrip, expenses, { USD: 1 }, 'USD');

      expect(result.details.Alice).toEqual({ totalPaid: 90, totalOwed: 30, balance: 60 });
      expect(result.details.Bob).toEqual({ totalPaid: 60, totalOwed: 60, balance: 0 });
      expect(result.details.Charlie).toEqual({ totalPaid: 0, totalOwed: 60, balance: -60 });

      expect(result.settlements).toEqual([
        { from: 'Charlie', to: 'Alice', amount: 60 },
      ]);
    });

    it('returns zero transactions for an already-settled trip', () => {
      const expenses: Expense[] = [
        {
          id: 'e1',
          tripId: 'trip-settle',
          date: '2026-06-01',
          description: 'Lunch',
          category: 'Food',
          amount: 50,
          currency: 'USD',
          paidBy: 'Alice',
          splitAmong: ['Alice', 'Bob'],
          created: '2026-06-01T00:00:00.000Z',
          modified: '2026-06-01T00:00:00.000Z',
        },
        {
          id: 'e2',
          tripId: 'trip-settle',
          date: '2026-06-02',
          description: 'Museum',
          category: 'Attraction',
          amount: 50,
          currency: 'USD',
          paidBy: 'Bob',
          splitAmong: ['Alice', 'Bob'],
          created: '2026-06-02T00:00:00.000Z',
          modified: '2026-06-02T00:00:00.000Z',
        },
      ];

      const twoPersonTrip: Trip = { ...baseTrip, participants: ['Alice', 'Bob'] };
      const result = calculateParticipantBalances(twoPersonTrip, expenses, { USD: 1 }, 'USD');

      expect(result.details.Alice.balance).toBe(0);
      expect(result.details.Bob.balance).toBe(0);
      expect(result.settlements).toEqual([]);

      // Also directly test simplifyDebts with 0 balances
      expect(simplifyDebts({ Alice: 0, Bob: 0, Charlie: 0 })).toEqual([]);
    });
  });
});

