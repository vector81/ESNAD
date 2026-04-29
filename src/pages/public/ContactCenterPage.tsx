import { useState } from 'react'
import { PublicSiteShell } from '../../components/public/PublicSiteShell'
import type { AppLanguage } from '../../types/publication'

export function ContactCenterPage({ language }: { language: AppLanguage }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setNotice('')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      })
      const payload = (await response.json().catch(() => null)) as { error?: string } | null
      if (!response.ok) {
        throw new Error(payload?.error || 'تعذر إرسال الرسالة حالياً.')
      }
      setName('')
      setEmail('')
      setMessage('')
      setNotice(language === 'ar' ? 'تم إرسال رسالتك بنجاح.' : 'Your message has been sent.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : language === 'ar' ? 'تعذر إرسال الرسالة.' : 'Failed to send message.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PublicSiteShell language={language}>
      <div className="auth-layout">
        <div>
          <span className="eyebrow">{language === 'ar' ? 'تواصل معنا' : 'Contact'}</span>
          <h1 className="title-1 mb-2">{language === 'ar' ? 'راسل المركز' : 'Contact the center'}</h1>
          <p className="body-muted" style={{ maxWidth: 480 }}>
            {language === 'ar'
              ? 'للاستفسارات البحثية، التعاون المؤسسي، أو طلبات الاشتراك.'
              : 'For research inquiries, institutional collaboration, or subscription requests.'}
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>{language === 'ar' ? 'الاسم' : 'Name'}</span>
            <input onChange={(event) => setName(event.target.value)} required value={name} />
          </label>
          <label className="field">
            <span>{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</span>
            <input onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
          </label>
          <label className="field">
            <span>{language === 'ar' ? 'الرسالة' : 'Message'}</span>
            <textarea onChange={(event) => setMessage(event.target.value)} required rows={6} value={message} />
          </label>
          <button className="btn btn--primary" disabled={submitting} type="submit">
            {submitting
              ? language === 'ar'
                ? 'جار الإرسال...'
                : 'Sending...'
              : language === 'ar'
                ? 'إرسال'
                : 'Send'}
          </button>
          {notice ? <div className="notice notice--success">{notice}</div> : null}
        </form>
      </div>
    </PublicSiteShell>
  )
}
