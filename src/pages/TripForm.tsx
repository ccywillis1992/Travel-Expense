import { useEffect, useState, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trip } from '../types';
import { getTrips, createTrip, updateTrip } from '../lib/storage';
import { SUPPORTED_CURRENCIES } from '../lib/currency';
import { getSettings } from '../lib/settings';

export default function TripForm() {
  const { tripId } = useParams<{ tripId?: string }>();
  const navigate = useNavigate();
  const isEditMode = Boolean(tripId);
  const baseCurrency = getSettings().baseCurrency;

  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState<string>('');
  const [defaultCurrency, setDefaultCurrency] = useState('HKD');
  const [participants, setParticipants] = useState<string[]>(['Me']);
  const [newParticipantName, setNewParticipantName] = useState('');

  const [existingTrip, setExistingTrip] = useState<Trip | null>(null);

  // Errors state
  const [errors, setErrors] = useState<{
    name?: string;
    destination?: string;
    budget?: string;
    dateRange?: string;
    participants?: string;
  }>({});

  useEffect(() => {
    if (isEditMode && tripId) {
      const trips = getTrips();
      const found = trips.find((t) => t.id === tripId);
      if (found) {
        setExistingTrip(found);
        setName(found.name);
        setDestination(found.destination || '');
        setStartDate(found.startDate || '');
        setEndDate(found.endDate || '');
        setBudget(found.budget !== null && found.budget !== undefined ? found.budget.toString() : '');
        setDefaultCurrency(found.defaultCurrency || found.summaryCurrency || 'HKD');
        setParticipants(
          found.participants && found.participants.length > 0 ? found.participants : ['Me']
        );
      }
    } else {
      setDefaultCurrency(baseCurrency);
    }
  }, [tripId, isEditMode, baseCurrency]);

  const isDateRangeInvalid = Boolean(
    startDate && endDate && new Date(endDate) < new Date(startDate)
  );

  const addParticipant = () => {
    const trimmed = newParticipantName.trim();
    if (!trimmed) return;
    if (participants.some((p) => p.toLowerCase() === trimmed.toLowerCase())) {
      setErrors((prev) => ({ ...prev, participants: 'Participant already exists' }));
      return;
    }
    setParticipants([...participants, trimmed]);
    setNewParticipantName('');
    setErrors((prev) => ({ ...prev, participants: undefined }));
  };

  const removeParticipant = (nameToRemove: string) => {
    if (participants.length <= 1) {
      setErrors((prev) => ({ ...prev, participants: 'Trip must have at least 1 participant' }));
      return;
    }
    setParticipants(participants.filter((p) => p !== nameToRemove));
    setErrors((prev) => ({ ...prev, participants: undefined }));
  };

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!name.trim()) {
      newErrors.name = 'Trip name is required';
    }
    if (!destination.trim()) {
      newErrors.destination = 'Destination is required';
    }
    if (budget.trim() !== '' && (isNaN(Number(budget)) || Number(budget) < 0)) {
      newErrors.budget = 'Budget must be a valid number >= 0';
    }
    if (isDateRangeInvalid) {
      newErrors.dateRange = 'End date cannot be earlier than start date';
    }
    if (participants.length === 0) {
      newErrors.participants = 'Trip must have at least 1 participant';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const numericBudget = budget.trim() === '' ? null : Number(budget);

    if (isEditMode && existingTrip) {
      const updated: Trip = {
        ...existingTrip,
        name: name.trim(),
        destination: destination.trim(),
        startDate,
        endDate,
        budget: numericBudget,
        defaultCurrency,
        participants,
      };
      updateTrip(updated);
      navigate(`/trip/${existingTrip.id}`);
    } else {
      const created = createTrip({
        name: name.trim(),
        destination: destination.trim(),
        startDate,
        endDate,
        budget: numericBudget,
        defaultCurrency,
        participants,
      });
      navigate(`/trip/${created.id}`);
    }
  };

  const handleCancel = () => {
    if (isEditMode && tripId) {
      navigate(`/trip/${tripId}`);
    } else {
      navigate('/');
    }
  };

  if (isEditMode && !existingTrip) {
    return (
      <div className="max-w-md mx-auto p-4 text-center">
        <p className="text-gray-600 my-6">Trip not found.</p>
        <button
          id="btn-back-not-found"
          onClick={() => navigate('/')}
          className="min-h-[44px] px-4 py-2 bg-gray-200 text-gray-800 rounded-xl font-medium"
        >
          ◀ Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen p-4 pb-12 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pt-2 border-b border-gray-100 pb-3">
        <button
          id="btn-back-header"
          type="button"
          onClick={handleCancel}
          className="min-h-[44px] min-w-[44px] text-gray-700 hover:text-gray-900 font-medium text-lg flex items-center justify-center rounded-lg hover:bg-gray-100 transition"
          title="Back"
        >
          ◀
        </button>
        <h1 className="text-xl font-bold text-gray-900">
          {isEditMode ? '✏️ Edit Trip' : '➕ New Trip'}
        </h1>
        <div className="w-11" />
      </div>

      <form onSubmit={handleSave} className="space-y-5" noValidate>
        {/* Trip Name */}
        <div>
          <label htmlFor="trip-name" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
            Trip Name <span className="text-red-500">*</span>
          </label>
          <input
            id="trip-name"
            type="text"
            placeholder="e.g. Summer in Tokyo"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            className={`w-full min-h-[44px] px-3.5 py-2 border rounded-xl text-base focus:outline-none focus:ring-2 ${
              errors.name ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-200 focus:border-blue-500'
            }`}
          />
          {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
        </div>

        {/* Destination */}
        <div>
          <label htmlFor="trip-destination" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
            Destination <span className="text-red-500">*</span>
          </label>
          <input
            id="trip-destination"
            type="text"
            placeholder="e.g. Tokyo, Japan"
            value={destination}
            onChange={(e) => {
              setDestination(e.target.value);
              if (errors.destination) setErrors((prev) => ({ ...prev, destination: undefined }));
            }}
            className={`w-full min-h-[44px] px-3.5 py-2 border rounded-xl text-base focus:outline-none focus:ring-2 ${
              errors.destination ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-200 focus:border-blue-500'
            }`}
          />
          {errors.destination && <p className="text-xs text-red-600 mt-1">{errors.destination}</p>}
        </div>

        {/* Dates Row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="trip-start-date" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Start Date
            </label>
            <input
              id="trip-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="trip-end-date" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              End Date
            </label>
            <input
              id="trip-end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={`w-full min-h-[44px] px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 ${
                isDateRangeInvalid ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-200 focus:border-blue-500'
              }`}
            />
          </div>
        </div>
        {isDateRangeInvalid && (
          <p className="text-xs text-red-600 mt-0.5">⚠️ End date cannot be before start date.</p>
        )}

        {/* Budget & Default Currency Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label htmlFor="trip-budget" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Budget ({baseCurrency}) <span className="text-gray-400 font-normal lowercase">(optional)</span>
            </label>
            <input
              id="trip-budget"
              type="number"
              step="any"
              min="0"
              placeholder="Leave blank for no budget"
              value={budget}
              onChange={(e) => {
                setBudget(e.target.value);
                if (errors.budget) setErrors((prev) => ({ ...prev, budget: undefined }));
              }}
              className={`w-full min-h-[44px] px-3.5 py-2 border rounded-xl text-base focus:outline-none focus:ring-2 ${
                errors.budget ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-200 focus:border-blue-500'
              }`}
            />
            {errors.budget && <p className="text-xs text-red-600 mt-1">{errors.budget}</p>}
          </div>

          <div>
            <label htmlFor="trip-currency" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Default Currency
            </label>
            <select
              id="trip-currency"
              value={defaultCurrency}
              onChange={(e) => setDefaultCurrency(e.target.value)}
              className="w-full min-h-[44px] px-2.5 py-2 border border-gray-300 rounded-xl text-base bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
            >
              {SUPPORTED_CURRENCIES.map((curr) => (
                <option key={curr} value={curr}>
                  {curr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Trip Participants */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
            Trip Participants
          </label>
          <div className="flex gap-2 mb-2">
            <input
              id="input-participant-name"
              type="text"
              placeholder="Add name (e.g. Alice)"
              value={newParticipantName}
              onChange={(e) => setNewParticipantName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addParticipant();
                }
              }}
              className="flex-1 min-h-[44px] px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
            />
            <button
              id="btn-add-participant"
              type="button"
              onClick={addParticipant}
              className="min-h-[44px] px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-xs rounded-xl transition"
            >
              ➕ Add
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {participants.map((person) => (
              <span
                key={person}
                className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 bg-blue-50 text-blue-800 rounded-lg border border-blue-200"
              >
                👤 {person}
                {participants.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeParticipant(person)}
                    className="hover:text-red-600 ml-0.5 text-xs font-bold"
                    title={`Remove ${person}`}
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
          {errors.participants && <p className="text-xs text-red-600 mt-1">{errors.participants}</p>}
        </div>

        {/* Action Buttons */}
        <div className="pt-4 flex items-center gap-3">
          <button
            id="btn-cancel-form"
            type="button"
            onClick={handleCancel}
            className="flex-1 min-h-[48px] bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl text-sm transition flex items-center justify-center gap-1.5 active:scale-95"
          >
            ❌ Cancel
          </button>
          <button
            id="btn-save-form"
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
