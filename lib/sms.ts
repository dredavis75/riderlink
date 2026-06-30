import twilio from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken  = process.env.TWILIO_AUTH_TOKEN
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID

export async function sendSms(to: string, body: string): Promise<void> {
  if (!accountSid || !authToken || !messagingServiceSid) {
    throw new Error('Twilio env vars not configured')
  }
  const client = twilio(accountSid, authToken)
  await client.messages.create({ messagingServiceSid, to, body })
}

export function formatPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (digits.length > 10) return `+${digits}`
  return null
}
