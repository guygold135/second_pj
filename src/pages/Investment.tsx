import { useState, useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { InvestmentPreset, InvestmentScenario, ChartDataPoint } from '../types'

const presets: InvestmentPreset[] = [
  { label: '$1,000', value: 1000 },
  { label: '$5,000', value: 5000 },
  { label: '$10,000', value: 10000 },
  { label: '$25,000', value: 25000 },
]

function compound(principal: number, rate: number, years: number): number {
  return Math.round(principal * Math.pow(1 + rate, years))
}

export default function Investment() {
  const [investmentAmount, setInvestmentAmount] = useState(1000)
  const [timeframeYears, setTimeframeYears] = useState(10)

  const scenarios: InvestmentScenario[] = useMemo(() => {
    const conservative = { rate: 0.04, id: 'conservative' as const, name: 'Conservative', iconName: 'checkmark', colorClass: 'text-green-600 border-green-500' }
    const moderate = { rate: 0.07, id: 'moderate' as const, name: 'Moderate', iconName: 'bar-chart', colorClass: 'text-blue-600 border-blue-500' }
    const aggressive = { rate: 0.1, id: 'aggressive' as const, name: 'Aggressive', iconName: 'rocket', colorClass: 'text-purple-600 border-purple-500' }
    return [
      {
        ...conservative,
        projectedValue: compound(investmentAmount, conservative.rate, timeframeYears),
        totalGain: compound(investmentAmount, conservative.rate, timeframeYears) - investmentAmount,
      },
      {
        ...moderate,
        projectedValue: compound(investmentAmount, moderate.rate, timeframeYears),
        totalGain: compound(investmentAmount, moderate.rate, timeframeYears) - investmentAmount,
      },
      {
        ...aggressive,
        projectedValue: compound(investmentAmount, aggressive.rate, timeframeYears),
        totalGain: compound(investmentAmount, aggressive.rate, timeframeYears) - investmentAmount,
      },
    ]
  }, [investmentAmount, timeframeYears])

  const chartData: ChartDataPoint[] = useMemo(() => {
    const points: ChartDataPoint[] = []
    for (let year = 0; year <= timeframeYears; year++) {
      points.push({
        year,
        conservativeValue: compound(investmentAmount, 0.04, year),
        moderateValue: compound(investmentAmount, 0.07, year),
        aggressiveValue: compound(investmentAmount, 0.1, year),
      })
    }
    return points
  }, [investmentAmount, timeframeYears])

  const maxVal = Math.max(
    scenarios[0].projectedValue,
    scenarios[1].projectedValue,
    scenarios[2].projectedValue
  )

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6 lg:px-8 text-white">
      <h1 className="text-center text-xl font-medium text-white sm:text-2xl">
        Project your wealth growth across different scenarios
      </h1>

      {/* Inputs */}
      <div className="mb-10 grid gap-8 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">Investment Amount ($)</label>
          <input
            type="number"
            value={investmentAmount}
            onChange={(e) => setInvestmentAmount(Number(e.target.value) || 0)}
            className="mb-3 w-full rounded-lg bg-slate-900 border border-gray-700 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setInvestmentAmount(p.value)}
                className={`rounded-lg px-4 py-2 text-sm font-medium ${
                  investmentAmount === p.value
                    ? 'bg-slate-800 text-white ring-2 ring-blue-400'
                    : 'bg-slate-900 border border-gray-700 text-white hover:bg-slate-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">Timeframe (Years)</label>
          <input
            type="number"
            value={timeframeYears}
            onChange={(e) => setTimeframeYears(Math.min(50, Math.max(1, Number(e.target.value) || 1)))}
            className="mb-3 w-full rounded-lg bg-slate-900 border border-gray-700 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="range"
            min={1}
            max={30}
            value={timeframeYears}
            onChange={(e) => setTimeframeYears(Number(e.target.value))}
            className="w-full accent-blue-500"
          />
        </div>
      </div>

      {/* Scenario cards */}
      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        {scenarios.map((s) => (
          <div
            key={s.id}
            className={`rounded-xl border-2 bg-slate-900/60 p-5 shadow-xl shadow-black/30 ${
              s.id === 'conservative'
                ? 'border-emerald-500/70'
                : s.id === 'moderate'
                  ? 'border-blue-500/70'
                  : 'border-purple-500/70'
            }`}
          >
            <div className={`mb-2 flex items-center gap-2 ${s.colorClass.split(' ')[0]}`}>
              {s.iconName === 'checkmark' && (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {s.iconName === 'bar-chart' && (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              )}
              {s.iconName === 'rocket' && (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              )}
              <span className="text-sm font-medium">{s.annualReturnRate * 100}% Annual Return</span>
            </div>
            <p className="text-2xl font-bold">
              <span className={s.id === 'conservative' ? 'text-emerald-400' : s.id === 'moderate' ? 'text-blue-400' : 'text-purple-400'}>
                ${s.projectedValue.toLocaleString()}
              </span>
            </p>
            <p className="text-sm text-gray-400">After {timeframeYears} years</p>
            <p className="mt-2 text-sm font-medium text-gray-300">Total Gain</p>
            <p className={`font-bold ${s.id === 'conservative' ? 'text-emerald-400' : s.id === 'moderate' ? 'text-blue-400' : 'text-purple-400'}`}>
              +${s.totalGain.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="mb-8 h-80 w-full sm:h-96 rounded-2xl border border-gray-800 bg-slate-900/60 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="year" label={{ value: 'Years', position: 'insideBottom', offset: -5 }} tick={{ fill: '#f8fafc' }} />
            <YAxis
              label={{ value: 'Value ($)', angle: -90, position: 'insideLeft' }}
              domain={[0, Math.ceil(maxVal / 1000) * 1000]}
              tickFormatter={(v) => `$${v / 1000}k`}
              tick={{ fill: '#f8fafc' }}
            />
            <Tooltip
              formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
              labelFormatter={(label) => `Year ${label}`}
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1f2937', color: '#f8fafc' }}
            />
            <Legend wrapperStyle={{ color: '#cbd5f5' }} />
            <Line type="monotone" dataKey="conservativeValue" name="Conservative (4%)" stroke="#16a34a" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="moderateValue" name="Moderate (7%)" stroke="#2563eb" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="aggressiveValue" name="Aggressive (10%)" stroke="#9333ea" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Disclaimer */}
      <div className="flex gap-3 rounded-lg border border-amber-400/50 bg-amber-500/10 p-4 text-amber-100">
        <svg className="h-6 w-6 shrink-0 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <div>
          <p className="font-semibold">Investment Disclaimer</p>
          <p className="mt-1 text-sm text-amber-100">
            These projections are for educational purposes only and do not constitute financial advice. Past performance does not guarantee future results. Actual returns may vary significantly.
          </p>
        </div>
      </div>
    </div>
  )
}
