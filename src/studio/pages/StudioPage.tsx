import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { StudioLayout } from '../components/StudioLayout'
import { StudioTopBar } from '../components/StudioTopBar'
import { StudioNav } from '../components/StudioNav'
import { EditorCanvas } from '../components/EditorCanvas'
import { ContextPanel } from '../components/ContextPanel'
import { useStudioEditor } from '../lib/tiptap-config'
import {
  getPublicationById,
  listAdminPublications,
  savePublication,
  uploadPublicationPdf,
} from '../../lib/publications'
import { uploadImageToCloudinary } from '../../lib/cloudinary'
import { listChapters, saveChapter, deleteChapter, reorderChapters } from '../lib/chapters'
import type { Publication, PublicationInput } from '../../types/publication'
import type { Chapter } from '../../types/studio'
import { EMPTY_PUBLICATION_INPUT } from '../../types/publication'

function tagsToString(tags: string[]) {
  return tags.join(', ')
}

function extractToc(content: Record<string, unknown> | null | undefined): Publication['toc'] {
  if (!content || typeof content !== 'object') return []
  const toc: Publication['toc'] = []
  const walk = (node: Record<string, unknown>) => {
    if (node.type === 'heading' && typeof node.attrs === 'object' && node.attrs && 'level' in node.attrs) {
      const text = extractText(node)
      if (text) {
        toc.push({
          id: `h-${toc.length + 1}`,
          title: text,
          level: Number(node.attrs.level) || 1,
        })
      }
    }
    if (Array.isArray(node.content)) {
      node.content.forEach((child) => {
        if (typeof child === 'object' && child) walk(child as Record<string, unknown>)
      })
    }
  }
  walk(content)
  return toc
}

function extractText(node: Record<string, unknown>): string {
  if (typeof node.text === 'string') return node.text
  if (Array.isArray(node.content)) {
    return node.content.map((child) => (typeof child === 'object' && child ? extractText(child as Record<string, unknown>) : '')).join('')
  }
  return ''
}

export function StudioPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const [publication, setPublication] = useState<PublicationInput>(EMPTY_PUBLICATION_INPUT)
  const [publications, setPublications] = useState<Publication[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [currentChapterId, setCurrentChapterId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(id))
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [tagsAr, setTagsAr] = useState('')
  const [tagsEn, setTagsEn] = useState('')
  const [pdfUploading, setPdfUploading] = useState(false)

  const currentChapter = useMemo(
    () => chapters.find((c) => c.id === currentChapterId) || null,
    [chapters, currentChapterId]
  )

  useEffect(() => {
    document.title = id ? 'إسناد | تعديل الإصدار' : 'إسناد | إصدار جديد'
  }, [id])

  useEffect(() => {
    setCurrentChapterId(null)
    if (!id) {
      setPublication(EMPTY_PUBLICATION_INPUT)
      setTagsAr('')
      setTagsEn('')
      setChapters([])
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    Promise.all([getPublicationById(id), listChapters(id)])
      .then(([pub, chs]) => {
        if (!pub) throw new Error('الإصدار المطلوب غير موجود.')
        setPublication({ ...pub })
        setTagsAr(tagsToString(pub.tags_ar))
        setTagsEn(tagsToString(pub.tags_en))
        setChapters(chs)
        if (chs.length > 0) setCurrentChapterId(chs[0].id)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'تعذر تحميل الإصدار.')
      })
      .finally(() => setIsLoading(false))
  }, [id])

  useEffect(() => {
    listAdminPublications().then((list) => setPublications(list)).catch(() => setPublications([]))
  }, [id, isSaving])

  const handleEditorUpdate = useCallback((editor: import('@tiptap/react').Editor) => {
    const json = editor.getJSON() as Record<string, unknown>
    if (currentChapterId) {
      setChapters((list) => {
        const next = list.map((c) => (c.id === currentChapterId ? { ...c, content_json: json } : c))
        const current = list.find((c) => c.id === currentChapterId)
        const changed = JSON.stringify(current?.content_json) !== JSON.stringify(json)
        if (changed) setHasUnsavedChanges(true)
        return next
      })
    } else {
      setPublication((current) => {
        if (JSON.stringify(current.content_json) === JSON.stringify(json)) return current
        setHasUnsavedChanges(true)
        return { ...current, content_json: json }
      })
    }
  }, [currentChapterId])

  const editorContent = currentChapter?.content_json ?? publication.content_json
  const handleInlineTitleChange = useCallback((value: string) => {
    if (currentChapterId) {
      setChapters((list) =>
        list.map((chapter) => (
          chapter.id === currentChapterId ? { ...chapter, title_ar: value } : chapter
        ))
      )
    } else {
      setPublication((current) => ({ ...current, title_ar: value }))
    }
    setHasUnsavedChanges(true)
  }, [currentChapterId])

  const editor = useStudioEditor({
    content: editorContent,
    onUpdate: handleEditorUpdate,
    editable: true,
    onImageUpload: uploadImageToCloudinary,
  })

  const lastLoadedIdRef = useRef<string | undefined>(undefined)
  const lastChapterIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (!editor) return
    const target = currentChapter?.content_json ?? publication.content_json ?? { type: 'doc', content: [{ type: 'paragraph' }] }
    const shouldSync = id !== lastLoadedIdRef.current || currentChapterId !== lastChapterIdRef.current
    if (shouldSync) {
      lastLoadedIdRef.current = id
      lastChapterIdRef.current = currentChapterId
      editor.commands.setContent(target)
    }
  }, [editor, id, currentChapterId, currentChapter?.content_json, publication.content_json])

  const handleChange = useCallback((updates: Partial<PublicationInput>) => {
    setPublication((current) => ({ ...current, ...updates }))
    setHasUnsavedChanges(true)
  }, [])

  const handleCoverUpload = async (file: File) => {
    setError('')
    try {
      const imageUrl = await uploadImageToCloudinary(file)
      handleChange({ cover_image: imageUrl })
      if (id) {
        await savePublication({ ...publication, cover_image: imageUrl }, id)
        setHasUnsavedChanges(false)
      }
      setSuccess('تم رفع صورة الغلاف وحفظها.')
    } catch {
      setError('تعذر رفع صورة الغلاف.')
    }
  }

  const handlePdfUpload = async (file: File) => {
    setPdfUploading(true)
    setError('')
    try {
      const pdfUrl = await uploadPublicationPdf(file)
      handleChange({ pdf_url: pdfUrl })
      setSuccess('تم رفع ملف PDF بنجاح.')
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'تعذر رفع ملف PDF.')
    } finally {
      setPdfUploading(false)
    }
  }

  const validate = useCallback((input: PublicationInput) => {
    if (!input.title_ar.trim()) throw new Error('أدخل عنوان الإصدار بالعربية.')
  }, [])

  const persist = useCallback(async (status: 'draft' | 'published') => {
    setIsSaving(true)
    setError('')
    setSuccess('')
    try {
      validate(publication)

      // Always grab the latest editor JSON at save time. State updates from
      // handleEditorUpdate may not have flushed when the user clicks publish
      // immediately after typing.
      const liveJson = editor ? (editor.getJSON() as Record<string, unknown>) : null

      const liveChapters =
        liveJson && currentChapterId
          ? chapters.map((c) =>
              c.id === currentChapterId ? { ...c, content_json: liveJson } : c,
            )
          : chapters

      const livePublicationContent =
        liveJson && !currentChapterId ? liveJson : publication.content_json

      const toc =
        publication.type === 'book'
          ? liveChapters.map((c, index) => ({ id: `ch-${index + 1}`, title: c.title_ar, level: 1 }))
          : extractToc(livePublicationContent)

      const payload: PublicationInput = {
        ...publication,
        content_json: livePublicationContent,
        status,
        workflow_stage: status === 'published' ? 'published' : 'draft',
        slug: publication.slug.trim(),
        price_aud: publication.access_tier === 'paid' ? Number(publication.price_aud) || 0 : 0,
        tags_ar: tagsAr.split(',').map((t) => t.trim()).filter(Boolean),
        tags_en: tagsEn.split(',').map((t) => t.trim()).filter(Boolean),
        toc,
      }

      const publicationId = await savePublication(payload, id)

      if (currentChapterId && id) {
        const ch = liveChapters.find((c) => c.id === currentChapterId)
        if (ch) await saveChapter(id, ch, ch.id)
      }

      setHasUnsavedChanges(false)
      setSuccess(status === 'published' ? 'تم نشر الإصدار.' : 'تم حفظ الإصدار كمسودة.')
      if (!id) navigate(`/admin/publications/${publicationId}/edit`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ الإصدار.')
    } finally {
      setIsSaving(false)
    }
  }, [publication, id, navigate, validate, tagsAr, tagsEn, currentChapterId, chapters, editor])

  const handleSaveDraft = useCallback(() => void persist('draft'), [persist])
  const handlePublish = useCallback(() => void persist('published'), [persist])

  const handleAddChapter = useCallback(async () => {
    if (!id) return
    try {
      const nextOrder = chapters.length > 0 ? Math.max(...chapters.map((c) => c.order)) + 1 : 1
      const newChapter = await saveChapter(id, {
        order: nextOrder,
        title_ar: `فصل ${nextOrder}`,
        title_en: `Chapter ${nextOrder}`,
        content_json: { type: 'doc', content: [{ type: 'paragraph' }] },
      })
      setChapters((list) => [...list, newChapter].sort((a, b) => a.order - b.order))
      setCurrentChapterId(newChapter.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إضافة الفصل.')
    }
  }, [id, chapters])

  const handleReorderChapters = useCallback(async (orderedIds: string[]) => {
    if (!id) return
    const next = orderedIds
      .map((cid, index) => {
        const existing = chapters.find((c) => c.id === cid)
        return existing ? { ...existing, order: index + 1 } : null
      })
      .filter(Boolean) as Chapter[]
    setChapters(next)
    try {
      await reorderChapters(id, orderedIds)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إعادة ترتيب الفصول.')
    }
  }, [id, chapters])

  const handleDeleteChapter = useCallback(async () => {
    if (!id || !currentChapter) return
    if (!window.confirm('هل تريد حذف هذا الفصل؟ لا يمكن التراجع عن هذا الإجراء.')) return
    try {
      await deleteChapter(id, currentChapter.id)
      setChapters((list) => list.filter((c) => c.id !== currentChapter.id))
      setCurrentChapterId(() => {
        const remaining = chapters.filter((c) => c.id !== currentChapter.id)
        return remaining[0]?.id || null
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حذف الفصل.')
    }
  }, [id, currentChapter, chapters])

  const topBar = useMemo(() => (
    <StudioTopBar
      publication={publication}
      existingId={id}
      isSaving={isSaving || pdfUploading}
      hasUnsavedChanges={hasUnsavedChanges}
      onSaveDraft={handleSaveDraft}
      onPublish={handlePublish}
      onBack={() => navigate('/')}
    />
  ), [publication, id, isSaving, pdfUploading, hasUnsavedChanges, handleSaveDraft, handlePublish, navigate])

  if (isLoading) {
    return (
      <div className="empty">
        <strong>جار تحميل الاستوديو…</strong>
        <p className="text-muted">نستدعي البيانات الحالية.</p>
      </div>
    )
  }

  return (
    <>
      <div className="studio-notices">
        {error ? <div className="notice notice--error">{error}</div> : null}
        {success ? <div className="notice notice--success">{success}</div> : null}
      </div>
      <StudioLayout
        topBar={topBar}
        sidebar={
          <StudioNav
            publications={publications}
            currentId={id}
            isLoading={false}
            chapters={chapters}
            currentChapterId={currentChapterId ?? undefined}
            onSelectChapter={(chapterId) => setCurrentChapterId(chapterId)}
            onAddChapter={handleAddChapter}
            onReorderChapters={handleReorderChapters}
            publicationType={publication.type}
          />
        }
        editor={
          <EditorCanvas
            editor={editor}
            title={currentChapter?.title_ar ?? publication.title_ar}
            titleLabel={currentChapter ? 'عنوان الفصل' : 'عنوان الإصدار'}
            titlePlaceholder={currentChapter ? 'اكتب عنوان الفصل هنا' : 'اكتب عنوان الإصدار هنا'}
            onTitleChange={handleInlineTitleChange}
            onImageUpload={uploadImageToCloudinary}
          />
        }
        contextPanel={
          <ContextPanel
            publication={publication}
            onChange={handleChange}
            publicationId={id}
            chapterId={currentChapterId}
            chapters={chapters}
            setChapters={setChapters}
            setHasUnsavedChanges={setHasUnsavedChanges}
            onRestoreVersion={(snapshot) => {
              const restored = snapshot as unknown as PublicationInput
              setPublication((current) => ({ ...current, ...restored }))
              if (editor && restored.content_json) {
                editor.commands.setContent(restored.content_json)
              }
              setHasUnsavedChanges(true)
            }}
            onCoverUpload={handleCoverUpload}
            onPdfUpload={handlePdfUpload}
            pdfUploading={pdfUploading}
            isSaving={isSaving}
            tagsAr={tagsAr}
            setTagsAr={setTagsAr}
            onDeleteChapter={handleDeleteChapter}
          />
        }
      />
    </>
  )
}
