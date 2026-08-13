import { Trip, Expense, Settings } from '../types';
import { getTrips, saveTrips, getExpenses, saveExpenses, clearDraftExpense } from './storage';
import { getSettings, saveSettings } from './settings';
import { CURRENT_SCHEMA_VERSION, migrateImportedData } from './migration';

export interface BackupData {
  schemaVersion: number;
  exportedAt: string;
  settings: Settings;
  trips: Trip[];
  expenses: Expense[];
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  migratedData?: {
    settings: Settings;
    trips: Trip[];
    expenses: Expense[];
  };
}

export function generateBackupJson(): string {
  const settings = getSettings();
  const trips = getTrips();
  const expenses = getExpenses();

  const backup: BackupData = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    settings,
    trips,
    expenses,
  };

  return JSON.stringify(backup, null, 2);
}

export function downloadBackupFile(): void {
  const jsonString = generateBackupJson();
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const today = new Date().toISOString().split('T')[0];

  const a = document.createElement('a');
  a.href = url;
  a.download = `travel-expense-backup-${today}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function validateAndParseBackup(jsonString: string): ValidationResult {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return {
      valid: false,
      error: 'Invalid JSON file format. Please select a valid backup JSON file.',
    };
  }

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !('schemaVersion' in parsed) ||
    !('settings' in parsed) ||
    !('trips' in parsed) ||
    !('expenses' in parsed) ||
    !Array.isArray(parsed.trips) ||
    !Array.isArray(parsed.expenses) ||
    typeof parsed.settings !== 'object' ||
    parsed.settings === null
  ) {
    return {
      valid: false,
      error: 'Invalid backup file structure. File must contain schemaVersion, settings, trips, and expenses.',
    };
  }

  const fileVersion = Number(parsed.schemaVersion);
  if (isNaN(fileVersion)) {
    return {
      valid: false,
      error: 'Invalid schemaVersion in backup file.',
    };
  }

  if (fileVersion > CURRENT_SCHEMA_VERSION) {
    return {
      valid: false,
      error: `This backup was created with a newer version of the app (v${fileVersion}). Please update the app to import this file.`,
    };
  }

  // Migrate / sanitize data if older or current version
  const migrated = migrateImportedData(parsed.trips, parsed.expenses, parsed.settings);

  return {
    valid: true,
    migratedData: migrated,
  };
}

export function applyImport(migratedData: { settings: Settings; trips: Trip[]; expenses: Expense[] }): void {
  saveSettings(migratedData.settings);
  saveTrips(migratedData.trips);
  saveExpenses(migratedData.expenses);
  clearDraftExpense();
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem('schemaVersion', String(CURRENT_SCHEMA_VERSION));
  }
}
