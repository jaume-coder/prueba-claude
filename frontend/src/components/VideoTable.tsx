import { useState } from 'react'
import { formatNumber, formatDuration, formatHours, formatDate } from '../lib/utils'

interface Video {
  video_id: string
  title: string
  thumbnail: string
  published_at: string
  duration_seconds: number
  views: number
  minutes_watched: number
  avg_view_duration: number
  ctr: number
  likes: number
  comments: number
}

interface Props {
  videos: Video[]
  onSortChange: (sort: string) => void
  currentSort: string
}

const COLUMNS = [
  { key: 'views', label: 'Visualizaciones' },
  { key: 'ctr', label: 'CTR' },
  { key: 'watch_time', label: 'Tiempo visto' },
  { key: 'avg_duration', label: 'Duración media' },
  { key: 'likes', label: 'Likes' },
]

export default function VideoTable({ videos, onSortChange, currentSort }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (!videos.length) {
    return (
      <div className="text-center py-12 text-slate-400">
        No hay datos de vídeos para el periodo seleccionado.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-2 mb-4 flex-wrap">
        <span className="text-sm text-slate-500 self-center">Ordenar por:</span>
        {COLUMNS.map((col) => (
          <button
            key={col.key}
            onClick={() => onSortChange(col.key)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              currentSort === col.key
                ? 'bg-red-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {col.label}
          </button>
        ))}
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="text-left py-2 px-3 text-slate-500 font-medium w-8">#</th>
            <th className="text-left py-2 px-3 text-slate-500 font-medium">Vídeo</th>
            <th className="text-right py-2 px-3 text-slate-500 font-medium">Visualiz.</th>
            <th className="text-right py-2 px-3 text-slate-500 font-medium">CTR</th>
            <th className="text-right py-2 px-3 text-slate-500 font-medium hidden md:table-cell">Tiempo visto</th>
            <th className="text-right py-2 px-3 text-slate-500 font-medium hidden lg:table-cell">Duración media</th>
            <th className="text-right py-2 px-3 text-slate-500 font-medium hidden lg:table-cell">Likes</th>
          </tr>
        </thead>
        <tbody>
          {videos.map((video, idx) => (
            <tr
              key={video.video_id}
              className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors"
              onClick={() => setExpandedId(expandedId === video.video_id ? null : video.video_id)}
            >
              <td className="py-3 px-3 text-slate-400 font-mono text-xs">{idx + 1}</td>
              <td className="py-3 px-3">
                <div className="flex items-center gap-3">
                  {video.thumbnail ? (
                    <img
                      src={video.thumbnail}
                      alt=""
                      className="w-16 h-9 object-cover rounded flex-shrink-0 bg-slate-100"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-16 h-9 bg-slate-100 rounded flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate max-w-xs">{video.title}</p>
                    <p className="text-xs text-slate-400">
                      {formatDate(video.published_at?.split('T')[0] || '')}
                      {video.duration_seconds > 0 && ` · ${formatDuration(video.duration_seconds)}`}
                    </p>
                  </div>
                </div>
                {expandedId === video.video_id && (
                  <div className="mt-2 flex gap-3">
                    <a
                      href={`https://www.youtube.com/watch?v=${video.video_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Ver en YouTube →
                    </a>
                  </div>
                )}
              </td>
              <td className="py-3 px-3 text-right font-semibold text-slate-900">{formatNumber(video.views)}</td>
              <td className="py-3 px-3 text-right">
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                  video.ctr >= 5 ? 'bg-green-100 text-green-700' :
                  video.ctr >= 3 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {video.ctr.toFixed(1)}%
                </span>
              </td>
              <td className="py-3 px-3 text-right text-slate-600 hidden md:table-cell">{formatHours(video.minutes_watched)}</td>
              <td className="py-3 px-3 text-right text-slate-600 hidden lg:table-cell">{formatDuration(Math.round(video.avg_view_duration))}</td>
              <td className="py-3 px-3 text-right text-slate-600 hidden lg:table-cell">{formatNumber(video.likes)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
