import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from '../../components/admin/AdminLayout'
import { ProtectedRoute } from '../../components/admin/ProtectedRoute'
import { AuthProvider } from '../../contexts/AuthContext'

const AdminLoginPage = lazy(async () =>
  import('../../pages/admin/AdminLoginPage').then((module) => ({ default: module.AdminLoginPage })),
)
const AdminDashboardPage = lazy(async () =>
  import('../../pages/admin/AdminDashboardPage').then((module) => ({
    default: module.AdminDashboardPage,
  })),
)
const StudioPage = lazy(async () =>
  import('../../studio/pages/StudioPage').then((module) => ({
    default: module.StudioPage,
  })),
)

function EditorLoadingFallback() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>جارٍ تحميل لوحة الإدارة...</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>نستعد لعرض مساحة التحرير.</p>
      </div>
    </div>
  )
}

export function AdminApp() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<EditorLoadingFallback />}>
          <Routes>
            <Route path="/login" element={<AdminLoginPage />} />
            <Route path="/" element={<ProtectedRoute />}>
              <Route element={<AdminLayout />}>
                <Route index element={<AdminDashboardPage />} />
                <Route path="admin/publications/new" element={<StudioPage />} />
                <Route path="admin/publications/:id/edit" element={<StudioPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate replace to="/" />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}
