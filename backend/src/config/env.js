import dotenv from 'dotenv'

dotenv.config()

const requiredInProduction = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENAI_API_KEY',
  'CORS_ORIGIN',
]

const supabaseConfigured = Boolean(
  process.env.SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !String(process.env.SUPABASE_URL).includes('your_supabase') &&
    !String(process.env.SUPABASE_SERVICE_ROLE_KEY).includes('your_supabase'),
)

const configuredStore = process.env.DATA_STORE
const dataStore =
  configuredStore || (supabaseConfigured ? 'supabase' : 'memory')

const nodeEnv = process.env.NODE_ENV || 'development'
const isProduction = nodeEnv === 'production'

// Never allow shared dev bearer tokens in production.
const allowDevAuthBypass =
  !isProduction &&
  (process.env.ALLOW_DEV_AUTH_BYPASS === 'true' || dataStore === 'memory')

export const env = {
  nodeEnv,
  isProduction,
  port: Number(process.env.PORT) || 5000,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN || '',
  whatsappAppSecret: process.env.WHATSAPP_APP_SECRET || '',
  dataStore,
  supabaseConfigured,
  allowDevAuthBypass,
  devAuthToken: process.env.DEV_AUTH_TOKEN || 'dev-admin-token',
  aiProvider: (process.env.AI_PROVIDER || 'auto').toLowerCase(),
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
}

export function assertEnv() {
  if (!isProduction) return

  const missing = requiredInProduction.filter((key) => {
    const value = process.env[key]
    return !value || String(value).includes('your_')
  })

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    )
  }

  if (env.dataStore !== 'supabase') {
    throw new Error('DATA_STORE must be "supabase" in production.')
  }

  if (process.env.ALLOW_DEV_AUTH_BYPASS === 'true') {
    throw new Error('ALLOW_DEV_AUTH_BYPASS must not be enabled in production.')
  }

  if (process.env.WHATSAPP_MOCK === 'true') {
    throw new Error('WHATSAPP_MOCK must be disabled in production.')
  }

  if (process.env.WHATSAPP_WEBHOOK_SYNC === 'true') {
    throw new Error(
      'WHATSAPP_WEBHOOK_SYNC must be disabled in production (use async webhook ack).',
    )
  }
}
