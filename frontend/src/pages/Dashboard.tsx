import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAnalyticsOverview, getTopVideos, getYouTubeStatus, getYouTubeAuthUrl } from '../api/analytics'
import { getDateRange, formatNumber, formatHours } from '../lib/utils'
import StatCard from '../components/StatCard'
import ViewsChart from '../components/ViewsChart'
import VideoTable from '../components/VideoTable'
import DateRangeSelector from '../components/DateRangeSelector'

type MetricKey = 'views' | 'minutes_watched' | 'impressions' | 'ctr'

const METRIC_TABS: { key: MetricKey; label: string }[] = [
  { key: 'views', label: 'Visualizaciones' },
  { key: 'minutes_watched', label: 'Minutos vistos' },
  { key: 'impressions', label: 'Impresiones' },
  { key: 'ctr', label: 'CTR' },
]

function useUser() {
  try {
    return JSON.parse(localStorage.getItem('tdg_user') || '{}')
  } catch {
    return {}
  }
}

export default function DashboardPage() {
  const user = useUser()
  const defaultRange = getDateRange(28)
  const [startDate, setStartDate] = useState(defaultRange.start)
  const [endDate, setEndDate] = useState(defaultRange.end)
  const [activeMetric, setActiveMetric] = useState<MetricKey>('views')
  const [videoSort, setVideoSort] = useState('views')

  const { data: ytStatus } = useQuery({
    queryKey: ['youtube-status'],
    queryFn: getYouTubeStatus,
  })

  const { data: overview, isLoading: loadingOverview, error: overviewError } = useQuery({
    queryKey: ['analytics-overview', startDate, endDate],
    queryFn: () => getAnalyticsOverview(startDate, endDate),
    enabled: !!ytStatus?.connected,
  })

  const { data: topVideos, isLoading: loadingVideos } = useQuery({
    queryKey: ['top-videos', startDate, endDate, videoSort],
    queryFn: () => getTopVideos(startDate, endDate, videoSort, 25),
    enabled: !!ytStatus?.connected,
  })

  function handleLogout() {
    localStorage.removeItem('tdg_token')
    localStorage.removeItem('tdg_user')
    window.location.href = '/login'
  }

  async function handleConnectYouTube() {
    try {
      const { auth_url } = await getYouTubeAuthUrl()
      window.location.href = auth_url
    } catch {
      alert('Error al obtener URL de autorización. ¿Has configurado las credenciales de Google?')
    }
  }

  const totals = overview?.totals || {}
  const channel = overview?.channel || ytStatus

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-sm leading-none">TDG Dashboard</h1>
              {channel?.channel_name && (
                <p className="text-xs text-slate-400 leading-none mt-0.5">{channel.channel_name}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user.is_admin && !ytStatus?.connected && (
              <button
                onClick={handleConnectYouTube}
                className="text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Conectar YouTube
              </button>
            )}
            <span className="text-sm text-slate-500">{user.username}</span>
            <button
              onClick={handleLogout}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* YouTube no conectado */}
        {!ytStatus?.connected && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
            <div className="text-4xl mb-3">📡</div>
            <h2 className="text-lg font-semibold text-amber-900 mb-1">Canal de YouTube no conectado</h2>
            <p className="text-amber-700 text-sm mb-4">
              Para ver las analíticas, un administrador debe conectar el canal de YouTube.
            </p>
            {user.is_admin && (
              <button
                onClick={handleConnectYouTube}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Conectar canal de YouTube
              </button>
            )}
          </div>
        )}

        {ytStatus?.connected && (
          <>
            {/* Date selector */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-slate-900">Analytics · Módulo 1</h2>
              <DateRangeSelector
                startDate={startDate}
                endDate={endDate}
                onChange={(s, e) => { setStartDate(s); setEndDate(e) }}
              />
            </div>

            {/* Error */}
            {overviewError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
                Error al cargar datos. Verifica que las credenciales de YouTube siguen siendo válidas.
              </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <StatCard
                label="Visualizaciones"
                value={loadingOverview ? '—' : formatNumber(totals.total_views || 0)}
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>}
                color="bg-red-100 text-red-600"
              />
              <StatCard
                label="Impresiones"
                value={loadingOverview ? '—' : formatNumber(totals.total_impressions || 0)}
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>}
                color="bg-purple-100 text-purple-600"
              />
              <StatCard
                label="CTR medio"
                value={loadingOverview ? '—' : `${totals.avg_ctr || 0}%`}
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5"/></svg>}
                color="bg-green-100 text-green-600"
              />
              <StatCard
                label="Horas vistas"
                value={loadingOverview ? '—' : formatHours(totals.total_minutes_watched || 0)}
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
                color="bg-blue-100 text-blue-600"
              />
              <StatCard
                label="Suscriptores +"
                value={loadingOverview ? '—' : `+${formatNumber(totals.net_subscribers || 0)}`}
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0"/></svg>}
                color="bg-orange-100 text-orange-600"
              />
              <StatCard
                label="Likes totales"
                value={loadingOverview ? '—' : formatNumber(totals.total_likes || 0)}
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"/></svg>}
                color="bg-pink-100 text-pink-600"
              />
            </div>

            {/* Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <h3 className="font-semibold text-slate-900">Evolución temporal</h3>
                <div className="flex gap-1.5 flex-wrap">
                  {METRIC_TABS.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveMetric(tab.key)}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                        activeMetric === tab.key
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
              {loadingOverview ? (
                <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                  Cargando datos...
                </div>
              ) : overview?.timeseries?.length ? (
                <ViewsChart data={overview.timeseries} metric={activeMetric} />
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                  Sin datos para el periodo seleccionado
                </div>
              )}
            </div>

            {/* Top videos */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900">
                  Top vídeos
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    {topVideos?.videos?.length || 0} vídeos
                  </span>
                </h3>
              </div>
              {loadingVideos ? (
                <div className="py-8 text-center text-slate-400 text-sm">Cargando vídeos...</div>
              ) : (
                <VideoTable
                  videos={topVideos?.videos || []}
                  onSortChange={setVideoSort}
                  currentSort={videoSort}
                />
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
