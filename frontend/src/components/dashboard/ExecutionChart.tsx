'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { getModuleSummary } from '@/utils/module-summary';
import { useAnalyticsView } from './AnalyticsViewContext';

const COLORS: Record<string, string> = {
  'PASSED': '#34d399', // emerald-400
  'FAILED': '#fb7185', // rose-400
  'PASSED WITH NOTES': '#fbbf24', // amber-400
  'BLOCKED': '#94a3b8', // slate-400
  'TO DO': '#818cf8', // indigo-400
  'DROPPED': '#a1a1aa',
};

export function ExecutionChart({ summary, modules }: { summary: Record<string, number>; modules?: any[] }) {
  const analyticsView = useAnalyticsView();
  const chartSummary = analyticsView?.view === 'module' && modules ? getModuleSummary(modules) : summary;
  // Transform summary object into array for Recharts, excluding 'total'
  const data = Object.entries(chartSummary || {})
    .filter(([key, value]) => key !== 'total' && Number(value) > 0)
    .map(([key, value]) => ({
      name: key,
      value: value,
    }));

  return (
    <div className="w-full" data-testid="execution-chart-container">
      {data.length === 0 ? (
        <div className="w-full h-[180px] flex items-center justify-center text-white/50" data-testid="execution-chart-empty">
          No execution data available.
        </div>
      ) : (
        <div className="w-full h-[180px]" data-testid="execution-chart">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="45%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth={2}
                cornerRadius={4}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '0.75rem', color: 'white', fontSize: '12px' }}
                itemStyle={{ color: 'white', fontWeight: 'bold' }}
              />
              <Legend
                layout="vertical"
                verticalAlign="middle"
                align="right"
                iconType="circle"
                wrapperStyle={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '24px' }}
                formatter={(value: string, entry: any) => (
                  <span className="text-slate-300 font-medium ml-1">
                    {value.toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())}
                    <span className="font-bold text-white ml-2">{entry.payload.value}</span>
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
