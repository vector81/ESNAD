import { sendTestEmail } from '../api/_lib/resend.js'

const to = 'abuali882005@gmail.com'

const result = await sendTestEmail({ to })

if (!result?.id) {
  throw new Error('Resend test email was not sent. Check RESEND_API_KEY in the runtime environment.')
}

console.log(`Resend test email sent to ${to}. Message id: ${result.id}`)
