import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { formatDate, formatNumber } from '../lib/utils'

interface DayData {
  date: string
  views: number
  minutes_watched: number
  impressions: number
  ctr: number
}

interface Props {
  data: DayData[]
  metric: 'views' | 'minutes_watched' | 'impressions' | 'ctr'
}

const METRIC_CONFIG = {
  views: { label: 'Visualizaciones', color: '#ef4444', format: formatNumber },
  minutes_watched: { label: 'Minutos vistos', color: '#3b82f6', format: formatNumber },
  impressions: { label: 'Impresiones', color: '#8b5cf6', format: formatNumber },
  ctr: { label: 'CTR (%)', color: '#10b981', format: (n: number) => `${n.toFixed(2)}%` },
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const config = METRIC_CONFIG[payload[0]?.name as keyof typeof METRIC_CONFIG] || METRIC_CONFIG.views
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm shadow-xl">
      <p className="text-slate-400 mb-1">{formatDate(label)}</p>
      <p className="text-white font-semibold">
        {config.format(payload[0]?.value || 0)}
      </p>
    </div>
  )
}

export default function ViewsChart({ data, metric }: Props) {
  const config = METRIC_CONFIG[metric]

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={config.color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={config.color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="date"
          tickFormatter={(d) => {
            const parts = d.split('-')
            return `${parts[2]}/${parts[1]}`
          }}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={(v) => formatNumber(v)}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={false}
          width={55}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey={metric}
          name={metric}
          stroke={config.color}
          strokeWidth={2}
          fill="url(#colorMetric)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
