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

export function calculateBalances(
  expenses: Expense[],
  participants: string[],
  ratesMap: Record<string, number | null> = {}
): { balances: Record<string, number>; settlements: SettlementTransaction[] } {
  const balances: Record<string, number> = {};
  participants.forEach((p) => {
    balances[p] = 0;
  });

  expenses.forEach((exp) => {
    const rate = ratesMap[exp.currency];
    if (typeof rate !== 'number' || isNaN(rate)) return; // skip if rate unavailable

    const convertedAmount = exp.amount * rate;
    const payer = exp.paidBy || (participants[0] || 'Me');
    const splitList = exp.splitAmong && exp.splitAmong.length > 0 ? exp.splitAmong : participants;
    const share = convertedAmount / splitList.length;

    if (balances[payer] !== undefined) {
      balances[payer] += convertedAmount;
    } else {
      balances[payer] = convertedAmount;
    }

    splitList.forEach((person) => {
      if (balances[person] !== undefined) {
        balances[person] -= share;
      } else {
        balances[person] = -share;
      }
    });
  });

  // Calculate minimal settlements
  const creditors: { name: string; amount: number }[] = [];
  const debtors: { name: string; amount: number }[] = [];

  Object.entries(balances).forEach(([name, bal]) => {
    const rounded = Math.round(bal * 100) / 100;
    if (rounded > 0.01) {
      creditors.push({ name, amount: rounded });
    } else if (rounded < -0.01) {
      debtors.push({ name, amount: -rounded });
    }
  });

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const settlements: SettlementTransaction[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(debtor.amount, creditor.amount);

    if (amount > 0.01) {
      settlements.push({
        from: debtor.name,
        to: creditor.name,
        amount: Math.round(amount * 100) / 100,
      });
    }

    debtor.amount -= amount;
    creditor.amount -= amount;

    if (debtor.amount < 0.01) i++;
    if (creditor.amount < 0.01) j++;
  }

  return { balances, settlements };
}
