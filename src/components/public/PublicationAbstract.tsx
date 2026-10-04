import { cleanAbstract } from '../../lib/cleanAbstract.js'

export function PublicationAbstract({ value }: { value: string }) {
  const abstract = cleanAbstract(value)
  return <div className="publication-abstract">
    {(['ar', 'en'] as const).map(language => abstract[language] ? (
      <section key={language} className="publication-abstract__block" dir={language === 'ar' ? 'rtl' : 'ltr'} lang={language}>
        <span className="publication-abstract__label">{language === 'ar' ? 'الملخص' : 'Abstract'}</span>
        <p>{abstract[language]}</p>
      </section>
    ) : null)}
  </div>
}
