export type BaseCurrency = 'HKD' | 'USD' | 'EUR';

export type Settings = {
  baseCurrency: BaseCurrency;
};

export type Trip = {
  id: string;
  name: string;
  destination: string;
  startDate: string;   // ISO date
  endDate: string;      // ISO date
  budget: number | null; // in Settings.baseCurrency, null if no budget
  defaultCurrency: string; // ISO currency code for defaulting new expenses, e.g. "JPY"
  participants: string[];  // list of people on the trip, defaults to ["Me"]
  created: string;       // ISO datetime
  // Legacy field support for migration
  summaryCurrency?: string;
};

export type ExpenseCategory =
  | "Food" | "Transport" | "Accommodation" | "Shopping"
  | "Entertainment" | "Attraction" | "Groceries" | "Others";

export type Expense = {
  id: string;
  tripId: string;
  date: string;             // ISO date
  description: string;
  category: ExpenseCategory;
  amount: number;            // in original currency
  currency: string;          // ISO currency code of original amount
  exchangeRate: number;      // 1 currency = X Settings.baseCurrency
  convertedAmount: number;   // amount * exchangeRate, in Settings.baseCurrency
  paidBy: string;            // participant who paid
  splitAmong: string[];      // participants split among
  created: string;
  modified: string;
  // Legacy field support for migration
  peopleCount?: number;
  splitAmount?: number;
};
