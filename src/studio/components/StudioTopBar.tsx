import type { PublicationInput } from '../../types/publication'

interface StudioTopBarProps {
  publication: PublicationInput
  existingId?: string
  isSaving: boolean
  hasUnsavedChanges: boolean
  onSaveDraft: () => void
  onPublish: () => void
  onBack: () => void
}

export function StudioTopBar({
  publication,
  existingId,
  isSaving,
  hasUnsavedChanges,
  onSaveDraft,
  onPublish,
  onBack,
}: StudioTopBarProps) {
  const displayTitle = publication.title_ar || 'إصدار بلا عنوان'

  return (
    <div className="studio-topbar">
      <div className="studio-topbar__left">
        <button type="button" className="btn btn--ghost btn--sm" onClick={onBack}>
          العودة
        </button>
        <div className="studio-topbar__meta">
          <span className="eyebrow">{existingId ? 'تعديل' : 'إصدار جديد'}</span>
          <h1 className="studio-topbar__title">{displayTitle}</h1>
        </div>
        {hasUnsavedChanges && <span className="studio-topbar__unsaved">تغييرات غير محفوظة</span>}
      </div>

      <div className="studio-topbar__actions">
        <button
          type="button"
          disabled={isSaving}
          className="btn btn--secondary btn--sm"
          onClick={onSaveDraft}
        >
          {isSaving ? 'جارٍ الحفظ…' : 'حفظ مسودة'}
        </button>
        <button
          type="button"
          disabled={isSaving}
          className="btn btn--primary btn--sm"
          onClick={onPublish}
        >
          {isSaving ? 'جارٍ النشر…' : 'نشر الآن'}
        </button>
      </div>
    </div>
  )
}
