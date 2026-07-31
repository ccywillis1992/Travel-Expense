import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { Trip, Expense } from '../types';
import { buildTripWorkbook } from './export';

describe('exportTripToExcel / buildTripWorkbook', () => {
  it('generates structured spreadsheet data with trip summary and sorted expenses', () => {
    const mockTrip: Trip = {
      id: 'trip-101',
      name: 'Euro Trip 2026',
      destination: 'Paris & Rome',
      startDate: '2026-06-01',
      endDate: '2026-06-15',
      budget: 3000,
      defaultCurrency: 'EUR',
      participants: ['Me'],
      summaryCurrency: 'EUR',
      created: '2026-05-01T00:00:00.000Z',
    };

    const mockExpenses: Expense[] = [
      {
        id: 'exp-1',
        tripId: 'trip-101',
        date: '2026-06-05',
        description: 'Gelato near Colosseum',
        category: 'Food',
        amount: 8,
        currency: 'EUR',
        exchangeRate: 1,
        convertedAmount: 8,
        paidBy: 'Me',
        splitAmong: ['Me'],
        peopleCount: 1,
        splitAmount: 8,
        created: '2026-06-05T12:00:00.000Z',
        modified: '2026-06-05T12:00:00.000Z',
      },
      {
        id: 'exp-2',
        tripId: 'trip-101',
        date: '2026-06-01',
        description: 'Flight connection USD',
        category: 'Transport',
        amount: 250,
        currency: 'USD',
        exchangeRate: 0.92,
        convertedAmount: 230,
        paidBy: 'Me',
        splitAmong: ['Me'],
        peopleCount: 2,
        splitAmount: 125,
        created: '2026-06-01T08:00:00.000Z',
        modified: '2026-06-01T08:00:00.000Z',
      },
      {
        id: 'exp-3',
        tripId: 'trip-101',
        date: '2026-06-03',
        description: 'Louvre Museum Tickets',
        category: 'Attraction',
        amount: 44,
        currency: 'EUR',
        exchangeRate: 1,
        convertedAmount: 44,
        paidBy: 'Me',
        splitAmong: ['Me'],
        peopleCount: 2,
        splitAmount: 22,
        created: '2026-06-03T10:00:00.000Z',
        modified: '2026-06-03T10:00:00.000Z',
      },
      {
        id: 'exp-4',
        tripId: 'trip-101',
        date: '2026-06-10',
        description: 'Souvenir shop GBP',
        category: 'Shopping',
        amount: 35,
        currency: 'GBP',
        exchangeRate: 1.18,
        convertedAmount: 41.3,
        paidBy: 'Me',
        splitAmong: ['Me'],
        peopleCount: 1,
        splitAmount: 35,
        created: '2026-06-10T15:00:00.000Z',
        modified: '2026-06-10T15:00:00.000Z',
      },
      {
        id: 'exp-5',
        tripId: 'trip-101',
        date: '2026-06-02',
        description: 'Bistro Dinner',
        category: 'Food',
        amount: 85,
        currency: 'EUR',
        exchangeRate: 1,
        convertedAmount: 85,
        paidBy: 'Me',
        splitAmong: ['Me'],
        peopleCount: 2,
        splitAmount: 42.5,
        created: '2026-06-02T20:00:00.000Z',
        modified: '2026-06-02T20:00:00.000Z',
      },
    ];

    const { workbook, fileName } = buildTripWorkbook(mockTrip, mockExpenses);

    expect(fileName).toBe('euro_trip_2026-expenses.xlsx');
    expect(workbook).not.toBeNull();

    const sheetName = workbook.SheetNames[0];
    expect(sheetName).toBe('Euro Trip 2026');

    const worksheet = workbook.Sheets[sheetName];
    const jsonRows = XLSX.utils.sheet_to_json<(string | number)[]>(worksheet, { header: 1 });

    // Verify header summary block
    expect(jsonRows[0][0]).toBe('TRIP SUMMARY');
    expect(jsonRows[1]).toEqual(['Trip Name', 'Euro Trip 2026']);
    expect(jsonRows[2]).toEqual(['Destination', 'Paris & Rome']);
    expect(jsonRows[3]).toEqual(['Dates', '2026-06-01 to 2026-06-15']);
    expect(jsonRows[4]).toEqual(['Budget', 3000, 'EUR']);
    expect(jsonRows[5]).toEqual(['Total Spent', 408.3, 'EUR']);
    expect(jsonRows[6]).toEqual(['Remaining', 2591.7, 'EUR']);

    // Header row
    expect(jsonRows[8]).toEqual([
      'Date',
      'Description',
      'Category',
      'Amount',
      'Currency',
      'Exchange Rate',
      'Converted Amount (EUR)',
      'People',
      'Split Amount',
    ]);

    // Sorted date ascending check (June 1, June 2, June 3, June 5, June 10)
    expect(jsonRows[9][0]).toBe('2026-06-01');
    expect(jsonRows[9][1]).toBe('Flight connection USD');
    expect(jsonRows[10][0]).toBe('2026-06-02');
    expect(jsonRows[11][0]).toBe('2026-06-03');
    expect(jsonRows[12][0]).toBe('2026-06-05');
    expect(jsonRows[13][0]).toBe('2026-06-10');
    expect(jsonRows[13][1]).toBe('Souvenir shop GBP');
  });
});
