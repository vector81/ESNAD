import type { ReactNode } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { articleImageSize, articleImageUrl, priorityArticleImage, articleImageSrcSet, ARTICLE_IMAGE_SIZES } from '../../lib/articleImages.js'

interface PmNode {
  type: string
  attrs?: Record<string, unknown>
  content?: PmNode[]
  text?: string
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
}

function renderEquation(expression: string, displayMode: boolean): ReactNode {
  try {
    const html = katex.renderToString(expression, { throwOnError: false, displayMode })
    return <span dangerouslySetInnerHTML={{ __html: html }} />
  } catch {
    return <span>{expression}</span>
  }
}

function renderMarks(text: string, marks?: PmNode['marks']): ReactNode {
  if (!marks || marks.length === 0) return text
  return marks.reduce<ReactNode>((children, mark) => {
    switch (mark.type) {
      case 'bold':
        return <strong key={mark.type}>{children}</strong>
      case 'italic':
        return <em key={mark.type}>{children}</em>
      case 'underline':
        return <u key={mark.type}>{children}</u>
      case 'strike':
        return <s key={mark.type}>{children}</s>
      case 'subscript':
        return <sub key={mark.type}>{children}</sub>
      case 'superscript':
        return <sup key={mark.type}>{children}</sup>
      case 'highlight': {
        const color = mark.attrs?.color
        return (
          <mark
            key={mark.type}
            style={typeof color === 'string' && color ? { background: color } : undefined}
          >
            {children}
          </mark>
        )
      }
      case 'textStyle': {
        const style: Record<string, string> = {}
        const fontFamily = mark.attrs?.fontFamily
        const fontSize = mark.attrs?.fontSize
        const color = mark.attrs?.color
        if (typeof fontFamily === 'string' && fontFamily) style.fontFamily = fontFamily
        if (typeof fontSize === 'string' && fontSize) style.fontSize = fontSize
        if (typeof color === 'string' && color) style.color = color
        if (Object.keys(style).length === 0) return children
        return <span key={mark.type} style={style}>{children}</span>
      }
      case 'code':
        return <code key={mark.type}>{children}</code>
      case 'link':
        return (
          <a key={mark.type} href={String(mark.attrs?.href || '#')} target="_blank" rel="noreferrer">
            {children}
          </a>
        )
      default:
        return children
    }
  }, text)
}

function renderNode(node: PmNode, index: number, priorityImage = ''): ReactNode {
  const imageSrc = String(node.attrs?.src || '')
  const priority = Boolean(imageSrc && imageSrc === priorityImage)
  const dimensions = articleImageSize(imageSrc)
  switch (node.type) {
    case 'text':
      return <span key={index}>{renderMarks(node.text || '', node.marks)}</span>
    case 'paragraph':
      return <p key={index}>{node.content?.map((n, i) => renderNode(n, i, priorityImage))}</p>
    case 'heading':
      switch (node.attrs?.level) {
        case 1:
          return <h2 key={index}>{node.content?.map((n, i) => renderNode(n, i, priorityImage))}</h2>
        case 2:
          return <h2 key={index}>{node.content?.map((n, i) => renderNode(n, i, priorityImage))}</h2>
        case 3:
          return <h3 key={index}>{node.content?.map((n, i) => renderNode(n, i, priorityImage))}</h3>
        case 4:
          return <h4 key={index}>{node.content?.map((n, i) => renderNode(n, i, priorityImage))}</h4>
        default:
          return <h2 key={index}>{node.content?.map((n, i) => renderNode(n, i, priorityImage))}</h2>
      }
    case 'bulletList':
      return <ul key={index}>{node.content?.map((n, i) => renderNode(n, i, priorityImage))}</ul>
    case 'orderedList':
      return <ol key={index}>{node.content?.map((n, i) => renderNode(n, i, priorityImage))}</ol>
    case 'listItem':
      return <li key={index}>{node.content?.map((n, i) => renderNode(n, i, priorityImage))}</li>
    case 'blockquote':
      return <blockquote key={index}>{node.content?.map((n, i) => renderNode(n, i, priorityImage))}</blockquote>
    case 'codeBlock':
      return <pre key={index}><code>{node.content?.map((n, i) => renderNode(n, i, priorityImage))}</code></pre>
    case 'image':
      return (
        <img
          key={index}
          src={articleImageUrl(imageSrc, priority)}
          srcSet={priority ? articleImageSrcSet(imageSrc) || undefined : undefined}
          sizes={priority && articleImageSrcSet(imageSrc) ? ARTICLE_IMAGE_SIZES : undefined}
          alt={/[\u0600-\u06ff]/.test(String(node.attrs?.alt || '')) ? String(node.attrs?.alt) : 'صورة توضيحية ضمن المقال'}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : undefined}
          width={dimensions.width}
          height={dimensions.height}
          decoding="async"
          style={{ maxWidth: '100%', height: 'auto', borderRadius: 8, margin: '1em 0' }}
        />
      )
    case 'hardBreak':
      return <br key={index} />
    case 'table':
      return (
        <table key={index} style={{ width: '100%', borderCollapse: 'collapse', margin: '1em 0' }}>
          <tbody>{node.content?.map((n, i) => renderNode(n, i, priorityImage))}</tbody>
        </table>
      )
    case 'tableRow':
      return <tr key={index}>{node.content?.map((n, i) => renderNode(n, i, priorityImage))}</tr>
    case 'tableHeader':
      return (
        <th key={index} style={{ border: '1px solid #e5e5e5', padding: '10px 12px', background: '#f7f7f5' }}>
          {node.content?.map((n, i) => renderNode(n, i, priorityImage))}
        </th>
      )
    case 'tableCell':
      return (
        <td key={index} style={{ border: '1px solid #e5e5e5', padding: '10px 12px' }}>
          {node.content?.map((n, i) => renderNode(n, i, priorityImage))}
        </td>
      )
    case 'equation':
      return (
        <span
          key={index}
          style={{
            display: node.attrs?.displayMode ? 'block' : 'inline',
            textAlign: node.attrs?.displayMode ? 'center' : 'inherit',
            margin: node.attrs?.displayMode ? '1em 0' : '0 4px',
          }}
        >
          {renderEquation(String(node.attrs?.expression || ''), Boolean(node.attrs?.displayMode))}
        </span>
      )
    case 'figure':
      return (
        <figure key={index} style={{ margin: '1.2em 0', textAlign: 'center' }}>
          <img
            src={articleImageUrl(imageSrc, priority)}
            srcSet={priority ? articleImageSrcSet(imageSrc) || undefined : undefined}
            sizes={priority && articleImageSrcSet(imageSrc) ? ARTICLE_IMAGE_SIZES : undefined}
            alt={/[\u0600-\u06ff]/.test(String(node.attrs?.alt || '')) ? String(node.attrs?.alt) : String(node.attrs?.caption || 'صورة توضيحية ضمن المقال')}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : undefined}
            width={dimensions.width}
            height={dimensions.height}
            decoding="async"
            style={{ maxWidth: '100%', height: 'auto', borderRadius: 8 }}
          />
          {node.attrs?.caption ? (
            <figcaption style={{ marginTop: 8, fontSize: 14, color: 'var(--text-muted)' }}>
              {String(node.attrs.caption)}
            </figcaption>
          ) : null}
        </figure>
      )
    case 'citation':
      return (
        <sup key={index} style={{ color: 'var(--accent)', fontWeight: 600, margin: '0 2px' }}>
          [{String(node.attrs?.text || '')}]
        </sup>
      )
    case 'footnote':
      return (
        <div
          key={index}
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
            padding: '12px 14px',
            background: 'var(--bg-subtle)',
            borderRadius: 8,
            margin: '1em 0',
          }}
        >
          <sup style={{ fontWeight: 700, color: 'var(--accent)' }}>{String(node.attrs?.id || '')}</sup>
          <span style={{ flex: 1, fontSize: 14 }}>{String(node.attrs?.content || '')}</span>
        </div>
      )
    default:
      return <div key={index}>{node.content?.map((n, i) => renderNode(n, i, priorityImage))}</div>
  }
}

export function renderPmJson(content: Record<string, unknown> | null | undefined): ReactNode {
  if (!content) return null
  const doc = content as unknown as PmNode
  if (!doc.content) return null
  const priorityImage = priorityArticleImage(doc)
  return <>{doc.content.map((node, index) => renderNode(node, index, priorityImage))}</>
}
