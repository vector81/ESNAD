import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { adminEmail, isFirebaseConfigured } from '../../lib/firebase'
import { publicSiteUrl } from '../../lib/siteLinks'

interface LoginState {
  email: string
  password: string
}

export function AdminLoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { signIn, user, isAdmin, loading } = useAuth()
  const [form, setForm] = useState<LoginState>({
    email: adminEmail,
    password: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    document.title = 'إسناد | دخول الإدارة'
  }, [])

  useEffect(() => {
    if (!isFirebaseConfigured) {
      navigate('/', { replace: true })
      return
    }

    if (!loading && user && isAdmin) {
      const redirectTo = (
        location.state as { from?: { pathname?: string } } | null
      )?.from?.pathname
      navigate(redirectTo || '/', { replace: true })
    }
  }, [isAdmin, loading, location.state, navigate, user])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      await signIn(form.email, form.password)
      navigate('/', { replace: true })
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : 'فشل تسجيل الدخول. حاول مرة أخرى.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-screen auth-screen--admin" dir="rtl" lang="ar">
      <aside className="auth-screen__brand">
        {publicSiteUrl ? (
          <a className="auth-screen__back" href={publicSiteUrl}>
            ← العودة إلى الموقع
          </a>
        ) : null}
        <div className="auth-screen__brand-content">
          <div className="auth-screen__lockup">
            <img className="auth-screen__logo" src="/newlogo.png" alt="" />
            <div className="auth-screen__lockup-text">
              <span className="auth-screen__brand-name">مركز إسناد</span>
              <span className="auth-screen__brand-sub">لوحة التحرير</span>
            </div>
          </div>
          <h1 className="auth-screen__pitch">
            واجهة فريق التحرير لإدارة الدراسات والأوراق البحثية والكتب.
          </h1>
          <ul className="auth-screen__bullets">
            <li>إنشاء وتحرير الإصدارات بكل أنواعها</li>
            <li>مراجعة المسودات وتقدّم العمل</li>
            <li>نشر الأعداد إلى الموقع العام</li>
          </ul>
        </div>
      </aside>

      <main className="auth-screen__panel">
        <div className="auth-screen__card">
          <div className="auth-screen__head">
            <span className="auth-screen__chip">دخول الإدارة</span>
            <h2 className="auth-screen__title">تسجيل الدخول</h2>
            <p className="auth-screen__sub">
              أدخل بريدك وكلمة المرور المخصصة لفريق التحرير.
            </p>
          </div>

          {!isFirebaseConfigured ? (
            <div className="auth-screen__notice auth-screen__notice--info">
              وضع المعاينة مفعل. يتم تجاوز تسجيل الدخول مؤقتاً.
            </div>
          ) : null}

          {error ? <div className="auth-screen__notice">{error}</div> : null}

          <form className="auth-screen__form" onSubmit={handleSubmit}>
            <label className="auth-field">
              <span>البريد الإلكتروني</span>
              <input
                autoComplete="email"
                dir="ltr"
                id="email"
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="admin@example.com"
                type="email"
                value={form.email}
              />
            </label>

            <label className="auth-field">
              <span>كلمة المرور</span>
              <input
                autoComplete="current-password"
                dir="ltr"
                id="password"
                onChange={(event) =>
                  setForm((current) => ({ ...current, password: event.target.value }))
                }
                placeholder="••••••••"
                type="password"
                value={form.password}
              />
            </label>

            {isFirebaseConfigured ? (
              <button className="auth-screen__submit" disabled={submitting} type="submit">
                {submitting ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
              </button>
            ) : (
              <Link className="auth-screen__submit" to="/">
                دخول تجريبي
              </Link>
            )}
          </form>
        </div>
      </main>
    </div>
  )
}
