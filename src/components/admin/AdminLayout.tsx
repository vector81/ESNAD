import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { isFirebaseConfigured } from '../../lib/firebase'
import { publicSiteUrl } from '../../lib/siteLinks'

function getNavClassName(isActive: boolean) {
  return `admin-nav__link${isActive ? ' admin-nav__link--active' : ''}`
}

export function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { signOutUser, user } = useAuth()
  const isWriterRoute =
    location.pathname === '/admin/publications/new' ||
    /^\/admin\/publications\/[^/]+\/edit$/.test(location.pathname)

  const handleLogout = async () => {
    await signOutUser()
    navigate('/login', { replace: true })
  }

  return (
    <div className={`admin-shell${isWriterRoute ? ' admin-shell--writer' : ''}`} dir="rtl" lang="ar">
      {!isWriterRoute && (
        <aside className="admin-sidebar">
          <div className="admin-sidebar__brand">
            <img src="/newlogo.png" alt="Esnad" style={{ height: '72px', objectFit: 'contain', marginBottom: '12px' }} />
            <span>لوحة إدارة المركز</span>
          </div>

          <nav className="admin-nav">
            <NavLink className={({ isActive }) => getNavClassName(isActive)} end to="/">
              الإصدارات
            </NavLink>
            <NavLink className={({ isActive }) => getNavClassName(isActive)} to="/admin/publications/new">
              إصدار جديد
            </NavLink>
            {publicSiteUrl ? (
              <a className="admin-nav__link" href={publicSiteUrl} target="_blank" rel="noreferrer">
                الموقع العام
              </a>
            ) : null}
          </nav>

          <div className="admin-sidebar__footer">
            <div className="admin-user">
              <div className="admin-user__email">{user?.email ?? (isFirebaseConfigured ? 'جلسة نشطة' : 'وضع معاينة')}</div>
              <div className="admin-user__date">
                {new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium' }).format(new Date())}
              </div>
            </div>
            <button className="btn btn--ghost btn--sm" onClick={handleLogout} type="button">
              تسجيل الخروج
            </button>
          </div>
        </aside>
      )}

      <main className="admin-main" style={{ padding: isWriterRoute ? 0 : 28 }}>
        <Outlet />
      </main>
    </div>
  )
}
