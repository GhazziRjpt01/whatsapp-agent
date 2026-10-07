import app from './app.js'
import { assertEnv, env } from './config/env.js'
import { resumeQrSessionIfSaved } from './whatsapp/qrSession.js'

assertEnv()

const server = app.listen(env.port, () => {
  console.log(`Server running on http://localhost:${env.port}`)
  console.log(`Environment: ${env.nodeEnv}`)
  console.log(`Data store: ${env.dataStore}`)
  if (env.allowDevAuthBypass) {
    console.log('Dev auth bypass enabled (memory/local only).')
  }
  resumeQrSessionIfSaved()
})

function shutdown(signal) {
  console.log(`${signal} received. Shutting down gracefully...`)
  server.close(() => process.exit(0))
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
