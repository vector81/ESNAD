import type { Editor } from '@tiptap/react'
import { TiptapEditor } from './Tiptap/TiptapEditor'

interface EditorCanvasProps {
  editor: Editor | null
  title: string
  titleLabel: string
  titlePlaceholder: string
  onTitleChange: (value: string) => void
  onImageUpload?: (file: File) => Promise<string>
}

export function EditorCanvas({
  editor,
  title,
  titleLabel,
  titlePlaceholder,
  onTitleChange,
  onImageUpload,
}: EditorCanvasProps) {
  return (
    <div className="editor-canvas">
      <div className="editor-canvas__header">
        <label className="editor-canvas__title-field">
          <span className="editor-canvas__title-label">{titleLabel}</span>
          <input
            className="editor-canvas__title-input"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder={titlePlaceholder}
          />
        </label>
      </div>
      <TiptapEditor editor={editor} onImageUpload={onImageUpload} />
    </div>
  )
}
