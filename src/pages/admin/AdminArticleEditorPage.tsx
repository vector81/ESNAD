import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ImageUploadZone } from '../../components/admin/ImageUploadZone'
import { FocalPointPicker } from '../../components/admin/FocalPointPicker'
import {
  PUBLICATION_CATEGORIES,
  getCoverObjectPosition,
  getPublicationCategoryLabel,
  getPublicationById,
  savePublication,
  uploadPublicationPdf,
} from '../../lib/publications'
import { uploadImageToCloudinary } from '../../lib/cloudinary'
import {
  EMPTY_PUBLICATION_INPUT,
  type AccessTier,
  type PublicationInput,
  type PublicationKind,
  type PublicationStatus,
} from '../../types/publication'

function tagsToString(tags: string[]) {
  return tags.join(', ')
}

function splitTags(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean)
}

export function AdminArticleEditorPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [form, setForm] = useState<PublicationInput>(EMPTY_PUBLICATION_INPUT)
  const [tagsAr, setTagsAr] = useState('')
  const [tagsEn, setTagsEn] = useState('')
  const [loading, setLoading] = useState(Boolean(id))
  const [saving, setSaving] = useState(false)
  const [pdfUploading, setPdfUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    document.title = id ? 'إسناد | تعديل الإصدار' : 'إسناد | إصدار جديد'
  }, [id])

  useEffect(() => {
    if (!id) return
    getPublicationById(id)
      .then((publication) => {
        if (!publication) throw new Error('الإصدار المطلوب غير موجود.')
        setForm({ ...publication })
        setTagsAr(tagsToString(publication.tags_ar))
        setTagsEn(tagsToString(publication.tags_en))
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل الإصدار.')
      })
      .finally(() => setLoading(false))
  }, [id])

  const updateField = <K extends keyof PublicationInput>(field: K, value: PublicationInput[K]) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleCoverUpload = async (file: File) => {
    setError('')
    try {
      const imageUrl = await uploadImageToCloudinary(file)
      updateField('cover_image', imageUrl)
      if (id) {
        await savePublication({ ...form, cover_image: imageUrl }, id)
      }
      setSuccess('تم رفع صورة الغلاف وحفظها.')
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : 'تعذر رفع صورة الغلاف.'
      setError(message)
      throw uploadError
    }
  }

  const handlePdfUpload = async (file: File) => {
    setPdfUploading(true)
    setError('')
    try {
      const pdfUrl = await uploadPublicationPdf(file)
      updateField('pdf_url', pdfUrl)
      setSuccess('تم رفع ملف PDF بنجاح.')
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'تعذر رفع ملف PDF.')
    } finally {
      setPdfUploading(false)
    }
  }

  const handleSave = async (status: PublicationStatus) => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      if (!form.title_ar.trim()) throw new Error('أدخل عنوان الإصدار بالعربية.')

      const payload: PublicationInput = {
        ...form,
        status,
        workflow_stage: status === 'published' ? 'published' : form.workflow_stage,
        slug: form.slug.trim(),
        price_aud: form.access_tier === 'paid' ? Number(form.price_aud) || 0 : 0,
        tags_ar: splitTags(tagsAr),
        tags_en: splitTags(tagsEn),
      }

      const publicationId = await savePublication(payload, id)
      setSuccess(status === 'published' ? 'تم نشر الإصدار.' : 'تم حفظ الإصدار كمسودة.')
      navigate(`/admin/publications/${publicationId}/edit`, { replace: true })
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'تعذر حفظ الإصدار.')
    } finally {
      setSaving(false)
    }
  }

  const publishedAtInput = useMemo(() => {
    try {
      return form.published_at ? new Date(form.published_at).toISOString().slice(0, 16) : ''
    } catch {
      return ''
    }
  }, [form.published_at])

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 600 }}>جار تحميل نموذج الإصدار...</div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 8 }}>نستدعي البيانات الحالية.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="editor-layout">
      <div className="editor-main">
        <div className="editor-topbar">
          <div>
            <span className="eyebrow">{id ? 'تعديل' : 'إصدار جديد'}</span>
            <h1 className="editor-title">{form.title_ar || 'إصدار بلا عنوان'}</h1>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn--ghost btn--sm" onClick={() => navigate('/')} type="button">العودة للقائمة</button>
            <button className="btn btn--secondary btn--sm" disabled={saving || pdfUploading} onClick={() => void handleSave('draft')} type="button">
              {saving ? 'جار الحفظ...' : 'حفظ مسودة'}
            </button>
            <button className="btn btn--primary btn--sm" disabled={saving || pdfUploading} onClick={() => void handleSave('published')} type="button">
              {saving ? 'جار المعالجة...' : 'نشر الآن'}
            </button>
          </div>
        </div>

        {error ? <div className="notice notice--error">{error}</div> : null}
        {success ? <div className="notice notice--success">{success}</div> : null}

        <section className="editor-section">
          <h2 className="editor-section__title">المحتوى</h2>
          <div className="editor-fieldset">
            <label className="editor-label">العنوان بالعربية</label>
            <input
              className="editor-input editor-input--headline"
              value={form.title_ar}
              onChange={(e) => updateField('title_ar', e.target.value)}
              placeholder="عنوان الإصدار الرئيسي"
            />
          </div>
          <div className="editor-fieldset">
            <label className="editor-label">العنوان بالإنجليزية</label>
            <input
              dir="ltr"
              className="editor-input editor-input--headline"
              value={form.title_en}
              onChange={(e) => updateField('title_en', e.target.value)}
              placeholder="Publication title in English"
            />
          </div>

          <div className="editor-fieldset">
            <label className="editor-label">عنوان مختصر (للبطاقات والمشاركة) — يُفضّل أقل من 80 حرفًا</label>
            <input
              className="editor-input"
              maxLength={120}
              value={form.headline_ar}
              onChange={(e) => updateField('headline_ar', e.target.value)}
              placeholder="مثال: لبنان لا يصافح قاتله"
            />
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              يظهر في بطاقات الموقع وروابط المشاركة على واتساب وتويتر وفيسبوك. اتركه فارغًا لاستخدام العنوان الكامل.
            </p>
          </div>
          <div className="editor-fieldset">
            <label className="editor-label">Short headline (English)</label>
            <input
              dir="ltr"
              className="editor-input"
              maxLength={120}
              value={form.headline_en}
              onChange={(e) => updateField('headline_en', e.target.value)}
              placeholder="e.g. Lebanon does not shake its killer's hand"
            />
          </div>

          <div className="editor-fieldset">
            <label className="editor-label">الملخص بالعربية</label>
            <textarea
              className="editor-textarea"
              rows={4}
              value={form.abstract_ar}
              onChange={(e) => updateField('abstract_ar', e.target.value)}
              placeholder="ملخص موجز يظهر في البطاقات ونتائج البحث"
            />
          </div>
          <div className="editor-fieldset">
            <label className="editor-label">الملخص بالإنجليزية</label>
            <textarea
              dir="ltr"
              className="editor-textarea"
              rows={4}
              value={form.abstract_en}
              onChange={(e) => updateField('abstract_en', e.target.value)}
              placeholder="Short abstract for cards and search results"
            />
          </div>

          <div className="editor-fieldset">
            <label className="editor-label">الوصف التفصيلي بالعربية</label>
            <textarea
              className="editor-textarea"
              rows={8}
              value={form.description_ar}
              onChange={(e) => updateField('description_ar', e.target.value)}
              placeholder="وصف مطوّل يظهر في صفحة الإصدار"
            />
          </div>
          <div className="editor-fieldset">
            <label className="editor-label">الوصف التفصيلي بالإنجليزية</label>
            <textarea
              dir="ltr"
              className="editor-textarea"
              rows={8}
              value={form.description_en}
              onChange={(e) => updateField('description_en', e.target.value)}
              placeholder="Full description shown on the publication page"
            />
          </div>
        </section>

        <section className="editor-section">
          <h2 className="editor-section__title">البيانات الوصفية</h2>
          <div className="editor-row">
            <div className="editor-fieldset">
              <label className="editor-label">الكاتب/الوحدة بالعربية</label>
              <input className="editor-input" value={form.author_ar} onChange={(e) => updateField('author_ar', e.target.value)} />
            </div>
            <div className="editor-fieldset">
              <label className="editor-label">الكاتب/الوحدة بالإنجليزية</label>
              <input dir="ltr" className="editor-input" value={form.author_en} onChange={(e) => updateField('author_en', e.target.value)} />
            </div>
          </div>
          <div className="editor-row">
            <div className="editor-fieldset">
              <label className="editor-label">الموضوع بالعربية</label>
              <input className="editor-input" value={form.topic_ar} onChange={(e) => updateField('topic_ar', e.target.value)} />
            </div>
            <div className="editor-fieldset">
              <label className="editor-label">الموضوع بالإنجليزية</label>
              <input dir="ltr" className="editor-input" value={form.topic_en} onChange={(e) => updateField('topic_en', e.target.value)} />
            </div>
          </div>
          <div className="editor-row editor-row--3">
            <div className="editor-fieldset">
              <label className="editor-label">الرابط المختصر</label>
              <input dir="ltr" className="editor-input" value={form.slug} onChange={(e) => updateField('slug', e.target.value)} placeholder="slug-arabic-or-english" />
            </div>
            <div className="editor-fieldset">
              <label className="editor-label">تاريخ النشر</label>
              <input className="editor-input" type="datetime-local" value={publishedAtInput} onChange={(e) => updateField('published_at', new Date(e.target.value).toISOString())} />
            </div>
            <div className="editor-fieldset">
              <label className="editor-label">عدد الصفحات</label>
              <input className="editor-input" type="number" min={1} value={form.pages} onChange={(e) => updateField('pages', Number(e.target.value))} />
            </div>
          </div>
        </section>
      </div>

      <aside className="editor-sidebar">
        <div className="editor-sidebar__card">
          <h3 className="editor-sidebar__title">الإعدادات</h3>
          <div className="editor-fieldset">
            <label className="editor-label">نوع الإصدار</label>
            <select
              className="editor-select"
              value={form.kind}
              onChange={(e) => {
                const nextKind = e.target.value as PublicationKind
                setForm((current) => ({
                  ...current,
                  kind: nextKind,
                  type: nextKind === 'book' ? 'book' : 'article',
                }))
              }}
            >
              <option value="article">مقال</option>
              <option value="research-paper">ورقة بحثية</option>
              <option value="book">كتاب</option>
            </select>
          </div>
          <div className="editor-fieldset">
            <label className="editor-label">التصنيف</label>
            <select className="editor-select" value={form.category} onChange={(e) => updateField('category', e.target.value as PublicationInput['category'])}>
              {PUBLICATION_CATEGORIES.map((category) => (
                <option key={category.id} value={category.id}>
                  {getPublicationCategoryLabel(category.id, 'ar')}
                </option>
              ))}
            </select>
          </div>
          <div className="editor-fieldset">
            <label className="editor-label">لغة المحتوى</label>
            <select className="editor-select" value={form.language_mode} onChange={(e) => updateField('language_mode', e.target.value as PublicationInput['language_mode'])}>
              <option value="both">عربي + إنجليزي</option>
              <option value="ar">عربي فقط</option>
              <option value="en">إنجليزي فقط</option>
            </select>
          </div>
          <div className="editor-fieldset">
            <label className="editor-label">الحالة</label>
            <select className="editor-select" value={form.status} onChange={(e) => updateField('status', e.target.value as PublicationStatus)}>
              <option value="draft">مسودة</option>
              <option value="published">منشور</option>
            </select>
          </div>
        </div>

        <div className="editor-sidebar__card">
          <h3 className="editor-sidebar__title">الوصول والتسعير</h3>
          <div className="editor-fieldset">
            <label className="editor-label">نوع الوصول</label>
            <select className="editor-select" value={form.access_tier} onChange={(e) => updateField('access_tier', e.target.value as AccessTier)}>
              <option value="free">مجاني</option>
              <option value="paid">مدفوع</option>
            </select>
          </div>
          <div className="editor-fieldset">
            <label className="editor-label">السعر (AUD)</label>
            <input dir="ltr" className="editor-input" type="number" min={0} disabled={form.access_tier === 'free'} value={form.price_aud} onChange={(e) => updateField('price_aud', Number(e.target.value))} />
          </div>
          <div className="editor-fieldset" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
            <input id="featured" type="checkbox" checked={form.featured} onChange={(e) => updateField('featured', e.target.checked)} />
            <label htmlFor="featured" style={{ fontSize: 13, fontWeight: 500 }}>إبراز على الصفحة الرئيسية</label>
          </div>
        </div>

        <div className="editor-sidebar__card">
          <h3 className="editor-sidebar__title">صورة الغلاف</h3>
          {form.cover_image ? (
            <div
              style={{
                width: '100%',
                aspectRatio: '16 / 10',
                overflow: 'hidden',
                borderRadius: 8,
                border: '1px solid var(--border)',
                marginBottom: 12,
              }}
            >
              <img
                src={form.cover_image}
                alt="غلاف"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: getCoverObjectPosition(form),
                  display: 'block',
                }}
              />
            </div>
          ) : (
            <div style={{ padding: 24, background: 'var(--bg-subtle)', borderRadius: 8, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>لا توجد صورة</div>
          )}
          <ImageUploadZone imageUrl={form.cover_image} onRemove={() => updateField('cover_image', '')} onUpload={handleCoverUpload} />
          {form.cover_image ? (
            <div className="editor-fieldset" style={{ marginTop: 12 }}>
              <FocalPointPicker
                imageUrl={form.cover_image}
                focalX={form.cover_position_x ?? 50}
                focalY={form.cover_position_y ?? 50}
                onChange={({ focalX, focalY }) => {
                  updateField('cover_position_x', focalX)
                  updateField('cover_position_y', focalY)
                }}
              />
            </div>
          ) : null}
          <div className="editor-fieldset" style={{ marginTop: 12 }}>
            <label className="editor-label">أو رابط مباشر</label>
            <input dir="ltr" className="editor-input" value={form.cover_image} onChange={(e) => updateField('cover_image', e.target.value)} placeholder="https://..." />
          </div>
        </div>

        <div className="editor-sidebar__card">
          <h3 className="editor-sidebar__title">ملف PDF</h3>
          <div className="editor-fieldset">
            <input accept="application/pdf" disabled={pdfUploading} onChange={(e) => { const file = e.target.files?.[0]; if (file) void handlePdfUpload(file) }} type="file" />
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>أو أدخل رابطاً:</p>
            <input dir="ltr" className="editor-input" style={{ marginTop: 6 }} value={form.pdf_url} onChange={(e) => updateField('pdf_url', e.target.value)} placeholder="https://..." />
          </div>
        </div>

        <div className="editor-sidebar__card">
          <h3 className="editor-sidebar__title">الكلمات المفتاحية</h3>
          <div className="editor-fieldset">
            <label className="editor-label">بالعربية</label>
            <input className="editor-input" value={tagsAr} onChange={(e) => setTagsAr(e.target.value)} placeholder="أمن، سياسات، قانون" />
          </div>
          <div className="editor-fieldset">
            <label className="editor-label">بالإنجليزية</label>
            <input dir="ltr" className="editor-input" value={tagsEn} onChange={(e) => setTagsEn(e.target.value)} placeholder="security, policy, law" />
          </div>
        </div>
      </aside>
    </div>
  )
}
