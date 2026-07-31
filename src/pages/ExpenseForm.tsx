import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trip, Expense, ExpenseCategory } from '../types';
import {
  getTrips,
  getExpenses,
  createExpense,
  updateExpense,
  getDraftExpense,
  saveDraftExpense,
  clearDraftExpense,
} from '../lib/storage';
import { SUPPORTED_CURRENCIES, CATEGORIES, fetchExchangeRate } from '../lib/currency';
import { splitAmount } from '../lib/calculations';

const CATEGORY_ICONS: Record<ExpenseCategory, string> = {
  Food: '🍔',
  Transport: '🚕',
  Accommodation: '🏨',
  Shopping: '🛍️',
  Entertainment: '🎟️',
  Attraction: '🏛️',
  Groceries: '🛒',
  Others: '📦',
};

export default function ExpenseForm() {
  const { tripId, expenseId } = useParams<{ tripId: string; expenseId?: string }>();
  const navigate = useNavigate();
  const isEditMode = Boolean(expenseId);

  const amountInputRef = useRef<HTMLInputElement>(null);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [existingExpense, setExistingExpense] = useState<Expense | null>(null);

  // Form states
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<string>('EUR');
  const [category, setCategory] = useState<ExpenseCategory>('Food');
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [peopleCount, setPeopleCount] = useState<string>('1');
  const [exchangeRate, setExchangeRate] = useState<string>('1');

  // Async & UI states
  const [isFetchingRate, setIsFetchingRate] = useState<boolean>(false);
  const [rateError, setRateError] = useState<string | null>(null);

  // Draft Banner State
  const [draftBannerVisible, setDraftBannerVisible] = useState<boolean>(false);
  const [draftData, setDraftData] = useState<Partial<Expense> | null>(null);

  // Form errors
  const [errors, setErrors] = useState<{
    amount?: string;
    category?: string;
    currency?: string;
  }>({});

  // 1. Load Trip & Existing Expense (or Draft)
  useEffect(() => {
    if (!tripId) return;

    const trips = getTrips();
    const foundTrip = trips.find((t) => t.id === tripId);
    if (!foundTrip) {
      setTrip(null);
      return;
    }
    setTrip(foundTrip);

    if (isEditMode && expenseId) {
      // Edit mode: prefill existing expense without auto-fetching new exchange rate
      const allExpenses = getExpenses();
      const foundExpense = allExpenses.find((e) => e.id === expenseId);
      if (foundExpense) {
        setExistingExpense(foundExpense);
        setAmount(foundExpense.amount.toString());
        setCurrency(foundExpense.currency);
        setCategory(foundExpense.category);
        setDescription(foundExpense.description || '');
        setDate(foundExpense.date);
        setPeopleCount(foundExpense.peopleCount ? foundExpense.peopleCount.toString() : '1');
        setExchangeRate(foundExpense.exchangeRate ? foundExpense.exchangeRate.toString() : '1');
      }
    } else {
      // New mode: default currency to trip summary currency
      setCurrency(foundTrip.summaryCurrency);
      setExchangeRate('1');

      // Check for saved draft
      const draft = getDraftExpense();
      if (draft && draft.tripId === tripId) {
        setDraftData(draft);
        setDraftBannerVisible(true);
      }
    }
  }, [tripId, expenseId, isEditMode]);

  // Autofocus amount input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      amountInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // 2. Auto-save Draft in New Mode
  useEffect(() => {
    if (isEditMode || !tripId || draftBannerVisible) return;

    const handler = setTimeout(() => {
      const numAmount = Number(amount);
      const numRate = Number(exchangeRate) || 1;
      const numPeople = Number(peopleCount) || 1;

      saveDraftExpense({
        tripId,
        amount: isNaN(numAmount) ? 0 : numAmount,
        currency,
        category,
        description,
        date,
        peopleCount: numPeople,
        exchangeRate: numRate,
      });
    }, 400);

    return () => clearTimeout(handler);
  }, [amount, currency, category, description, date, peopleCount, exchangeRate, isEditMode, tripId, draftBannerVisible]);

  // Restore draft
  const handleRestoreDraft = () => {
    if (!draftData) return;
    if (draftData.amount !== undefined) setAmount(draftData.amount ? draftData.amount.toString() : '');
    if (draftData.currency) setCurrency(draftData.currency);
    if (draftData.category) setCategory(draftData.category);
    if (draftData.description !== undefined) setDescription(draftData.description);
    if (draftData.date) setDate(draftData.date);
    if (draftData.peopleCount !== undefined) setPeopleCount(draftData.peopleCount.toString());
    if (draftData.exchangeRate !== undefined) setExchangeRate(draftData.exchangeRate.toString());
    setDraftBannerVisible(false);
  };

  // Discard draft
  const handleDiscardDraft = () => {
    clearDraftExpense();
    setDraftBannerVisible(false);
    setDraftData(null);
  };

  // 3. Currency Rate Fetching
  const handleCurrencyChange = async (newCurrency: string) => {
    setCurrency(newCurrency);
    setRateError(null);

    if (!trip) return;

    if (newCurrency === trip.summaryCurrency) {
      setExchangeRate('1');
    } else {
      await updateExchangeRate(newCurrency, trip.summaryCurrency);
    }
  };

  const updateExchangeRate = async (fromCurr: string, toCurr: string) => {
    if (fromCurr === toCurr) {
      setExchangeRate('1');
      setRateError(null);
      return;
    }

    setIsFetchingRate(true);
    setRateError(null);

    try {
      const rate = await fetchExchangeRate(fromCurr, toCurr);
      setExchangeRate(rate.toString());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch rate';
      setRateError('⚠️ Offline or rate fetch failed. Set rate manually.');
      console.warn('Exchange rate fetch warning:', msg);
    } finally {
      setIsFetchingRate(false);
    }
  };

  const handleManualRefreshRate = () => {
    if (!trip) return;
    updateExchangeRate(currency, trip.summaryCurrency);
  };

  // Calculations
  const numAmount = Number(amount) || 0;
  const numRate = Number(exchangeRate) || 1;
  const numPeople = Number(peopleCount) || 1;
  const convertedAmount = numAmount * numRate;
  const currentSplitAmount = splitAmount(numAmount, numPeople);

  // Validation
  const validate = () => {
    const newErrors: typeof errors = {};
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }
    if (!category) {
      newErrors.category = 'Category is required';
    }
    if (!currency) {
      newErrors.currency = 'Currency is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !trip) return;

    const finalAmount = Number(amount);
    const finalRate = currency === trip.summaryCurrency ? 1 : Number(exchangeRate) || 1;
    const finalConverted = finalAmount * finalRate;
    const finalPeople = Math.max(1, Number(peopleCount) || 1);

    if (isEditMode && existingExpense) {
      updateExpense({
        ...existingExpense,
        amount: finalAmount,
        currency,
        category,
        description: description.trim(),
        date,
        peopleCount: finalPeople,
        exchangeRate: finalRate,
        convertedAmount: finalConverted,
        splitAmount: finalAmount / finalPeople,
      });
    } else {
      createExpense({
        tripId: trip.id,
        amount: finalAmount,
        currency,
        category,
        description: description.trim(),
        date,
        peopleCount: finalPeople,
        exchangeRate: finalRate,
        convertedAmount: finalConverted,
        splitAmount: finalAmount / finalPeople,
      });
      clearDraftExpense();
    }

    navigate(`/trip/${trip.id}`);
  };

  const handleCancel = () => {
    if (!isEditMode) {
      clearDraftExpense();
    }
    if (trip) {
      navigate(`/trip/${trip.id}`);
    } else {
      navigate('/');
    }
  };

  if (!trip) {
    return (
      <div className="max-w-md mx-auto p-4 text-center py-12">
        <p className="text-gray-600 mb-4">Trip not found.</p>
        <button
          id="btn-expense-trip-notfound"
          onClick={() => navigate('/')}
          className="min-h-[44px] px-4 py-2 bg-gray-200 text-gray-800 rounded-xl font-medium"
        >
          ◀ Back to Trips
        </button>
      </div>
    );
  }

  const isDifferentCurrency = currency !== trip.summaryCurrency;

  return (
    <div className="max-w-md mx-auto min-h-screen p-4 pb-12 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pt-1 border-b border-gray-100 pb-3">
        <button
          id="btn-expense-back"
          type="button"
          onClick={handleCancel}
          className="min-h-[44px] min-w-[44px] text-gray-700 hover:text-gray-900 font-medium text-lg flex items-center justify-center rounded-lg hover:bg-gray-100 transition"
          title="Cancel / Back"
        >
          ◀
        </button>
        <h1 className="text-xl font-bold text-gray-900">
          {isEditMode ? '✏️ Edit Expense' : '➕ Add Expense'}
        </h1>
        <div className="w-11" />
      </div>

      {/* Draft Resume Banner */}
      {draftBannerVisible && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-2xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-xs">
          <div className="text-xs text-blue-900">
            <span className="font-bold">📝 Resume unsaved draft?</span>
            <p className="text-[11px] text-blue-700 mt-0.5">You have an unsaved expense from earlier.</p>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              id="btn-discard-draft"
              type="button"
              onClick={handleDiscardDraft}
              className="px-2.5 py-1.5 bg-white border border-blue-200 text-blue-700 text-xs font-semibold rounded-lg hover:bg-blue-100 active:scale-95 transition"
            >
              Discard
            </button>
            <button
              id="btn-restore-draft"
              type="button"
              onClick={handleRestoreDraft}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 active:scale-95 transition"
            >
              Restore
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4" noValidate>
        {/* 1. Amount Input (Large & Prominent) */}
        <div>
          <label htmlFor="expense-amount" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Amount <span className="text-red-500">*</span>
          </label>
          <div className="relative flex items-center">
            <input
              id="expense-amount"
              ref={amountInputRef}
              type="number"
              step="any"
              min="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (errors.amount) setErrors((prev) => ({ ...prev, amount: undefined }));
              }}
              className={`w-full min-h-[54px] px-4 py-3 text-2xl font-bold border rounded-2xl focus:outline-none focus:ring-2 ${
                errors.amount
                  ? 'border-red-500 focus:ring-red-200 text-red-900'
                  : 'border-gray-300 focus:ring-blue-200 focus:border-blue-500 text-gray-900'
              }`}
            />
            <span className="absolute right-4 text-sm font-bold text-gray-400 pointer-events-none">
              {currency}
            </span>
          </div>
          {errors.amount && <p className="text-xs text-red-600 mt-1">{errors.amount}</p>}
        </div>

        {/* 2. Currency Dropdown */}
        <div>
          <label htmlFor="expense-currency" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Currency <span className="text-red-500">*</span>
          </label>
          <select
            id="expense-currency"
            value={currency}
            onChange={(e) => handleCurrencyChange(e.target.value)}
            className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-xl text-base bg-white font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
          >
            {SUPPORTED_CURRENCIES.map((curr) => (
              <option key={curr} value={curr}>
                {curr} {curr === trip.summaryCurrency ? '(Trip Summary)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Category Chips Grid */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
            Category <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat;
              return (
                <button
                  key={cat}
                  id={`chip-category-${cat.toLowerCase()}`}
                  type="button"
                  onClick={() => {
                    setCategory(cat);
                    if (errors.category) setErrors((prev) => ({ ...prev, category: undefined }));
                  }}
                  className={`min-h-[46px] p-1.5 rounded-xl border flex flex-col items-center justify-center text-center transition active:scale-95 ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 font-medium'
                  }`}
                >
                  <span className="text-base leading-none mb-0.5">{CATEGORY_ICONS[cat]}</span>
                  <span className="text-[10px] leading-tight truncate max-w-full px-0.5">{cat}</span>
                </button>
              );
            })}
          </div>
          {errors.category && <p className="text-xs text-red-600 mt-1">{errors.category}</p>}
        </div>

        {/* 4. Description (Optional) */}
        <div>
          <label htmlFor="expense-description" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Description
          </label>
          <input
            id="expense-description"
            type="text"
            placeholder="e.g. Lunch at Shibuya Station"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full min-h-[44px] px-3.5 py-2 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
          />
        </div>

        {/* 5. Date Picker */}
        <div>
          <label htmlFor="expense-date" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Date
          </label>
          <input
            id="expense-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
          />
        </div>

        {/* 6. People Count & Split Amount */}
        <div className="grid grid-cols-2 gap-3 items-end bg-gray-50 border border-gray-200 p-3 rounded-2xl">
          <div>
            <label htmlFor="expense-people-count" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              👥 People Count
            </label>
            <input
              id="expense-people-count"
              type="number"
              min="1"
              value={peopleCount}
              onChange={(e) => setPeopleCount(e.target.value)}
              className="w-full min-h-[42px] px-3 py-2 border border-gray-300 rounded-xl text-base bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div>
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
              Per Person ({currency})
            </div>
            <div className="min-h-[42px] px-3 py-2 bg-white border border-gray-200 rounded-xl text-base font-bold text-blue-700 flex items-center">
              {currentSplitAmount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
        </div>

        {/* 7. Exchange Rate Row (Only visible if currency != summaryCurrency) */}
        {isDifferentCurrency && (
          <div className="bg-amber-50/70 border border-amber-200 p-3.5 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Exchange Rate (1 {currency} = ? {trip.summaryCurrency})
              </span>
              <button
                id="btn-refresh-exchange-rate"
                type="button"
                onClick={handleManualRefreshRate}
                disabled={isFetchingRate}
                className="px-2.5 py-1 bg-white border border-amber-300 text-amber-900 rounded-lg text-xs font-semibold shadow-2xs hover:bg-amber-100 flex items-center gap-1 active:scale-95 transition disabled:opacity-50"
              >
                🔄 {isFetchingRate ? 'Fetching...' : 'Refresh Rate'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="expense-exchange-rate" className="block text-[11px] font-semibold text-amber-800 mb-0.5">
                  Rate
                </label>
                <input
                  id="expense-exchange-rate"
                  type="number"
                  step="any"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-200"
                />
              </div>

              <div>
                <div className="text-[11px] font-semibold text-amber-800 mb-0.5">
                  Converted Total ({trip.summaryCurrency})
                </div>
                <div className="min-h-[40px] px-3 py-1.5 bg-amber-100/60 border border-amber-300 rounded-xl text-sm font-extrabold text-amber-950 flex items-center">
                  {convertedAmount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>
            </div>

            {rateError && (
              <p className="text-xs text-red-600 font-medium">{rateError}</p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex items-center gap-3">
          <button
            id="btn-cancel-expense-form"
            type="button"
            onClick={handleCancel}
            className="flex-1 min-h-[48px] bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl text-sm transition flex items-center justify-center gap-1.5 active:scale-95"
          >
            ❌ Cancel
          </button>
          <button
            id="btn-save-expense-form"
            type="submit"
            className="flex-1 min-h-[48px] bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition flex items-center justify-center gap-1.5 shadow-xs active:scale-95"
          >
            💾 Save
          </button>
        </div>
      </form>
    </div>
  );
}
