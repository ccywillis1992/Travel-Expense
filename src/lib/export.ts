import * as XLSX from 'xlsx';
import { Trip, Expense } from '../types';
import { calculateTripSpent, personSplitAmount } from './calculations';
import { fetchRatesForCurrencies, getRateCache } from './currency';
import { getSettings } from './settings';

function sanitizeSheetName(name: string): string {
  const cleaned = name.replace(/[\\/?*\[\]:]/g, '').trim();
  return cleaned.length > 0 ? cleaned.substring(0, 31) : 'Trip Expenses';
}

function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9_\-]/g, '_').toLowerCase();
  return (cleaned || 'trip') + '-expenses.xlsx';
}

export async function buildTripWorkbook(
  trip: Trip,
  expenses: Expense[],
  passedRatesMap?: Record<string, number | null>
): Promise<{ workbook: XLSX.WorkBook; fileName: string }> {
  const baseCurrency = getSettings().baseCurrency;
  let ratesMap: Record<string, number | null> = passedRatesMap ? { ...passedRatesMap } : {};

  if (!passedRatesMap) {
    const currencies = Array.from(new Set([baseCurrency, ...expenses.map((e) => e.currency)]));
    try {
      const live = await fetchRatesForCurrencies(baseCurrency, currencies);
      const cache = getRateCache();
      currencies.forEach((c) => {
        if (c === baseCurrency) {
          ratesMap[c] = 1;
        } else if (typeof live[c] === 'number') {
          ratesMap[c] = live[c];
        } else if (cache[c] && typeof cache[c].rate === 'number') {
          ratesMap[c] = cache[c].rate;
        } else {
          ratesMap[c] = null;
        }
      });
    } catch {
      const cache = getRateCache();
      currencies.forEach((c) => {
        if (c === baseCurrency) {
          ratesMap[c] = 1;
        } else if (cache[c] && typeof cache[c].rate === 'number') {
          ratesMap[c] = cache[c].rate;
        } else {
          ratesMap[c] = null;
        }
      });
    }
  }

  const summary = calculateTripSpent(trip, expenses, ratesMap, baseCurrency);
  const hasBudget = trip.budget !== null && trip.budget !== undefined;
  const remaining = hasBudget ? trip.budget! - summary.baseSpent : 'N/A';

  // Sort expenses ascending by date
  const sortedExpenses = [...expenses].sort((a, b) => a.date.localeCompare(b.date));

  // Build rows array for SheetJS
  const sheetData: (string | number)[][] = [];

  // 1. Summary Block
  sheetData.push(['TRIP SUMMARY']);
  sheetData.push(['Trip Name', trip.name]);
  sheetData.push(['Destination', trip.destination || 'N/A']);
  sheetData.push(['Dates', `${trip.startDate || 'N/A'} to ${trip.endDate || 'N/A'}`]);
  sheetData.push(['Base Currency', baseCurrency]);
  sheetData.push(['Budget', hasBudget ? trip.budget! : 'N/A', baseCurrency]);
  sheetData.push(['Total Spent', summary.baseSpent, baseCurrency]);
  sheetData.push(['Remaining', remaining, baseCurrency]);
  sheetData.push([]); // blank line

  // 2. Expenses Header
  sheetData.push([
    'Date',
    'Description',
    'Category',
    'Amount',
    'Currency',
    'Exchange Rate',
    `Converted Amount (${baseCurrency})`,
    'Paid By',
    'Split Among',
    'Split Amount per Person',
  ]);

  // 3. Expense rows
  sortedExpenses.forEach((exp) => {
    const rate = exp.currency === baseCurrency ? 1 : ratesMap[exp.currency];
    const converted = typeof rate === 'number' && !isNaN(rate) ? exp.amount * rate : 'N/A';
    const splitList = exp.splitAmong && exp.splitAmong.length > 0 ? exp.splitAmong : ['Me'];
    const perPerson = personSplitAmount(exp.amount, splitList.length);

    sheetData.push([
      exp.date,
      exp.description || 'N/A',
      exp.category,
      exp.amount,
      exp.currency,
      typeof rate === 'number' ? rate : 'N/A',
      converted,
      exp.paidBy || 'Me',
      splitList.join(', '),
      perPerson,
    ]);
  });

  // Create workbook and worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

  // Set column widths for clean presentation
  worksheet['!cols'] = [
    { wch: 12 }, // Date
    { wch: 25 }, // Description
    { wch: 15 }, // Category
    { wch: 12 }, // Amount
    { wch: 10 }, // Currency
    { wch: 15 }, // Exchange Rate
    { wch: 22 }, // Converted Amount
    { wch: 15 }, // Paid By
    { wch: 20 }, // Split Among
    { wch: 20 }, // Split Amount
  ];

  const workbook = XLSX.utils.book_new();
  const sheetName = sanitizeSheetName(trip.name);
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const fileName = sanitizeFileName(trip.name);
  return { workbook, fileName };
}

export async function exportTripToExcel(
  trip: Trip,
  expenses: Expense[],
  passedRatesMap?: Record<string, number | null>
): Promise<void> {
  const { workbook, fileName } = await buildTripWorkbook(trip, expenses, passedRatesMap);
  XLSX.writeFile(workbook, fileName);
}
