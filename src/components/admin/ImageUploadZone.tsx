import { useRef, useState, type ClipboardEvent, type DragEvent, type KeyboardEvent } from 'react'

interface ImageUploadZoneProps {
  imageUrl: string
  onUpload: (file: File) => Promise<void>
  onRemove: () => void
  disabled?: boolean
  compact?: boolean
  compactLabel?: string
}

function extractImageFromClipboard(event: ClipboardEvent<HTMLElement>) {
  const items = Array.from(event.clipboardData?.items ?? [])
  const imageItem = items.find((item) => item.type.startsWith('image/'))
  return imageItem?.getAsFile() ?? null
}

export function ImageUploadZone({
  imageUrl,
  onUpload,
  onRemove,
  disabled = false,
  compact = false,
  compactLabel = 'أضف صورة',
}: ImageUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')

  const runUpload = async (file: File | null) => {
    if (!file) {
      return
    }

    setIsUploading(true)
    setError('')

    try {
      await onUpload(file)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'تعذر رفع الصورة.')
    } finally {
      setIsUploading(false)
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }

  const triggerInput = () => {
    if (!disabled && !isUploading) {
      inputRef.current?.click()
    }
  }

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    await runUpload(event.dataTransfer.files[0] ?? null)
  }

  const handlePaste = async (event: ClipboardEvent<HTMLDivElement>) => {
    const file = extractImageFromClipboard(event)
    if (!file) {
      return
    }

    event.preventDefault()
    await runUpload(file)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      triggerInput()
    }
  }

  return (
    <div className={`upload-zone-wrapper${compact ? ' upload-zone-wrapper--compact' : ''}`}>
      <input
        accept="image/*"
        hidden
        onChange={(event) => void runUpload(event.target.files?.[0] ?? null)}
        ref={inputRef}
        type="file"
      />

      {compact ? (
        <div className="upload-inline">
          {imageUrl ? (
            <div className="upload-preview upload-preview--compact upload-preview--thumbnail">
              <img alt="معاينة الصورة" className="upload-preview__image" src={imageUrl} />
              <div className="upload-preview__actions">
                <button className="button" onClick={triggerInput} type="button">
                  تغيير الصورة
                </button>
                <button className="button button--danger" onClick={onRemove} type="button">
                  إزالة
                </button>
              </div>
            </div>
          ) : (
            <button
              className="button upload-inline__button"
              disabled={disabled || isUploading}
              onClick={triggerInput}
              type="button"
            >
              {isUploading ? 'جارٍ رفع الصورة...' : compactLabel}
            </button>
          )}
        </div>
      ) : (
        <div
          aria-disabled={disabled || isUploading}
          className={`upload-zone${isDragging ? ' upload-zone--dragging' : ''}${
            disabled || isUploading ? ' upload-zone--disabled' : ''
          }`}
          onClick={triggerInput}
          onDragEnter={(event) => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={(event) => {
            event.preventDefault()
            if (event.currentTarget === event.target) {
              setIsDragging(false)
            }
          }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => void handleDrop(event)}
          onKeyDown={handleKeyDown}
          onPaste={(event) => void handlePaste(event)}
          role="button"
          tabIndex={0}
        >
          <svg aria-hidden="true" className="upload-zone__icon" viewBox="0 0 24 24">
            <path
              d="M7 18.5A4.5 4.5 0 0 1 7.7 9.55 6 6 0 0 1 19 11.5a4 4 0 0 1-1 7.87H7Z"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.6"
            />
            <path
              d="M12 9.5v7m0-7 2.5 2.5M12 9.5 9.5 12"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.6"
            />
          </svg>

          <div className="upload-zone__copy">
            <strong>اسحب الصورة هنا أو انقر للاختيار</strong>
            <span>يمكنك أيضاً لصق صورة مباشرة باستخدام Ctrl+V.</span>
            {isUploading ? <span>جارٍ رفع الصورة...</span> : null}
          </div>
        </div>
      )}

      {error ? <div className="notice notice--error">{error}</div> : null}

      {!compact && imageUrl ? (
        <div className="upload-preview">
          <img alt="معاينة الصورة" className="upload-preview__image" src={imageUrl} />
          <div className="upload-preview__actions">
            <button className="button button--danger" onClick={onRemove} type="button">
              إزالة الصورة
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
