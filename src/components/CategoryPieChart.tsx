import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Expense, ExpenseCategory } from '../types';

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

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  Food: '#F87171',         // Red
  Transport: '#60A5FA',    // Blue
  Accommodation: '#A78BFA',// Purple
  Shopping: '#F472B6',     // Pink
  Entertainment: '#34D399',// Emerald
  Attraction: '#FBBF24',   // Amber
  Groceries: '#38BDF8',    // Cyan
  Others: '#9CA3AF',       // Gray
};

interface CategoryPieChartProps {
  expenses: Expense[];
  ratesMap: Record<string, number | null>;
  baseCurrency: string;
}

interface ChartSliceData {
  name: ExpenseCategory;
  value: number;
  percentage: number;
  color: string;
  icon: string;
}

export default function CategoryPieChart({ expenses, ratesMap, baseCurrency }: CategoryPieChartProps) {
  const chartData = useMemo(() => {
    const totals: Partial<Record<ExpenseCategory, number>> = {};
    let totalSpent = 0;

    for (const exp of expenses) {
      let rate: number | null = 1;
      const cleanExpCurr = (exp.currency || '').trim().toUpperCase();
      const cleanBase = (baseCurrency || '').trim().toUpperCase();

      if (cleanExpCurr !== cleanBase) {
        rate = ratesMap[cleanExpCurr] ?? ratesMap[exp.currency];
      }

      const converted = typeof rate === 'number' && !isNaN(rate) ? exp.amount * rate : exp.amount;
      const cat = exp.category || 'Others';
      totals[cat] = (totals[cat] || 0) + converted;
      totalSpent += converted;
    }

    if (totalSpent === 0) return { data: [] as ChartSliceData[], totalSpent: 0 };

    const data: ChartSliceData[] = Object.entries(totals)
      .filter(([_, value]) => value && value > 0)
      .map(([name, value]) => {
        const cat = name as ExpenseCategory;
        const percentage = totalSpent > 0 ? (value! / totalSpent) * 100 : 0;
        return {
          name: cat,
          value: Math.round(value! * 100) / 100,
          percentage: Math.round(percentage * 10) / 10,
          color: CATEGORY_COLORS[cat] || '#9CA3AF',
          icon: CATEGORY_ICONS[cat] || '📦',
        };
      })
      .sort((a, b) => b.value - a.value);

    return { data, totalSpent };
  }, [expenses, ratesMap, baseCurrency]);

  if (expenses.length === 0 || chartData.data.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center shadow-xs mb-5">
        <p className="text-xs text-gray-400 font-medium">
          📊 No expenses recorded yet for category chart
        </p>
      </div>
    );
  }

  const { data, totalSpent } = chartData;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item: ChartSliceData = payload[0].payload;
      return (
        <div className="bg-gray-900 text-white p-2.5 rounded-xl text-xs shadow-lg border border-gray-700">
          <div className="font-bold flex items-center gap-1.5 mb-1">
            <span>{item.icon}</span>
            <span>{item.name}</span>
          </div>
          <div className="text-gray-100 font-extrabold text-sm">
            {baseCurrency} {item.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-blue-300 text-[11px] font-semibold mt-0.5">
            {item.percentage}% of trip total
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs mb-5">
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
          <span>📊</span>
          <span>Category Breakdown ({baseCurrency})</span>
        </h3>
        <span className="text-[11px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
          {data.length} {data.length === 1 ? 'category' : 'categories'}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Donut Chart Visual */}
        <div className="w-full sm:w-1/2 h-[175px] relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={66}
                paddingAngle={3}
                dataKey="value"
                isAnimationActive={true}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Donut center total text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Total</span>
            <span className="text-xs font-extrabold text-gray-900 truncate max-w-[85px]">
              {Math.round(totalSpent).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Category Legend List */}
        <div className="w-full sm:w-1/2 space-y-1.5 max-h-[175px] overflow-y-auto pr-1">
          {data.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between text-xs p-1.5 rounded-xl hover:bg-gray-50 transition border border-transparent hover:border-gray-100"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm shrink-0">{item.icon}</span>
                <span className="font-semibold text-gray-800 truncate">{item.name}</span>
              </div>
              <div className="text-right shrink-0 ml-2">
                <span className="font-bold text-gray-900 text-xs">
                  {item.percentage}%
                </span>
                <div className="text-[10px] text-gray-400 font-medium">
                  {item.value.toLocaleString(undefined, { maximumFractionDigits: 0 })} {baseCurrency}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
