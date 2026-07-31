import { describe, it, expect } from 'vitest';
import { splitAmount, tripSpent, tripRemaining, calculateTripSpent } from './calculations';
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
});
