export type Trip = {
  id: string;
  name: string;
  destination: string;
  startDate: string;   // ISO date
  endDate: string;      // ISO date
  budget: number;        // in summaryCurrency
  summaryCurrency: string; // ISO currency code, e.g. "EUR"
  created: string;       // ISO datetime
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
  currency: string;          // ISO currency code of the original amount
  exchangeRate: number;      // rate at time of entry: 1 currency = X summaryCurrency
  convertedAmount: number;   // amount * exchangeRate, in trip.summaryCurrency
  peopleCount: number;       // default 1
  splitAmount: number;       // amount / peopleCount, DISPLAY ONLY, does not
                              // affect trip totals
  created: string;
  modified: string;
};
