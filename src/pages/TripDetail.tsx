import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trip, Expense } from '../types';
import { getTrips, getExpensesForTrip, deleteTrip, deleteExpense } from '../lib/storage';
import { calculateTripSpent, personSplitAmount } from '../lib/calculations';
import { CATEGORIES, resolveRatesForTrip, ResolvedCurrencyRate } from '../lib/currency';
import { exportTripToExcel } from '../lib/export';
import { getSettings } from '../lib/settings';
import ConfirmModal from '../components/ConfirmModal';

export default function TripDetail() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const baseCurrency = getSettings().baseCurrency;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [ratesInfo, setRatesInfo] = useState<Record<string, ResolvedCurrencyRate>>({});
  const [isFetchingRates, setIsFetchingRates] = useState<boolean>(false);

  // Filter & Sort state
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Modal confirm state
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    type: 'trip' | 'expense';
    id: string;
    title: string;
    message: string;
  } | null>(null);

  const loadDataAndRates = useCallback(async (id: string) => {
    const allTrips = getTrips();
    const foundTrip = allTrips.find((t) => t.id === id);
    if (foundTrip) {
      setTrip(foundTrip);
      const tripExpenses = getExpensesForTrip(id);
      setExpenses(tripExpenses);

      // Collect distinct currencies
      const defaultCurr = foundTrip.defaultCurrency || foundTrip.summaryCurrency || 'HKD';
      const currencies = Array.from(new Set([defaultCurr, baseCurrency, ...tripExpenses.map((e) => e.currency)]));
      
      setIsFetchingRates(true);
      try {
        const info = await resolveRatesForTrip(baseCurrency, currencies);
        setRatesInfo(info);
      } catch (err) {
        console.warn('Failed to resolve rates:', err);
      } finally {
        setIsFetchingRates(false);
      }
    } else {
      setTrip(null);
    }
  }, [baseCurrency]);

  useEffect(() => {
    if (tripId) {
      loadDataAndRates(tripId);
    }
  }, [tripId, loadDataAndRates]);

  const handleRefreshRates = async () => {
    if (!trip) return;
    const defaultCurr = trip.defaultCurrency || trip.summaryCurrency || 'HKD';
    const currencies = Array.from(new Set([defaultCurr, baseCurrency, ...expenses.map((e) => e.currency)]));
    
    setIsFetchingRates(true);
    try {
      const info = await resolveRatesForTrip(baseCurrency, currencies);
      setRatesInfo(info);
    } catch (err) {
      console.warn('Failed to refresh rates:', err);
    } finally {
      setIsFetchingRates(false);
    }
  };

  const promptDeleteTrip = () => {
    if (!trip) return;
    setConfirmModalState({
      isOpen: true,
      type: 'trip',
      id: trip.id,
      title: 'Delete Trip',
      message: `Are you sure you want to delete "${trip.name}" and ALL its expenses? This action cannot be undone.`,
    });
  };

  const promptDeleteExpense = (expenseId: string, description: string) => {
    setConfirmModalState({
      isOpen: true,
      type: 'expense',
      id: expenseId,
      title: 'Delete Expense',
      message: `Delete expense "${description || 'Untitled'}"?`,
    });
  };

  const handleConfirmDelete = () => {
    if (!confirmModalState) return;

    if (confirmModalState.type === 'trip') {
      deleteTrip(confirmModalState.id);
      setConfirmModalState(null);
      navigate('/');
    } else if (confirmModalState.type === 'expense') {
      deleteExpense(confirmModalState.id);
      setConfirmModalState(null);
      if (tripId) {
        const updated = getExpensesForTrip(tripId);
        setExpenses(updated);
      }
    }
  };

  const handleDuplicateExpense = (expenseId: string) => {
    if (tripId) {
      navigate(`/trip/${tripId}/expense/new?duplicateFrom=${expenseId}`);
    }
  };

  const formatCurrency = (val: number, currencyCode: string) => {
    return `${currencyCode} ${val.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  if (!trip) {
    return (
      <div className="max-w-md mx-auto p-4 text-center py-12">
        <p className="text-gray-600 mb-4">Trip not found.</p>
        <button
          id="btn-trip-detail-notfound-back"
          onClick={() => navigate('/')}
          className="min-h-[44px] px-4 py-2 bg-gray-200 text-gray-800 rounded-xl font-medium"
        >
          ◀ Back to Trips
        </button>
      </div>
    );
  }

  // Construct simple rate map (currency -> number | null)
  const ratesMap: Record<string, number | null> = {};
  (Object.entries(ratesInfo) as [string, ResolvedCurrencyRate][]).forEach(([curr, info]) => {
    ratesMap[curr] = info.rate;
  });

  const defaultCurrency = trip.defaultCurrency || trip.summaryCurrency || 'HKD';
  const spentSummary = calculateTripSpent(trip, expenses, ratesMap, baseCurrency);
  const hasBudget = trip.budget !== null && trip.budget !== undefined;
  const remaining = hasBudget ? trip.budget! - spentSummary.baseSpent : null;
  const isOverBudget = hasBudget && remaining! < 0;

  // Filter expenses
  const filteredExpenses = expenses.filter((e) => {
    const matchesCategory = selectedCategory === 'ALL' || e.category === selectedCategory;
    const matchesQuery =
      searchQuery.trim() === '' ||
      e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  // Helper function to calculate converted amount for a single expense
  const getExpenseConvertedAmount = (exp: Expense): number | null => {
    if (exp.currency === baseCurrency) return exp.amount;
    const rate = ratesMap[exp.currency];
    if (typeof rate === 'number' && !isNaN(rate)) {
      return exp.amount * rate;
    }
    return null;
  };

  // Sort expenses
  const sortedExpenses = [...filteredExpenses].sort((a, b) => {
    if (sortBy === 'date') {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    } else {
      const amountA = getExpenseConvertedAmount(a) ?? a.amount;
      const amountB = getExpenseConvertedAmount(b) ?? b.amount;
      return sortOrder === 'desc' ? amountB - amountA : amountA - amountB;
    }
  });

  const tripParticipants = trip.participants && trip.participants.length > 0 ? trip.participants : ['Me'];

  return (
    <div className="max-w-md mx-auto min-h-screen p-4 pb-20 bg-gray-50">
      {/* 1. Header Navigation */}
      <div className="flex items-center justify-between mb-4 pt-1">
        <button
          id="btn-back-to-trips"
          onClick={() => navigate('/')}
          className="min-h-[44px] min-w-[44px] text-gray-700 hover:text-gray-900 font-medium text-lg flex items-center justify-center rounded-xl bg-white border border-gray-200 shadow-xs active:scale-95 transition"
          title="Back to Trips"
        >
          ◀
        </button>

        <div className="flex items-center gap-2">
          <button
            id="btn-refresh-rates"
            onClick={handleRefreshRates}
            disabled={isFetchingRates}
            className="min-h-[44px] px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl shadow-xs active:scale-95 transition flex items-center gap-1 hover:bg-gray-50 disabled:opacity-50"
            title="Refresh Exchange Rates"
          >
            🔄 {isFetchingRates ? 'Refreshing...' : 'Refresh Rates'}
          </button>
          <button
            id="btn-edit-trip"
            onClick={() => navigate(`/trip/${trip.id}/edit`)}
            className="min-h-[44px] min-w-[44px] text-gray-700 hover:text-gray-900 font-medium text-base flex items-center justify-center rounded-xl bg-white border border-gray-200 shadow-xs active:scale-95 transition"
            title="Edit Trip"
          >
            ✏️
          </button>
          <button
            id="btn-delete-trip"
            onClick={promptDeleteTrip}
            className="min-h-[44px] min-w-[44px] text-red-600 hover:text-red-700 font-medium text-base flex items-center justify-center rounded-xl bg-white border border-red-200 shadow-xs active:scale-95 transition"
            title="Delete Trip"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Trip Details Info */}
      <div className="mb-4">
        <div className="flex justify-between items-baseline">
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">{trip.name}</h1>
          <span className="text-xs font-bold px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg">
            Default: {defaultCurrency}
          </span>
        </div>
        {trip.destination && (
          <p className="text-xs text-gray-600 font-medium mt-0.5">📍 {trip.destination}</p>
        )}
        {(trip.startDate || trip.endDate) && (
          <p className="text-xs text-gray-400 mt-0.5">
            🗓️ {trip.startDate} {trip.endDate ? `– ${trip.endDate}` : ''}
          </p>
        )}
        <p className="text-xs text-gray-500 mt-1 flex flex-wrap gap-1 items-center">
          <span>👥 Participants:</span>
          {tripParticipants.map((person) => (
            <span key={person} className="bg-gray-200 text-gray-800 px-1.5 py-0.5 rounded-md font-medium text-[11px]">
              {person}
            </span>
          ))}
        </p>
      </div>

      {/* 2. Dual Currency Summary Panel */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs mb-5 space-y-3">
        {/* Spent Row with Dual Currency Display */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-2.5 gap-1">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Spent:</span>
          <div className="text-right">
            <span className="font-bold text-gray-900 text-base">
              {formatCurrency(spentSummary.rawDefaultSpent, defaultCurrency)}
            </span>
            <span className="font-bold text-blue-600 text-base ml-1.5">
              / {formatCurrency(spentSummary.baseSpent, baseCurrency)}
            </span>
          </div>
        </div>

        {/* Budget & Remaining (Base Currency only) */}
        {hasBudget && (
          <div className="grid grid-cols-2 gap-2 text-center pt-1 text-xs">
            <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
              <div className="text-gray-400 font-medium text-[10px] uppercase tracking-wider">Budget</div>
              <div className="font-bold text-gray-900 text-sm mt-0.5 truncate">
                {formatCurrency(trip.budget!, baseCurrency)}
              </div>
            </div>
            <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
              <div className="text-gray-400 font-medium text-[10px] uppercase tracking-wider">Remaining</div>
              <div
                className={`font-extrabold text-sm mt-0.5 truncate ${
                  isOverBudget ? 'text-red-600' : 'text-emerald-600'
                }`}
              >
                {formatCurrency(remaining!, baseCurrency)}
              </div>
            </div>
          </div>
        )}

        {/* Notes for other currencies or missing rates */}
        <div className="space-y-1 pt-0.5">
          {spentSummary.otherCurrenciesCount > 0 && (
            <p className="text-[11px] text-gray-500 font-medium">
              + {spentSummary.otherCurrenciesCount} expense{spentSummary.otherCurrenciesCount > 1 ? 's' : ''} in other currencies, included in {baseCurrency} total
            </p>
          )}
          {spentSummary.missingRatesCount > 0 && (
            <p className="text-[11px] text-amber-600 font-semibold flex items-center gap-1">
              <span>⚠️</span>
              <span>
                {spentSummary.missingRatesCount} expense{spentSummary.missingRatesCount > 1 ? 's' : ''} not converted — rate unavailable
              </span>
            </p>
          )}
        </div>
      </div>

      {/* 3. Actions Row: Add Expense & Export */}
      <div className="flex gap-2 mb-5">
        <button
          id="btn-add-expense"
          onClick={() => navigate(`/trip/${trip.id}/expense/new`)}
          className="flex-1 min-h-[48px] bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-xs active:scale-95 transition flex items-center justify-center gap-1.5"
        >
          ➕ Add Expense
        </button>
        <button
          id="btn-export-excel"
          onClick={() => exportTripToExcel(trip, expenses, ratesMap)}
          className="min-h-[48px] px-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 font-medium rounded-xl text-sm shadow-xs active:scale-95 transition flex items-center justify-center gap-1"
          title="Export to Excel"
        >
          ⬇️ Export
        </button>
      </div>

      {/* 4. Filter & Sort Bar */}
      {expenses.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-xs mb-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm">🔍</span>
            <input
              id="filter-search-input"
              type="text"
              placeholder="Filter description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 min-h-[38px] px-3 border border-gray-200 rounded-lg text-xs bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label htmlFor="filter-category-select" className="sr-only">Category</label>
              <select
                id="filter-category-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full min-h-[36px] px-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 font-medium focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-1">
              <select
                id="sort-by-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'amount')}
                className="flex-1 min-h-[36px] px-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 font-medium focus:outline-none"
              >
                <option value="date">Date</option>
                <option value="amount">Amount</option>
              </select>

              <button
                id="btn-toggle-sort-order"
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                className="min-h-[36px] px-2.5 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-800 font-bold rounded-lg"
                title={`Sort ${sortOrder === 'desc' ? 'Descending' : 'Ascending'}`}
              >
                ↕ {sortOrder === 'desc' ? '↓' : '↑'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Expense List */}
      <div>
        <div className="flex justify-between items-center mb-2 px-1">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Expenses ({sortedExpenses.length})
          </h2>
        </div>

        {expenses.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-6 text-center my-4">
            <p className="text-sm text-gray-500 font-medium mb-3">
              No expenses logged yet for this trip.
            </p>
            <button
              id="btn-empty-add-expense"
              onClick={() => navigate(`/trip/${trip.id}/expense/new`)}
              className="min-h-[44px] px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs active:scale-95 transition"
            >
              ➕ Add First Expense
            </button>
          </div>
        ) : sortedExpenses.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center my-4">
            <p className="text-xs text-gray-500 font-medium">
              No expenses match your search/filter.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {sortedExpenses.map((exp) => {
              const rateDetails = ratesInfo[exp.currency];
              const isBase = exp.currency === baseCurrency;
              const converted = getExpenseConvertedAmount(exp);
              const splitList = exp.splitAmong && exp.splitAmong.length > 0 ? exp.splitAmong : ['Me'];
              const perPersonSplit = personSplitAmount(exp.amount, splitList.length);

              return (
                <div
                  key={exp.id}
                  id={`expense-row-${exp.id}`}
                  className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-xs hover:border-gray-300 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    {/* Left: Category badge, Description, Date */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className="text-[10px] font-semibold px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md uppercase tracking-wider">
                          {exp.category}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {exp.date}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {exp.description || 'Expense'}
                      </h3>

                      {/* Participant & Split details */}
                      <div className="text-[11px] text-gray-500 mt-1 space-y-0.5">
                        <p className="text-gray-600">
                          💳 Paid by: <span className="font-medium text-gray-800">{exp.paidBy || 'Me'}</span>
                        </p>
                        <p className="text-blue-600 font-medium">
                          👥 Split among: {splitList.join(', ')} ({formatCurrency(perPersonSplit, exp.currency)}/person)
                        </p>
                      </div>
                    </div>

                    {/* Right: Stacked Amount Display & Actions */}
                    <div className="flex flex-col items-end justify-between self-stretch">
                      <div className="text-right">
                        {/* Line 1: Original Amount */}
                        <div className="text-base font-bold text-gray-900">
                          {formatCurrency(exp.amount, exp.currency)}
                        </div>

                        {/* Line 2: Converted Amount in Base Currency (if different) */}
                        {!isBase && (
                          <div className="text-xs font-semibold text-gray-500 mt-0.5">
                            {converted !== null ? (
                              <span>
                                / {formatCurrency(converted, baseCurrency)}
                                {rateDetails?.status === 'cached' && rateDetails.fetchedAt && (
                                  <span className="text-[10px] text-amber-600 font-normal ml-1">
                                    (as of {rateDetails.fetchedAt})
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-amber-600 font-medium">
                                / ⚠️ rate unavailable
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Row Action Buttons */}
                      <div className="flex items-center gap-1 mt-2">
                        <button
                          id={`btn-duplicate-exp-${exp.id}`}
                          onClick={() => handleDuplicateExpense(exp.id)}
                          className="p-1 text-xs hover:bg-gray-100 rounded-md text-gray-600"
                          title="Duplicate Expense"
                        >
                          📄
                        </button>
                        <button
                          id={`btn-edit-exp-${exp.id}`}
                          onClick={() => navigate(`/trip/${trip.id}/expense/${exp.id}/edit`)}
                          className="p-1 text-xs hover:bg-gray-100 rounded-md text-gray-600"
                          title="Edit Expense"
                        >
                          ✏️
                        </button>
                        <button
                          id={`btn-delete-exp-${exp.id}`}
                          onClick={() => promptDeleteExpense(exp.id, exp.description)}
                          className="p-1 text-xs hover:bg-red-50 text-red-600 rounded-md"
                          title="Delete Expense"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmModalState && (
        <ConfirmModal
          isOpen={confirmModalState.isOpen}
          title={confirmModalState.title}
          message={confirmModalState.message}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          isDanger={true}
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmModalState(null)}
        />
      )}
    </div>
  );
}
