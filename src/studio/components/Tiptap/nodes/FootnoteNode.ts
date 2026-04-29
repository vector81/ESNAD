// @ts-nocheck
import { TiptapNode, mergeAttributes } from '../tiptap-core-shim'

export interface FootnoteOptions {}

export const FootnoteNode = TiptapNode.create<FootnoteOptions>({
  name: 'footnote',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      id: {
        default: '',
      },
      content: {
        default: '',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="footnote"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-type': 'footnote' }, HTMLAttributes)]
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const dom = document.createElement('div')
      dom.className = 'editor-footnote'
      dom.style.display = 'flex'
      dom.style.gap = '10px'
      dom.style.alignItems = 'flex-start'
      dom.style.padding = '12px 14px'
      dom.style.background = 'var(--bg-subtle)'
      dom.style.borderRadius = '8px'
      dom.style.margin = '1em 0'

      const label = document.createElement('sup')
      label.className = 'editor-footnote__label'
      label.style.fontWeight = '700'
      label.style.color = 'var(--accent)'
      label.textContent = String(node.attrs.id || '')

      const text = document.createElement('span')
      text.className = 'editor-footnote__text'
      text.contentEditable = 'true'
      text.style.flex = '1'
      text.style.outline = 'none'
      text.style.fontSize = '14px'
      text.textContent = String(node.attrs.content || '')

      text.addEventListener('blur', () => {
        const pos = typeof getPos === 'function' ? getPos() : null
        if (pos !== null) {
          editor
            .chain()
            .focus()
            .command(({ tr }) => {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                content: text.textContent || '',
              })
              return true
            })
            .run()
        }
      })

      dom.appendChild(label)
      dom.appendChild(text)
      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type !== node.type) return false
          label.textContent = String(updatedNode.attrs.id || '')
          if (text.textContent !== updatedNode.attrs.content) {
            text.textContent = String(updatedNode.attrs.content || '')
          }
          return true
        },
      }
    }
  },

  addCommands() {
    return {
      insertFootnote:
        (options: { id: string; content?: string }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              id: options.id,
              content: options.content || '',
            },
          })
        },
    }
  },
})
