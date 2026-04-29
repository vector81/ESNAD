import type { Editor } from '@tiptap/react'
import { EditorContent } from '@tiptap/react'
import { EditorToolbar } from './EditorToolbar'

interface TiptapEditorProps {
  editor: Editor | null
  onImageUpload?: (file: File) => Promise<string>
}

export function TiptapEditor({ editor, onImageUpload }: TiptapEditorProps) {
  if (!editor) {
    return (
      <div style={{ padding: 24, color: 'var(--text-muted)' }}>
        جارٍ تحميل المحرر…
      </div>
    )
  }

  return (
    <div className="tiptap-editor">
      <EditorToolbar editor={editor} onImageUpload={onImageUpload} />
      <div className="tiptap-editor__canvas">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
