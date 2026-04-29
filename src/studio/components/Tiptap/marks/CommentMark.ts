// @ts-nocheck
import { Mark } from '@tiptap/core'

export const CommentMark = Mark.create({
  name: 'comment',
  excludes: '',
  inclusive: false,
  parseHTML() {
    return [
      {
        tag: 'span[data-comment-id]',
      },
    ]
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', { 'data-comment-id': HTMLAttributes['data-comment-id'], class: 'comment-mark' }, 0]
  },
  addAttributes() {
    return {
      'data-comment-id': {
        default: '',
      },
    }
  },
})
