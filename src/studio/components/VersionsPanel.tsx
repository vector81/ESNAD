import { useEffect, useState } from 'react'
import { listVersions } from '../lib/versions'
import type { Version } from '../../types/studio'

interface VersionsPanelProps {
  publicationId: string
  onRestore?: (snapshot: Record<string, unknown>) => void
}

export function VersionsPanel({ publicationId, onRestore }: VersionsPanelProps) {
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    listVersions(publicationId)
      .then((list) => setVersions(list))
      .catch(() => setVersions([]))
      .finally(() => setLoading(false))
  }, [publicationId])

  return (
    <div className="context-panel__section">
      <h3 className="context-panel__section-title">تاريخ النسخ</h3>
      {loading ? (
        <p className="context-panel__hint">جارٍ التحميل…</p>
      ) : versions.length === 0 ? (
        <p className="context-panel__hint">لا توجد نسخ محفوظة بعد.</p>
      ) : (
        <ul className="versions-list">
          {versions.map((v) => (
            <li key={v.id} className="versions-item">
              <div className="versions-item__label">{v.label}</div>
              <div className="versions-item__meta">
                {new Date(v.created_at).toLocaleString('ar-EG')}
              </div>
              {onRestore && (
                <button
                  type="button"
                  className="btn btn--ghost btn--xs"
                  onClick={() => onRestore(v.snapshot_json)}
                >
                  استعادة
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
