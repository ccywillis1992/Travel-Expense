import { Expense, Trip } from '../types';

export interface TripSpentSummary {
  rawDefaultSpent: number;
  baseSpent: number;
  otherCurrenciesCount: number;
  missingRatesCount: number;
}

export function splitAmount(amount: number, peopleCount: number): number {
  const count = peopleCount <= 0 || isNaN(peopleCount) ? 1 : peopleCount;
  return amount / count;
}

export function personSplitAmount(amount: number, splitCount: number): number {
  const count = splitCount <= 0 || isNaN(splitCount) ? 1 : splitCount;
  return amount / count;
}

export function calculateTripSpent(
  trip: Trip,
  expenses: Expense[],
  ratesMap: Record<string, number | null> = {},
  baseCurrency?: string
): TripSpentSummary {
  const tripExpenses = expenses.filter((e) => e.tripId === trip.id);
  const defaultCurr = (trip.defaultCurrency || trip.summaryCurrency || 'HKD').trim().toUpperCase();
  const cleanBase = baseCurrency ? baseCurrency.trim().toUpperCase() : '';

  let rawDefaultSpent = 0;
  let baseSpent = 0;
  let otherCurrenciesCount = 0;
  let missingRatesCount = 0;

  for (const e of tripExpenses) {
    const expCurr = (e.currency || '').trim().toUpperCase();
    if (expCurr === defaultCurr) {
      rawDefaultSpent += e.amount;
    } else {
      otherCurrenciesCount += 1;
    }

    // Rate resolution: if expCurr === cleanBase, rate is 1. Else lookup in ratesMap.
    let rate: number | null | undefined = ratesMap[expCurr] ?? ratesMap[e.currency];
    if (cleanBase && expCurr === cleanBase) {
      rate = 1;
    }

    if (typeof rate === 'number' && !isNaN(rate)) {
      baseSpent += e.amount * rate;
    } else {
      missingRatesCount += 1;
    }
  }

  return {
    rawDefaultSpent,
    baseSpent,
    otherCurrenciesCount,
    missingRatesCount,
  };
}

export function tripSpent(
  trip: Trip,
  expenses: Expense[],
  ratesMap: Record<string, number | null> = {},
  baseCurrency?: string
): number {
  return calculateTripSpent(trip, expenses, ratesMap, baseCurrency).baseSpent;
}

export function tripRemaining(
  trip: Trip,
  expenses: Expense[],
  ratesMap: Record<string, number | null> = {},
  baseCurrency?: string
): number | null {
  if (trip.budget === null || trip.budget === undefined) {
    return null;
  }
  const spent = tripSpent(trip, expenses, ratesMap, baseCurrency);
  return trip.budget - spent;
}

export interface SettlementTransaction {
  from: string;
  to: string;
  amount: number;
}

export interface ParticipantBalanceDetails {
  totalPaid: number;
  totalOwed: number;
  balance: number;
}

export interface TripBalancesSummary {
  participants: string[];
  details: Record<string, ParticipantBalanceDetails>;
  balances: Record<string, number>;
  settlements: SettlementTransaction[];
}

export function calculateParticipantBalances(
  trip: Trip,
  expenses: Expense[],
  ratesMap: Record<string, number | null> = {},
  baseCurrency?: string
): TripBalancesSummary {
  const tripExpenses = expenses.filter((e) => e.tripId === trip.id);

  // Collect all unique participant names from trip definition and expenses
  const participantSet = new Set<string>(
    trip.participants && trip.participants.length > 0 ? trip.participants : ['Me']
  );

  tripExpenses.forEach((exp) => {
    if (exp.paidBy) participantSet.add(exp.paidBy);
    if (exp.splitAmong) exp.splitAmong.forEach((p) => participantSet.add(p));
  });

  const participants = Array.from(participantSet);

  const details: Record<string, ParticipantBalanceDetails> = {};
  const balances: Record<string, number> = {};

  participants.forEach((p) => {
    details[p] = { totalPaid: 0, totalOwed: 0, balance: 0 };
    balances[p] = 0;
  });

  const cleanBase = baseCurrency ? baseCurrency.trim().toUpperCase() : '';

  tripExpenses.forEach((exp) => {
    const expCurr = (exp.currency || '').trim().toUpperCase();
    let rate: number | null | undefined;

    if (cleanBase && expCurr === cleanBase) {
      rate = 1;
    } else {
      rate = ratesMap[expCurr] ?? ratesMap[exp.currency];
    }

    const convertedAmount =
      typeof rate === 'number' && !isNaN(rate) ? exp.amount * rate : exp.amount;

    const payer = exp.paidBy || participants[0] || 'Me';
    const splitList =
      exp.splitAmong && exp.splitAmong.length > 0 ? exp.splitAmong : participants;
    const share = convertedAmount / splitList.length;

    // Credit payer
    if (!details[payer]) {
      details[payer] = { totalPaid: 0, totalOwed: 0, balance: 0 };
    }
    details[payer].totalPaid += convertedAmount;

    // Debit split participants
    splitList.forEach((person) => {
      if (!details[person]) {
        details[person] = { totalPaid: 0, totalOwed: 0, balance: 0 };
      }
      details[person].totalOwed += share;
    });
  });

  // Calculate net balances
  participants.forEach((p) => {
    const d = details[p];
    d.totalPaid = Math.round(d.totalPaid * 100) / 100;
    d.totalOwed = Math.round(d.totalOwed * 100) / 100;
    d.balance = Math.round((d.totalPaid - d.totalOwed) * 100) / 100;
    balances[p] = d.balance;
  });

  const settlements = simplifyDebts(balances);

  return {
    participants,
    details,
    balances,
    settlements,
  };
}

export function simplifyDebts(balances: Record<string, number>): SettlementTransaction[] {
  const creditors: { name: string; amount: number }[] = [];
  const debtors: { name: string; amount: number }[] = [];

  Object.entries(balances).forEach(([name, bal]) => {
    const rounded = Math.round(bal * 100) / 100;
    if (rounded > 0.009) {
      creditors.push({ name, amount: rounded });
    } else if (rounded < -0.009) {
      debtors.push({ name, amount: Math.abs(rounded) });
    }
  });

  const settlements: SettlementTransaction[] = [];

  while (creditors.length > 0 && debtors.length > 0) {
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    const creditor = creditors[0];
    const debtor = debtors[0];

    const amount = Math.min(creditor.amount, debtor.amount);
    const roundedAmount = Math.round(amount * 100) / 100;

    if (roundedAmount >= 0.01) {
      settlements.push({
        from: debtor.name,
        to: creditor.name,
        amount: roundedAmount,
      });
    }

    creditor.amount -= amount;
    debtor.amount -= amount;

    if (creditor.amount < 0.009) {
      creditors.shift();
    }
    if (debtor.amount < 0.009) {
      debtors.shift();
    }
  }

  return settlements;
}

export function calculateBalances(
  expenses: Expense[],
  participants: string[],
  ratesMap: Record<string, number | null> = {}
): { balances: Record<string, number>; settlements: SettlementTransaction[] } {
  const dummyTrip: Trip = {
    id: 'temp',
    name: 'Temp',
    destination: '',
    startDate: '',
    endDate: '',
    budget: null,
    defaultCurrency: 'HKD',
    participants,
    created: '',
  };
  const result = calculateParticipantBalances(dummyTrip, expenses, ratesMap);
  return {
    balances: result.balances,
    settlements: result.settlements,
  };
}
