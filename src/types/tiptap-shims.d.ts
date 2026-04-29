declare module '@tiptap/core' {
  export interface Commands<ReturnType = any> {}
  export const Extension: any
  export const ResizableNodeView: any
  export function mergeAttributes(...attributes: any[]): any
}

declare module '@tiptap/react' {
  export type Editor = any
  export type NodeViewProps = {
    editor: any
    getPos: (() => number) | boolean
    node: any
    selected: boolean
    updateAttributes: (attributes: Record<string, unknown>) => void
  }
  export const EditorContent: any
  export const NodeViewWrapper: any
  export const ReactNodeViewRenderer: any
  export function useEditor(options: any): any
}

declare module '@tiptap/starter-kit' {
  const StarterKit: any
  export default StarterKit
}

declare module '@tiptap/extensions' {
  export const UndoRedo: any
}

declare module '@tiptap/extension-image' {
  const Image: any
  export default Image
}

declare module '@tiptap/extension-link' {
  const Link: any
  export default Link
}

declare module '@tiptap/extension-text-align' {
  const TextAlign: any
  export default TextAlign
}

declare module '@tiptap/extension-text-style' {
  export const TextStyle: any
}

declare module '@tiptap/extension-color' {
  const Color: any
  export default Color
}

declare module '@tiptap/extension-highlight' {
  const Highlight: any
  export default Highlight
}

declare module '@tiptap/extension-underline' {
  const Underline: any
  export default Underline
}

declare module '@tiptap/extension-dropcursor' {
  const Dropcursor: any
  export default Dropcursor
}

declare module '@tiptap/extension-gapcursor' {
  const Gapcursor: any
  export default Gapcursor
}
