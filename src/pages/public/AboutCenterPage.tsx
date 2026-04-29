import { useState } from 'react'
import { PublicSiteShell } from '../../components/public/PublicSiteShell'
import type { AppLanguage } from '../../types/publication'

export function AboutCenterPage({ language }: { language: AppLanguage }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleContactSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
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
      <section className="panel">
        <span className="eyebrow">{language === 'ar' ? 'من نحن' : 'About'}</span>
        <h1 className="title-1 mb-2">
          {language === 'ar' ? 'مركز إسناد للدراسات والأبحاث' : 'Esnad Center for Studies and Research'}
        </h1>
        <p className="body-muted" style={{ maxWidth: 720 }}>
          {language === 'ar'
            ? 'إسناد منصة بحثية عربية متخصصة في إنتاج ونشر وأرشفة الدراسات والأوراق السياسية والاقتصادية والتحليلية. نركز على بناء مكتبة رقمية متخصصة تجمع بين الإتاحة المجانية والإصدارات المدفوعة.'
            : 'Esnad is an Arabic-first research platform focused on producing, publishing, and archiving studies, policy papers, and analytical outputs. We are building a structured digital library that combines open access and paid releases.'}
        </p>

        <div className="grid-3" style={{ marginTop: 32 }}>
          <div className="card" style={{ padding: 24 }}>
            <h2 className="title-3 mb-2">{language === 'ar' ? 'الرؤية' : 'Vision'}</h2>
            <p className="body-muted" style={{ fontSize: 14 }}>
              {language === 'ar'
                ? 'بناء مرجع بحثي عربي منظم وموثوق يربط المعرفة المتخصصة بالمجال العام.'
                : 'Build a trusted Arabic research reference that connects specialized knowledge to the public sphere.'}
            </p>
          </div>
          <div className="card" style={{ padding: 24 }}>
            <h2 className="title-3 mb-2">{language === 'ar' ? 'المهمة' : 'Mission'}</h2>
            <p className="body-muted" style={{ fontSize: 14 }}>
              {language === 'ar'
                ? 'إنتاج أوراق ودراسات وكتب قابلة للأرشفة والشراء والاستخدام المؤسسي.'
                : 'Produce research papers, studies, and books built for archiving, purchase, and institutional use.'}
            </p>
          </div>
          <div className="card" style={{ padding: 24 }}>
            <h2 className="title-3 mb-2">{language === 'ar' ? 'القيم' : 'Values'}</h2>
            <p className="body-muted" style={{ fontSize: 14 }}>
              {language === 'ar'
                ? 'الدقة، الوضوح، الوصول المفتوح، والجودة التحريرية في كل إصدار.'
                : 'Accuracy, clarity, open access, and editorial quality in every publication.'}
            </p>
          </div>
        </div>
      </section>

      <section className="panel" style={{ marginTop: 24 }}>
        <span className="eyebrow">{language === 'ar' ? 'تواصل معنا' : 'Contact'}</span>
        <h2 className="title-2 mb-2">
          {language === 'ar' ? 'راسل المركز' : 'Contact the center'}
        </h2>
        <p className="body-muted" style={{ maxWidth: 560, marginBottom: 24 }}>
          {language === 'ar'
            ? 'للاستفسارات البحثية، التعاون المؤسسي، أو طلبات الاشتراك.'
            : 'For research inquiries, institutional collaboration, or subscription requests.'}
        </p>

        <form className="about-contact-form" onSubmit={handleContactSubmit}>
          <label className="field">
            <span>{language === 'ar' ? 'الاسم' : 'Name'}</span>
            <input onChange={(event) => setName(event.target.value)} required value={name} />
          </label>
          <label className="field">
            <span>{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</span>
            <input onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
          </label>
          <label className="field about-contact-form__message">
            <span>{language === 'ar' ? 'الرسالة' : 'Message'}</span>
            <textarea onChange={(event) => setMessage(event.target.value)} required rows={6} value={message} />
          </label>
          <button className="btn btn--brand" disabled={submitting} type="submit">
            {submitting
              ? language === 'ar' ? 'جار الإرسال...' : 'Sending...'
              : language === 'ar' ? 'إرسال' : 'Send'}
          </button>
          {notice ? <div className="notice notice--success" style={{ gridColumn: '1 / -1' }}>{notice}</div> : null}
        </form>
      </section>
    </PublicSiteShell>
  )
}
