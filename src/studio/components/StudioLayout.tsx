interface StudioLayoutProps {
  topBar: React.ReactNode
  sidebar: React.ReactNode
  editor: React.ReactNode
  contextPanel: React.ReactNode
}

export function StudioLayout({ topBar, sidebar, editor, contextPanel }: StudioLayoutProps) {
  return (
    <div className="studio-layout">
      <div className="studio-layout__topbar">{topBar}</div>
      <div className="studio-layout__body">
        <div className="studio-layout__sidebar">{sidebar}</div>
        <div className="studio-layout__canvas">{editor}</div>
        <div className="studio-layout__context">{contextPanel}</div>
      </div>
    </div>
  )
}
