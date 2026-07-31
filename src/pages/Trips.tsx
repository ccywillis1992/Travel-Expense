import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trip, Expense } from '../types';
import { getTrips, getExpenses, getStorageUsageBytes } from '../lib/storage';
import { tripSpent, tripRemaining } from '../lib/calculations';
import { getSettings } from '../lib/settings';

export default function Trips() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [storageBytes, setStorageBytes] = useState<number>(0);
  const baseCurrency = getSettings().baseCurrency;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setTrips(getTrips());
    setExpenses(getExpenses());
    setStorageBytes(getStorageUsageBytes());
  };

  const formatStorageSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    const kb = (bytes / 1024).toFixed(1);
    return `${kb} KB`;
  };

  const formatDateRange = (start: string, end: string): string => {
    if (!start && !end) return '';
    if (start === end || !end) return start;
    return `${start} – ${end}`;
  };

  const formatCurrency = (val: number, currency: string) => {
    return `${currency} ${val.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col justify-between p-4 pb-20">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pt-2 border-b border-gray-100 pb-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Travel Expenses</h1>
            <p className="text-xs text-gray-500 mt-0.5">Base currency: <strong>{baseCurrency}</strong></p>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="btn-settings-header"
              onClick={() => navigate('/settings')}
              className="min-h-[44px] min-w-[44px] px-2.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-lg font-medium active:scale-95 transition flex items-center justify-center"
              title="Settings"
            >
              ⚙️
            </button>
            <button
              id="btn-new-trip-header"
              onClick={() => navigate('/trip/new')}
              className="min-h-[44px] px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-base font-medium shadow-xs active:scale-95 transition flex items-center gap-1"
              title="Create New Trip"
            >
              ➕ <span className="text-sm font-semibold">New</span>
            </button>
          </div>
        </div>

        {/* Trips List or Empty State */}
        {trips.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-8 text-center my-8 shadow-xs">
            <p className="text-base text-gray-600 font-medium mb-3">
              No trips yet — tap ➕ to start one.
            </p>
            <button
              id="btn-new-trip-empty"
              onClick={() => navigate('/trip/new')}
              className="min-h-[44px] px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-xs active:scale-95 transition inline-flex items-center gap-1.5"
            >
              ➕ Create Your First Trip
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {trips.map((trip) => {
              const spent = tripSpent(trip, expenses);
              const remaining = tripRemaining(trip, expenses);
              const hasBudget = trip.budget !== null && trip.budget !== undefined;
              const isOverBudget = hasBudget && remaining! < 0;

              return (
                <div
                  key={trip.id}
                  id={`trip-card-${trip.id}`}
                  onClick={() => navigate(`/trip/${trip.id}`)}
                  className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs hover:border-blue-400 active:bg-gray-50 transition cursor-pointer min-h-[44px]"
                >
                  <div className="flex justify-between items-start mb-1">
                    <h2 className="text-lg font-bold text-gray-900 leading-snug">{trip.name}</h2>
                    <span className="text-xs font-semibold px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md uppercase tracking-wider">
                      Default: {trip.defaultCurrency || trip.summaryCurrency || 'HKD'}
                    </span>
                  </div>

                  {trip.destination && (
                    <p className="text-xs text-gray-500 font-medium mb-2">📍 {trip.destination}</p>
                  )}

                  {(trip.startDate || trip.endDate) && (
                    <p className="text-xs text-gray-400 mb-3">
                      🗓️ {formatDateRange(trip.startDate, trip.endDate)}
                    </p>
                  )}

                  {/* Summary Bar */}
                  {hasBudget ? (
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 grid grid-cols-3 gap-1 text-center text-xs">
                      <div>
                        <div className="text-gray-400 font-medium text-[10px] uppercase tracking-wider">Budget</div>
                        <div className="font-semibold text-gray-800 text-xs mt-0.5 truncate">
                          {formatCurrency(trip.budget!, baseCurrency)}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400 font-medium text-[10px] uppercase tracking-wider">Spent</div>
                        <div className="font-semibold text-gray-800 text-xs mt-0.5 truncate">
                          {formatCurrency(spent, baseCurrency)}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400 font-medium text-[10px] uppercase tracking-wider">Remaining</div>
                        <div
                          className={`font-bold text-xs mt-0.5 truncate ${
                            isOverBudget ? 'text-red-600 font-extrabold' : 'text-emerald-600'
                          }`}
                        >
                          {formatCurrency(remaining!, baseCurrency)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex items-center justify-between text-xs">
                      <span className="text-gray-500 font-medium">Spent:</span>
                      <span className="font-bold text-gray-900 text-sm">
                        {formatCurrency(spent, baseCurrency)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Action Button (FAB) for quick add on mobile */}
      {trips.length > 0 && (
        <button
          id="btn-fab-new-trip"
          onClick={() => navigate('/trip/new')}
          className="fixed bottom-12 right-6 min-h-[52px] min-w-[52px] bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xl shadow-lg active:scale-95 transition flex items-center justify-center border border-white/20"
          title="Create New Trip"
        >
          ➕
        </button>
      )}

      {/* Footer Storage Indicator */}
      <div className="mt-8 pt-4 border-t border-gray-200 text-center">
        <p className="text-xs text-gray-400 font-mono">
          Storage: ~{formatStorageSize(storageBytes)} used
        </p>
      </div>
    </div>
  );
}
