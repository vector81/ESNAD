import { useEditor, type Editor } from '@tiptap/react'
import { useRef, useEffect } from 'react'
import { Extension } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { EditorView } from '@tiptap/pm/view'
import StarterKit from '@tiptap/starter-kit'
import Color from '@tiptap/extension-color'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import Highlight from '@tiptap/extension-highlight'
import Underline from '@tiptap/extension-underline'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { Placeholder } from '@tiptap/extension-placeholder'
import { EquationNode } from '../components/Tiptap/nodes/EquationNode'
import { FigureNode } from '../components/Tiptap/nodes/FigureNode'
import { CitationNode } from '../components/Tiptap/nodes/CitationNode'
import { FootnoteNode } from '../components/Tiptap/nodes/FootnoteNode'
import { CommentMark } from '../components/Tiptap/marks/CommentMark'
import 'katex/dist/katex.min.css'

function extractImageFileFromClipboard(event: ClipboardEvent) {
  const items = Array.from(event.clipboardData?.items ?? [])
  const imageItem = items.find((item) => item.type.startsWith('image/'))
  return imageItem?.getAsFile() ?? null
}

function extractImageFileFromDrop(event: DragEvent) {
  const files = Array.from(event.dataTransfer?.files ?? [])
  return files.find((file) => file.type.startsWith('image/')) ?? null
}

function createImageNode(
  figureNode: { create: (attrs?: Record<string, unknown>) => unknown } | undefined,
  imageNode: { create: (attrs?: Record<string, unknown>) => unknown } | undefined,
  imageUrl: string,
): ProseMirrorNode | null {
  if (figureNode) {
    return figureNode.create({
      src: imageUrl,
      alt: '',
      caption: '',
      width: 100,
      align: 'center',
    }) as ProseMirrorNode
  }

  if (imageNode) {
    return imageNode.create({ src: imageUrl, alt: '' }) as ProseMirrorNode
  }

  return null
}

const FontFamily = Extension.create({
  name: 'fontFamily',

  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontFamily: {
            default: null,
            parseHTML: (element: HTMLElement) => {
              const value = element.style.fontFamily || ''
              return value ? value.replace(/["']/g, '') : null
            },
            renderHTML: (attributes: { fontFamily?: string | null }) => {
              if (!attributes.fontFamily) {
                return {}
              }

              return {
                style: `font-family: ${attributes.fontFamily}`,
              }
            },
          },
        },
      },
    ]
  },
})

const FontSize = Extension.create({
  name: 'fontSize',

  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.fontSize || null,
            renderHTML: (attributes: { fontSize?: string | null }) => {
              if (!attributes.fontSize) return {}
              return { style: `font-size: ${attributes.fontSize}` }
            },
          },
        },
      },
    ]
  },
})

export const defaultExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3, 4] },
  }),
  TextStyle,
  FontFamily,
  FontSize,
  Color,
  Subscript,
  Superscript,
  Image.configure({
    inline: false,
    allowBase64: false,
  }),
  Link.configure({
    openOnClick: false,
    autolink: true,
  }),
  TextAlign.configure({
    types: ['heading', 'paragraph'],
  }),
  Highlight.configure({
    multicolor: true,
  }),
  Underline,
  Table.configure({
    resizable: true,
  }),
  TableRow,
  TableHeader,
  TableCell,
  Placeholder.configure({
    placeholder: 'ابدأ الكتابة هنا…',
  }),
  EquationNode,
  FigureNode,
  CitationNode,
  FootnoteNode,
  CommentMark,
]

export function useStudioEditor(options: {
  content?: Record<string, unknown> | null
  onUpdate?: (editor: Editor) => void
  editable?: boolean
  onImageUpload?: (file: File | Blob) => Promise<string>
}) {
  const onUpdateRef = useRef(options.onUpdate)
  const onImageUploadRef = useRef(options.onImageUpload)
  useEffect(() => {
    onUpdateRef.current = options.onUpdate
  }, [options.onUpdate])
  useEffect(() => {
    onImageUploadRef.current = options.onImageUpload
  }, [options.onImageUpload])

  return useEditor({
    extensions: defaultExtensions,
    content: options.content ?? '<p></p>',
    editable: options.editable ?? true,
    onUpdate: ({ editor }: { editor: Editor }) => {
      onUpdateRef.current?.(editor)
    },
    editorProps: {
      attributes: {
        class: 'studio-editor__content',
      },
      handlePaste(view: EditorView, event: ClipboardEvent) {
        const uploadImage = onImageUploadRef.current
        const file = extractImageFileFromClipboard(event)
        if (!uploadImage || !file) {
          return false
        }

        event.preventDefault()
        void uploadImage(file).then((imageUrl) => {
          const { schema, selection } = view.state
          const node = createImageNode(schema.nodes.figure, schema.nodes.image, imageUrl)
          if (!node) return
          const transaction = view.state.tr.replaceRangeWith(selection.from, selection.to, node)
          view.dispatch(transaction.scrollIntoView())
          view.focus()
        }).catch((error) => {
          console.error('Image paste upload failed', error)
        })

        return true
      },
      handleDrop(view: EditorView, event: DragEvent) {
        const uploadImage = onImageUploadRef.current
        const file = extractImageFileFromDrop(event)
        if (!uploadImage || !file) {
          return false
        }

        event.preventDefault()
        void uploadImage(file).then((imageUrl) => {
          const { schema } = view.state
          const node = createImageNode(schema.nodes.figure, schema.nodes.image, imageUrl)
          if (!node) return
          const position = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ?? view.state.selection.from
          const transaction = view.state.tr.insert(position, node)
          view.dispatch(transaction.scrollIntoView())
          view.focus()
        }).catch((error) => {
          console.error('Image drop upload failed', error)
        })

        return true
      },
    },
  })
}
