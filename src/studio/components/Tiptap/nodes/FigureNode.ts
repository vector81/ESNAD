// @ts-nocheck
import { TiptapNode, mergeAttributes } from '../tiptap-core-shim'

export interface FigureOptions {}

const SIZE_PRESETS = [40, 55, 70, 100]

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function normalizeWidth(value: unknown) {
  const width = Number(value)
  if (!Number.isFinite(width)) {
    return 100
  }
  return clamp(Math.round(width), 25, 100)
}

function normalizeAlign(value: unknown) {
  return value === 'left' || value === 'right' ? value : 'center'
}

function applyFigureLayout(dom: HTMLElement, img: HTMLImageElement, attrs: Record<string, unknown>) {
  const width = normalizeWidth(attrs.width)
  const align = normalizeAlign(attrs.align)

  dom.style.width = `${width}%`
  dom.style.maxWidth = '100%'
  dom.style.display = 'block'
  dom.style.marginTop = '1.2em'
  dom.style.marginBottom = '1.2em'
  dom.style.marginInlineStart = align === 'left' ? 'auto' : '0'
  dom.style.marginInlineEnd = align === 'right' ? 'auto' : '0'
  if (align === 'center') {
    dom.style.marginInlineStart = 'auto'
    dom.style.marginInlineEnd = 'auto'
  }
  dom.dataset.width = String(width)
  dom.dataset.align = align
  img.style.width = '100%'
}

export const FigureNode = TiptapNode.create<FigureOptions>({
  name: 'figure',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: {
        default: '',
      },
      alt: {
        default: '',
      },
      caption: {
        default: '',
      },
      width: {
        default: 100,
      },
      align: {
        default: 'center',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'figure[data-type="figure"]',
        getAttrs: (element) => {
          if (!(element instanceof HTMLElement)) return {}
          return {
            width: normalizeWidth(element.getAttribute('data-width')),
            align: normalizeAlign(element.getAttribute('data-align')),
          }
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const width = normalizeWidth(HTMLAttributes.width)
    const align = normalizeAlign(HTMLAttributes.align)
    return [
      'figure',
      mergeAttributes(
        {
          'data-type': 'figure',
          'data-width': String(width),
          'data-align': align,
        },
        HTMLAttributes,
      ),
    ]
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      let currentNode = node

      const dom = document.createElement('figure')
      dom.className = 'editor-figure'

      const frame = document.createElement('div')
      frame.className = 'editor-figure__frame'

      const toolbar = document.createElement('div')
      toolbar.className = 'editor-figure__toolbar'

      const dragHandle = document.createElement('span')
      dragHandle.className = 'editor-figure__drag'
      dragHandle.textContent = 'اسحب'
      dragHandle.title = 'اسحب الصورة لتحريكها داخل المقال'
      toolbar.appendChild(dragHandle)

      const buttonGroups = document.createElement('div')
      buttonGroups.className = 'editor-figure__toolbar-groups'
      toolbar.appendChild(buttonGroups)

      const img = document.createElement('img')
      img.className = 'editor-figure__image'
      img.draggable = false

      const resizeHandle = document.createElement('button')
      resizeHandle.type = 'button'
      resizeHandle.className = 'editor-figure__resize'
      resizeHandle.title = 'اسحب لتكبير الصورة أو تصغيرها'
      resizeHandle.setAttribute('aria-label', 'تغيير حجم الصورة')

      const caption = document.createElement('figcaption')
      caption.className = 'editor-figure__caption'
      caption.contentEditable = 'true'
      caption.spellcheck = true

      const syncAttrs = (partial: Record<string, unknown>) => {
        const pos = typeof getPos === 'function' ? getPos() : null
        if (pos === null) return

        const nextAttrs = { ...currentNode.attrs, ...partial }
        editor
          .chain()
          .focus()
          .command(({ tr }) => {
            tr.setNodeMarkup(pos, undefined, nextAttrs)
            return true
          })
          .run()
      }

      const stopEditorFocusLoss = (event: Event) => {
        event.preventDefault()
        event.stopPropagation()
      }

      const makeToolbarButton = (label: string, title: string, onActivate: () => void) => {
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'editor-figure__tool'
        button.textContent = label
        button.title = title
        button.addEventListener('mousedown', stopEditorFocusLoss)
        button.addEventListener('click', () => onActivate())
        return button
      }

      const sizeButtons = SIZE_PRESETS.map((preset) => {
        const button = makeToolbarButton(`${preset}%`, `حجم ${preset}%`, () => {
          syncAttrs({ width: preset })
        })
        buttonGroups.appendChild(button)
        return { button, preset }
      })

      const alignButtons = [
        { value: 'right', label: 'يمين' },
        { value: 'center', label: 'وسط' },
        { value: 'left', label: 'يسار' },
      ].map((option) => {
        const button = makeToolbarButton(option.label, `محاذاة ${option.label}`, () => {
          syncAttrs({ align: option.value })
        })
        buttonGroups.appendChild(button)
        return { button, value: option.value }
      })

      const refresh = () => {
        img.src = String(currentNode.attrs.src || '')
        img.alt = String(currentNode.attrs.alt || '')
        caption.textContent = String(currentNode.attrs.caption || '')
        applyFigureLayout(dom, img, currentNode.attrs)

        const width = normalizeWidth(currentNode.attrs.width)
        const align = normalizeAlign(currentNode.attrs.align)

        sizeButtons.forEach(({ button, preset }) => {
          button.classList.toggle('editor-figure__tool--active', width === preset)
        })
        alignButtons.forEach(({ button, value }) => {
          button.classList.toggle('editor-figure__tool--active', align === value)
        })
      }

      caption.addEventListener('mousedown', (event) => event.stopPropagation())
      caption.addEventListener('keydown', (event) => event.stopPropagation())
      caption.addEventListener('blur', () => {
        syncAttrs({ caption: caption.textContent || '' })
      })

      resizeHandle.addEventListener('mousedown', (event) => {
        stopEditorFocusLoss(event)

        const containerWidth = dom.parentElement?.clientWidth || dom.getBoundingClientRect().width
        const startWidth = dom.getBoundingClientRect().width
        const startX = event.clientX

        const handleMove = (moveEvent: MouseEvent) => {
          const nextWidth = clamp(startWidth + (moveEvent.clientX - startX), 160, Math.max(containerWidth, 160))
          const widthPercent = clamp(Math.round((nextWidth / Math.max(containerWidth, 1)) * 100), 25, 100)
          applyFigureLayout(dom, img, { ...currentNode.attrs, width: widthPercent })
        }

        const handleUp = (upEvent: MouseEvent) => {
          const nextWidth = clamp(startWidth + (upEvent.clientX - startX), 160, Math.max(containerWidth, 160))
          const widthPercent = clamp(Math.round((nextWidth / Math.max(containerWidth, 1)) * 100), 25, 100)
          syncAttrs({ width: widthPercent })
          window.removeEventListener('mousemove', handleMove)
          window.removeEventListener('mouseup', handleUp)
        }

        window.addEventListener('mousemove', handleMove)
        window.addEventListener('mouseup', handleUp)
      })

      frame.appendChild(toolbar)
      frame.appendChild(img)
      frame.appendChild(resizeHandle)
      dom.appendChild(frame)
      dom.appendChild(caption)

      refresh()

      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type !== currentNode.type) return false
          currentNode = updatedNode
          refresh()
          return true
        },
      }
    }
  },

  addCommands() {
    return {
      insertFigure:
        (options: { src: string; alt?: string; caption?: string; width?: number; align?: 'left' | 'center' | 'right' }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              src: options.src,
              alt: options.alt || '',
              caption: options.caption || '',
              width: normalizeWidth(options.width ?? 100),
              align: normalizeAlign(options.align ?? 'center'),
            },
          })
        },
    }
  },
})
