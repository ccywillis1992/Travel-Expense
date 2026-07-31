import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSettings, saveSettings, BASE_CURRENCIES } from '../lib/settings';
import { BaseCurrency } from '../types';

export default function Settings() {
  const navigate = useNavigate();
  const [settings, setSettingsState] = useState(getSettings());
  const [savedToast, setSavedToast] = useState(false);

  const handleCurrencyChange = (newCurrency: BaseCurrency) => {
    const updated = { baseCurrency: newCurrency };
    setSettingsState(updated);
    saveSettings(updated);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

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

        {savedToast && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium p-3 rounded-xl text-center">
            ✓ Base currency updated to {settings.baseCurrency}
          </div>
        )}
      </div>
    </div>
  );
}
