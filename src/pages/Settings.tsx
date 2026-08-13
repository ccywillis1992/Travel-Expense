import { useState, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSettings, saveSettings, BASE_CURRENCIES } from '../lib/settings';
import { getTrips, getExpenses } from '../lib/storage';
import { downloadBackupFile, validateAndParseBackup, applyImport } from '../lib/backup';
import { BaseCurrency, Trip, Expense, Settings as SettingsType } from '../types';

export default function Settings() {
  const navigate = useNavigate();
  const [settings, setSettingsState] = useState<SettingsType>(getSettings());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<{
    settings: SettingsType;
    trips: Trip[];
    expenses: Expense[];
  } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleCurrencyChange = (newCurrency: BaseCurrency) => {
    const updated = { baseCurrency: newCurrency };
    setSettingsState(updated);
    saveSettings(updated);
    setToastMessage(`✓ Base currency updated to ${newCurrency}`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleExportBackup = () => {
    try {
      downloadBackupFile();
      setToastMessage('✓ Backup JSON downloaded');
      setTimeout(() => setToastMessage(null), 2500);
    } catch (err) {
      console.error('Export error:', err);
      setErrorMessage('Failed to generate backup download.');
    }
  };

  const handleFileSelected = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setToastMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const result = validateAndParseBackup(content);
      if (!result.valid) {
        setErrorMessage(result.error || 'Invalid backup file.');
        return;
      }
      if (result.migratedData) {
        setPendingImport(result.migratedData);
        setShowConfirmModal(true);
      }
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read the selected file.');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmImport = () => {
    if (!pendingImport) return;
    applyImport(pendingImport);
    setSettingsState(pendingImport.settings);
    const tripCount = pendingImport.trips.length;
    const expenseCount = pendingImport.expenses.length;

    setPendingImport(null);
    setShowConfirmModal(false);
    setToastMessage(`✓ Backup imported! Restored ${tripCount} trip${tripCount === 1 ? '' : 's'} and ${expenseCount} expense${expenseCount === 1 ? '' : 's'}.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCancelImport = () => {
    setPendingImport(null);
    setShowConfirmModal(false);
  };

  const currentTripsCount = getTrips().length;
  const currentExpensesCount = getExpenses().length;

  return (
    <div className="max-w-md mx-auto min-h-screen p-4 pb-12 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pt-2 border-b border-gray-100 pb-3">
        <button
          id="btn-settings-back"
          type="button"
          onClick={() => navigate('/')}
          className="min-h-[44px] min-w-[44px] text-gray-700 hover:text-gray-900 font-medium text-lg flex items-center justify-center rounded-lg hover:bg-gray-100 transition"
          title="Back to Home"
        >
          ◀
        </button>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-1.5">
          ⚙️ Settings
        </h1>
        <div className="w-11" />
      </div>

      <div className="space-y-6">
        {/* Base Currency Control */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 shadow-xs">
          <label
            htmlFor="base-currency-select"
            className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2"
          >
            Base Currency
          </label>

          <select
            id="base-currency-select"
            value={settings.baseCurrency}
            onChange={(e) => handleCurrencyChange(e.target.value as BaseCurrency)}
            className="w-full min-h-[44px] px-3.5 py-2.5 border border-gray-300 rounded-xl text-base bg-white font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
          >
            {BASE_CURRENCIES.map((curr) => (
              <option key={curr} value={curr}>
                {curr}
              </option>
            ))}
          </select>

          <p className="text-xs text-gray-500 leading-relaxed mt-3 pt-2 border-t border-gray-200/80">
            ℹ️ Changing this won't recalculate past expenses — only new ones and rate refreshes use the new base currency.
          </p>
        </div>

        {/* Backup & Restore Control */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 shadow-xs space-y-3">
          <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
            Backup & Restore Data
          </h2>

          <div className="grid grid-cols-2 gap-3">
            {/* Export Backup Button */}
            <button
              id="btn-export-backup"
              type="button"
              onClick={handleExportBackup}
              className="min-h-[44px] px-3 py-2.5 bg-white border border-gray-200 hover:bg-gray-100 text-gray-800 font-semibold rounded-xl text-sm shadow-2xs active:scale-95 transition flex items-center justify-center gap-1.5"
            >
              ⬇️ Export Backup
            </button>

            {/* Import Backup Button */}
            <label
              id="btn-import-backup-label"
              htmlFor="import-backup-file"
              className="min-h-[44px] px-3 py-2.5 bg-white border border-gray-200 hover:bg-gray-100 text-gray-800 font-semibold rounded-xl text-sm shadow-2xs active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer text-center"
            >
              ⬆️ Import Backup
              <input
                id="import-backup-file"
                type="file"
                accept=".json,application/json"
                onChange={handleFileSelected}
                className="hidden"
              />
            </label>
          </div>

          <p className="text-xs text-gray-500 leading-relaxed pt-1 border-t border-gray-200/80">
            ℹ️ Export your trips, expenses, and settings to a JSON backup file to save or transfer to another device.
          </p>
        </div>

        {/* Inline Error Message */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-xs font-medium p-3.5 rounded-xl leading-relaxed flex items-start gap-2">
            <span>⚠️</span>
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}

        {/* Success Toast */}
        {toastMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold p-3.5 rounded-xl text-center shadow-xs">
            {toastMessage}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && pendingImport && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-gray-100 space-y-4">
            <div className="flex items-center gap-2 text-amber-600">
              <span className="text-xl">⚠️</span>
              <h3 className="font-bold text-gray-900 text-base">Replace All Existing Data?</h3>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              This will replace <strong className="text-gray-900">{currentTripsCount} trip{currentTripsCount === 1 ? '' : 's'}</strong> and <strong className="text-gray-900">{currentExpensesCount} expense{currentExpensesCount === 1 ? '' : 's'}</strong> currently stored on this device with the data from this backup (<strong className="text-gray-900">{pendingImport.trips.length} trip{pendingImport.trips.length === 1 ? '' : 's'}</strong>, <strong className="text-gray-900">{pendingImport.expenses.length} expense{pendingImport.expenses.length === 1 ? '' : 's'}</strong>).
            </p>

            <p className="text-xs text-red-600 font-semibold bg-red-50 p-2.5 rounded-xl border border-red-100">
              This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                id="btn-cancel-import"
                type="button"
                onClick={handleCancelImport}
                className="min-h-[44px] px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 border border-gray-200 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-import"
                type="button"
                onClick={handleConfirmImport}
                className="min-h-[44px] px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:scale-95 rounded-xl transition shadow-xs"
              >
                Replace & Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

