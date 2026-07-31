import { describe, it, expect } from 'vitest';
import { splitAmount, tripSpent, tripRemaining } from './calculations';
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
      summaryCurrency: 'USD',
      created: '2026-03-01T00:00:00.000Z',
    };

    it('returns 0 spent and full budget remaining when there are zero expenses', () => {
      expect(tripSpent(mockTrip, [])).toBe(0);
      expect(tripRemaining(mockTrip, [])).toBe(2000);
    });

    it('ignores expenses belonging to other trips', () => {
      const expenses: Expense[] = [
        {
          id: 'exp-other',
          tripId: 'trip-2',
          date: '2026-04-02',
          description: 'Other trip expense',
          category: 'Food',
          amount: 50,
          currency: 'USD',
          exchangeRate: 1,
          convertedAmount: 50,
          peopleCount: 1,
          splitAmount: 50,
          created: '2026-04-02T10:00:00.000Z',
          modified: '2026-04-02T10:00:00.000Z',
        },
      ];
      expect(tripSpent(mockTrip, expenses)).toBe(0);
      expect(tripRemaining(mockTrip, expenses)).toBe(2000);
    });

    it('calculates total spent with mixed currencies already converted', () => {
      const expenses: Expense[] = [
        {
          id: 'exp-1',
          tripId: 'trip-1',
          date: '2026-04-01',
          description: 'Ramen',
          category: 'Food',
          amount: 1500,
          currency: 'JPY',
          exchangeRate: 0.0067,
          convertedAmount: 10.05,
          peopleCount: 1,
          splitAmount: 1500,
          created: '2026-04-01T10:00:00.000Z',
          modified: '2026-04-01T10:00:00.000Z',
        },
        {
          id: 'exp-2',
          tripId: 'trip-1',
          date: '2026-04-02',
          description: 'Hotel tax',
          category: 'Accommodation',
          amount: 50,
          currency: 'USD',
          exchangeRate: 1,
          convertedAmount: 50,
          peopleCount: 2,
          splitAmount: 25,
          created: '2026-04-02T10:00:00.000Z',
          modified: '2026-04-02T10:00:00.000Z',
        },
      ];

      expect(tripSpent(mockTrip, expenses)).toBeCloseTo(60.05);
      expect(tripRemaining(mockTrip, expenses)).toBeCloseTo(1939.95);
    });
  });
});
