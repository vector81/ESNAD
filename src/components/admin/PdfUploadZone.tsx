import { useRef, useState, type DragEvent, type KeyboardEvent } from 'react'

interface PdfUploadZoneProps {
  fileUrl: string
  onUpload: (file: File) => Promise<void>
  onRemove: () => void
  disabled?: boolean
}

function isPdf(file: File) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

export function PdfUploadZone({
  fileUrl,
  onUpload,
  onRemove,
  disabled = false,
}: PdfUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')

  const runUpload = async (file: File | null) => {
    if (!file) return
    if (!isPdf(file)) {
      setError('اختر ملف PDF صالحاً.')
      return
    }

    setIsUploading(true)
    setError('')

    try {
      await onUpload(file)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'تعذر رفع ملف PDF.')
    } finally {
      setIsUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const triggerInput = () => {
    if (!disabled && !isUploading) inputRef.current?.click()
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    void runUpload(event.dataTransfer.files[0] ?? null)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      triggerInput()
    }
  }

  const busy = disabled || isUploading

  return (
    <div className="asset-upload">
      <input
        accept="application/pdf,.pdf"
        hidden
        onChange={(event) => void runUpload(event.target.files?.[0] ?? null)}
        ref={inputRef}
        type="file"
      />

      <div
        aria-disabled={busy}
        className={`asset-drop asset-drop--pdf${isDragging ? ' asset-drop--dragging' : ''}${
          busy ? ' asset-drop--disabled' : ''
        }`}
        onClick={triggerInput}
        onDragEnter={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={(event) => {
          event.preventDefault()
          if (event.currentTarget === event.target) setIsDragging(false)
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={busy ? -1 : 0}
      >
        <span aria-hidden="true" className="asset-drop__icon">
          PDF
        </span>
        <span className="asset-drop__copy">
          <strong>{isUploading ? 'جارٍ رفع الملف…' : fileUrl ? 'استبدال ملف PDF' : 'إضافة ملف PDF'}</strong>
          <small>اسحب الملف هنا أو انقر للاختيار</small>
        </span>
      </div>

      {fileUrl ? (
        <div className="asset-upload__status">
          <span className="asset-upload__status-copy">
            <span aria-hidden="true" className="asset-upload__check">
              ✓
            </span>
            ملف PDF مرتبط بالإصدار
          </span>
          <button className="btn btn--ghost btn--xs" onClick={onRemove} type="button">
            إزالة
          </button>
        </div>
      ) : null}

      {error ? <div className="asset-upload__error">{error}</div> : null}
    </div>
  )
}
