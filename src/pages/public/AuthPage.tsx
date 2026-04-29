import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { usePublicSession } from '../../contexts/PublicSessionContext'
import { buildLocalizedPath } from '../../lib/navigation'
import type { AppLanguage } from '../../types/publication'

export function AuthPage({ language }: { language: AppLanguage }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { signInUser, registerUser } = usePublicSession()
  const [mode, setMode] = useState<'login' | 'register'>(
    location.pathname.includes('register') ? 'register' : 'login',
  )
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setNotice('')
    try {
      if (mode === 'login') {
        await signInUser(email, password)
      } else {
        await registerUser(name, email, password)
      }
      navigate(buildLocalizedPath(language, '/dashboard'))
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : language === 'ar'
            ? 'تعذر إكمال العملية.'
            : 'Unable to complete the request.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const isAr = language === 'ar'

  return (
    <div className="auth-screen" dir={isAr ? 'rtl' : 'ltr'}>
      <aside className="auth-screen__brand">
        <Link className="auth-screen__back" to={buildLocalizedPath(language, '/')}>
          {isAr ? '← العودة للموقع' : '← Back to site'}
        </Link>
        <div className="auth-screen__brand-content">
          <div className="auth-screen__lockup">
            <img className="auth-screen__logo" src="/newlogo.png" alt="" />
            <div className="auth-screen__lockup-text">
              <span className="auth-screen__brand-name">
                {isAr ? 'مركز إسناد' : 'Esnad Center'}
              </span>
              <span className="auth-screen__brand-sub">
                {isAr ? 'للدراسات والأبحاث' : 'for Studies and Research'}
              </span>
            </div>
          </div>
          <h1 className="auth-screen__pitch">
            {isAr
              ? 'مكتبة بحثية عربية. دراسات، أوراق، وكتب في مكان واحد.'
              : 'An Arabic research library. Studies, papers, and books all in one place.'}
          </h1>
          <ul className="auth-screen__bullets">
            <li>{isAr ? 'احفظ الإصدارات للقراءة لاحقاً' : 'Save publications for later'}</li>
            <li>{isAr ? 'تابع مشترياتك ومحتوى المركز' : 'Track purchases and access paid content'}</li>
            <li>{isAr ? 'تنبيهات بأحدث الإصدارات' : 'Get alerts on the latest releases'}</li>
          </ul>
        </div>
      </aside>

      <main className="auth-screen__panel">
        <div className="auth-screen__card">
          <div className="auth-screen__head">
            <h2 className="auth-screen__title">
              {mode === 'login'
                ? isAr ? 'تسجيل الدخول' : 'Sign in'
                : isAr ? 'إنشاء حساب جديد' : 'Create your account'}
            </h2>
            <p className="auth-screen__sub">
              {mode === 'login'
                ? isAr ? 'مرحباً بعودتك. أدخل بياناتك للمتابعة.' : 'Welcome back. Enter your details to continue.'
                : isAr ? 'انضم إلى مكتبة المركز في أقل من دقيقة.' : 'Join the center library in under a minute.'}
            </p>
          </div>

          <div className="auth-screen__switch" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={`auth-screen__switch-btn${mode === 'login' ? ' auth-screen__switch-btn--active' : ''}`}
              onClick={() => setMode('login')}
            >
              {isAr ? 'دخول' : 'Login'}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              className={`auth-screen__switch-btn${mode === 'register' ? ' auth-screen__switch-btn--active' : ''}`}
              onClick={() => setMode('register')}
            >
              {isAr ? 'تسجيل' : 'Register'}
            </button>
          </div>

          <form className="auth-screen__form" onSubmit={handleSubmit}>
            {mode === 'register' ? (
              <label className="auth-field">
                <span>{isAr ? 'الاسم الكامل' : 'Full name'}</span>
                <input
                  required={mode === 'register'}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={isAr ? 'أحمد عبدالله' : 'Your name'}
                />
              </label>
            ) : null}
            <label className="auth-field">
              <span>{isAr ? 'البريد الإلكتروني' : 'Email'}</span>
              <input
                required
                type="email"
                dir="ltr"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <label className="auth-field">
              <span>{isAr ? 'كلمة المرور' : 'Password'}</span>
              <input
                required
                type="password"
                dir="ltr"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
              />
            </label>

            {notice ? <div className="auth-screen__notice">{notice}</div> : null}

            <button className="auth-screen__submit" type="submit" disabled={submitting}>
              {submitting
                ? isAr ? 'جارٍ التنفيذ...' : 'Processing...'
                : mode === 'login'
                  ? isAr ? 'تسجيل الدخول' : 'Sign in'
                  : isAr ? 'إنشاء الحساب' : 'Create account'}
            </button>

            <p className="auth-screen__alt">
              {mode === 'login'
                ? <>
                    {isAr ? 'ليس لديك حساب؟ ' : "Don't have an account? "}
                    <button type="button" className="auth-screen__inline-link" onClick={() => setMode('register')}>
                      {isAr ? 'سجّل الآن' : 'Register'}
                    </button>
                  </>
                : <>
                    {isAr ? 'لديك حساب بالفعل؟ ' : 'Already have an account? '}
                    <button type="button" className="auth-screen__inline-link" onClick={() => setMode('login')}>
                      {isAr ? 'تسجيل الدخول' : 'Sign in'}
                    </button>
                  </>}
            </p>
          </form>
        </div>
      </main>
    </div>
  )
}
