import { useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'

interface EditorToolbarProps {
  editor: Editor
  onImageUpload?: (file: File) => Promise<string>
}

const FONT_OPTIONS = [
  { label: 'افتراضي', value: '' },
  { label: 'Noto Naskh Arabic', value: 'Noto Naskh Arabic' },
  { label: 'Amiri', value: 'Amiri' },
  { label: 'Cairo', value: 'Cairo' },
  { label: 'Inter', value: 'Inter' },
  { label: 'Times New Roman', value: 'Times New Roman' },
  { label: 'Arial', value: 'Arial' },
  { label: 'Tahoma', value: 'Tahoma' },
]

const FONT_SIZES = ['10', '11', '12', '13', '14', '16', '18', '20', '24', '28', '32', '40', '48', '56', '64', '72']

const TEXT_PALETTE: string[] = [
  '#000000', '#1f2937', '#4b5563', '#9ca3af', '#d1d5db', '#ffffff',
  '#7f1d1d', '#b91c1c', '#dc2626', '#ef4444', '#f87171', '#fca5a5',
  '#7c2d12', '#c2410c', '#ea580c', '#f97316', '#fb923c', '#fdba74',
  '#78350f', '#b45309', '#d97706', '#f59e0b', '#fbbf24', '#fcd34d',
  '#365314', '#4d7c0f', '#65a30d', '#84cc16', '#a3e635', '#bef264',
  '#14532d', '#15803d', '#16a34a', '#22c55e', '#4ade80', '#86efac',
  '#134e4a', '#0f766e', '#0d9488', '#14b8a6', '#2dd4bf', '#5eead4',
  '#0c4a6e', '#0369a1', '#0284c7', '#0ea5e9', '#38bdf8', '#7dd3fc',
  '#1e3a8a', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd',
  '#312e81', '#4338ca', '#4f46e5', '#6366f1', '#818cf8', '#a5b4fc',
  '#581c87', '#7e22ce', '#9333ea', '#a855f7', '#c084fc', '#d8b4fe',
  '#831843', '#be185d', '#db2777', '#ec4899', '#f472b6', '#f9a8d4',
]

const HIGHLIGHT_PALETTE: string[] = [
  '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24',
  '#bbf7d0', '#86efac', '#4ade80', '#22c55e',
  '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6',
  '#e9d5ff', '#d8b4fe', '#c084fc', '#a855f7',
  '#fecdd3', '#fda4af', '#fb7185', '#f43f5e',
  '#f5f5f4', '#e7e5e4', '#d6d3d1', '#a8a29e',
]

const STYLES = [
  { id: 'normal', label: 'عادي', preview: { fontSize: 14, fontWeight: 400 } },
  { id: 'h1', label: 'عنوان 1', preview: { fontSize: 22, fontWeight: 700 } },
  { id: 'h2', label: 'عنوان 2', preview: { fontSize: 18, fontWeight: 700 } },
  { id: 'h3', label: 'عنوان 3', preview: { fontSize: 16, fontWeight: 600 } },
  { id: 'title', label: 'العنوان', preview: { fontSize: 26, fontWeight: 800 } },
  { id: 'subtitle', label: 'العنوان الفرعي', preview: { fontSize: 16, fontWeight: 500, fontStyle: 'italic' as const, color: '#6b7280' } },
] as const

function ToolbarButton({
  active,
  disabled,
  onClick,
  children,
  title,
}: {
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
  title?: string
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`editor-toolbar__btn${active ? ' editor-toolbar__btn--active' : ''}`}
    >
      {children}
    </button>
  )
}

function ToolbarSelect({
  ariaLabel,
  onChange,
  options,
  value,
  width,
}: {
  ariaLabel: string
  onChange: (value: string) => void
  options: Array<{ label: string; value: string }>
  value: string
  width?: number
}) {
  return (
    <label className="editor-toolbar__select-wrap" style={width ? { width } : undefined}>
      <select
        aria-label={ariaLabel}
        className="editor-toolbar__select"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={`${ariaLabel}-${option.label}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function ColorPickerControl({
  ariaLabel,
  icon,
  underlineColor,
  value,
  palette,
  onChange,
}: {
  ariaLabel: string
  icon: React.ReactNode
  underlineColor?: string
  value: string
  palette: string[]
  onChange: (next: string) => void
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const handleDocClick = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleDocClick)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleDocClick)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [open])

  const indicator = underlineColor ?? value ?? '#000000'

  return (
    <div className="editor-color" ref={wrapRef}>
      <button
        type="button"
        className="editor-color__trigger"
        aria-label={ariaLabel}
        title={ariaLabel}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="editor-color__icon">{icon}</span>
        <span className="editor-color__bar" style={{ background: indicator }} />
        <span className="editor-color__caret">▾</span>
      </button>
      {open ? (
        <div className="editor-color__pop" role="dialog">
          <div className="editor-color__grid">
            {palette.map((color) => (
              <button
                key={color}
                type="button"
                title={color}
                className={`editor-color__cell${value.toLowerCase() === color.toLowerCase() ? ' editor-color__cell--active' : ''}`}
                style={{ background: color }}
                onClick={() => {
                  onChange(color)
                  setOpen(false)
                }}
              />
            ))}
          </div>
          <div className="editor-color__row">
            <label className="editor-color__custom">
              <span>لون مخصص</span>
              <input
                type="color"
                value={value || '#000000'}
                onChange={(event) => onChange(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="editor-color__clear"
              onClick={() => {
                onChange('')
                setOpen(false)
              }}
            >
              بدون لون
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function normalizeUrl(value: string) {
  if (/^[a-z]+:\/\//i.test(value)) return value
  return `https://${value}`
}

function getSelectedText(editor: Editor) {
  const { from, to } = editor.state.selection
  return editor.state.doc.textBetween(from, to, ' ').trim()
}

function getActiveStyleId(editor: Editor): string {
  if (editor.isActive('heading', { level: 1 })) return 'h1'
  if (editor.isActive('heading', { level: 2 })) return 'h2'
  if (editor.isActive('heading', { level: 3 })) return 'h3'
  if (editor.isActive('heading', { level: 4 })) return 'subtitle'
  return 'normal'
}

function parsePxNumber(value: string | null | undefined): number | null {
  if (!value) return null
  const match = String(value).match(/(\d+(?:\.\d+)?)/)
  if (!match) return null
  return Number(match[1])
}

// Inline icon helpers (16px)
const I = {
  bold: <span style={{ fontWeight: 800 }}>B</span>,
  italic: <em style={{ fontWeight: 700 }}>I</em>,
  underline: <span style={{ textDecoration: 'underline', fontWeight: 700 }}>U</span>,
  strike: <span style={{ textDecoration: 'line-through', fontWeight: 700 }}>S</span>,
  sub: (
    <span style={{ fontWeight: 700 }}>X<sub style={{ fontSize: 9 }}>2</sub></span>
  ),
  sup: (
    <span style={{ fontWeight: 700 }}>X<sup style={{ fontSize: 9 }}>2</sup></span>
  ),
  clear: <span style={{ fontWeight: 700 }}>↺ A</span>,
  bigger: <span style={{ fontSize: 14, fontWeight: 700 }}>A<span style={{ fontSize: 10 }}>↑</span></span>,
  smaller: <span style={{ fontSize: 12, fontWeight: 700 }}>A<span style={{ fontSize: 10 }}>↓</span></span>,
  bullets: <span>• ☰</span>,
  numbered: <span>1. ☰</span>,
  alignRight: <span>☰▸</span>,
  alignCenter: <span>≡</span>,
  alignLeft: <span>◂☰</span>,
  alignJustify: <span>☰</span>,
  link: <span>🔗</span>,
  image: <span>🖼</span>,
  table: <span>▦</span>,
  textColor: <span style={{ fontWeight: 800 }}>A</span>,
  highlight: <span style={{ fontWeight: 800 }}>✱</span>,
}

export function EditorToolbar({ editor, onImageUpload }: EditorToolbarProps) {
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  const activeFontFamily = String(editor.getAttributes('textStyle').fontFamily || '')
  const activeColor = String(editor.getAttributes('textStyle').color || '')
  const activeHighlight = String(editor.getAttributes('highlight').color || '')
  const activeFontSize = String(editor.getAttributes('textStyle').fontSize || '')
  const activeStyleId = getActiveStyleId(editor)

  const handleStyleSelect = (id: string) => {
    const chain = editor.chain().focus()
    if (id === 'normal') {
      chain.setParagraph().run()
      return
    }
    if (id === 'title') {
      // Use H1 + bigger emphasis as "Title" — set H1 then keep
      chain.setHeading({ level: 1 }).run()
      return
    }
    if (id === 'subtitle') {
      chain.setHeading({ level: 4 }).run()
      return
    }
    const level = id === 'h1' ? 1 : id === 'h2' ? 2 : 3
    chain.setHeading({ level: level as 1 | 2 | 3 }).run()
  }

  const handleFontChange = (value: string) => {
    if (!value) {
      editor.chain().focus().setMark('textStyle', { fontFamily: null }).removeEmptyTextStyle().run()
      return
    }
    editor.chain().focus().setMark('textStyle', { fontFamily: value }).run()
  }

  const setFontSizePx = (px: number | null) => {
    if (!px) {
      editor.chain().focus().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run()
      return
    }
    editor.chain().focus().setMark('textStyle', { fontSize: `${px}px` }).run()
  }

  const handleFontSizeChange = (value: string) => {
    if (!value) return setFontSizePx(null)
    const num = Number(value)
    if (Number.isFinite(num) && num > 0) setFontSizePx(num)
  }

  const bumpFontSize = (delta: number) => {
    const current = parsePxNumber(activeFontSize) ?? 16
    const next = Math.max(8, Math.min(120, current + delta))
    setFontSizePx(next)
  }

  const handleTextColorChange = (value: string) => {
    if (!value) {
      editor.chain().focus().unsetColor().run()
      return
    }
    editor.chain().focus().setColor(value).run()
  }

  const handleHighlightChange = (value: string) => {
    if (!value) {
      editor.chain().focus().unsetHighlight().run()
      return
    }
    editor.chain().focus().setHighlight({ color: value }).run()
  }

  const handleInsertLink = () => {
    const currentSelection = getSelectedText(editor)
    const currentHref = String(editor.getAttributes('link').href || '')
    const hrefInput = window.prompt('ألصق الرابط الكامل:', currentHref)
    if (!hrefInput) return
    const href = normalizeUrl(hrefInput.trim())
    const label = window.prompt('النص الظاهر للرابط:', currentSelection || href)
    if (!label) return
    const { from, to } = editor.state.selection
    editor.chain().focus().insertContentAt({ from, to }, {
      type: 'text',
      text: label,
      marks: [{ type: 'link', attrs: { href } }],
    }).run()
  }

  const handleInsertImage = async (file: File | null) => {
    if (!file || !onImageUpload) return
    setIsUploadingImage(true)
    try {
      const imageUrl = await onImageUpload(file)
      editor.chain().focus().insertFigure({ src: imageUrl, width: 100, align: 'center' }).run()
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'تعذر رفع الصورة.')
    } finally {
      setIsUploadingImage(false)
      if (imageInputRef.current) imageInputRef.current.value = ''
    }
  }

  const fontSizeInput = activeFontSize ? String(parsePxNumber(activeFontSize) ?? '') : ''

  return (
    <div className="editor-toolbar">
      <input
        ref={imageInputRef}
        hidden
        type="file"
        accept="image/*"
        onChange={(event) => void handleInsertImage(event.target.files?.[0] ?? null)}
      />

      {/* === Font group === */}
      <div className="editor-toolbar__group">
        <div className="editor-toolbar__group-row">
          <ToolbarSelect
            ariaLabel="نوع الخط"
            value={activeFontFamily}
            onChange={handleFontChange}
            options={FONT_OPTIONS}
            width={130}
          />
          <ToolbarSelect
            ariaLabel="حجم الخط"
            value={fontSizeInput}
            onChange={handleFontSizeChange}
            options={[{ label: '—', value: '' }, ...FONT_SIZES.map((s) => ({ label: s, value: s }))]}
            width={56}
          />
          <ToolbarButton title="تكبير الخط" onClick={() => bumpFontSize(2)}>
            {I.bigger}
          </ToolbarButton>
          <ToolbarButton title="تصغير الخط" onClick={() => bumpFontSize(-2)}>
            {I.smaller}
          </ToolbarButton>
          <ToolbarButton
            title="مسح التنسيق"
            onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          >
            {I.clear}
          </ToolbarButton>
        </div>
        <div className="editor-toolbar__group-row">
          <ToolbarButton
            title="غامق"
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            {I.bold}
          </ToolbarButton>
          <ToolbarButton
            title="مائل"
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            {I.italic}
          </ToolbarButton>
          <ToolbarButton
            title="تسطير"
            active={editor.isActive('underline')}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            {I.underline}
          </ToolbarButton>
          <ToolbarButton
            title="يتوسطه خط"
            active={editor.isActive('strike')}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            {I.strike}
          </ToolbarButton>
          <ToolbarButton
            title="منخفض"
            active={editor.isActive('subscript')}
            onClick={() => editor.chain().focus().toggleSubscript().run()}
          >
            {I.sub}
          </ToolbarButton>
          <ToolbarButton
            title="مرتفع"
            active={editor.isActive('superscript')}
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
          >
            {I.sup}
          </ToolbarButton>
          <ColorPickerControl
            ariaLabel="لون النص"
            icon={I.textColor}
            underlineColor={activeColor || '#000000'}
            value={activeColor}
            palette={TEXT_PALETTE}
            onChange={handleTextColorChange}
          />
          <ColorPickerControl
            ariaLabel="تظليل النص"
            icon={I.highlight}
            underlineColor={activeHighlight || '#fde68a'}
            value={activeHighlight}
            palette={HIGHLIGHT_PALETTE}
            onChange={handleHighlightChange}
          />
        </div>
        <div className="editor-toolbar__group-label">الخط</div>
      </div>

      <div className="editor-toolbar__divider" />

      {/* === Paragraph group === */}
      <div className="editor-toolbar__group">
        <div className="editor-toolbar__group-row">
          <ToolbarButton
            title="قائمة نقطية"
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            {I.bullets}
          </ToolbarButton>
          <ToolbarButton
            title="قائمة مرقمة"
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            {I.numbered}
          </ToolbarButton>
          <ToolbarButton
            title="اقتباس"
            active={editor.isActive('blockquote')}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            ❝
          </ToolbarButton>
        </div>
        <div className="editor-toolbar__group-row">
          <ToolbarButton
            title="محاذاة لليمين"
            active={editor.isActive({ textAlign: 'right' })}
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
          >
            {I.alignRight}
          </ToolbarButton>
          <ToolbarButton
            title="توسيط"
            active={editor.isActive({ textAlign: 'center' })}
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
          >
            {I.alignCenter}
          </ToolbarButton>
          <ToolbarButton
            title="محاذاة لليسار"
            active={editor.isActive({ textAlign: 'left' })}
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
          >
            {I.alignLeft}
          </ToolbarButton>
          <ToolbarButton
            title="ضبط"
            active={editor.isActive({ textAlign: 'justify' })}
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          >
            {I.alignJustify}
          </ToolbarButton>
        </div>
        <div className="editor-toolbar__group-label">الفقرة</div>
      </div>

      <div className="editor-toolbar__divider" />

      {/* === Styles gallery === */}
      <div className="editor-toolbar__group editor-toolbar__group--styles">
        <div className="editor-toolbar__group-row editor-toolbar__styles">
          {STYLES.map((style) => (
            <button
              key={style.id}
              type="button"
              title={style.label}
              className={`editor-style${activeStyleId === style.id ? ' editor-style--active' : ''}`}
              onClick={() => handleStyleSelect(style.id)}
              style={{
                fontSize: style.preview.fontSize,
                fontWeight: style.preview.fontWeight,
                fontStyle: 'fontStyle' in style.preview ? style.preview.fontStyle : undefined,
                color: 'color' in style.preview ? style.preview.color : undefined,
              }}
            >
              {style.label}
            </button>
          ))}
        </div>
        <div className="editor-toolbar__group-label">الأنماط</div>
      </div>

      <div className="editor-toolbar__divider" />

      {/* === Insert group === */}
      <div className="editor-toolbar__group">
        <div className="editor-toolbar__group-row">
          <ToolbarButton title="رابط" active={editor.isActive('link')} onClick={handleInsertLink}>
            {I.link} رابط
          </ToolbarButton>
          <ToolbarButton
            title="إزالة الرابط"
            onClick={() => editor.chain().focus().extendMarkRange('link').unsetLink().run()}
          >
            فك
          </ToolbarButton>
          <ToolbarButton
            title="إدراج صورة"
            disabled={!onImageUpload || isUploadingImage}
            onClick={() => imageInputRef.current?.click()}
          >
            {isUploadingImage ? '…' : I.image} صورة
          </ToolbarButton>
          <ToolbarButton
            title="جدول"
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          >
            {I.table} جدول
          </ToolbarButton>
        </div>
        <div className="editor-toolbar__group-label">إدراج</div>
      </div>
    </div>
  )
}
