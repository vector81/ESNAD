import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { isFirebaseConfigured } from '../../lib/firebase'

export function ProtectedRoute() {
  const location = useLocation()
  const { loading, user, isAdmin } = useAuth()

  if (!isFirebaseConfigured) {
    return <Outlet />
  }

  if (loading) {
    return (
      <div className="editor-shell" dir="rtl" lang="ar">
        <main className="editor-content">
          <section className="editor-loading-card">
            <span className="editor-eyebrow">Authentication</span>
            <h1>نتحقق من جلسة التحرير</h1>
            <p>ننتظر Firebase Auth لتأكيد صلاحية الحساب الحالي.</p>
          </section>
        </main>
      </div>
    )
  }

  if (!user || !isAdmin) {
    return <Navigate replace state={{ from: location }} to="/login" />
  }

  return <Outlet />
}
