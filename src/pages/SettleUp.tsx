import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trip, Expense } from '../types';
import { getTrips, getExpensesForTrip } from '../lib/storage';
import { calculateParticipantBalances } from '../lib/calculations';
import { resolveRatesForTrip, formatCurrency, ResolvedCurrencyRate } from '../lib/currency';
import { getSettings } from '../lib/settings';

export default function SettleUp() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const baseCurrency = getSettings().baseCurrency;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [ratesInfo, setRatesInfo] = useState<Record<string, ResolvedCurrencyRate>>({});
  const [isFetchingRates, setIsFetchingRates] = useState<boolean>(false);

  const loadDataAndRates = useCallback(async (id: string) => {
    const allTrips = getTrips();
    const foundTrip = allTrips.find((t) => t.id === id);
    if (foundTrip) {
      setTrip(foundTrip);
      const tripExpenses = getExpensesForTrip(id);
      setExpenses(tripExpenses);

      const defaultCurr = foundTrip.defaultCurrency || foundTrip.summaryCurrency || 'HKD';
      const currencies = Array.from(
        new Set([defaultCurr, baseCurrency, ...tripExpenses.map((e) => e.currency)])
      );

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
    const currencies = Array.from(
      new Set([defaultCurr, baseCurrency, ...expenses.map((e) => e.currency)])
    );

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

  if (!trip) {
    return (
      <div className="max-w-md mx-auto min-h-screen p-4 flex flex-col items-center justify-center text-center">
        <p className="text-gray-500 font-medium mb-4">Trip not found.</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-xl text-sm"
        >
          Back to Trips
        </button>
      </div>
    );
  }

  // Convert ratesInfo to simple numeric map
  const ratesMap: Record<string, number | null> = {};
  Object.entries(ratesInfo).forEach(([curr, info]) => {
    ratesMap[curr] = (info as ResolvedCurrencyRate).rate;
  });

  const balancesSummary = calculateParticipantBalances(trip, expenses, ratesMap, baseCurrency);
  const { participants, details, settlements } = balancesSummary;

  return (
    <div className="max-w-md mx-auto min-h-screen p-4 pb-20 bg-gray-50">
      {/* Navigation & Actions */}
      <div className="flex items-center justify-between mb-4 pt-1">
        <button
          id="btn-back-to-trip"
          onClick={() => navigate(`/trip/${trip.id}`)}
          className="min-h-[44px] min-w-[44px] text-gray-700 hover:text-gray-900 font-medium text-lg flex items-center justify-center rounded-xl bg-white border border-gray-200 shadow-xs active:scale-95 transition"
          title="Back to Trip Detail"
        >
          ◀
        </button>

        <div className="flex items-center gap-2">
          <button
            id="btn-refresh-rates-settle"
            onClick={handleRefreshRates}
            disabled={isFetchingRates}
            className="min-h-[44px] px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl shadow-xs active:scale-95 transition flex items-center gap-1 hover:bg-gray-50 disabled:opacity-50"
            title="Refresh Exchange Rates"
          >
            🔄 {isFetchingRates ? 'Refreshing...' : 'Refresh Rates'}
          </button>
        </div>
      </div>

      {/* Title & Subtitle */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900 leading-tight">⚖️ Settle Up</h1>
        <p className="text-xs text-gray-600 font-medium mt-0.5">
          {trip.name} • All balances in <span className="font-bold text-blue-700">{baseCurrency}</span>
        </p>
      </div>

      {/* 1. PROMINENT SECTION: Simplified Settlement Transactions */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
            Settlement Plan
          </h2>
          <span className="text-[11px] font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
            {settlements.length} {settlements.length === 1 ? 'payment' : 'payments'} needed
          </span>
        </div>

        {settlements.length === 0 ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
            <span className="text-3xl block mb-2">🎉</span>
            <h3 className="text-base font-bold text-emerald-900">All settled up!</h3>
            <p className="text-xs text-emerald-700 font-medium mt-1">
              Everyone has paid their exact fair share. No payments required.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {settlements.map((tx, idx) => (
              <div
                key={idx}
                className="bg-white border-2 border-blue-200 rounded-2xl p-4 shadow-sm flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-900 truncate">👤 {tx.from}</span>
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      pays
                    </span>
                    <span className="text-sm font-bold text-emerald-800 truncate">👤 {tx.to}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-lg font-extrabold text-blue-700">
                    {formatCurrency(tx.amount, baseCurrency)}
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium uppercase">
                    {baseCurrency}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. PARTICIPANT BALANCES BREAKDOWN TABLE */}
      <div>
        <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
          Participant Balances
        </h2>
        <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-xs space-y-3">
          {participants.map((person) => {
            const detail = details[person] || { totalPaid: 0, totalOwed: 0, balance: 0 };
            const isCreditor = detail.balance > 0.009;
            const isDebtor = detail.balance < -0.009;

            return (
              <div
                key={person}
                className="p-3 bg-gray-50 border border-gray-100 rounded-xl space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900 text-sm">👤 {person}</span>
                  {isCreditor && (
                    <span className="text-xs font-bold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg border border-emerald-200">
                      Is owed {formatCurrency(detail.balance, baseCurrency)}
                    </span>
                  )}
                  {isDebtor && (
                    <span className="text-xs font-bold px-2.5 py-1 bg-amber-100 text-amber-900 rounded-lg border border-amber-200">
                      Owes {formatCurrency(Math.abs(detail.balance), baseCurrency)}
                    </span>
                  )}
                  {!isCreditor && !isDebtor && (
                    <span className="text-xs font-semibold px-2.5 py-1 bg-gray-200 text-gray-700 rounded-lg">
                      Settled ($0.00)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 pt-1 border-t border-gray-200/60">
                  <div>
                    <span className="text-gray-400 font-medium text-[11px] block">Total Paid</span>
                    <span className="font-semibold text-gray-800">
                      {formatCurrency(detail.totalPaid, baseCurrency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-medium text-[11px] block">Fair Share (Owed)</span>
                    <span className="font-semibold text-gray-800">
                      {formatCurrency(detail.totalOwed, baseCurrency)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
