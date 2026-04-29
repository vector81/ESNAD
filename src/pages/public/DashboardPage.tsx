import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PublicationCard } from '../../components/public/PublicationCard'
import { PublicSiteShell } from '../../components/public/PublicSiteShell'
import { usePublicSession } from '../../contexts/PublicSessionContext'
import { auth, isFirebaseConfigured } from '../../lib/firebase'
import { confirmCheckoutSession } from '../../lib/payments'
import { listPublications } from '../../lib/publications'
import type { AppLanguage, Publication } from '../../types/publication'

export function DashboardPage({ language }: { language: AppLanguage }) {
  const { user, library, refreshLibrary } = usePublicSession()
  const [searchParams, setSearchParams] = useSearchParams()
  const [allItems, setAllItems] = useState<Publication[]>([])
  const [notice, setNotice] = useState('')

  useEffect(() => {
    listPublications({ kind: 'all' }).then(setAllItems).catch(() => setAllItems([]))
  }, [])

  useEffect(() => {
    const publicationId = searchParams.get('purchase')
    const sessionId = searchParams.get('session_id')

    if (!user || !publicationId || !sessionId || !isFirebaseConfigured || !auth?.currentUser) {
      return
    }

    auth.currentUser
      .getIdToken()
      .then((token) => confirmCheckoutSession(publicationId, sessionId, token))
      .then(() => refreshLibrary())
      .then(() =>
        setNotice(
          language === 'ar'
            ? 'تم تأكيد الشراء وإضافة الإصدار إلى حسابك.'
            : 'Purchase confirmed and added to your account.',
        ),
      )
      .finally(() => {
        const next = new URLSearchParams(searchParams)
        next.delete('purchase')
        next.delete('session_id')
        setSearchParams(next, { replace: true })
      })
  }, [language, refreshLibrary, searchParams, setSearchParams, user])

  const savedItems = useMemo(
    () => allItems.filter((item) => library.saved_item_ids.includes(item.id)),
    [allItems, library.saved_item_ids],
  )
  const purchasedItems = useMemo(
    () => allItems.filter((item) => library.purchased_item_ids.includes(item.id)),
    [allItems, library.purchased_item_ids],
  )

  return (
    <PublicSiteShell language={language}>
      <section className="panel">
        <div className="panel__head">
          <div>
            <span className="eyebrow">{language === 'ar' ? 'الحساب' : 'Account'}</span>
            <h1 className="title-2">{language === 'ar' ? 'لوحة المستخدم' : 'User dashboard'}</h1>
          </div>
        </div>

        {notice ? <div className="notice notice--success">{notice}</div> : null}

        {!user ? (
          <div className="empty">{language === 'ar' ? 'لا توجد جلسة مستخدم حالياً.' : 'No active user session.'}</div>
        ) : (
          <div className="dashboard-grid">
            <div className="metrics" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
              <div className="metric">
                <div className="metric__value">{purchasedItems.length}</div>
                <div className="metric__label">{language === 'ar' ? 'مشتريات' : 'Purchases'}</div>
              </div>
              <div className="metric">
                <div className="metric__value">{savedItems.length}</div>
                <div className="metric__label">{language === 'ar' ? 'محفوظات' : 'Saved'}</div>
              </div>
            </div>

            <section>
              <div className="panel__head">
                <div>
                  <span className="eyebrow">{language === 'ar' ? 'المشتريات' : 'Purchases'}</span>
                  <h2 className="title-3">{language === 'ar' ? 'إصدارات اشتريتها' : 'Items you purchased'}</h2>
                </div>
              </div>
              {purchasedItems.length === 0 ? (
                <div className="empty">{language === 'ar' ? 'لا توجد مشتريات بعد.' : 'No purchases yet.'}</div>
              ) : (
                <div className="grid-3">
                  {purchasedItems.map((publication) => (
                    <PublicationCard key={publication.id} language={language} publication={publication} />
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="panel__head">
                <div>
                  <span className="eyebrow">{language === 'ar' ? 'المحفوظات' : 'Saved'}</span>
                  <h2 className="title-3">{language === 'ar' ? 'إصدارات محفوظة' : 'Items saved for later'}</h2>
                </div>
              </div>
              {savedItems.length === 0 ? (
                <div className="empty">{language === 'ar' ? 'لا توجد محفوظات بعد.' : 'No saved items yet.'}</div>
              ) : (
                <div className="grid-3">
                  {savedItems.map((publication) => (
                    <PublicationCard key={publication.id} language={language} publication={publication} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </section>
    </PublicSiteShell>
  )
}
