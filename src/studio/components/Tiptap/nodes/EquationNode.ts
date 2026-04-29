// @ts-nocheck
import { TiptapNode, mergeAttributes } from '../tiptap-core-shim'
import katex from 'katex'

export interface EquationOptions {}

export const EquationNode = TiptapNode.create<EquationOptions>({
  name: 'equation',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      expression: {
        default: '',
      },
      displayMode: {
        default: false,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="equation"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes({ 'data-type': 'equation' }, HTMLAttributes)]
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('span')
      dom.className = node.attrs.displayMode ? 'equation-block' : 'equation-inline'
      dom.style.display = node.attrs.displayMode ? 'block' : 'inline'
      dom.style.textAlign = node.attrs.displayMode ? 'center' : 'inherit'
      dom.style.margin = node.attrs.displayMode ? '1em 0' : '0 4px'
      try {
        katex.render(String(node.attrs.expression || ''), dom, {
          throwOnError: false,
          displayMode: Boolean(node.attrs.displayMode),
        })
      } catch {
        dom.textContent = String(node.attrs.expression || '')
      }
      return {
        dom,
      }
    }
  },

  addCommands() {
    return {
      insertEquation:
        (options: { expression: string; displayMode?: boolean }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              expression: options.expression,
              displayMode: options.displayMode ?? false,
            },
          })
        },
    }
  },
})
