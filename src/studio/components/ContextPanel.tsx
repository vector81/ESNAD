import { useState } from 'react'
import type { PublicationInput } from '../../types/publication'
import { VersionsPanel } from './VersionsPanel'
import { ImageUploadZone } from '../../components/admin/ImageUploadZone'
import { FocalPointPicker } from '../../components/admin/FocalPointPicker'
import { PUBLICATION_CATEGORIES, getCoverObjectPosition, getPublicationCategoryLabel } from '../../lib/publications'
import type { Chapter } from '../../types/studio'

interface ContextPanelProps {
  publication: PublicationInput
  onChange: (updates: Partial<PublicationInput>) => void
  publicationId?: string
  chapterId?: string | null
  chapters: Chapter[]
  setChapters: React.Dispatch<React.SetStateAction<Chapter[]>>
  setHasUnsavedChanges: (v: boolean) => void
  onRestoreVersion?: (snapshot: Record<string, unknown>) => void
  onCoverUpload: (file: File) => Promise<void>
  onPdfUpload: (file: File) => Promise<void>
  pdfUploading: boolean
  isSaving: boolean
  tagsAr: string
  setTagsAr: (v: string) => void
  onDeleteChapter?: () => void
}

type PanelTab = 'metadata' | 'versions'

export function ContextPanel({
  publication,
  onChange,
  publicationId,
  chapterId,
  chapters,
  setChapters,
  setHasUnsavedChanges,
  onRestoreVersion,
  onCoverUpload,
  onPdfUpload,
  pdfUploading,
  isSaving,
  tagsAr,
  setTagsAr,
  onDeleteChapter,
}: ContextPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>('metadata')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const currentChapter = chapters.find((c) => c.id === chapterId) || null

  const updateChapter = (updates: Partial<Chapter>) => {
    if (!currentChapter) return
    setChapters((list) =>
      list.map((c) => (c.id === currentChapter.id ? { ...c, ...updates } : c))
    )
    setHasUnsavedChanges(true)
  }

  return (
    <div className="context-panel">
      <div className="context-panel__tabs">
        <button
          type="button"
          className={`context-panel__tab${activeTab === 'metadata' ? ' context-panel__tab--active' : ''}`}
          onClick={() => setActiveTab('metadata')}
        >
          البيانات
        </button>
        <button
          type="button"
          className={`context-panel__tab${activeTab === 'versions' ? ' context-panel__tab--active' : ''}`}
          onClick={() => setActiveTab('versions')}
        >
          النسخ
        </button>
      </div>

      <div className="context-panel__body">
        {activeTab === 'metadata' && (
          <div className="context-panel__section">
            {/* Cover image — prominent at top */}
            <div className="panel-group panel-group--cover">
              <h4 className="panel-group__title">صورة الغلاف</h4>
              {publication.cover_image ? (
                <div
                  className="cover-crop-preview"
                  style={{
                    width: '100%',
                    aspectRatio: '16 / 10',
                    overflow: 'hidden',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    marginBottom: 8,
                  }}
                >
                  <img
                    src={publication.cover_image}
                    alt="غلاف"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: getCoverObjectPosition(publication),
                      display: 'block',
                    }}
                  />
                </div>
              ) : null}
              <ImageUploadZone
                imageUrl={publication.cover_image}
                onRemove={() => onChange({ cover_image: '' })}
                onUpload={onCoverUpload}
                compact
                compactLabel={publication.cover_image ? 'تغيير الصورة' : 'إضافة صورة غلاف'}
              />
              {publication.cover_image ? (
                <div style={{ marginTop: 12 }}>
                  <FocalPointPicker
                    imageUrl={publication.cover_image}
                    focalX={publication.cover_position_x ?? 50}
                    focalY={publication.cover_position_y ?? 50}
                    onChange={({ focalX, focalY }) =>
                      onChange({ cover_position_x: focalX, cover_position_y: focalY })
                    }
                  />
                </div>
              ) : null}
            </div>

            {/* Chapter (books only) */}
            {publication.type === 'book' && currentChapter && (
              <div className="panel-group">
                <h4 className="panel-group__title">الفصل الحالي</h4>
                <input
                  className="editor-input"
                  value={currentChapter.title_ar}
                  onChange={(e) => updateChapter({ title_ar: e.target.value })}
                  placeholder="عنوان الفصل بالعربية"
                />
                {onDeleteChapter && (
                  <button type="button" className="btn btn--danger btn--sm" onClick={onDeleteChapter}>
                    حذف الفصل
                  </button>
                )}
              </div>
            )}

            {/* Basic info */}
            <div className="panel-group">
              <h4 className="panel-group__title">المعلومات الأساسية</h4>
              <input
                className="editor-input editor-input--headline"
                value={publication.title_ar}
                onChange={(e) => onChange({ title_ar: e.target.value })}
                placeholder="العنوان بالعربية *"
              />
              <input
                className="editor-input"
                maxLength={120}
                value={publication.headline_ar}
                onChange={(e) => onChange({ headline_ar: e.target.value })}
                placeholder="عنوان مختصر للبطاقات والمشاركة (≤80 حرفًا)"
              />
              <textarea
                className="editor-textarea"
                rows={3}
                value={publication.abstract_ar}
                onChange={(e) => onChange({ abstract_ar: e.target.value })}
                placeholder="الملخص بالعربية *"
              />
            </div>

            {/* Settings */}
            <div className="panel-group">
              <h4 className="panel-group__title">الإعدادات</h4>
              <select
                className="editor-select"
                value={publication.kind}
                onChange={(e) => {
                  const nextKind = e.target.value as PublicationInput['kind']
                  onChange({
                    kind: nextKind,
                    type: nextKind === 'book' ? 'book' : 'article',
                  })
                }}
              >
                <option value="article">مقال</option>
                <option value="research-paper">ورقة بحثية</option>
                <option value="book">كتاب</option>
              </select>
              <select
                className="editor-select"
                value={publication.category}
                onChange={(e) => onChange({ category: e.target.value as PublicationInput['category'] })}
              >
                {PUBLICATION_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {getPublicationCategoryLabel(cat.id, 'ar')}
                  </option>
                ))}
              </select>
              <select
                className="editor-select"
                value={publication.access_tier}
                onChange={(e) => onChange({ access_tier: e.target.value as PublicationInput['access_tier'] })}
              >
                <option value="free">مجاني</option>
                <option value="paid">مدفوع</option>
              </select>
              <input
                dir="ltr"
                className="editor-input"
                type="number"
                min={0}
                disabled={publication.access_tier === 'free'}
                value={publication.price_aud}
                onChange={(e) => onChange({ price_aud: Number(e.target.value) })}
                placeholder="السعر (AUD)"
              />
              <label className="checkbox-row">
                <input
                  id="featured"
                  type="checkbox"
                  checked={publication.featured}
                  onChange={(e) => onChange({ featured: e.target.checked })}
                />
                <span>إبراز على الصفحة الرئيسية</span>
              </label>
            </div>

            {/* PDF */}
            <div className="panel-group">
              <h4 className="panel-group__title">ملف PDF</h4>
              <input
                accept="application/pdf"
                disabled={pdfUploading || isSaving}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void onPdfUpload(file)
                }}
                type="file"
              />
              <input
                dir="ltr"
                className="editor-input"
                value={publication.pdf_url}
                onChange={(e) => onChange({ pdf_url: e.target.value })}
                placeholder="رابط ملف PDF"
              />
            </div>

            {/* Advanced — collapsed by default */}
            <div className="panel-group panel-group--advanced">
              <button
                type="button"
                className="advanced-toggle"
                onClick={() => setShowAdvanced((s) => !s)}
              >
                {showAdvanced ? '▾ إخفاء التفاصيل المتقدمة' : '▸ إظهار التفاصيل المتقدمة'}
              </button>

              {showAdvanced && (
                <div className="advanced-fields">
                  <input
                    className="editor-input"
                    value={publication.author_ar}
                    onChange={(e) => onChange({ author_ar: e.target.value })}
                    placeholder="الكاتب/الوحدة بالعربية"
                  />
                  <input
                    className="editor-input"
                    value={publication.topic_ar}
                    onChange={(e) => onChange({ topic_ar: e.target.value })}
                    placeholder="الموضوع بالعربية"
                  />
                  <input
                    dir="ltr"
                    className="editor-input"
                    value={publication.slug}
                    onChange={(e) => onChange({ slug: e.target.value })}
                    placeholder="الرابط المختصر (slug)"
                  />
                  <input
                    className="editor-input"
                    type="datetime-local"
                    value={
                      publication.published_at
                        ? new Date(publication.published_at).toISOString().slice(0, 16)
                        : ''
                    }
                    onChange={(e) => onChange({ published_at: new Date(e.target.value).toISOString() })}
                  />
                  <input
                    className="editor-input"
                    type="number"
                    min={1}
                    value={publication.pages}
                    onChange={(e) => onChange({ pages: Number(e.target.value) })}
                    placeholder="عدد الصفحات"
                  />
                  <textarea
                    className="editor-textarea"
                    rows={3}
                    value={publication.description_ar}
                    onChange={(e) => onChange({ description_ar: e.target.value })}
                    placeholder="الوصف التفصيلي بالعربية"
                  />
                  <input
                    className="editor-input"
                    value={tagsAr}
                    onChange={(e) => setTagsAr(e.target.value)}
                    placeholder="الكلمات المفتاحية بالعربية"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'versions' && publicationId && (
          <VersionsPanel publicationId={publicationId} onRestore={onRestoreVersion} />
        )}
      </div>
    </div>
  )
}
