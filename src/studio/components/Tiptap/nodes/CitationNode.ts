// @ts-nocheck
import { TiptapNode, mergeAttributes } from '../tiptap-core-shim'

export interface CitationOptions {}

export const CitationNode = TiptapNode.create<CitationOptions>({
  name: 'citation',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      id: {
        default: '',
      },
      text: {
        default: '',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="citation"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes({ 'data-type': 'citation' }, HTMLAttributes)]
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('span')
      dom.className = 'editor-citation'
      dom.style.color = 'var(--accent)'
      dom.style.fontWeight = '600'
      dom.style.cursor = 'pointer'
      dom.textContent = `[${node.attrs.text || ''}]`
      return {
        dom,
      }
    }
  },

  addCommands() {
    return {
      insertCitation:
        (options: { id: string; text: string }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              id: options.id,
              text: options.text,
            },
          })
        },
    }
  },
})
