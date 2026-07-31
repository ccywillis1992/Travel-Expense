import * as XLSX from 'xlsx';
import { Trip, Expense } from '../types';
import { tripSpent, tripRemaining } from './calculations';

function sanitizeSheetName(name: string): string {
  // Remove invalid characters for sheet names: \ / ? * [ ] :
  const cleaned = name.replace(/[\\/?*\[\]:]/g, '').trim();
  return cleaned.length > 0 ? cleaned.substring(0, 31) : 'Trip Expenses';
}

function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9_\-]/g, '_').toLowerCase();
  return (cleaned || 'trip') + '-expenses.xlsx';
}

export function buildTripWorkbook(trip: Trip, expenses: Expense[]): { workbook: XLSX.WorkBook; fileName: string } {
  const spent = tripSpent(trip, expenses);
  const remaining = tripRemaining(trip, expenses);

  // Sort expenses ascending by date
  const sortedExpenses = [...expenses].sort((a, b) => a.date.localeCompare(b.date));

  // Build rows array for SheetJS
  const sheetData: (string | number)[][] = [];

  // 1. Summary Block
  sheetData.push(['TRIP SUMMARY']);
  sheetData.push(['Trip Name', trip.name]);
  sheetData.push(['Destination', trip.destination || 'N/A']);
  sheetData.push(['Dates', `${trip.startDate || 'N/A'} to ${trip.endDate || 'N/A'}`]);
  sheetData.push(['Budget', trip.budget, trip.summaryCurrency]);
  sheetData.push(['Total Spent', spent, trip.summaryCurrency]);
  sheetData.push(['Remaining', remaining, trip.summaryCurrency]);
  sheetData.push([]); // blank line

  // 2. Expenses Header
  sheetData.push([
    'Date',
    'Description',
    'Category',
    'Amount',
    'Currency',
    'Exchange Rate',
    `Converted Amount (${trip.summaryCurrency})`,
    'People',
    'Split Amount',
  ]);

  // 3. Expense rows
  sortedExpenses.forEach((exp) => {
    sheetData.push([
      exp.date,
      exp.description || 'N/A',
      exp.category,
      exp.amount,
      exp.currency,
      exp.exchangeRate,
      exp.convertedAmount,
      exp.peopleCount,
      exp.splitAmount,
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
    { wch: 10 }, // People
    { wch: 14 }, // Split Amount
  ];

  const workbook = XLSX.utils.book_new();
  const sheetName = sanitizeSheetName(trip.name);
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const fileName = sanitizeFileName(trip.name);
  return { workbook, fileName };
}

export function exportTripToExcel(trip: Trip, expenses: Expense[]): void {
  const { workbook, fileName } = buildTripWorkbook(trip, expenses);
  XLSX.writeFile(workbook, fileName);
}
