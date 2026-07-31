import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { Trip, Expense } from '../types';
import { buildTripWorkbook } from './export';

describe('exportTripToExcel / buildTripWorkbook', () => {
  it('generates structured spreadsheet data with trip summary and sorted expenses', async () => {
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
        paidBy: 'Me',
        splitAmong: ['Me'],
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
        paidBy: 'Me',
        splitAmong: ['Me'],
        created: '2026-06-01T08:00:00.000Z',
        modified: '2026-06-01T08:00:00.000Z',
      },
    ];

    const ratesMap = {
      HKD: 1,
      EUR: 0.12,
      USD: 0.13,
    };

    const { workbook, fileName } = await buildTripWorkbook(mockTrip, mockExpenses, ratesMap);

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
  });
});
