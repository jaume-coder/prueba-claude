import { getDateRange } from '../lib/utils'

interface Props {
  startDate: string
  endDate: string
  onChange: (start: string, end: string) => void
}

const PRESETS = [
  { label: '7 días', days: 7 },
  { label: '28 días', days: 28 },
  { label: '90 días', days: 90 },
  { label: '365 días', days: 365 },
]

export default function DateRangeSelector({ startDate, endDate, onChange }: Props) {
  function applyPreset(days: number) {
    const { start, end } = getDateRange(days)
    onChange(start, end)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((p) => {
        const { start, end } = getDateRange(p.days)
        const active = start === startDate && end === endDate
        return (
          <button
            key={p.days}
            onClick={() => applyPreset(p.days)}
            className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${
              active
                ? 'bg-red-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {p.label}
          </button>
        )
      })}
      <div className="flex items-center gap-2 ml-2">
        <input
          type="date"
          value={startDate}
          onChange={(e) => onChange(e.target.value, endDate)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500"
        />
        <span className="text-slate-400 text-sm">→</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onChange(startDate, e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500"
        />
      </div>
    </div>
  )
}
